// Minimal human-readable ABI fragments for the functions/events the services use.
// Kept hand-written (not imported from artifacts) so the services stay decoupled
// from the Hardhat build. Must stay in sync with contracts/contracts/*.sol.

export const reserveOracleAbi = [
  "function reserveSats() view returns (uint256)",
  "function attestationURI() view returns (string)",
  "function lastUpdated() view returns (uint64)",
  "function updateReserves(uint256 newReserveSats, string uri)",
  "event ReservesUpdated(uint256 reserveSats, string attestationURI, uint64 timestamp)",
];

export const cleanBtcAbi = [
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const attestationRegistryAbi = [
  "function getAttestation(address subject) view returns (tuple(uint8 score, bool sanctioned, bool revoked, address provider, uint64 issuedAt, uint64 expiresAt, string evidenceURI))",
  "function isClean(address subject, uint8 minScore) view returns (bool)",
  "function isSanctioned(address subject) view returns (bool)",
  "function hasLiveAttestation(address subject) view returns (bool)",
  "function attest(address subject, uint8 score, bool sanctioned, uint64 ttl, string evidenceURI)",
  "event AttestationIssued(address indexed subject, address indexed provider, uint8 score, bool sanctioned, uint64 expiresAt, string evidenceURI)",
];

export const reserveVaultAbi = [
  "function processDeposit(address to, uint256 amountSats, bytes32 btcTxid, string evidenceURI)",
  "function requestRedeem(uint256 amountSats, string btcPayoutAddress) returns (uint256)",
  "function settleRedeem(uint256 id, bytes32 btcTxid)",
  "function redemptionCount() view returns (uint256)",
  "function processedDeposits(bytes32) view returns (bool)",
  "function redemptions(uint256) view returns (address account, uint256 amountSats, string btcPayoutAddress, uint8 status, uint64 requestedAt, bytes32 btcTxid)",
  "event Minted(address indexed to, uint256 amountSats, bytes32 indexed btcTxid, string evidenceURI)",
  "event RedeemRequested(uint256 indexed id, address indexed account, uint256 amountSats, string btcPayoutAddress)",
];
