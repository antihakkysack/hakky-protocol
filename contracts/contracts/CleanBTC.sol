// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IReserveOracle, ICompliancePolicy} from "./interfaces/IHakky.sol";

/// @title CleanBTC (cBTC)
/// @author Hakky Protocol
/// @notice A token backed 1:1 by BTC held in verifiable reserve, whose backing BTC
///         has passed provenance screening. 1 cBTC = 1 verifiably clean BTC.
/// @dev    - Uses 8 decimals to mirror BTC, so 1 base unit == 1 satoshi and the
///           supply can be compared directly against `ReserveOracle.reserveSats()`.
///         - Minting is gated by the solvency invariant `totalSupply() <= reserveSats`.
///         - Transfers are checked against a pluggable `CompliancePolicy` which
///           ships in monitor-only mode (never blocks) by default.
contract CleanBTC is ERC20, ERC20Permit, AccessControl {
    /// @notice Role permitted to mint cBTC (held by the ReserveVault).
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /// @notice Role permitted to burn cBTC on redemption (held by the ReserveVault).
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @notice Proof-of-reserves oracle enforcing the 1:1 solvency invariant.
    IReserveOracle public reserveOracle;
    /// @notice Optional transfer policy (monitor-only by default).
    ICompliancePolicy public compliancePolicy;

    event ReserveOracleUpdated(address oracle);
    event CompliancePolicyUpdated(address policy);

    error ExceedsReserves(uint256 newSupply, uint256 reserveSats);
    error TransferNotAllowed(address from, address to);

    /// @param admin   Address granted DEFAULT_ADMIN_ROLE (should be a multisig/governance).
    /// @param oracle  The proof-of-reserves oracle.
    /// @param policy  The compliance policy (may be address(0) to disable checks).
    constructor(address admin, IReserveOracle oracle, ICompliancePolicy policy)
        ERC20("Clean BTC", "cBTC")
        ERC20Permit("Clean BTC")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        reserveOracle = oracle;
        compliancePolicy = policy;
    }

    /// @notice cBTC uses 8 decimals to match Bitcoin (1 base unit = 1 satoshi).
    function decimals() public pure override returns (uint8) {
        return 8;
    }

    /// @notice Mint `amount` cBTC (in satoshis) to `to`. Reverts if minting would
    ///         push supply above the attested BTC reserves.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        uint256 newSupply = totalSupply() + amount;
        uint256 reserves = reserveOracle.reserveSats();
        if (newSupply > reserves) revert ExceedsReserves(newSupply, reserves);
        _mint(to, amount);
    }

    /// @notice Burn `amount` cBTC from `from` (used by the vault on 1:1 redemption).
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    /// @notice Update the proof-of-reserves oracle.
    function setReserveOracle(IReserveOracle oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reserveOracle = oracle;
        emit ReserveOracleUpdated(address(oracle));
    }

    /// @notice Update (or disable, with address(0)) the compliance policy.
    function setCompliancePolicy(ICompliancePolicy policy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        compliancePolicy = policy;
        emit CompliancePolicyUpdated(address(policy));
    }

    /// @dev Enforce the compliance policy on peer-to-peer transfers only. Mints
    ///      (from == 0) and burns (to == 0) bypass the policy so the vault can always
    ///      issue and redeem. In the default MONITOR mode the policy never blocks.
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && address(compliancePolicy) != address(0)) {
            if (!compliancePolicy.isTransferAllowed(from, to)) {
                revert TransferNotAllowed(from, to);
            }
        }
        super._update(from, to, value);
    }
}
