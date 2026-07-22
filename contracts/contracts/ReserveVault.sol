// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
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
contract ReserveVault is AccessControl {
    /// @notice Role that confirms BTC deposits and triggers mints.
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    /// @notice Role that settles redemptions after BTC is paid out.
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

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

    /// @notice Guards against replaying the same BTC deposit.
    mapping(bytes32 => bool) public processedDeposits;

    /// @notice Redemption requests by id.
    mapping(uint256 => Redemption) public redemptions;
    /// @notice Total number of redemption requests ever created.
    uint256 public redemptionCount;

    event Minted(address indexed to, uint256 amountSats, bytes32 indexed btcTxid, string evidenceURI);
    event RedeemRequested(
        uint256 indexed id,
        address indexed account,
        uint256 amountSats,
        string btcPayoutAddress
    );
    event RedeemSettled(uint256 indexed id, bytes32 indexed btcTxid);
    event RedeemCancelled(uint256 indexed id);
    event RegistryUpdated(address registry);

    error DepositAlreadyProcessed(bytes32 btcTxid);
    error RecipientSanctioned(address to);
    error ZeroAmount();
    error NotRequester();
    error BadStatus();

    constructor(address admin, CleanBTC cbtc_, IAttestationRegistry registry_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        cbtc = cbtc_;
        registry = registry_;
    }

    /// @notice Confirm a screened BTC deposit and mint cBTC 1:1 to `to`.
    /// @param to          Recipient of the freshly minted cBTC.
    /// @param amountSats  Deposit amount in satoshis (== cBTC base units).
    /// @param btcTxid     The Bitcoin txid of the deposit (replay guard).
    /// @param evidenceURI Pointer to the deposit's provenance-screening report.
    function processDeposit(
        address to,
        uint256 amountSats,
        bytes32 btcTxid,
        string calldata evidenceURI
    ) external onlyRole(VERIFIER_ROLE) {
        if (amountSats == 0) revert ZeroAmount();
        if (processedDeposits[btcTxid]) revert DepositAlreadyProcessed(btcTxid);
        if (address(registry) != address(0) && registry.isSanctioned(to)) {
            revert RecipientSanctioned(to);
        }

        processedDeposits[btcTxid] = true;
        cbtc.mint(to, amountSats);
        emit Minted(to, amountSats, btcTxid, evidenceURI);
    }

    /// @notice Burn `amountSats` cBTC and request 1:1 BTC payout to `btcPayoutAddress`.
    /// @return id The redemption id, referenced when the payout settles.
    function requestRedeem(uint256 amountSats, string calldata btcPayoutAddress)
        external
        returns (uint256 id)
    {
        if (amountSats == 0) revert ZeroAmount();

        // Burn first (checks-effects): reverts if the caller lacks the balance.
        cbtc.burn(msg.sender, amountSats);

        id = ++redemptionCount;
        redemptions[id] = Redemption({
            account: msg.sender,
            amountSats: amountSats,
            btcPayoutAddress: btcPayoutAddress,
            status: RedeemStatus.Pending,
            requestedAt: uint64(block.timestamp),
            btcTxid: bytes32(0)
        });
        emit RedeemRequested(id, msg.sender, amountSats, btcPayoutAddress);
    }

    /// @notice Mark a redemption settled after BTC has been paid out off-chain.
    function settleRedeem(uint256 id, bytes32 btcTxid) external onlyRole(SETTLER_ROLE) {
        Redemption storage r = redemptions[id];
        if (r.status != RedeemStatus.Pending) revert BadStatus();
        r.status = RedeemStatus.Settled;
        r.btcTxid = btcTxid;
        emit RedeemSettled(id, btcTxid);
    }

    /// @notice Cancel a pending redemption and re-mint the burned cBTC back to the
    ///         requester (used only if a payout provably cannot be completed).
    function cancelRedeem(uint256 id) external onlyRole(SETTLER_ROLE) {
        Redemption storage r = redemptions[id];
        if (r.status != RedeemStatus.Pending) revert BadStatus();
        r.status = RedeemStatus.Cancelled;
        cbtc.mint(r.account, r.amountSats);
        emit RedeemCancelled(id);
    }

    function setRegistry(IAttestationRegistry newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registry = newRegistry;
        emit RegistryUpdated(address(newRegistry));
    }
}
