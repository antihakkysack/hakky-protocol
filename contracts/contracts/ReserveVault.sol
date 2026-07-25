// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CleanBTC} from "./CleanBTC.sol";
import {IAttestationRegistry} from "./interfaces/IHakky.sol";

/// @title ReserveVault
/// @author Hakky Protocol
/// @notice Mint/redeem gateway between native BTC (held in qualified custody) and cBTC.
/// @dev    Flow (v1, custodial and stated plainly):
///          MINT:  user sends screened BTC to the protocol custody address off-chain.
///                 A verifier (VERIFIER_ROLE, a multisig fed by custodian + screening
///                 attestations) confirms the deposit and calls `processDeposit`, which
///                 checks the recipient is not sanctioned and mints cBTC 1:1.
///          REDEEM: user calls `requestRedeem`, which burns their cBTC and records a
///                 payout request; a settler (SETTLER_ROLE) releases BTC off-chain and
///                 calls `settleRedeem` with the settling BTC txid.
contract ReserveVault is AccessControl, Pausable, ReentrancyGuard {
    /// @notice Role that confirms BTC deposits and triggers mints.
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    /// @notice Role that settles redemptions after BTC is paid out.
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    /// @notice Role permitted to stop and resume new deposits/redemptions.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    enum RedeemStatus {
        None,
        Pending,
        Settled,
        Cancelled
    }

    struct Redemption {
        address account;
        uint256 amountSats;
        string btcPayoutAddress;
        RedeemStatus status;
        uint64 requestedAt;
        bytes32 btcTxid;
    }

    /// @notice The cBTC token this vault mints and burns.
    CleanBTC public immutable cbtc;
    /// @notice Registry consulted to block sanctioned recipients at mint time.
    IAttestationRegistry public registry;

    /// @notice Guards against replaying the same Bitcoin outpoint (`txid:vout`).
    mapping(bytes32 => bool) public processedDeposits;

    /// @notice Redemption requests by id.
    mapping(uint256 => Redemption) public redemptions;
    /// @notice Total number of redemption requests ever created.
    uint256 public redemptionCount;
    /// @notice BTC liabilities awaiting payout or cBTC re-mint on cancellation.
    uint256 public pendingRedemptionSats;

    event Minted(
        address indexed to,
        uint256 amountSats,
        bytes32 indexed btcTxid,
        uint32 vout,
        bytes32 indexed depositId,
        string evidenceURI
    );
    event RedeemRequested(
        uint256 indexed id,
        address indexed account,
        uint256 amountSats,
        string btcPayoutAddress
    );
    event RedeemSettled(uint256 indexed id, bytes32 indexed btcTxid);
    event RedeemCancelled(uint256 indexed id);
    event RegistryUpdated(address indexed registry);

    error DepositAlreadyProcessed(bytes32 depositId);
    error InvalidDepositReference();
    error RecipientSanctioned(address to);
    error ZeroAmount();
    error BadStatus();
    error ZeroAddress();
    error RegistryUnavailable();
    error InvalidPayoutAddress();
    error InvalidSettlementReference();
    error ExceedsPilotLiabilityCap(uint256 newLiabilities, uint256 capSats);
    error ExceedsAvailableBacking(uint256 newLiabilities, uint256 reserveSats);

    constructor(address admin, CleanBTC cbtc_, IAttestationRegistry registry_) {
        if (
            admin == address(0) ||
            address(cbtc_) == address(0) ||
            address(registry_) == address(0)
        ) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        cbtc = cbtc_;
        registry = registry_;
    }

    /// @notice Confirm a screened BTC deposit and mint cBTC 1:1 to `to`.
    /// @param to          Recipient of the freshly minted cBTC.
    /// @param amountSats  Deposit amount in satoshis (== cBTC base units).
    /// @param btcTxid     The Bitcoin transaction id containing the deposit.
    /// @param vout        The transaction output index containing the deposit.
    /// @param evidenceURI Pointer to the deposit's provenance-screening report.
    function processDeposit(
        address to,
        uint256 amountSats,
        bytes32 btcTxid,
        uint32 vout,
        string calldata evidenceURI
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused nonReentrant {
        if (amountSats == 0) revert ZeroAmount();
        if (btcTxid == bytes32(0)) revert InvalidDepositReference();
        bytes32 depositId = getDepositId(btcTxid, vout);
        if (processedDeposits[depositId]) revert DepositAlreadyProcessed(depositId);
        if (address(registry) == address(0)) revert RegistryUnavailable();
        if (registry.isSanctioned(to)) revert RecipientSanctioned(to);

        uint256 newLiabilities = cbtc.totalSupply() + pendingRedemptionSats + amountSats;
        uint256 cap = cbtc.PILOT_SUPPLY_CAP_SATS();
        if (newLiabilities > cap) {
            revert ExceedsPilotLiabilityCap(newLiabilities, cap);
        }
        uint256 reserves = cbtc.reserveOracle().reserveSats();
        if (newLiabilities > reserves) {
            revert ExceedsAvailableBacking(newLiabilities, reserves);
        }

        processedDeposits[depositId] = true;
        cbtc.mint(to, amountSats);
        emit Minted(to, amountSats, btcTxid, vout, depositId, evidenceURI);
    }

    /// @notice Canonical replay key for one Bitcoin transaction output.
    function getDepositId(bytes32 btcTxid, uint32 vout) public pure returns (bytes32) {
        return keccak256(abi.encode(btcTxid, vout));
    }

    /// @notice Burn `amountSats` cBTC and request 1:1 BTC payout to `btcPayoutAddress`.
    /// @return id The redemption id, referenced when the payout settles.
    function requestRedeem(uint256 amountSats, string calldata btcPayoutAddress)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 id)
    {
        if (amountSats == 0) revert ZeroAmount();
        uint256 payoutAddressLength = bytes(btcPayoutAddress).length;
        if (payoutAddressLength < 14 || payoutAddressLength > 90) {
            revert InvalidPayoutAddress();
        }

        // Record the liability before the external token call (checks-effects-
        // interactions). A failed burn reverts this state atomically.
        pendingRedemptionSats += amountSats;

        id = ++redemptionCount;
        redemptions[id] = Redemption({
            account: msg.sender,
            amountSats: amountSats,
            btcPayoutAddress: btcPayoutAddress,
            status: RedeemStatus.Pending,
            requestedAt: uint64(block.timestamp),
            btcTxid: bytes32(0)
        });
        cbtc.burn(msg.sender, amountSats);
        emit RedeemRequested(id, msg.sender, amountSats, btcPayoutAddress);
    }

    /// @notice Mark a redemption settled after BTC has been paid out off-chain.
    function settleRedeem(uint256 id, bytes32 btcTxid) external onlyRole(SETTLER_ROLE) {
        Redemption storage r = redemptions[id];
        if (r.status != RedeemStatus.Pending) revert BadStatus();
        if (btcTxid == bytes32(0)) revert InvalidSettlementReference();
        r.status = RedeemStatus.Settled;
        r.btcTxid = btcTxid;
        pendingRedemptionSats -= r.amountSats;
        emit RedeemSettled(id, btcTxid);
    }

    /// @notice Cancel a pending redemption and re-mint the burned cBTC back to the
    ///         requester (used only if a payout provably cannot be completed).
    function cancelRedeem(uint256 id) external onlyRole(SETTLER_ROLE) nonReentrant {
        Redemption storage r = redemptions[id];
        if (r.status != RedeemStatus.Pending) revert BadStatus();
        r.status = RedeemStatus.Cancelled;
        pendingRedemptionSats -= r.amountSats;
        cbtc.mint(r.account, r.amountSats);
        emit RedeemCancelled(id);
    }

    function setRegistry(IAttestationRegistry newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(newRegistry) == address(0)) revert ZeroAddress();
        registry = newRegistry;
        emit RegistryUpdated(address(newRegistry));
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
