# Hakky Protocol — Canonical Specification

> This is the single source of truth for naming, mechanism, and parameters.
> Contracts, website, whitepaper, and launch copy must all match this document.

## 1. What it is

**Hakky Protocol** is a transaction-cleanliness layer for Bitcoin. It issues
**cBTC ("Clean BTC")** — a token that is **fully backed 1:1 by BTC held in
verifiable reserve** *and* whose backing BTC has passed provenance screening
(no ties to sanctioned entities, known hacks, or scam-tagged addresses).

The name comes from the community shorthand for tainted coins — "hakky sack"
(hacked / dirty coin that gets passed around). Hakky Protocol is the
**anti-hakky** layer: it lets honest users hold and move Bitcoin value with a
portable, on-chain proof that the coins behind it are clean.

**Tagline:** *Keep crypto clean.*
**One-liner:** *The proof-of-clean layer for Bitcoin — 1 cBTC = 1 verifiably clean BTC.*

## 2. Why it exists (real-world use case)

- Exchanges, OTC desks, and regulated institutions routinely **freeze
  deposits** that trace back to tainted sources. Users often don't know their
  coins are flagged until a withdrawal is blocked.
- "Clean" / "virgin" BTC already trades at a **premium** in OTC markets.
- Compliance screening today is **opaque, off-chain, and non-portable** — every
  venue re-screens from scratch and results can't travel with the asset.

Hakky turns cleanliness into a **portable, composable, on-chain asset + attestation**:
mint cBTC from screened BTC, move it anywhere in DeFi, redeem 1:1 for BTC, and
carry a verifiable attestation of provenance with it.

## 3. Core components

| Module | Contract | Responsibility |
|---|---|---|
| Clean BTC token | `CleanBTC` (cBTC) | ERC-20; pilot supply is capped at one BTC, minting requires fresh proven reserves, and transfers can be compliance-gated |
| Reserve oracle | `ReserveOracle` | Publishes attested BTC reserve balance (proof-of-reserves) |
| Mint/redeem vault | `ReserveVault` | Mints cBTC against verified BTC deposits; processes 1:1 redemptions |
| Attestation registry | `AttestationRegistry` | Accredited attestors publish signed cleanliness attestations per address |
| Compliance policy | `CompliancePolicy` | Configurable ruleset (min score, block sanctioned, allowlist mode) enforced on transfers |

## 4. Token: cBTC

- **Name / symbol:** Clean BTC / **cBTC**
- **Decimals:** 8 (matches BTC).
- **Peg:** 1 cBTC = 1 BTC, redeemable 1:1.
- **Pilot ceiling:** `totalSupply() + pendingRedemptionSats <= 100,000,000` satoshis. The ceiling is immutable and increasing it requires a new deployment and review.
- **Mint solvency check:** a mint is refused unless `totalSupply() + pendingRedemptionSats + amount <= ReserveOracle.reserveSats()`. A later custody loss can still make reported reserves lower than liabilities and must be surfaced as insolvency.
- **Freshness invariant:** minting stops when the latest reserve publication is missing or more than 12 hours old.
- **Mint:** only `ReserveVault` (MINTER_ROLE), after the off-chain verifier proves an exact confirmed Bitcoin custody outpoint (`txid:vout`). An outpoint can be processed once.
- **Burn/redeem:** holder burns cBTC → vault releases an equal amount of BTC to their BTC payout address.
- **Pending liability:** burning for redemption reduces supply but creates an equal `pendingRedemptionSats` liability until the BTC payout settles or the redemption is cancelled and cBTC is re-minted.
- **Emergency pause:** `PAUSER_ROLE` can stop new deposits and redemption requests. Existing redemptions remain settleable or cancellable.
- **Compliance hook (optional/config):** on transfer, `CompliancePolicy` may require sender+recipient to satisfy the active policy (never sanctioned; score ≥ threshold when gating is enabled). Default deployment ships **monitor-only** (no blocking) so cBTC behaves like a normal ERC-20 until governance explicitly enables gating.

## 5. Cleanliness attestations

- **Attestors** are accredited screening providers (e.g. analytics firms) granted `ATTESTOR_ROLE`.
- An attestation for an address records: `score` (0–100), `sanctioned` (bool), `provider`, `issuedAt`, `expiresAt`, `evidenceURI` (IPFS/HTTPS pointer to the screening report).
- Attestations **expire** and can be **revoked**.
- The registry is **additive and transparent** — anyone can read attestations; nothing is hidden. Hakky screens *for* cleanliness; it never obscures, mixes, or anonymizes funds. It is the opposite of a mixer.

## 6. Proof of reserves

- `ReserveOracle` stores `reserveSats` (total BTC in custody, in satoshis) and a `merkleRoot` / `attestationURI` pointing to the published reserve report and signed custody attestations.
- Updated by `RESERVE_UPDATER_ROLE` (a multisig fed by custodian attestations; roadmap: threshold-signature / zk proof of reserves).
- The public comparison `cBTC.totalSupply() + ReserveVault.pendingRedemptionSats() <= reserveSats` is verifiable by anyone at any block. It is a mint admission check and a live solvency signal, not a guarantee that custody reserves cannot later decline.
- The reserve updater publishes a heartbeat even when the confirmed custody balance is unchanged. Minting fails closed after 12 hours without a publication.

## 7. Trust model & honesty

- **v1 custody is federated/qualified-custodian** (like every 1:1 BTC-backed token today, e.g. wrapped BTC). This is stated plainly; it is not "trustless."
- Roadmap moves toward **decentralized custody (MPC/threshold), zk proof-of-reserves, and decentralized attestation**.
- Hakky is a **compliance & provenance tool**, not investment advice and not a way to evade lawful process. All copy carries clear risk + regulatory disclaimers.

## 8. Governance / roadmap token

- `$HAKKY` (governance/utility) is **roadmap**, not launched at v1. Governs policy parameters, attestor accreditation, fee switch, and the reserve-update multisig. No token sale is promised or implied in this repo.

## 9. Naming / handles

- GitHub: `github.com/antihakkysack/hakky-protocol`
- Site: `hakky.xyz` (live — GitHub Pages)
- X/Twitter: `@antihakkysack` (live)
- Tokens: `cBTC` (live concept), `$HAKKY` (roadmap governance)

## 10. Parameters (defaults)

| Param | Default | Notes |
|---|---|---|
| cBTC decimals | 8 | BTC-native |
| Pilot liability cap | 100,000,000 sats | Immutable; includes supply plus pending redemptions |
| Maximum reserve age for mint | 12 hours | Enforced on-chain |
| Bitcoin deposit confirmations | 6 | Minimum live configuration |
| EVM event confirmations | 12 | Minimum live redemption indexer configuration |
| Compliance mode | `MONITOR` | `MONITOR` \| `GATED` \| `ALLOWLIST` |
| Min score (when GATED) | 50 | 0–100 |
| Attestation TTL | 90 days | configurable |
| Redemption fee | 0 bps (v1) | fee switch via governance |
| Mint fee | 0 bps (v1) | fee switch via governance |
