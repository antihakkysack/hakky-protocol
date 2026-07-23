# HAKKY Release, Devnet, and No-Mainnet Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the immutable HAKKY candidate is reproducible, within the
one-SOL on-chain cap, rehearsed on devnet, metadata/browser verified, and ready
for an evidence-backed no-mainnet audit.

**Architecture:** Deterministic build receipts and a prefix-based cost ledger
feed the immutable-program proof. A bounded no-retry devnet ceremony deploys,
finalizes, initializes, and exercises the exact candidate using ignored
secrets. Metadata and browser gates are separate evidence workflows, while
independent audits and every mainnet action remain external hard stops.

**Tech Stack:** Docker, pinned
`solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68`,
Solana Verify 0.5.1, Node.js ESM, native `node:test`, AJV, Solana JSON-RPC,
Chrome control, GitHub Actions and Pages.

## Global Constraints

- Normative design:
  `docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md`.
- The build consumes a clean reviewed commit, exact `Cargo.lock`, exact
  release configuration, and the pinned container digest above.
- Two controller-operated clean builds must be byte-identical; a third
  independently operated build remains an external mainnet gate.
- Program binary length must be at most 120,000 bytes.
- ProgramData capacity equals exact binary length; no excess `max_len`.
- Every cost is represented in integer lamports and every reachable finalized
  canonical-funder prefix is at most 1,000,000,000 lamports.
- Rent and fee evidence is freshness-qualified; any drift invalidates prior
  cost approval.
- Devnet uses only free SOL and never falls back to payment, mainnet, or an
  unrelated funder.
- Devnet deployment, finalization, and initialization have no automatic retry.
  An unknown result is reconciled at finalized commitment before any decision.
- The image workflow uploads only `web/assets/token.png`, requires Pinata
  authentication, requires no wallet/payment, and verifies the exact returned
  bytes through two public gateways.
- Metadata JSON remains at the exact HTTPS URI and is not uploaded to Pinata
  under the current image-only approval.
- Browser QA is local until a separate publication approval.
- Independent security/economic reviews are not simulated by agents and remain
  hard mainnet gates.
- No push, PR, merge, website deployment, wallet signature, mainnet
  transaction, SOL spend, social action, or other external mutation is
  authorized by this plan.

---

### Task 1: Record two byte-identical clean SBF builds

**Files:**
- Create: `Containerfile.sbf`
- Create: `src/release-manifest.mjs`
- Create: `schemas/release/build-record-v1.schema.json`
- Create: `scripts/verify-sbf-reproduction.mjs`
- Create: `test/release-manifest.test.mjs`
- Create: `test/verify-sbf-reproduction.test.mjs`
- Modify: `scripts/build-hakky-sbf.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: completed program and exact release configuration.
- Produces two closed build records and one reproduction comparison receipt.

- [ ] **Step 1: Write failing manifest/reproduction tests**

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILD_IMAGE,
  evaluateBuildRecord,
  evaluateReproduction,
} from "../src/release-manifest.mjs";

test("pins exact verifiable image and binary ceiling", () => {
  assert.equal(
    BUILD_IMAGE,
    "solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68",
  );
  assert.equal(evaluateBuildRecord(validBuild({ byteLength: 120_000 })).ok, true);
  assert.equal(evaluateBuildRecord(validBuild({ byteLength: 120_001 })).ok, false);
});

test("requires independent clean directories and byte-identical output", () => {
  assert.equal(evaluateReproduction(leftBuild(), rightBuild()).ok, true);
  assert.equal(
    evaluateReproduction(leftBuild(), rightBuild({ executableSha256: "0".repeat(64) })).ok,
    false,
  );
});
```

Add mutations for dirty source, tag-only image, wrong digest, tool/version
drift, source/lock/config hash drift, reused directory, missing stdout/stderr
hash, missing UTC time, wrong executable name, and unknown field.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/release-manifest.test.mjs test/verify-sbf-reproduction.test.mjs
```

Expected: FAIL because release-manifest modules do not exist.

- [ ] **Step 3: Add the exact build image wrapper**

```dockerfile
FROM solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68
WORKDIR /workspace
```

The build script refuses a dirty tree, copies the tracked source into a fresh
ignored directory, mounts no wallet or user home, builds
`hakky_market.so`, and records:

```text
source commit/tree hash
Cargo.lock hash
release_config.rs hash
container repository/tag/digest
rustc/cargo/solana/cargo-build-sbf versions
command and environment allowlist
UTC start/end
stdout/stderr SHA-256
executable length/SHA-256
```

- [ ] **Step 4: Implement closed record and reproduction evaluation**

Reject unknown fields and any mismatch other than build-directory identity and
UTC time. The compared `.so` bytes must be equal, not only their reported
hashes.

```json
{
  "scripts": {
    "program:reproduce": "node scripts/verify-sbf-reproduction.mjs"
  }
}
```

- [ ] **Step 5: Run GREEN and two clean builds**

```powershell
rtk node --test test/release-manifest.test.mjs test/verify-sbf-reproduction.test.mjs
rtk npm run program:build -- --output artifacts/build/local-a
rtk npm run program:build -- --output artifacts/build/local-b
rtk npm run program:reproduce -- --left artifacts/build/local-a --right artifacts/build/local-b
```

Expected: tests pass; both executable byte streams and SHA-256 values match;
each length is at most 120,000; the reproduction receipt reports `ok:true`.

- [ ] **Step 6: Commit**

```powershell
rtk git add Containerfile.sbf src/release-manifest.mjs schemas/release/build-record-v1.schema.json scripts/build-hakky-sbf.mjs scripts/verify-sbf-reproduction.mjs test/release-manifest.test.mjs test/verify-sbf-reproduction.test.mjs package.json package-lock.json .gitignore
rtk git commit -m "release: prove reproducible SBF build"
```

---

### Task 2: Model every canonical-funder cost prefix

**Files:**
- Create: `src/cost-ledger.mjs`
- Create: `schemas/release/cost-ledger-v1.schema.json`
- Create: `scripts/build-cost-ledger.mjs`
- Create: `test/cost-ledger.test.mjs`
- Create: `test/build-cost-ledger.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: exact executable length, finalized rent responses, fee/compute
  limits, deployment write plan, and recovery graph.
- Produces a closed ledger whose maximum prefix is at most one SOL.

- [ ] **Step 1: Write failing exact-lamport tests**

```javascript
test("120KB permanent rent matches the reviewed snapshot formula", () => {
  const ledger = buildLedger(snapshot({
    executableBytes: 120_000,
    rent: {
      program36: "1141440",
      programData120045: "836404080",
      mint82: "1461600",
      state384: "3563520",
      token165: "2039280",
      metadata679: "5616720",
    },
  }));
  assert.equal(ledger.permanentRentLamports, "852265920");
});

test("one lamport over the cap fails every approval view", () => {
  assert.equal(evaluateCostLedger(ledgerWithMaxPrefix("1000000001")).ok, false);
});
```

Add tests for every deployment write count, signature/priority-fee maximum,
transaction-rent/buffer debit, finalization/init success and failure prefix,
abandoned program, later refund not netted before finality, duplicate retry,
metadata rent, and rent/fee freshness drift.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/cost-ledger.test.mjs test/build-cost-ledger.test.mjs
```

Expected: FAIL because cost-ledger modules do not exist.

- [ ] **Step 3: Implement prefix semantics**

```javascript
export const CREATOR_FUNDED_CAP_LAMPORTS = 1_000_000_000n;

export function addDebit(prefix, debitLamports, operation) {
  const debit = parseCanonicalLamports(debitLamports);
  const cumulative = prefix.cumulativeDebitLamports + debit;
  return Object.freeze({
    operation,
    debitLamports: debit,
    cumulativeDebitLamports: cumulative,
    withinCap: cumulative <= CREATOR_FUNDED_CAP_LAMPORTS,
  });
}
```

Represent the ceremony as an explicit acyclic operation/failure graph. Expand
all reachable paths, keep external public-buyer WSOL out of the creator ledger,
and reject a graph with a cycle or unclassified debit.

- [ ] **Step 4: Add finalized read-only rent/fee collection**

The CLI first asserts cluster genesis, then queries every exact account size and
fee input at finalized commitment. It writes ignored evidence and the evaluated
ledger; it has no transaction-building/signing/sending surface.

```json
{
  "scripts": {
    "cost:verify": "node scripts/build-cost-ledger.mjs"
  }
}
```

- [ ] **Step 5: Run GREEN**

```powershell
rtk node --test test/cost-ledger.test.mjs test/build-cost-ledger.test.mjs
rtk npm run cost:verify -- --build-record artifacts/build/local-a/build-record.json --network devnet
```

Expected: tests pass; the devnet diagnostic reports exact values and either
`ok:true` or a named cap/freshness failure without mutation.

- [ ] **Step 6: Commit**

```powershell
rtk git add src/cost-ledger.mjs schemas/release/cost-ledger-v1.schema.json scripts/build-cost-ledger.mjs test/cost-ledger.test.mjs test/build-cost-ledger.test.mjs package.json package-lock.json
rtk git commit -m "release: enforce one-SOL cost prefixes"
```

---

### Task 3: Add exact-built SBF lifecycle and CI gates

**Files:**
- Create: `programs/hakky-market/tests/exact_sbf_lifecycle.rs`
- Create: `scripts/fetch-pinned-metaplex-program.mjs`
- Create: `scripts/run-exact-sbf-lifecycle.mjs`
- Create: `test/fetch-pinned-metaplex-program.test.mjs`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed program/client/proof work and reproducible build.
- Produces exact `.so` ProgramTest lifecycle plus deterministic CI commands.

- [ ] **Step 1: Write failing pinned-binary collector tests**

The collector accepts only the fixed Metaplex program ID, finalized public
RPC, raw executable/ProgramData bytes, exact reviewed client-layout commit
`a7ee5e17ed60feaafeaa5582a4f46d9317c1b412`, and a separate exact deployed
program/source-correspondence receipt supplied by the release evidence
manifest. Reject redirect, nonfinal data, authority/source/hash drift, and any
secret/authenticated URL.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/fetch-pinned-metaplex-program.test.mjs
```

Expected: FAIL because the collector does not exist.

- [ ] **Step 3: Add exact SBF ProgramTest lifecycle**

Load `target/deploy/hakky_market.so` with `add_program(..., None)`, not a native
processor closure. Load the pinned Metaplex executable. Exercise hostile
prefunds of the exact metadata PDA, finalized-self initialization, curve
boundaries, terminal transition, pool trades, donations, rollback, aliases,
expiry, slippage, and concurrency. The test consumes the same Rust vectors as
host tests.

- [ ] **Step 4: Extend CI**

CI runs Node checks on Node 22, host Rust format/clippy/tests on Rust 1.95.0,
then the digest-pinned SBF build, exact-binary lifecycle, surface/size check,
and two-build reproduction. No secret, RPC credential, wallet, or public
transaction is required.

```json
{
  "scripts": {
    "program:test-sbf": "node scripts/run-exact-sbf-lifecycle.mjs"
  }
}
```

- [ ] **Step 5: Run GREEN locally**

```powershell
rtk node --test test/fetch-pinned-metaplex-program.test.mjs
rtk npm run program:build
rtk npm run program:test-sbf
rtk npm run program:inspect
rtk npm run program:reproduce
rtk npm run check
```

Expected: exact-built lifecycle and complete repository checks pass.

- [ ] **Step 6: Commit**

```powershell
rtk git add programs/hakky-market/tests/exact_sbf_lifecycle.rs scripts/fetch-pinned-metaplex-program.mjs test/fetch-pinned-metaplex-program.test.mjs .github/workflows/quality.yml .github/workflows/pages.yml package.json package-lock.json
rtk git commit -m "ci: gate exact immutable market binary"
```

---

### Task 4: Rehearse the complete immutable lifecycle on devnet

**Files:**
- Create: `scripts/rehearse-immutable-devnet.mjs`
- Create: `test/immutable-devnet-rehearsal.test.mjs`
- Modify: `package.json`
- Delete after parity: `scripts/rehearse-devnet.mjs`
- Delete after parity: `test/devnet-rehearsal.test.mjs`

**Interfaces:**
- Consumes: ignored devnet program/initializer/nonce secrets, exact `.so`,
  cost ledger, fixed proof schemas, and free devnet SOL.
- Produces ignored public devnet receipts and proofs; never a mainnet artifact.

- [ ] **Step 1: Write failing ceremony state-machine tests**

Model exact states:

```text
prepared
deployed-pending
deployed-finalized
finalized-pending
immutable-finalized
initialized-pending
curve-live-finalized
pool-live-finalized
```

Test exact genesis, public RPC, no secret output, sufficient balance, exact
binary/max_len, finalized byte readback, one-shot authority removal, nonce
commitment, initialization, representative curve/pool trades, complete 24-SOL
terminal route, proof generation, failure/unknown reconciliation, and zero
automatic retry/fallback.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/immutable-devnet-rehearsal.test.mjs
```

Expected: FAIL because the new rehearsal module does not exist.

- [ ] **Step 3: Implement the bounded no-retry ceremony**

The command reads ignored key files without printing them, validates their
public identities against `release_config.rs`, checks free devnet balance,
builds exact deployment/finalization/initialization envelopes, and stops before
each mutation unless the invocation contains the reviewed devnet-only
operation flag. A submitted signature is recorded before polling; unknown
results are finalized-readback states, never implicit retries.

```json
{
  "scripts": {
    "rehearsal:immutable-devnet": "node scripts/rehearse-immutable-devnet.mjs"
  }
}
```

- [ ] **Step 4: Run offline GREEN**

```powershell
rtk node --test test/immutable-devnet-rehearsal.test.mjs
```

Expected: all mocked operation/failure/finality branches pass with no network.

- [ ] **Step 5: Run the live free-devnet ceremony only when funding is sufficient**

```powershell
rtk npm run rehearsal:immutable-devnet -- --mode inspect
rtk npm run rehearsal:immutable-devnet -- --mode execute-approved-devnet
```

Expected: inspect reports devnet genesis, exact public identities, required
lamports, and current free balance. Execute reaches pool-live and emits public
devnet proof only when more than 24 devnet SOL plus rent/fee headroom is
available. If free funding is insufficient, record
`free-devnet-funding-insufficient` and stop without payment or mainnet use.

- [ ] **Step 6: Commit code, never ceremony artifacts**

```powershell
rtk git add package.json package-lock.json scripts/rehearse-immutable-devnet.mjs test/immutable-devnet-rehearsal.test.mjs
rtk git rm scripts/rehearse-devnet.mjs test/devnet-rehearsal.test.mjs
rtk git commit -m "devnet: rehearse immutable market lifecycle"
```

---

### Task 5: Verify the separately approved image-only Pinata upload

**Files:**
- Create: `src/image-ipfs-proof.mjs`
- Create: `scripts/verify-image-ipfs.mjs`
- Create: `schemas/release/image-ipfs-v1.schema.json`
- Create: `test/image-ipfs-proof.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: a browser-observed Pinata CID after the exact approved upload.
- Produces an ignored closed receipt binding two gateway responses to
  SHA-256 `9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0`.

- [ ] **Step 1: Write failing gateway/readback tests**

Test canonical CID, exactly two distinct HTTPS gateway hosts, bounded body,
manual redirects, image/png type, exact size/hash, UTC times, no wallet/payment
fields, and rejection of directory/JSON/additional-file evidence.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/image-ipfs-proof.test.mjs
```

Expected: FAIL because image-IPFS proof modules do not exist.

- [ ] **Step 3: Implement read-only two-gateway verification**

The CLI accepts one canonical CID, fetches exact bytes from two fixed public
gateway origins with one total deadline, and writes the receipt only after
both match the approved local file byte-for-byte.

```json
{
  "scripts": {
    "metadata:image:verify": "node scripts/verify-image-ipfs.mjs"
  }
}
```

- [ ] **Step 4: Run offline GREEN**

```powershell
rtk node --test test/image-ipfs-proof.test.mjs
```

Expected: all readback and mutation tests pass.

- [ ] **Step 5: Perform the browser upload only when the user is authenticated**

Use Pinata's authenticated free public upload UI. Select exactly
`web/assets/token.png`; stop on wallet, payment, directory, or broader-access
request. Record the returned CID, then run:

```powershell
rtk npm run metadata:image:verify -- --cid "$env:HAKKY_IMAGE_CID"
```

Expected: receipt reports two exact gateway matches. If Pinata remains signed
out, this task is externally blocked; do not enter or request credentials.

- [ ] **Step 6: Commit code, never authenticated/session evidence**

```powershell
rtk git add src/image-ipfs-proof.mjs scripts/verify-image-ipfs.mjs schemas/release/image-ipfs-v1.schema.json test/image-ipfs-proof.test.mjs package.json package-lock.json
rtk git commit -m "metadata: verify image-only IPFS receipt"
```

---

### Task 6: Complete local browser certification

**Files:**
- Create: `docs/qa/immutable-market-browser-checklist.md`
- Create: `test/browser-qa-contract.test.mjs`
- Modify: `scripts/check-site.mjs`

**Interfaces:**
- Consumes: final local static site and generated browser client.
- Produces ignored screenshots/console/network records and a public-safe local
  QA receipt.

- [ ] **Step 1: Write failing QA contract tests**

Require both viewport sizes, no horizontal overflow, no console/page error,
prelaunch destination hiding, explicit connect/quote/preview/confirm sequence,
phase and fee disclosures, decoded transaction equality, wallet rejection
recovery, stale-state clearing, and no automatic signature/send/retry.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/browser-qa-contract.test.mjs
```

Expected: FAIL because the checklist/receipt contract does not exist.

- [ ] **Step 3: Implement the deterministic checklist and site gate**

The checklist records route, viewport, source commit, generated bundle hash,
launch-record hash, console errors, network failures, layout measurements,
transaction preview fields, and result. `check-site` rejects a missing or stale
generated browser client.

- [ ] **Step 4: Run GREEN and inspect locally**

```powershell
rtk node --test test/browser-qa-contract.test.mjs
rtk npm run preview
```

Using Chrome control, inspect `1440x1000` and `390x844`, complete all checklist
cases without signing or sending, and save only ignored local evidence.

- [ ] **Step 5: Commit**

```powershell
rtk git add docs/qa/immutable-market-browser-checklist.md test/browser-qa-contract.test.mjs scripts/check-site.mjs
rtk git commit -m "qa: certify local immutable market UI"
```

---

### Task 7: Write the operator handoff and run the final no-mainnet audit

**Files:**
- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/LAUNCH.md`
- Modify: `docs/TOKEN.md`
- Modify: `proof/README.md`
- Modify: `launch/README.md`
- Create: `docs/MAINNET-NO-GO-CHECKLIST.md`
- Create: `test/no-mainnet-readiness.test.mjs`

**Interfaces:**
- Consumes: every completed local artifact and external gate status.
- Produces a machine-checked readiness report that cannot authorize a mainnet
  effect.

- [ ] **Step 1: Write failing final-gate tests**

Require named status/evidence for:

```text
program implementation
all Rust/Node/SBF tests
binary <=120000
two local reproductions
third independent reproduction
cost cap
actual-Metaplex prefund proof
devnet deploy/finalize/init/curve/pool
image IPFS
metadata HTTPS readback
desktop/mobile browser QA
independent Solana security audit
independent economic/math review
finding resolution and final rebuild
operator handoff
mainnet deploy approval
mainnet finalization approval
mainnet initialization approval
```

Any absent/failed/stale gate yields `readyForMainnetApproval:false`. The report
has no signing, sending, retry, or approval field.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/no-mainnet-readiness.test.mjs
```

Expected: FAIL because the final checklist does not exist.

- [ ] **Step 3: Rewrite operator docs and implement the no-go evaluator**

Document exact user CLI/web flow, all irreversible risks, proof paths,
reproduction, cost semantics, devnet process, independent audit requirements,
and the separate mainnet sequence. The current report truthfully leaves
external incomplete gates false.

- [ ] **Step 4: Run the entire local suite**

```powershell
rtk cargo fmt --all --check
rtk cargo test --workspace --locked
rtk npm ci
rtk npm run schemas
rtk npm run client:web
rtk npm run assets
rtk npm run check
rtk npm run program:build
rtk npm run program:test-sbf
rtk npm run program:inspect
rtk npm run program:reproduce
rtk npm run cost:verify
rtk node --test test/no-mainnet-readiness.test.mjs
rtk git diff --check
rtk git status --short --branch
```

Expected: every locally executable gate passes; the readiness report lists
external incomplete gates explicitly and remains
`readyForMainnetApproval:false` until they are genuinely complete.

- [ ] **Step 5: Commit**

```powershell
rtk git add README.md SECURITY.md CONTRIBUTING.md docs/LAUNCH.md docs/TOKEN.md docs/MAINNET-NO-GO-CHECKLIST.md proof/README.md launch/README.md test/no-mainnet-readiness.test.mjs
rtk git commit -m "release: add immutable launch no-go audit"
```

## Release Plan Completion Gate

Local completion requires green build, size, surface, test, schema, site,
reproduction, cost, devnet, metadata, and browser evidence. Mainnet approval
readiness additionally requires:

1. a qualified independent Solana security audit;
2. an independent integer-math/economic review;
3. public resolution/disclosure of all findings;
4. a final audited-source byte-identical build;
5. a third independent reproduction.

Even after every gate passes, the work stops before any mainnet transaction.
Deployment, finalized byte reconciliation, permanent authority removal, and
initialization each require a separate exact transaction/debit approval at
action time.
