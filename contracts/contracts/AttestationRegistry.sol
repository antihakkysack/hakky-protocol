// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAttestationRegistry} from "./interfaces/IHakky.sol";

/// @title AttestationRegistry
/// @author Hakky Protocol
/// @notice Transparent, additive registry of address "cleanliness" attestations.
///         Accredited attestors (analytics/compliance providers) publish signed,
///         time-boxed attestations about the provenance risk of an address.
/// @dev    Hakky screens *for* cleanliness and is fully transparent — every
///         attestation is publicly readable on-chain. It never obscures, mixes,
///         or anonymizes funds; it is the opposite of a mixer.
contract AttestationRegistry is AccessControl, IAttestationRegistry {
    /// @notice Role held by accredited attestors permitted to publish attestations.
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    /// @notice A cleanliness attestation for a single address.
    /// @param score        Cleanliness score 0-100 (100 = cleanest). Meaningless if revoked/expired.
    /// @param sanctioned   True if the subject is tied to a sanctioned entity.
    /// @param revoked      True if the attestor has revoked this attestation.
    /// @param provider     The attestor address that issued this attestation.
    /// @param issuedAt     Unix timestamp the attestation was issued.
    /// @param expiresAt    Unix timestamp the attestation expires (0 = never).
    /// @param evidenceURI  Pointer (IPFS/HTTPS) to the off-chain screening report.
    struct Attestation {
        uint8 score;
        bool sanctioned;
        bool revoked;
        address provider;
        uint64 issuedAt;
        uint64 expiresAt;
        string evidenceURI;
    }

    /// @notice Default attestation time-to-live if an attestor passes ttl = 0.
    uint64 public defaultTtl = 90 days;

    /// @notice Latest attestation per subject address.
    mapping(address => Attestation) private _attestations;

    event AttestationIssued(
        address indexed subject,
        address indexed provider,
        uint8 score,
        bool sanctioned,
        uint64 expiresAt,
        string evidenceURI
    );
    event AttestationRevoked(address indexed subject, address indexed provider);
    event DefaultTtlUpdated(uint64 newTtl);

    error ScoreOutOfRange();
    error NoAttestation();
    error NotIssuingProvider();

    /// @param admin Address granted DEFAULT_ADMIN_ROLE (should be a multisig/governance).
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Publish or overwrite the cleanliness attestation for `subject`.
    /// @param subject     Address being attested.
    /// @param score       Cleanliness score, 0-100.
    /// @param sanctioned  Whether the subject is sanctioned.
    /// @param ttl         Validity window in seconds. `0` uses `defaultTtl`;
    ///                    `type(uint64).max` is the sentinel for a non-expiring
    ///                    attestation (stored as `expiresAt == 0`).
    /// @param evidenceURI Pointer to the off-chain screening report.
    function attest(
        address subject,
        uint8 score,
        bool sanctioned,
        uint64 ttl,
        string calldata evidenceURI
    ) external onlyRole(ATTESTOR_ROLE) {
        if (score > 100) revert ScoreOutOfRange();
        uint64 nowTs = uint64(block.timestamp);

        // A ttl of type(uint64).max means "never expires" and is stored as 0,
        // making the documented `expiresAt == 0` sentinel reachable. Any other
        // value expires at now + window (window == 0 falls back to defaultTtl).
        uint64 expiresAt;
        if (ttl == type(uint64).max) {
            expiresAt = 0;
        } else {
            expiresAt = nowTs + (ttl == 0 ? defaultTtl : ttl);
        }

        _attestations[subject] = Attestation({
            score: score,
            sanctioned: sanctioned,
            revoked: false,
            provider: msg.sender,
            issuedAt: nowTs,
            expiresAt: expiresAt,
            evidenceURI: evidenceURI
        });

        emit AttestationIssued(subject, msg.sender, score, sanctioned, expiresAt, evidenceURI);
    }

    /// @notice Revoke the current attestation for `subject`. Only the issuing provider
    ///         (or an admin) may revoke.
    function revoke(address subject) external {
        Attestation storage a = _attestations[subject];
        if (a.provider == address(0)) revert NoAttestation();
        if (a.provider != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotIssuingProvider();
        }
        a.revoked = true;
        emit AttestationRevoked(subject, a.provider);
    }

    /// @notice Update the default attestation TTL used when an attestor passes ttl = 0.
    function setDefaultTtl(uint64 newTtl) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultTtl = newTtl;
        emit DefaultTtlUpdated(newTtl);
    }

    /// @notice Read the raw attestation for `subject`.
    function getAttestation(address subject) external view returns (Attestation memory) {
        return _attestations[subject];
    }

    /// @notice Whether `subject` has a live (non-revoked, non-expired) attestation.
    function hasLiveAttestation(address subject) public view returns (bool) {
        Attestation storage a = _attestations[subject];
        if (a.provider == address(0) || a.revoked) return false;
        if (a.expiresAt != 0 && block.timestamp > a.expiresAt) return false;
        return true;
    }

    /// @inheritdoc IAttestationRegistry
    /// @dev Sanctions are "sticky" and fail closed: once an address is flagged, it
    ///      keeps reading as sanctioned until an attestor explicitly revokes it or
    ///      publishes a newer non-sanctioned attestation. Unlike a cleanliness score,
    ///      a sanctions flag deliberately does NOT lapse on expiry — a sanctions
    ///      designation should never silently clear just because time passed.
    function isSanctioned(address subject) external view returns (bool) {
        Attestation storage a = _attestations[subject];
        return a.provider != address(0) && !a.revoked && a.sanctioned;
    }

    /// @inheritdoc IAttestationRegistry
    /// @dev Requires a live attestation, not sanctioned, with score >= minScore.
    function isClean(address subject, uint8 minScore) external view returns (bool) {
        if (!hasLiveAttestation(subject)) return false;
        Attestation storage a = _attestations[subject];
        return !a.sanctioned && a.score >= minScore;
    }
}
