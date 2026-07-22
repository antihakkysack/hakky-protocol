// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAttestationRegistry, ICompliancePolicy} from "./interfaces/IHakky.sol";

/// @title CompliancePolicy
/// @author Hakky Protocol
/// @notice Configurable transfer policy consulted by cBTC. Ships in MONITOR mode
///         by default, meaning cBTC behaves like a normal ERC-20 until governance
///         explicitly enables gating. This keeps the token permissionless-by-default
///         while giving regulated deployments an opt-in compliance surface.
contract CompliancePolicy is AccessControl, ICompliancePolicy {
    /// @notice Role permitted to change policy parameters.
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");

    /// @notice Transfer-gating modes.
    /// @dev MONITOR: never blocks (default). GATED: both parties must be attested-clean.
    ///      ALLOWLIST: both parties must be explicitly allowlisted.
    enum Mode {
        MONITOR,
        GATED,
        ALLOWLIST
    }

    /// @notice Active policy mode.
    Mode public mode = Mode.MONITOR;

    /// @notice Minimum cleanliness score required in GATED mode (0-100).
    uint8 public minScore = 50;

    /// @notice The attestation registry consulted in GATED mode.
    IAttestationRegistry public registry;

    /// @notice Explicit allowlist used in ALLOWLIST mode and as an always-pass override.
    mapping(address => bool) public allowlisted;

    event ModeUpdated(Mode mode);
    event MinScoreUpdated(uint8 minScore);
    event RegistryUpdated(address registry);
    event AllowlistUpdated(address indexed account, bool allowed);

    constructor(address admin, IAttestationRegistry registry_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        registry = registry_;
    }

    function setMode(Mode newMode) external onlyRole(POLICY_ADMIN_ROLE) {
        mode = newMode;
        emit ModeUpdated(newMode);
    }

    function setMinScore(uint8 newMinScore) external onlyRole(POLICY_ADMIN_ROLE) {
        require(newMinScore <= 100, "score>100");
        minScore = newMinScore;
        emit MinScoreUpdated(newMinScore);
    }

    function setRegistry(IAttestationRegistry newRegistry) external onlyRole(POLICY_ADMIN_ROLE) {
        registry = newRegistry;
        emit RegistryUpdated(address(newRegistry));
    }

    function setAllowlisted(address account, bool allowed) external onlyRole(POLICY_ADMIN_ROLE) {
        allowlisted[account] = allowed;
        emit AllowlistUpdated(account, allowed);
    }

    /// @inheritdoc ICompliancePolicy
    function isTransferAllowed(address from, address to) external view returns (bool) {
        if (mode == Mode.MONITOR) {
            return true;
        }

        // Allowlisted parties always pass.
        bool fromOk = allowlisted[from];
        bool toOk = allowlisted[to];

        if (mode == Mode.ALLOWLIST) {
            return fromOk && toOk;
        }

        // Mode.GATED: allowlisted OR attested-clean, and never sanctioned.
        if (address(registry) == address(0)) return true;
        if (!fromOk) fromOk = registry.isClean(from, minScore);
        if (!toOk) toOk = registry.isClean(to, minScore);
        return fromOk && toOk;
    }
}
