# Internal Security Review — Pre-Audit

Scope: `contracts/contracts/*.sol` and `services/src/**` at commit `590a318`
(PR #1, the one-BTC pilot branch).

This is an **internal** review. It does not satisfy launch blocker 1, which requires
independent smart-contract and service reviews. It is intended to remove the cheap
findings before external auditors are paid to look, and to record the one issue that
needs a product decision before any further engineering.

Status key: **FIXED** — resolved on this branch. **OPEN** — not addressed.
**DECISION** — needs a product/economic decision, not just a patch.

---

## F-01 · FIXED (option A chosen) · Redemption fees drive the protocol permanently insolvent

`services/src/shared/bitcoin.ts:275-297`, `contracts/contracts/ReserveVault.sol:173-181`,
`services/src/reserve-oracle/cron.ts:53-65`

**This breaks on the first real redemption payout. It is not an edge case.**

`verifyPayout` requires the recipient receive *exactly* `amountSats`, both as a wallet
`send` detail (`:280`) and as a decoded output (`:293`). The miner fee therefore comes out
of custody's change rather than out of the payout. Meanwhile `settleRedeem` lowers
`pendingRedemptionSats` by `amountSats` alone.

So for a payout of `A` with fee `f`:

- confirmed custody reserves fall by `A + f`
- liabilities (`totalSupply + pendingRedemptionSats`) fall by `A`

Reserves end up below liabilities by exactly `f`, permanently, and the shortfall is
invariant under new deposits.

Worked example. Custody funded with 1.00000000 BTC, one deposit processed, so
`R = S = 100,000,000`, `P = 0`. Alice redeems 0.5 BTC: `S = 50,000,000`,
`P = 50,000,000`. Operator pays exactly 50,000,000 sats with a 3,000-sat fee and change
back to custody. Custody now holds 49,997,000. The keeper publishes that figure truthfully
(`cron.ts:81`). After `settleRedeem`, `S + P = 50,000,000` against `R = 49,997,000`.

Consequences, all confirmed against the code:

1. **Minting stops forever.** `processDeposit` requires
   `newLiabilities <= reserves` (`ReserveVault.sol:126-129`). A new deposit of `X` raises
   both sides by `X`, so the 3,000-sat gap never closes. Every future deposit reverts with
   `ExceedsAvailableBacking`, for any amount.
2. **The runbook's first stop condition fires on every correct redemption.**
   `cron.ts:55` logs "publishing insolvency state" and `/proof-of-reserves` reports
   `solvent: false`. LIVE_PILOT.md:147 instructs the operator to pause. Normal operation
   trips the emergency procedure.
3. **A full redemption is unpayable at all.** If supply is 100,000,000 and custody holds
   exactly 100,000,000, a transaction with a 100,000,000-sat output funded by
   100,000,000 sats of input implies a zero fee and will not relay.

**A decision is required, because each option changes a public product claim:**

| Option | Mechanism | Cost |
|---|---|---|
| **A. Fee buffer (recommended)** | Custody holds an operator-funded buffer beyond user deposits. Exclude it from the published reserve figure, or compare liabilities against `reserves - buffer`. | Keeps the 1:1 redemption promise intact. Needs a funded buffer, a way to account for it, and runbook changes. |
| **B. Net-of-fee payouts** | User receives `amountSats - fee`; `verifyPayout` checks that instead. | Cheapest to build, but breaks "redeem 1:1 for BTC anytime" as stated on hakky.xyz and in the whitepaper. A marketing and possibly legal change, not just a code one. |
| **C. Solvency tolerance** | Allow liabilities to exceed reserves by a bounded cumulative fee allowance. | Weakens the core invariant the protocol exists to guarantee. Not recommended. |

**Resolved: option A.** Implemented without any contract change, which the original
analysis expected to be necessary.

Publishing the truthful confirmed custody balance already satisfies
`reserves >= liabilities` once custody carries a buffer above user deposits, because the
surplus is `buffer - cumulative fees`. The pilot ceiling is unaffected: it binds on
`totalSupply + pendingRedemptionSats`, never on the custody balance, so a buffer cannot
breach the one-BTC cap. The protocol reports as over-collateralised rather than
over-reported.

What landed:

- `BITCOIN_FEE_BUFFER_SATS` config, **required to be greater than zero in live mode**, so
  a live process cannot start without a funded buffer (`shared/config.ts`).
- `shared/reserve-buffer.ts`, which grades custody headroom `healthy` → `depleted` →
  `exhausted` → `insolvent`. Because fees drain operator headroom before they touch user
  backing, the keeper now escalates on the way down instead of only once solvency is
  already gone (`reserve-oracle/cron.ts`).
- Buffer state, headroom, and target recorded on every `reserves-updated` audit row.
- Runbook section covering buffer sizing, the top-up procedure, the state table, and the
  rule that a top-up is operator capital and must never be submitted to `/deposit`.

Residual operational risk: the buffer is finite and depletes with every payout. The
`depleted` and `exhausted` alerts are the control, so they need to reach a human —
see F-11, where alerting has no delivery path.

---

## F-02 · FIXED · Cancellation was blocked exactly when it was needed

`contracts/contracts/CleanBTC.sol`, `contracts/contracts/ReserveVault.sol:185-192`

`cancelRedeem` re-minted burned cBTC through `CleanBTC.mint`, which reverts when the
reserve publication exceeds `MAX_RESERVE_AGE_SECONDS` (12h) or when supply would exceed
published reserves. `requestRedeem` burns the user's cBTC immediately, so both gates
stranded funds that were already destroyed.

Both trigger states are precisely the ones in which a redemption most needs returning: a
stale, failed, or revoked reserve updater (the runbook's own stop conditions), or reserves
that have legitimately fallen below supply via F-01. If the updater key were revoked
during an incident, the redemption could never be returned at all.

Fixed by adding `CleanBTC.restore`, gated on `BURNER_ROLE` so only the vault can call it,
with no reserve gate. Cancellation is liability-neutral — pending falls by the same amount
supply rises, leaving `totalSupply + pendingRedemptionSats` unchanged — so no
reserve-based check describes it. Refusing to restore does not improve solvency by one
satoshi; it only destroys the user's claim. The pilot ceiling is retained and cannot bind
a genuine cancellation.

Regression tests: `contracts/test/hakky.test.js` — cancellation under a stale attestation
and under fallen reserves.

---

## F-03 · FIXED · Write API key written to logs in plaintext

`services/src/shared/logger.ts`

`pino` was constructed with no `redact` option while `pino-http` serializes `req.headers`
verbatim, so every request to `/deposit`, `/screen`, and `/redemptions/:id/settle` wrote
the `Authorization` bearer token to stdout — including failed authentication attempts.

`WRITE_API_KEY` is the single credential authorising minting, settlement, and attestation.
Anyone with log access (Docker daemon, log shipper, support bundle) held full mint and
settle authority, and the write endpoints are internet-facing via Caddy with no rate
limiting. Fixed by redacting the `authorization` and `cookie` headers.

---

## F-04 · OPEN · One Bitcoin payout can settle unlimited redemptions

`services/src/shared/bitcoin.ts:258-305`, `services/src/shared/db.ts:131-159`

`verifyPayout` proves only that *some* transaction paid an exact amount to an address.
Nothing binds a txid to a specific redemption id, `redemption_jobs` has no unique
constraint on `btc_txid`, and `settleRedeem` rejects only `bytes32(0)`.

Two redemptions of 5,000,000 sats to the same address (one user redeeming twice) can both
be settled against a single 5,000,000-sat payout. 10,000,000 sats of liability is
extinguished for 5,000,000 sats paid, and both emit `RedeemSettled`. This is a theft
primitive for a compromised write key and a live footgun for an honest operator retrying
against the wrong id.

Suggested fix: a unique constraint on `btc_txid` in `redemption_jobs`, plus rejecting a
txid already recorded against another redemption. Consider whether batched payouts should
ever be supported; if so, the amount check must become per-redemption-output.

---

## F-05 · OPEN · Reserves are published from an unverified chainstate

`services/src/shared/bitcoin.ts:177-182`, `services/src/reserve-oracle/cron.ts:35-41`

`assertNetwork` reads `getblockchaininfo` but keeps only `chain`, discarding `blocks`,
`headers`, `initialblockdownload`, and `verificationprogress` — and it runs once at
process start. Nothing re-checks that the node is synced.

If Bitcoin Core stalls (lost peers, restarted mid-`reindex`), `listunspent` keeps
returning UTXOs from the frozen chainstate. Custody's coin can be spent at height H+1
while the keeper continues publishing the pre-spend balance on-chain as proof of reserves,
with `solvent: true`. The same stale UTXO set makes `gettxout` report a spent deposit as
confirmed, so `/deposit` mints against BTC that is already gone.

Suggested fix: assert `initialblockdownload === false` and `blocks === headers` (or a
bounded lag) on every reserve tick and every deposit verification, not once at boot.

---

## F-06 · OPEN · All signing keys are injected into the internet-facing API container

`provision/docker-compose.yml:26,41,54,68`

All four services share `env_file: ../services/.env`, overriding only `SERVICE_ROLE` and
`DATABASE_URL`. LIVE_PILOT.md:103-104 promises "a different role-specific private key for
each write service. The API process does not receive a signer."

In practice the `api` container — the only one with a published host port and the public
HTTPS origin — holds every signer key in its environment. `chain.ts:17-22` merely declines
to *use* them. Any RCE or environment dump in the most exposed component yields
VERIFIER + SETTLER + RESERVE_UPDATER + ATTESTOR simultaneously: enough to publish a
fabricated reserve figure, mint to the cap against it, and settle every redemption without
paying. Runbook promise versus deployment reality.

Related: `assertSignerRoles` (`services/src/shared/chain.ts:99-116`) checks one wallet
against every requirement, so live mode currently *forces* `VERIFIER` and `SETTLER` onto a
single key, contradicting the same runbook line and `deploy.js`, which accepts them
separately.

---

## F-07 · OPEN · `OPERATING_MODE` fails open

`services/src/shared/config.ts:13,35,63,99`

`OPERATING_MODE` defaults to `demo` and the `superRefine` live checks return early unless
it is exactly `live`. Nothing ties `CHAIN_ID=1` or `BITCOIN_NETWORK=main` to live mode, so
a dropped environment line disables every fail-closed check while the rest of the config
stays on mainnet — skipping bytecode, chain-id, pilot-cap, and role verification.

Worse, `REDEMPTION_MODE` then defaults to `demo-auto`, and `processDemoRedemptions`
(`worker.ts:406-409`) settles every redemption on-chain against a synthetic txid with **no
BTC ever sent**. `DEPOSIT_VERIFICATION_MODE` defaults to `stub`, making `/deposit` mint a
caller-asserted amount with no Bitcoin check.

Suggested fix: derive live mode from mainnet indicators rather than trusting a single
variable — if `CHAIN_ID` is 1 or `BITCOIN_NETWORK` is `main`, require the live profile and
refuse to start otherwise. Demo settlement paths should be compile-time excluded from any
mainnet build.

---

## F-08 · OPEN · Redemptions have no user-side recovery

`contracts/contracts/ReserveVault.sol:143-170`

`requestRedeem` burns the user's cBTC in the same call, and the only exits are
`settleRedeem` and `cancelRedeem`, both `SETTLER_ROLE`-gated. A lost settler key, an
abandoned pilot, or a rotated signer that is not regranted the role leaves the user with
no cBTC, no BTC, and no callable function.

The `requestedAt` field is written (`:165`) and read nowhere in the repository — the
timeout it exists for was never implemented. For a bounded pilot with a known operator
this is a documented risk rather than a defect, but it should be an explicit, disclosed
decision rather than an accident.

---

## F-09 · OPEN · Indexer can silently skip a redemption

`services/src/orchestrator/worker.ts:305-354`

The cursor advances to `range.toBlock` on whatever `queryFilter` returned, with no
coverage check and no reorg rollback. A load-balanced RPC backend lagging the head returns
`[]` rather than an error, so a redemption can be skipped permanently: the user's cBTC is
burned, `pendingRedemptionSats` stays elevated against the scarce 1-BTC cap, the redemption
never appears in `/redemptions/pending`, and no operator is alerted.

A cheap invariant is already available and unused: ids are strictly sequential and
`redemptionCount()` is in the ABI, so any gap between the highest indexed id and
`redemptionCount()` is directly detectable.

Related, `MEDIUM-HIGH`: the cursor key `orchestrator:redeem-requested` and
`redemption_jobs.id` are not namespaced by chain or vault address. Since launch blockers 1
and 8 make a vault redeploy near-certain while blocker 6 requires the database to survive,
a redeploy makes new-vault id `1` collide with the old vault's row; `upsertRedemptionJob`
throws, the cursor never advances, and the indexer is permanently dead.

---

## F-10 · OPEN · Sanctions attestations can be overwritten by any attestor

`contracts/contracts/AttestationRegistry.sol:93-101`

`attest` assigns `_attestations[subject]` unconditionally. `revoke` is correctly restricted
to the issuing provider or admin, but `attest` bypasses that: a second `ATTESTOR_ROLE`
holder can overwrite another attestor's sanctions flag with `sanctioned = false` and clear
the only on-chain control in the mint path. No consensus requirement, and no event
distinguishes an overwrite from a first attestation.

Note also that `isSanctioned` returns `false` for an address that has never been attested
(`provider == address(0)`), and there is no `isClean` check anywhere in the mint path. The
on-chain guarantee is "not explicitly flagged", not "screened" — weaker than
`CleanBTC.sol:11-12` and the site's "1 cBTC = 1 verifiably clean BTC" imply.

---

## F-11 · OPEN · Operational hardening

- **No rate limiting or lockout** on internet-facing `/deposit`, `/screen`, and
  `/redemptions/*` (`provision/Caddyfile:8-16`). One static bearer token covers minting,
  settlement, and attestation.
- **Unauthenticated `/health` amplifies into Bitcoin Core** (`api/server.ts:24-29`),
  issuing RPC calls per request against a node with a default `-rpcthreads=4`. A few
  thousand requests per second starves the reserve keeper and settlement verification.
- **`/activity` is unauthenticated with `Access-Control-Allow-Origin: *`**
  (`api/server.ts:151-163`) and publishes custody outpoints, payout addresses, and EVM
  recipients — letting anyone enumerate the custody wallet and link recipients to their
  funding Bitcoin transactions. For a provenance product this is a deanonymization surface
  against its own users.
- **Runbook stop conditions have no enforcement path.** Detected insolvency produces a log
  line and nothing else; `pause()` is not in `reserveVaultAbi` at all, so no service can
  trigger it (`shared/abis.ts:32-44`). Given F-01, this state is reached by normal
  operation.
- **Auth comparison short-circuits on length** before the constant-time compare
  (`shared/auth.ts:22`), leaking key length. Low impact; fix by comparing fixed-width
  digests.

---

## Checked and confirmed safe

Recorded so external auditors do not re-derive them:

- **Reentrancy across the vault/token/policy boundary.** The compliance policy is only
  consulted when both `from` and `to` are non-zero, so it is never invoked during a vault
  mint, burn, or restore. All vault entry points are `nonReentrant` with state written
  before the token call.
- **`getDepositId` replay key** uses `abi.encode` over two fixed-width types, so no
  collision is possible, and `processedDeposits` is set before the mint.
- **UTXO filtering** correctly excludes unsafe and non-custody outputs and is not a
  whole-wallet balance, matching LIVE_PILOT.md:58-59. `gettxout` correctly returns `null`
  for spent outputs and rejects coinbase.
- **`btcToSats`** avoids floating-point drift via exact decimal parsing.
- **All SQL is parameterized**; `upsertRedemptionJob`'s conditional `ON CONFLICT` is a
  correct immutability check that makes range re-scans idempotent, and the cursor is
  written after the batch so a mid-batch crash replays safely.
- **All three state-changing routes carry `requireWriteAuth`**, which fails closed with
  503 when the key is unset. No state-changing route is reachable unauthenticated.
- **Contract-level runbook claims that do hold:** unique-outpoint replay guard, 12-hour
  mint freshness, non-zero settlement reference, pause on deposits and redemption
  requests, settle and cancel available while paused, and the immutable one-BTC cap.

---

## Suggested order of work

1. **F-04, F-05, F-07** — settlement binding, chainstate verification, and fail-open
   config. All are "mint or settle against something that is not real".
2. **F-06** — split the environment files so the API container holds no signer.
3. **F-09** — indexer gap detection and cursor namespacing, before any redeploy.
4. **F-11** — give the buffer and stop-condition alerts a delivery path. F-01's control is
   an alert, so an alert nobody receives is not a control.
5. **F-08, F-10** — disclose or fix before external review, so auditor time goes to the
   hard parts.
6. **F-01, F-02, F-03** — fixed; carry the regression tests forward.

Then rehearse on signet or regtest (launch blocker 5). The rehearsal should now include a
full-supply redemption and a buffer drawdown to `exhausted`, since those were the states
F-01 made unreachable.
