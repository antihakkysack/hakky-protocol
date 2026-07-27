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
  release configuration, the pinned container digest above, and the validated
  lock-bound vendor manifest/tree/source-replacement config produced by
  Program Task 8.
- Every final candidate build runs the exact image with Docker networking
  disabled and `cargo-build-sbf --offline --skip-tools-install --tools-version
  v1.53 --arch v0 -- --locked`; no final build resolves or downloads a
  dependency.
- `config/hakky-release-v1.json` is the sole tracked candidate identity leaf;
  identity is committed before candidate build and build tools never rewrite
  it.
- Native, test-SBF, and candidate-SBF lanes have distinct commands, receipts,
  paths, and evidence classes; no receipt satisfies another lane.
- Candidate/public evaluators reject every registered native/test-SBF
  identity, config hash, path, and binary hash.
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
- The image CID is two-gateway verified and exact metadata bytes are committed
  before any candidate build approval; a CID or metadata-byte change
  invalidates every earlier build, reproduction, cost, and audit receipt.
- Browser QA is local until a separate publication approval.
- Before first approved initialization submission, the candidate nonce appears
  only in restricted offline candidate-SBF execution; no public RPC simulation
  or shared unsigned transaction may reveal it.
- Independent security/economic reviews are not simulated by agents and remain
  hard mainnet gates.
- No push, PR, merge, website deployment, wallet signature, mainnet
  transaction, SOL spend, social action, or other external mutation is
  authorized by this plan.

---

### Task 1: Record two byte-identical clean SBF builds

**Files:**
- Create: `Containerfile.sbf`
- Create: `config/local-build-operator-v1.json`
- Create: `src/release-manifest.mjs`
- Create: `schemas/release/build-record-v1.schema.json`
- Create: `schemas/release/local-build-operator-v1.schema.json`
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
drift, source/lock/config hash drift, non-candidate lane, any test identity or
test artifact path/hash, missing/mutated vendor manifest/tree/config binding,
network mode other than `none`, missing offline/skip-tools/v1.53/v0/forwarded
Cargo-locked command fields, reused directory, missing stdout/stderr hash,
missing UTC time, wrong executable name, asserted rather than derived surface
facts, local-operator identity/hash drift, and unknown field.

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
lane = candidate-sbf
source commit/tree hash
local builder organization/operator and config hash
Cargo.lock hash
vendor manifest hash
vendor complete-tree hash
vendor source-replacement config hash
config/hakky-release-v1.json hash
generated Rust/JavaScript release-view hashes
registered test-identity exclusion result
container repository/tag/digest
Docker network mode = none
rustc/cargo/solana/cargo-build-sbf versions
exact offline/skip-tools/v1.53/v0/forwarded-locked command and environment allowlist
UTC start/end
stdout/stderr SHA-256
executable length/SHA-256
```

`config/local-build-operator-v1.json` is canonical one-line JSON plus LF:

```json
{"schemaVersion":"hakky-local-build-operator-v1","organizationId":"hakky-local","operatorId":"local-controller"}
```

Both controller-operated local builds bind these exact values and raw config
hash. This is an exclusion identity, not a claim that the two directories are
independent operators. The authenticated third-party reproduction must use a
different organization and operator. Changing this file invalidates every
local build and reproduction receipt.

- [ ] **Step 4: Implement closed record and reproduction evaluation**

Reject unknown fields and any mismatch other than build-directory identity and
UTC time. The compared `.so` bytes must be equal, not only their reported
hashes.

```json
{
  "scripts": {
    "program:reproduce-candidate": "node scripts/verify-sbf-reproduction.mjs --lane candidate-sbf"
  }
}
```

- [ ] **Step 5: Run GREEN before committing the build wrapper**

```powershell
rtk node --test test/release-manifest.test.mjs test/verify-sbf-reproduction.test.mjs
```

Expected: manifest and reproduction mutation tests pass.

- [ ] **Step 6: Commit**

```powershell
rtk git add Containerfile.sbf config/local-build-operator-v1.json src/release-manifest.mjs schemas/release/build-record-v1.schema.json schemas/release/local-build-operator-v1.schema.json scripts/build-hakky-sbf.mjs scripts/verify-sbf-reproduction.mjs test/release-manifest.test.mjs test/verify-sbf-reproduction.test.mjs package.json .gitignore
rtk git commit -m "release: prove reproducible SBF build"
```

- [ ] **Step 7: From the clean commit, produce two clean builds**

```powershell
rtk git status --porcelain
rtk npm run program:vendor-dependencies
rtk npm run program:build-candidate -- --output artifacts/build/candidate/local-a
rtk npm run program:build-candidate -- --output artifacts/build/candidate/local-b
rtk npm run program:reproduce-candidate -- --left artifacts/build/candidate/local-a --right artifacts/build/candidate/local-b
rtk git status --porcelain
```

Expected: both status reads are empty; both records revalidate the same vendor
manifest/tree/config and show network mode `none`, offline pinned tools, and
forwarded Cargo `--locked`; both executable byte streams and SHA-256 values
match; each length is at most 120,000; and the ignored reproduction receipt
reports `ok:true`.

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
rtk npm run cost:verify -- --build-record artifacts/build/candidate/local-a/build-record.json --network devnet
```

Expected: tests pass; the devnet diagnostic reports exact values and either
`ok:true` or a named cap/freshness failure without mutation.

- [ ] **Step 6: Commit**

```powershell
rtk git add src/cost-ledger.mjs schemas/release/cost-ledger-v1.schema.json scripts/build-cost-ledger.mjs test/cost-ledger.test.mjs test/build-cost-ledger.test.mjs package.json
rtk git commit -m "release: enforce one-SOL cost prefixes"
```

---

### Task 3: Add exact-built SBF lifecycle and CI gates

**Files:**
- Create: `programs/hakky-market-sbf-tests/tests/release_runtime.rs`
- Create: `scripts/fetch-pinned-metaplex-program.mjs`
- Create: `scripts/run-exact-sbf-lifecycle.mjs`
- Create: `test/fetch-pinned-metaplex-program.test.mjs`
- Create: `test/exact-sbf-lanes.test.mjs`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed program/client/proof work and reproducible build.
- Produces deterministic test-SBF CI lifecycle, nonce-free exact candidate-SBF
  runtime checks, restricted offline candidate lifecycle receipt, and
  deterministic CI commands.

- [ ] **Step 1: Write failing pinned-binary collector tests**

The collector accepts only the fixed Metaplex program ID, finalized public
RPC, raw executable/ProgramData bytes, exact reviewed client-layout commit
`a7ee5e17ed60feaafeaa5582a4f46d9317c1b412`, and a separate exact deployed
program/source-correspondence receipt supplied by the release evidence
manifest. Reject redirect, nonfinal data, authority/source/hash drift, and any
secret/authenticated URL.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/fetch-pinned-metaplex-program.test.mjs test/exact-sbf-lanes.test.mjs
```

Expected: FAIL because the collector and exact-lane runner do not exist.

- [ ] **Step 3: Add exact SBF ProgramTest lifecycle**

For CI, load the deterministic `test-sbf` `.so` with `prefer_bpf(true)` and no
native HAKKY processor closure. Load the pinned Metaplex executable and
exercise hostile metadata prefunds, raw loader accounts, initialization, curve
boundaries, terminal transition, pool trades, donations, rollback, aliases,
expiry, slippage, safe second invocation, and concurrency.

Separately load the exact candidate `.so` in the isolated ProgramTest 4.1.2
package. CI executes nonce-free decoder/account/loader and surface behavior.
Full candidate initialization/lifecycle is local and offline, reads the nonce
only from the restricted ceremony directory, never prints it, and emits only a
sanitized receipt. A test-SBF receipt cannot satisfy candidate proof.

- [ ] **Step 4: Extend CI**

CI runs Node checks on Node 22, host Rust format/clippy/tests in the pinned
native image, then test-SBF lifecycle, candidate build, nonce-free
current-runtime candidate checks, raw-evidence surface/size check, bounded
fuzzing, and two-build candidate reproduction. No secret, RPC credential,
wallet, or public transaction is required.

```json
{
  "scripts": {
    "program:test-test-sbf": "node scripts/run-exact-sbf-lifecycle.mjs --lane test-sbf",
    "program:test-candidate-sbf": "node scripts/run-exact-sbf-lifecycle.mjs --lane candidate-sbf"
  }
}
```

- [ ] **Step 5: Run GREEN for collector and test-SBF lanes**

```powershell
rtk node --test test/fetch-pinned-metaplex-program.test.mjs
rtk node --test test/exact-sbf-lanes.test.mjs
rtk npm run program:build-test-sbf
rtk npm run program:test-test-sbf
rtk npm run program:fuzz
rtk npm run check
```

Expected: collector, test-SBF lifecycle, fuzzing, and complete repository
checks pass without cross-lane evidence.

- [ ] **Step 6: Commit**

```powershell
rtk git add programs/hakky-market-sbf-tests/tests/release_runtime.rs scripts/fetch-pinned-metaplex-program.mjs scripts/run-exact-sbf-lifecycle.mjs test/fetch-pinned-metaplex-program.test.mjs test/exact-sbf-lanes.test.mjs .github/workflows/quality.yml .github/workflows/pages.yml package.json
rtk git commit -m "ci: gate exact immutable market binary"
```

- [ ] **Step 7: From the clean commit, run candidate-only gates**

```powershell
rtk git status --porcelain
rtk npm run program:vendor-dependencies
rtk npm run program:build-candidate -- --output artifacts/build/candidate/ci-a
rtk npm run program:build-candidate -- --output artifacts/build/candidate/ci-b
rtk npm run program:test-candidate-sbf -- --build artifacts/build/candidate/ci-a
rtk npm run program:inspect-candidate -- --build artifacts/build/candidate/ci-a
rtk npm run program:reproduce-candidate -- --left artifacts/build/candidate/ci-a --right artifacts/build/candidate/ci-b
rtk git status --porcelain
```

Expected: both status reads are empty; nonce-free candidate checks and the
restricted offline lifecycle (when the private nonce is available) pass; and
all candidate evidence remains in ignored paths.

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
terminal route, three replay meanings, proof generation, failure/unknown
reconciliation, and zero automatic retry/fallback.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/immutable-devnet-rehearsal.test.mjs
```

Expected: FAIL because the new rehearsal module does not exist.

- [ ] **Step 3: Implement the bounded no-retry ceremony**

The command reads ignored key files without printing them, validates their
public identities against `config/hakky-release-v1.json`, verifies every
generated release view and candidate receipt has the same config hash, checks
free devnet balance,
builds exact deployment/finalization/initialization envelopes, and stops before
each mutation unless the invocation contains the reviewed devnet-only
operation flag. A submitted signature is recorded before polling; unknown
results are finalized-readback states, never implicit retries.

Before the first initialization submission, nonce-bearing construction,
decode, and candidate-SBF execution are local/offline only. There is no public
RPC simulation. The first submission permanently discloses the nonce even on
failure/expiry/unknown outcome. An identical signed transaction is handled by
runtime deduplication; a fresh initialization replay fails
`AlreadyInitialized`; a fresh swap invocation is a new trade and may execute
only against current state/slippage/deadline. Unknown signatures are
reconciled before any newly approved transaction is constructed.

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
rtk git add package.json scripts/rehearse-immutable-devnet.mjs test/immutable-devnet-rehearsal.test.mjs
rtk git rm scripts/rehearse-devnet.mjs test/devnet-rehearsal.test.mjs
rtk git commit -m "devnet: rehearse immutable market lifecycle"
```

---

### Task 5: Verify the separately approved image-only Pinata upload

**Execution order:** Run this task in Index Wave 6B, before Client Task 9 and
before Release Task 1. Task numbers group concerns; they do not override the
CID-before-metadata-before-build dependency.

**Files:**
- Create: `src/image-ipfs-proof.mjs`
- Create: `scripts/verify-image-ipfs.mjs`
- Create: `schemas/release/image-ipfs-v1.schema.json`
- Create: `test/image-ipfs-proof.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: ignored `artifacts/ipfs/pinata-upload-cid.txt`, containing exactly
  the browser-observed canonical CID plus LF after the approved upload.
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

The CLI accepts only `--cid-file`, requires that exact one-line text contract,
fetches exact bytes from two fixed public gateway origins with one total
deadline, and writes the receipt only after both match the approved local file
byte-for-byte.

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
rtk npm run metadata:image:verify -- --cid-file artifacts/ipfs/pinata-upload-cid.txt
```

Expected: receipt reports two exact gateway matches. If Pinata remains signed
out, this task is externally blocked; do not enter or request credentials.

- [ ] **Step 6: Commit code, never authenticated/session evidence**

```powershell
rtk git add src/image-ipfs-proof.mjs scripts/verify-image-ipfs.mjs schemas/release/image-ipfs-v1.schema.json test/image-ipfs-proof.test.mjs package.json
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
- Create: `src/no-mainnet-readiness.mjs`
- Create: `schemas/release/no-mainnet-readiness-v1.schema.json`
- Create: `scripts/build-no-mainnet-readiness.mjs`
- Create: `test/no-mainnet-readiness.test.mjs`
- Modify: `package.json`

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
```

Any absent/failed/stale technical gate yields
`readyForMainnetApproval:false`. The report always emits
`mainnetActionsAuthorized:false` and `readyForMainnetEffects:false`; its schema
rejects either value as `true`. The three exact action-time approvals are
deliberately outside technical readiness and outside this evaluator. Their
absence does not make a technically complete package unready to request
approval, and their presence cannot be supplied to this report to authorize an
effect.

The report has no signing, sending, retry, or approval-consumption capability
and accepts no approval or authorization input. Its raw input rejects
decisive `ok`, `verified`, `ready`, audit-complete, independence, or
finding-resolved booleans. It revalidates underlying immutable hashes and raw
evidence; locally authored JSON cannot complete an independent audit or
reproduction and another evaluator's `ok:true` is never sufficient evidence.
Independent audit/reproduction evidence must use the closed authenticated
contract from Client/Proof/Site Task 6: approved reviewer/builder identity and
key binding, trusted retrieval receipt, detached signature over candidate,
source/config/report hashes and scope, conflict disclosure, and raw findings.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/no-mainnet-readiness.test.mjs
```

Expected: FAIL because the final checklist does not exist.

- [ ] **Step 3: Rewrite operator docs and implement the no-go evaluator**

Document exact user CLI/web flow, all irreversible risks, proof paths,
reproduction, cost semantics, devnet process, independent audit requirements,
and the separate mainnet sequence. The current report truthfully leaves
external incomplete gates false. `src/no-mainnet-readiness.mjs` is a pure
closed-schema evaluator. `scripts/build-no-mainnet-readiness.mjs` reads only
raw evidence paths, revalidates them, and writes the ignored
`artifacts/readiness/no-mainnet-v1.json`; failed evidence cannot occupy any
canonical proof path.

Add the exact package command:

```json
{
  "scripts": {
    "readiness:no-mainnet": "node scripts/build-no-mainnet-readiness.mjs --output artifacts/readiness/no-mainnet-v1.json"
  }
}
```

- [ ] **Step 4: Run the pre-commit local suite**

```powershell
rtk cargo fmt --all --check
rtk cargo test --workspace --locked
rtk npm ci
rtk npm run schemas
rtk npm run client:web
rtk npm run assets
rtk npm run check
rtk npm run program:test-native
rtk npm run program:build-test-sbf
rtk npm run program:test-test-sbf
rtk npm run program:fuzz
rtk node --test test/no-mainnet-readiness.test.mjs
rtk git diff --check
```

Expected: every non-candidate local gate passes.

- [ ] **Step 5: Commit**

```powershell
rtk git add README.md SECURITY.md CONTRIBUTING.md docs/LAUNCH.md docs/TOKEN.md docs/MAINNET-NO-GO-CHECKLIST.md proof/README.md launch/README.md src/no-mainnet-readiness.mjs schemas/release/no-mainnet-readiness-v1.schema.json scripts/build-no-mainnet-readiness.mjs test/no-mainnet-readiness.test.mjs package.json
rtk git commit -m "release: add immutable launch no-go audit"
```

- [ ] **Step 6: From the clean final commit, run candidate and report gates**

```powershell
rtk git status --porcelain
rtk npm run program:vendor-dependencies
rtk npm run program:build-candidate -- --output artifacts/build/candidate/final-a
rtk npm run program:build-candidate -- --output artifacts/build/candidate/final-b
rtk npm run program:test-candidate-sbf -- --build artifacts/build/candidate/final-a
rtk npm run program:inspect-candidate -- --build artifacts/build/candidate/final-a
rtk npm run program:reproduce-candidate -- --left artifacts/build/candidate/final-a --right artifacts/build/candidate/final-b
rtk npm run cost:verify -- --build-record artifacts/build/candidate/final-a/build-record.json --network devnet
rtk npm run readiness:no-mainnet -- --build artifacts/build/candidate/final-a --evidence-root artifacts/independent-evidence
rtk git status --porcelain
```

Expected: both status reads are empty and every locally executable candidate
gate passes. The ignored readiness report explicitly lists incomplete external
gates and remains `readyForMainnetApproval:false` until genuine authenticated
evidence completes them.

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
