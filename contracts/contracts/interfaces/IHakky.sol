// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Hakky Protocol shared interfaces
/// @notice Minimal interfaces used to decouple the Hakky contracts from one another.

/// @notice Publishes the attested BTC reserve balance backing cBTC (proof of reserves).
interface IReserveOracle {
    /// @return The total BTC held in reserve, denominated in satoshis (1 BTC = 1e8 sats).
    function reserveSats() external view returns (uint256);
}

/// @notice On-chain registry of address cleanliness attestations.
interface IAttestationRegistry {
    /// @notice Whether `subject` currently holds a valid, unexpired, non-sanctioned
    ///         attestation with a score of at least `minScore`.
    function isClean(address subject, uint8 minScore) external view returns (bool);

    /// @notice Whether `subject` is currently flagged as sanctioned by a live attestation.
    function isSanctioned(address subject) external view returns (bool);
}

/// @notice Transfer policy consulted by cBTC on every non-mint/non-burn transfer.
interface ICompliancePolicy {
    /// @notice Returns true if a transfer from `from` to `to` is permitted under the active policy.
    function isTransferAllowed(address from, address to) external view returns (bool);
}
