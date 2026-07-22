// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IReserveOracle} from "./interfaces/IHakky.sol";

/// @title ReserveOracle
/// @author Hakky Protocol
/// @notice Publishes the attested BTC reserve balance that backs cBTC 1:1.
///         This is the on-chain anchor for Hakky's proof-of-reserves invariant:
///         `cBTC.totalSupply() <= reserveSats()` must hold at all times.
/// @dev    v1 is fed by a custodian-attestation multisig (RESERVE_UPDATER_ROLE).
///         The roadmap replaces this with threshold-signature / zk proof-of-reserves.
contract ReserveOracle is AccessControl, IReserveOracle {
    /// @notice Role permitted to update the published reserve figure.
    bytes32 public constant RESERVE_UPDATER_ROLE = keccak256("RESERVE_UPDATER_ROLE");

    /// @notice Total BTC held in reserve, in satoshis (1 BTC = 1e8 sats).
    uint256 private _reserveSats;

    /// @notice Pointer (IPFS/HTTPS) to the latest signed reserve attestation report.
    string public attestationURI;

    /// @notice Timestamp of the last reserve update.
    uint64 public lastUpdated;

    event ReservesUpdated(uint256 reserveSats, string attestationURI, uint64 timestamp);

    /// @param admin Address granted DEFAULT_ADMIN_ROLE (should be a multisig/governance).
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Publish an updated reserve figure and its attestation report.
    /// @param newReserveSats Total BTC in custody, in satoshis.
    /// @param uri            Pointer to the signed reserve report.
    function updateReserves(uint256 newReserveSats, string calldata uri)
        external
        onlyRole(RESERVE_UPDATER_ROLE)
    {
        _reserveSats = newReserveSats;
        attestationURI = uri;
        lastUpdated = uint64(block.timestamp);
        emit ReservesUpdated(newReserveSats, uri, uint64(block.timestamp));
    }

    /// @inheritdoc IReserveOracle
    function reserveSats() external view returns (uint256) {
        return _reserveSats;
    }
}
