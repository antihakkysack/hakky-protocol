# Security Review — Scope and Request for Proposal

Draft. Fill in the bracketed fields, freeze a commit, then send to shortlisted firms.

---

## 1. Summary

Hakky Protocol issues **cBTC**, an ERC-20 token backed 1:1 by Bitcoin that has passed
provenance screening. It is a **custodial** issuance and redemption system, not a DeFi
protocol: Bitcoin is held in a qualified custody wallet, and off-chain services verify
deposits, publish proof-of-reserves on-chain, and drive redemption settlement.

We are preparing a deliberately bounded **one-BTC live pilot**. Maximum protocol liability
is capped in an immutable contract constant at 100,000,000 satoshis. We are seeking review
before any real Bitcoin enters custody.

**This engagement is not a conventional smart-contract audit, and scoping it as one would
miss most of our risk.** See §3.

---

## 2. Scope

Repository: `https://github.com/antihakkysack/hakky-protocol`
Commit under review: `[FREEZE A COMMIT HASH]`

### In scope — Solidity (421 nSLOC)

| File | nSLOC | Role |
| --- | --- | --- |
| `contracts/contracts/ReserveVault.sol` | 155 | Mint/redeem gateway, replay protection, settlement |
| `contracts/contracts/AttestationRegistry.sol` | 92 | Signed cleanliness and sanctions attestations |
| `contracts/contracts/CleanBTC.sol` | 77 | ERC-20, supply capped by reserves and pilot ceiling |
| `contracts/contracts/CompliancePolicy.sol` | 58 | Transfer gating (MONITOR / GATED / ALLOWLIST) |
| `contracts/contracts/ReserveOracle.sol` | 27 | Publishes attested reserve figure |
| `contracts/contracts/interfaces/IHakky.sol` | 12 | Interfaces |

### In scope — off-chain services (1,815 nSLOC, TypeScript)

| File | nSLOC | Role |
| --- | --- | --- |
| `services/src/orchestrator/worker.ts` | 440 | Deposit verification, redemption indexing, settlement |
| `services/src/shared/bitcoin.ts` | 270 | Bitcoin Core RPC, deposit and payout verification |
| `services/src/shared/db.ts` | 202 | Redemption jobs, cursors, audit trail |
| `services/src/shared/config.ts` | 189 | Fail-closed live-mode configuration |
| `services/src/api/server.ts` | 174 | Public HTTP API including write endpoints |
| `services/src/reserve-oracle/cron.ts` | 138 | Publishes reserves on-chain |
| `services/src/shared/chain.ts` | 95 | Contract and signer wiring, readiness assertions |
| `services/src/attestation/worker.ts` | 83 | Screening and attestation endpoint |
| Remainder (`auth`, `custody`, `screening`, `reserve-buffer`, `abis`, indexer) | 224 | Supporting |

### In scope — deployment and operations

- `contracts/scripts/deploy.js` — role grants, admin handoff, deployer renunciation
- `provision/` — Docker Compose topology, Caddy reverse proxy, secret distribution
- `docs/LIVE_PILOT.md` — the operator runbook. **We consider a gap between what the
  runbook promises an operator and what the code enforces to be a finding in itself.**
  Two such gaps have already been found this way.

### Out of scope

- `web/` static marketing site
- `launch/` marketing material
- Hardhat 2 development toolchain dependency vulnerabilities (known, tracked separately;
  production Solidity dependencies audit clean)
- The legacy Sepolia deployment in `contracts/deployments/sepolia.json`, which is marked
  legacy and will be redeployed

---

## 3. What we most want from this engagement

Our own internal review found 11 issues. **Eight were in the off-chain services or
deployment topology, and only three were in Solidity.** We would rather pay for depth on
the custody and services path than for a fifth opinion on an ERC-20.

Specific questions we want answered:

1. **Can the protocol be made to mint cBTC that is not backed by real, final, confirmed
   Bitcoin at the custody address?** Consider Bitcoin reorgs, stalled or unsynced Bitcoin
   Core nodes, mempool versus confirmed state, coinbase maturity, and UTXO filtering.
2. **Can a redemption be settled without a corresponding Bitcoin payout, or can one payout
   satisfy more than one redemption?**
3. **Can the published reserve figure ever exceed the Bitcoin actually held?**
4. **Can user funds be stranded?** `requestRedeem` burns cBTC immediately, so any state
   where a redemption can neither settle nor cancel destroys user value. We have fixed two
   such traps and want to know whether more remain.
5. **What is the blast radius of each compromised role** — `VERIFIER`, `SETTLER`, `PAUSER`,
   `RESERVE_UPDATER`, `ATTESTOR`, `DEFAULT_ADMIN`, and the write API key — and of the
   custody Bitcoin Core node itself?
6. **Is the fail-closed configuration actually fail-closed?** We want adversarial attention
   on whether a missing or malformed environment variable can silently enable a demo code
   path against mainnet.
7. **Does the deployment procedure reliably end with the intended roles and admin?**

We are equally interested in **incorrect operator procedures** as in code defects. The
custody model depends on humans following `LIVE_PILOT.md` correctly.

---

## 4. Trust model and assumptions

State these back to us if you disagree with any of them.

- Bitcoin custody is **fully custodial** in v1. Users trust the operator. We do not claim
  otherwise, and the whitepaper says so.
- Payout construction and signing happen **outside** this repository. The services never
  build, sign, or broadcast a Bitcoin transaction; they verify one after the fact.
- The reserve figure is published by a trusted role in v1. Threshold signatures and zk
  proof-of-reserves are on the roadmap, not in scope here.
- Provenance screening is currently a **manual evidence adapter**, not an automated
  chain-analysis integration. We are aware this is an operator control and want it
  assessed as such.
- Administration is intended to be a multisig, with separate operational signers held in a
  KMS or HSM. Confirming the code and deployment actually deliver that separation is in
  scope.

---

## 5. Known issues

`docs/SECURITY_REVIEW.md` documents our internal findings: those fixed, those still open
and ranked, and a "checked and confirmed safe" section recording patterns we investigated
and cleared.

**Please read it before starting.** We are publishing our own findings deliberately, so
your time goes to what we missed rather than to rediscovering what we already know. If you
disagree with anything in the "confirmed safe" section, that disagreement is itself a
valuable deliverable.

---

## 6. Deliverables

- Findings with severity, concrete exploit or failure scenario, and remediation guidance
- Explicit coverage statement: what you reviewed, and what you did not
- A fix-review pass after we remediate
- Final report we may publish

---

## 7. Logistics

- **Budget:** `[RANGE]`
- **Target start:** `[DATE]`
- **Constraint:** no real Bitcoin enters custody until this review is closed. There is no
  live deployment and no user funds at risk during the engagement.
- **Contact:** `[NAME, EMAIL]`
- **Test suites:** `contracts` 28 passing, `services` 28 passing, `tsc --noEmit` clean.
  Both suites run in CI on every PR.

Please tell us in your proposal **how much of your quoted effort will go to the
TypeScript services and deployment topology versus the Solidity**, since that split is our
main concern in selecting a firm.
