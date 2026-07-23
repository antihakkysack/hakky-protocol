# HAKKY Clients, Proofs, and Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build independent HAKKY codecs, quotes, unsigned transaction clients,
canonical proof artifacts, lifecycle records, and a direct open-source trading
site that match the immutable program exactly.

**Architecture:** Node.js modules independently reproduce the Rust constants,
PDAs, state layout, and BigInt arithmetic. Closed proof schemas bind raw
finalized evidence into `program`, `market`, and `pool` artifacts, which alone
can promote the public v3 lifecycle. The static site bundles only the reviewed
client, requires an explicit wallet action, decodes its own transaction before
presentation, and never auto-connects or auto-sends.

**Tech Stack:** Node.js 22-compatible ESM, native `node:test`, AJV 8.20.0,
`@solana/web3.js` 1.98.4, `@solana/spl-token` 0.4.15, esbuild 0.28.1, static
HTML/CSS/JavaScript.

## Global Constraints

- Normative design:
  `docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md`.
- Rust vectors from
  `programs/hakky-market/test-vectors/curve-pool-v1.json` are inputs, not
  JavaScript implementation code.
- JavaScript quantities use `BigInt` internally and canonical unsigned decimal
  strings in JSON.
- Instruction tags/lengths are exactly `0/33`, `1/25`, and `2/25`.
- State length is exactly 384 bytes.
- Swap account count is exactly ten; no omission, append, reorder, alias, or
  privilege promotion is accepted.
- The CLI has no secret-key, signing, sending, retry, or wallet-connection
  option.
- The website connects to an injected wallet only after an explicit user
  click and decodes its exact generated transaction before requesting a
  signature.
- Public lifecycle is `prelaunch -> curve-live -> pool-live`, with independent
  proof availability `verified | unavailable`.
- No LaunchLab, Raydium, graduation, migration, LP, Burn & Earn, platform
  config, or external venue remains in an active module, test, schema, script,
  site surface, or operator document after replacement.
- Historical design/spec records under `docs/superpowers/` remain untouched.
- No upload, deployment, push, PR, merge, wallet action, transaction, spend,
  publication, or social mutation is authorized by this plan.

---

### Task 1: Implement independent constants, PDAs, codecs, and BigInt math

**Files:**
- Create: `src/hakky-market-constants.mjs`
- Create: `src/hakky-market-pdas.mjs`
- Create: `src/hakky-market-codec.mjs`
- Create: `src/hakky-market-math.mjs`
- Create: `test/hakky-market-constants.test.mjs`
- Create: `test/hakky-market-pdas.test.mjs`
- Create: `test/hakky-market-codec.test.mjs`
- Create: `test/hakky-market-math.test.mjs`

**Interfaces:**
- Consumes: approved spec and Rust vector JSON.
- Produces:
  `instanceCommitment`,
  `deriveHakkyMarketPdas`,
  exact instruction encoders/decoder, and five quote functions.

- [ ] **Step 1: Write failing tests**

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
  CURVE_MAX_BASE_UNITS,
  POOL_SEED_BASE_UNITS,
  TERMINAL_QUOTE_BASE_UNITS,
} from "../src/hakky-market-constants.mjs";
import {
  curveReserve,
  quotePoolBuyExactOut,
} from "../src/hakky-market-math.mjs";

test("curve endpoints and pool seed are exact", () => {
  assert.equal(curveReserve(0n), 0n);
  assert.equal(curveReserve(CURVE_MAX_BASE_UNITS), 24_000_000_000n);
  assert.equal(POOL_SEED_BASE_UNITS, 2_000_000_000_000n);
  assert.equal(TERMINAL_QUOTE_BASE_UNITS, 24_000_000_000n);
});

test("pool exact-out quote preserves product", () => {
  const quote = quotePoolBuyExactOut({
    baseReserve: 2_000_000_000_000n,
    quoteReserve: 24_000_000_000n,
    baseOut: 1_000_000n,
  });
  assert.ok(
    (2_000_000_000_000n - 1_000_000n)
      * (24_000_000_000n + quote.grossQuoteIn)
      >= 2_000_000_000_000n * 24_000_000_000n,
  );
});
```

Add exact failure tests for zero/negative/non-BigInt inputs, overflow above
`u64`, every instruction length/tag, noncanonical nonce bytes, and all six PDA
seed lists.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/hakky-market-constants.test.mjs test/hakky-market-pdas.test.mjs test/hakky-market-codec.test.mjs test/hakky-market-math.test.mjs
```

Expected: FAIL with missing-module errors.

- [ ] **Step 3: Implement exact constants and arithmetic**

```javascript
export const TOTAL_SUPPLY_BASE_UNITS = 10_000_000_000_000n;
export const CURVE_MAX_BASE_UNITS = 8_000_000_000_000n;
export const POOL_SEED_BASE_UNITS = 2_000_000_000_000n;
export const TERMINAL_QUOTE_BASE_UNITS = 24_000_000_000n;
export const POOL_FEE_DENOMINATOR = 1_000_000n;
export const POOL_EFFECTIVE_NUMERATOR = 997_500n;

export function curveReserve(sold) {
  assertU64(sold, "sold");
  if (sold > CURVE_MAX_BASE_UNITS) throw new RangeError("sold exceeds curve");
  return TERMINAL_QUOTE_BASE_UNITS * sold
    / (4n * CURVE_MAX_BASE_UNITS - 3n * sold);
}
```

The pool and curve functions mirror the spec independently and return deeply
frozen named records. The codec uses `DataView` little-endian reads/writes and
rejects any trailing byte.

- [ ] **Step 4: Differentially check every Rust vector**

Load `curve-pool-v1.json`, recompute every result, and assert its stored
SHA-256 before using the vectors.

- [ ] **Step 5: Run GREEN**

```powershell
rtk node --test test/hakky-market-constants.test.mjs test/hakky-market-pdas.test.mjs test/hakky-market-codec.test.mjs test/hakky-market-math.test.mjs
```

Expected: all focused tests and every Rust vector pass.

- [ ] **Step 6: Commit**

```powershell
rtk git add src/hakky-market-constants.mjs src/hakky-market-pdas.mjs src/hakky-market-codec.mjs src/hakky-market-math.mjs test/hakky-market-constants.test.mjs test/hakky-market-pdas.test.mjs test/hakky-market-codec.test.mjs test/hakky-market-math.test.mjs
rtk git commit -m "client: mirror immutable market math"
```

---

### Task 2: Decode raw state and finalized RPC evidence

**Files:**
- Create: `src/hakky-market-state.mjs`
- Create: `src/hakky-market-rpc.mjs`
- Create: `src/solana-wire.mjs`
- Create: `test/hakky-market-state.test.mjs`
- Create: `test/hakky-market-rpc.test.mjs`
- Create: `test/solana-wire.test.mjs`
- Modify: `src/solana-rpc.mjs`
- Delete after parity: `src/solana-transaction.mjs`
- Delete after parity: `test/solana-transaction.test.mjs`

**Interfaces:**
- Consumes: Task 1 constants/PDAs and existing generic RPC/wire functions.
- Produces:
  `decodeMarketStateV1`,
  `fetchFinalizedHakkyMarket`,
  generic base58/hash/finalized transaction/ALT resolution.

- [ ] **Step 1: Port generic wire tests before deleting the old module**

Copy only base58, SHA-256, signed legacy/v0 transaction, loaded-address order,
and privilege-preservation tests. Do not import a LaunchLab decoder in the new
test.

- [ ] **Step 2: Write failing state/RPC tests**

Test exact 384-byte decoding, magic, layout, phase, nonce commitment, bumps,
PDAs, stored identities, zero reserved bytes, curve reserve equations, pool
positive reserves, raw base64 hashes, finalized context slots, UTC block time,
public HTTPS RPC host, and bounded deadline behavior.

- [ ] **Step 3: Run RED**

```powershell
rtk node --test test/solana-wire.test.mjs test/hakky-market-state.test.mjs test/hakky-market-rpc.test.mjs
```

Expected: FAIL because the three new modules do not exist.

- [ ] **Step 4: Implement the state decoder**

```javascript
export function decodeMarketStateV1({
  accountBytes,
  programId,
  instanceNonce,
}) {
  if (!(accountBytes instanceof Uint8Array) || accountBytes.length !== 384) {
    throw new TypeError("MarketStateV1 must be exactly 384 bytes");
  }
  const decoded = decodeFixedOffsets(accountBytes);
  assertMarketStateV1({ decoded, programId, instanceNonce });
  return deepFreeze(decoded);
}
```

Use explicit offsets matching the reviewed Rust layout. Never deserialize a
number to JavaScript `Number` when its range can exceed `2^53-1`.

- [ ] **Step 5: Implement finalized raw RPC reads**

Retain `MAINNET_BETA_GENESIS_HASH`, `parsePublicRpcUrl`,
`createBoundedPublicRpcClient`, and `assertMainnetIdentity`. Add generic
`getAccountInfo`, `getTransaction`, signature-history pagination, and
`getBlockTime` calls with `encoding:"base64"` and
`commitment:"finalized"`. No authenticated query string or credential is
allowed.

- [ ] **Step 6: Run GREEN and remove the old generic wrapper**

```powershell
rtk node --test test/solana-wire.test.mjs test/hakky-market-state.test.mjs test/hakky-market-rpc.test.mjs
rtk rg -n "solana-transaction" src scripts test
```

Expected: focused tests pass and no active import remains before deleting the
old file/test.

- [ ] **Step 7: Commit**

```powershell
rtk git add src/hakky-market-state.mjs src/hakky-market-rpc.mjs src/solana-wire.mjs src/solana-rpc.mjs test/hakky-market-state.test.mjs test/hakky-market-rpc.test.mjs test/solana-wire.test.mjs
rtk git rm src/solana-transaction.mjs test/solana-transaction.test.mjs
rtk git commit -m "client: decode immutable market state"
```

---

### Task 3: Build exact swap instructions and mandatory transaction previews

**Files:**
- Create: `src/hakky-market-client.mjs`
- Create: `src/hakky-market-preview.mjs`
- Create: `test/hakky-market-client.test.mjs`
- Create: `test/hakky-market-preview.test.mjs`

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces:
  `buildBuyExactHakkyInstruction`,
  `buildSellExactHakkyInstruction`,
  `buildBuyTransaction`,
  `buildSellTransaction`,
  `decodeHakkyTradeTransaction`.

- [ ] **Step 1: Write failing builder and preview tests**

Use canonical fixed public keys and assert exact ten-account order, signer and
writable bits, tag/data bytes, latest blockhash/fee payer preservation, phase,
direction, amount, quote limit, fee disclosure, and deadline. Mutate every
account position, append an account, alias two positions, escalate every
readonly/nonsigner meta, change the HAKKY program, and add a second HAKKY
instruction; each mutation must fail before wallet presentation.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/hakky-market-client.test.mjs test/hakky-market-preview.test.mjs
```

Expected: FAIL with missing-module errors.

- [ ] **Step 3: Implement exact instruction builders**

```javascript
export function buildBuyExactHakkyInstruction({
  programId,
  trader,
  market,
  mint,
  baseVault,
  quoteVault,
  vaultAuthority,
  traderBaseAccount,
  traderQuoteAccount,
  baseAmount,
  maxQuoteIn,
  deadlineSlot,
}) {
  return new TransactionInstruction({
    programId,
    keys: exactSwapKeys({
      trader,
      market,
      mint,
      baseVault,
      quoteVault,
      vaultAuthority,
      traderBaseAccount,
      traderQuoteAccount,
    }),
    data: encodeBuyExactHakkyV1({ baseAmount, maxQuoteIn, deadlineSlot }),
  });
}
```

WSOL wrapping/account creation may be added as outer transaction instructions,
but they are decoded separately and can never change the ten-account HAKKY
instruction.

- [ ] **Step 4: Implement fail-closed preview decoding**

Return only:

```javascript
{
  programId,
  direction,
  baseAmount,
  quoteLimit,
  phase,
  feeRateMillionths,
  feeRounding: "up-to-one-input-base-unit",
  deadlineSlot,
  accountChecks,
  creatorOrProtocolFeeDestination: null,
}
```

The decoder compares the resolved transaction bytes to the exact expected
program, state, mint, vault, trader, account order, privileges, and data.

- [ ] **Step 5: Run GREEN**

```powershell
rtk node --test test/hakky-market-client.test.mjs test/hakky-market-preview.test.mjs
```

Expected: canonical builds pass and every mutation fails.

- [ ] **Step 6: Commit**

```powershell
rtk git add src/hakky-market-client.mjs src/hakky-market-preview.mjs test/hakky-market-client.test.mjs test/hakky-market-preview.test.mjs
rtk git commit -m "client: build and decode exact swaps"
```

---

### Task 4: Add the public no-secret CLI

**Files:**
- Create: `scripts/hakky-client.mjs`
- Create: `test/hakky-client.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: `quote`, `buy`, `sell`, and `decode` canonical JSON commands.

- [ ] **Step 1: Write failing CLI tests**

Invoke `main(args, dependencies)` with injected finalized RPC. Assert exact
option cardinality, canonical unsigned decimals, deterministic unsigned
transaction bytes, decoded preview equality, stderr sanitization, and rejection
of `--keypair`, `--secret`, `--sign`, `--send`, `--retry`, or unknown options.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/hakky-client.test.mjs
```

Expected: FAIL because the CLI does not exist.

- [ ] **Step 3: Implement the CLI**

```json
{
  "scripts": {
    "client": "node scripts/hakky-client.mjs"
  }
}
```

`quote` prints finalized state and an exact quote. `buy` and `sell` print an
unsigned transaction plus its decoded preview. `decode` accepts canonical
base64 and prints the same preview. The CLI never reads a secret or submits a
transaction.

- [ ] **Step 4: Run GREEN**

```powershell
rtk node --test test/hakky-client.test.mjs
rtk npm run client -- --help
```

Expected: tests pass; help lists only `quote`, `buy`, `sell`, and `decode`.

- [ ] **Step 5: Commit**

```powershell
rtk git add package.json package-lock.json scripts/hakky-client.mjs test/hakky-client.test.mjs
rtk git commit -m "client: add unsigned public market CLI"
```

---

### Task 5: Add closed proof schemas and the generated v3 browser validator

**Files:**
- Create: `schemas/proof/immutable-program-v1.schema.json`
- Create: `schemas/proof/hakky-market-v1.schema.json`
- Create: `schemas/proof/hakky-pool-v1.schema.json`
- Create: `schemas/web/launch-v3.schema.json`
- Create: `test-support/immutable-curve-pool-fixtures.mjs`
- Create: `test/immutable-curve-pool-schemas.test.mjs`
- Modify: `src/schema-validation.mjs`
- Modify: `scripts/render-launch-schema-validator.mjs`
- Replace: `web/lib/launch-schema.generated.js`

**Interfaces:**
- Consumes: approved artifact definitions.
- Produces validators for schema kinds `immutable-program-v1`,
  `hakky-market-v1`, `hakky-pool-v1`, and `launch-v3`.

- [ ] **Step 1: Write failing schema tests**

Create one exact valid fixture for program, market, pool, and all five public
branches:

```text
prelaunch
curve-live verified
curve-live unavailable
pool-live verified
pool-live unavailable
```

For every root/nested object, add unknown-property, omission, bad canonical
decimal, invalid base58, wrong length/hash/time, chronology, identity mismatch,
reserve mismatch, stage regression, and wrong artifact-path mutations.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/immutable-curve-pool-schemas.test.mjs
```

Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement closed schemas**

Every object uses `"additionalProperties": false`. Canonical artifact paths are
exactly:

```text
proof/mainnet-program.json
proof/mainnet-market.json
proof/mainnet-pool.json
```

Verified curve binds program+market; verified pool binds all three and exact
prior artifact SHA-256. Unavailable records contain no mint, program, market,
vault, transaction, proof, or trade destination.

- [ ] **Step 4: Replace semantic validation and regenerate**

Semantic validation enforces exact economics, chronology, phase/reserve
relations, nonce/PDA identities, artifact hashes, and monotonic lifecycle. The
browser generator reads only `launch-v3.schema.json`.

- [ ] **Step 5: Run GREEN**

```powershell
rtk npm run schemas
rtk node --test test/immutable-curve-pool-schemas.test.mjs
rtk node scripts/render-launch-schema-validator.mjs --check
```

Expected: every valid branch passes, every mutation fails, and generated bytes
are deterministic.

- [ ] **Step 6: Commit**

```powershell
rtk git add schemas src/schema-validation.mjs scripts/render-launch-schema-validator.mjs web/lib/launch-schema.generated.js test-support/immutable-curve-pool-fixtures.mjs test/immutable-curve-pool-schemas.test.mjs
rtk git commit -m "proof: define immutable lifecycle schemas"
```

---

### Task 6: Implement program, market, and pool proof evaluators

**Files:**
- Create: `src/immutable-program-proof.mjs`
- Create: `src/hakky-market-proof.mjs`
- Create: `src/hakky-pool-proof.mjs`
- Create: `scripts/verify-immutable-program.mjs`
- Create: `scripts/verify-hakky-market.mjs`
- Create: `scripts/verify-hakky-pool.mjs`
- Create: `test/immutable-program-proof.test.mjs`
- Create: `test/hakky-market-proof.test.mjs`
- Create: `test/hakky-pool-proof.test.mjs`
- Create: `test/verify-immutable-program.test.mjs`
- Create: `test/verify-hakky-market.test.mjs`
- Create: `test/verify-hakky-pool.test.mjs`
- Modify: `src/proof-output.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1-5 plus raw build/RPC/cost evidence.
- Produces three `ok:true` canonical proof artifacts only after all checks pass.

- [ ] **Step 1: Write failing evaluator mutation matrices**

Program mutations cover byte hash/length, build records, source commit,
Program/ProgramData owner/address/authority, tag/CPI surface, binary ceiling,
and cost cap. Market mutations cover initialization bytes/CPI decode,
nonce/commitment/PDAs, mint supply/authorities, vaults, metadata,
state/reserves, disclosed creator balances, and cost continuity. Pool mutations
cover terminal history, one-way phase, exact seed reserves, sealed surplus,
fee constants, product, and every forbidden LP/recipient/authority field.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/immutable-program-proof.test.mjs test/hakky-market-proof.test.mjs test/hakky-pool-proof.test.mjs
```

Expected: FAIL because evaluators do not exist.

- [ ] **Step 3: Implement pure evaluators before RPC wrappers**

Each evaluator returns a deeply frozen record containing named checks and
`ok:true` only when every required check is exactly true. It rejects operator
fact overrides and unknown input fields.

- [ ] **Step 4: Add canonical no-clobber CLI wrappers**

```json
{
  "scripts": {
    "verify:program": "node scripts/verify-immutable-program.mjs",
    "verify:market": "node scripts/verify-hakky-market.mjs",
    "verify:pool": "node scripts/verify-hakky-pool.mjs"
  }
}
```

Failed verification prints sanitized diagnostic JSON and never occupies a
canonical proof path.

- [ ] **Step 5: Run GREEN**

```powershell
rtk node --test test/immutable-program-proof.test.mjs test/hakky-market-proof.test.mjs test/hakky-pool-proof.test.mjs test/verify-immutable-program.test.mjs test/verify-hakky-market.test.mjs test/verify-hakky-pool.test.mjs test/proof-output.test.mjs
```

Expected: evaluators and wrappers pass; no failed fixture publishes.

- [ ] **Step 6: Commit**

```powershell
rtk git add package.json package-lock.json src/immutable-program-proof.mjs src/hakky-market-proof.mjs src/hakky-pool-proof.mjs src/proof-output.mjs scripts/verify-immutable-program.mjs scripts/verify-hakky-market.mjs scripts/verify-hakky-pool.mjs test
rtk git commit -m "proof: verify immutable program and market"
```

---

### Task 7: Migrate canonical lifecycle and remove active LaunchLab code

**Files:**
- Replace: `src/canonical-proof.mjs`
- Replace: `scripts/build-curve-live-record.mjs`
- Create: `scripts/build-pool-live-record.mjs`
- Replace: `scripts/build-unavailable-record.mjs`
- Replace: `web/lib/launch-policy.js`
- Replace: `web/lib/launch-view.js`
- Replace: `web/data/launch.json`
- Replace: `test/canonical-proof.test.mjs`
- Replace: `test/build-curve-live-record.test.mjs`
- Create: `test/build-pool-live-record.test.mjs`
- Replace: `test/build-unavailable-record.test.mjs`
- Replace: `test/launch-policy.test.mjs`
- Replace: `test/launch-view.test.mjs`
- Modify: `package.json`
- Delete: active LaunchLab/Raydium modules, scripts, schemas, fixtures, tests.

**Interfaces:**
- Consumes: Tasks 5-6.
- Produces v3 record builders and pure launch views only.

- [ ] **Step 1: Write failing lifecycle tests**

Assert:

```text
prelaunch -> curve-live -> pool-live
curve-live unavailable -> curve-live verified
pool-live unavailable -> pool-live verified
```

Reject regression, stage skip, wrong artifact hash, manual proof fields,
identity leakage in unavailable records, and every old `graduated` value.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/canonical-proof.test.mjs test/build-curve-live-record.test.mjs test/build-pool-live-record.test.mjs test/build-unavailable-record.test.mjs test/launch-policy.test.mjs test/launch-view.test.mjs
```

Expected: FAIL because v3 builders/views do not exist.

- [ ] **Step 3: Implement exact record builders and prelaunch record**

`web/data/launch.json` begins as schema v3 `prelaunch` with no program, mint,
market, vault, transaction, proof, or trade destination.

Add the exact pool record command and retain the rewritten curve/unavailable
commands:

```json
{
  "scripts": {
    "build:curve-live-record": "node scripts/build-curve-live-record.mjs",
    "build:pool-live-record": "node scripts/build-pool-live-record.mjs",
    "build:unavailable-record": "node scripts/build-unavailable-record.mjs"
  }
}
```

- [ ] **Step 4: Remove obsolete active files**

Delete the LaunchLab/Raydium/graduation modules, scripts, schemas, fixtures, and
tests enumerated in the suite review. Keep only historical
`docs/superpowers/specs/2026-07-23-*` records.

- [ ] **Step 5: Run GREEN and stale-surface scan**

```powershell
rtk node --test test/canonical-proof.test.mjs test/build-curve-live-record.test.mjs test/build-pool-live-record.test.mjs test/build-unavailable-record.test.mjs test/launch-policy.test.mjs test/launch-view.test.mjs
rtk rg -n -i "LaunchLab|Raydium|graduated|Burn & Earn|PlatformConfig" src scripts schemas web test test-support README.md docs/LAUNCH.md docs/TOKEN.md proof/README.md
```

Expected: focused tests pass; the scan has no active match. Matches in
historical `docs/superpowers/` were intentionally excluded.

- [ ] **Step 6: Commit**

```powershell
rtk git add -A
rtk git commit -m "proof: replace LaunchLab lifecycle"
```

---

### Task 8: Add the explicit-action direct trading website

**Files:**
- Create: `web/lib/trading-controller.js`
- Create: `web/market-entry.mjs`
- Create: `scripts/render-web-market-client.mjs`
- Create: `test/trading-controller.test.mjs`
- Create: `test/trading-ui-contract.test.mjs`
- Replace: `web/app.js`
- Replace: `web/index.html`
- Modify: `web/styles.css`
- Modify: `scripts/check-site.mjs`
- Modify: `test/site.test.mjs`
- Modify: `test/site-layout.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1-4 and v3 launch view.
- Produces a bundled client and explicit
  `connect -> quote -> preview -> request signature -> optional send` UI.

- [ ] **Step 1: Write failing controller/UI contract tests**

Test no automatic wallet access during module load/render/quote, explicit
connect click, finalized state quote, slippage/deadline conversion, decoded
preview equality before `signTransaction`, rejection before sign on any drift,
no automatic retry, fail-closed clearing, and visible exact program/direction/
amount/limit/phase/fee/rounding/expiry/no-fee-recipient fields.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/trading-controller.test.mjs test/trading-ui-contract.test.mjs test/site.test.mjs test/site-layout.test.mjs
```

Expected: FAIL because the controller and form do not exist.

- [ ] **Step 3: Add the deterministic browser bundle**

Pin `esbuild` 0.28.1. `render-web-market-client.mjs` bundles only reviewed
market modules and pinned Solana packages into
`web/lib/hakky-market.generated.js`, writes a banner containing dependency
versions and source hash, and supports `--check`.

```json
{
  "scripts": {
    "client:web": "node scripts/render-web-market-client.mjs"
  },
  "devDependencies": {
    "esbuild": "0.28.1"
  }
}
```

- [ ] **Step 4: Implement explicit wallet control**

`requestUserTrade` may call the injected wallet only after the user presses the
reviewed button. It first builds and decodes the exact transaction, renders the
preview, then requires a second explicit confirmation to request a signature.
Sending is a third explicit action and never retries an unknown result.

- [ ] **Step 5: Run GREEN**

```powershell
rtk npm run client:web
rtk npm run client:web -- --check
rtk node --test test/trading-controller.test.mjs test/trading-ui-contract.test.mjs test/site.test.mjs test/site-layout.test.mjs
rtk npm run check:site
```

Expected: bundle is deterministic, tests pass, site check is green, and no
static trading destination exists in prelaunch.

- [ ] **Step 6: Commit**

```powershell
rtk git add package.json package-lock.json scripts/render-web-market-client.mjs scripts/check-site.mjs web test
rtk git commit -m "web: add decoded direct market client"
```

---

### Task 9: Generate and verify exact HTTPS metadata JSON

**Files:**
- Create: `web/metadata/hakky-v1.json`
- Create: `test/hakky-v1-metadata.test.mjs`
- Modify: `src/metadata-integrity.mjs`
- Modify: `scripts/prepare-metadata.mjs`
- Modify: `scripts/finalize-metadata-manifest.mjs`
- Modify: `scripts/verify-metadata-upload.mjs`
- Modify: `test/metadata-integrity.test.mjs`

**Interfaces:**
- Consumes: separately verified image CID.
- Produces exact served JSON bytes and SHA-256; does not upload JSON.

- [ ] **Step 1: Write failing byte-contract tests**

Assert UTF-8, no BOM, one line plus final LF, exact key order/content, only one
`ipfs://` image URI, exact HTTPS metadata URI, correct content type, and
byte-for-byte readback. Reject `external_url`, `twitter`, creators, attributes,
directories, alternate CIDs, missing newline, and any unknown key.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/hakky-v1-metadata.test.mjs test/metadata-integrity.test.mjs
```

Expected: FAIL because current metadata contains the obsolete contract.

- [ ] **Step 3: Implement the exact serializer**

```javascript
export function canonicalHakkyMetadata(imageCid) {
  assertCanonicalCid(imageCid);
  return `${JSON.stringify({
    name: "Hakky Protocol",
    symbol: "HAKKY",
    description:
      "HAKKY is a fixed-supply Solana token with an immutable permissionless curve-to-pool market and zero creator allocation at launch.",
    image: `ipfs://${imageCid}`,
  })}\n`;
}
```

The pre-upload checked-in file contains no fabricated CID and is
never treated as finalized metadata. The finalized file is generated only
from the separately verified image receipt and invalidates build approval on
change.

- [ ] **Step 4: Run GREEN**

```powershell
rtk node --test test/hakky-v1-metadata.test.mjs test/metadata-integrity.test.mjs
```

Expected: exact-byte and rejection tests pass.

- [ ] **Step 5: Commit**

```powershell
rtk git add web/metadata/hakky-v1.json test/hakky-v1-metadata.test.mjs src/metadata-integrity.mjs scripts/prepare-metadata.mjs scripts/finalize-metadata-manifest.mjs scripts/verify-metadata-upload.mjs test/metadata-integrity.test.mjs
rtk git commit -m "metadata: pin immutable market JSON"
```

---

### Task 10: Align public copy and run the complete client/proof/site gate

**Files:**
- Modify: `README.md`
- Modify: `docs/LAUNCH.md`
- Modify: `docs/TOKEN.md`
- Modify: `proof/README.md`
- Modify: `web/README.md`
- Modify: `launch/README.md`
- Modify: `launch/content-calendar.md`
- Modify: `launch/prelaunch-post.md`
- Modify: `src/social-copy.mjs`
- Modify: `scripts/check-repo.mjs`
- Modify: `test/social-copy.test.mjs`
- Modify: `test/repository-hygiene.test.mjs`

**Interfaces:**
- Consumes: Tasks 1-9.
- Produces active public/operator copy matching the exact immutable lifecycle.

- [ ] **Step 1: Write failing copy/hygiene tests**

Require fixed 10M supply, 8M curve, 2M/24 SOL initial pool, zero creator
allocation, 0% curve fee, exact 0.25% pool-retained rate plus rounding,
no LP/admin/withdrawal right, direct website/CLI access, no aggregator promise,
and explicit risk/no-audit-until-complete language. Reject active LaunchLab,
Raydium, graduation, migration, platform-admin, LP burn/lock, price, return, or
safety promises.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/social-copy.test.mjs test/repository-hygiene.test.mjs
```

Expected: FAIL on obsolete active copy.

- [ ] **Step 3: Rewrite only active material**

Keep historical design/plan records intact. Update user/operator docs with
direct quote/build/preview commands, proof paths, lifecycle, immutable-risk
boundary, and no-mainnet action-time gates.

- [ ] **Step 4: Run GREEN and complete gate**

```powershell
rtk npm run schemas
rtk npm run client:web
rtk npm run assets
rtk npm run check
rtk git diff --check
rtk git status --short
```

Expected: all Node tests, repository/site checks, generated schema/client, and
assets pass deterministically; only intended files are changed.

- [ ] **Step 5: Commit**

```powershell
rtk git add README.md docs proof web launch src/social-copy.mjs scripts/check-repo.mjs test/social-copy.test.mjs test/repository-hygiene.test.mjs
rtk git commit -m "docs: align immutable market launch"
```

## Client/Proof/Site Completion Gate

```powershell
rtk npm ci
rtk npm run schemas
rtk npm run client:web
rtk npm run assets
rtk npm run check
rtk git diff --exit-code -- web/lib/launch-schema.generated.js web/lib/hakky-market.generated.js
rtk git diff --check
rtk git status --short
```

Expected: independent math/codecs match Rust vectors; the CLI is unsigned and
secret-free; proof schemas/artifacts are closed; lifecycle is v3 only; active
LaunchLab/Raydium material is absent; website transactions are decoded before
wallet presentation; prelaunch exposes no live destination.
