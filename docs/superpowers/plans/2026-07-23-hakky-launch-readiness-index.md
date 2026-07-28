# HAKKY Launch Readiness Plan Suite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this suite task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved LaunchLab reality-alignment design through three bounded TDD plans without allowing shared-file collisions or an external action to inherit stale approval.

**Architecture:** The proof plan owns schemas, Raydium/Solana decoding, canonical artifacts, and lifecycle promotion. The public-surface plan consumes the generated launch-v2 validator and renders only verified evidence. The operations plan owns devnet funding, metadata preparation, unsigned-transaction evaluation, recovery receipts, and the PR-to-main release sequence.

**Tech Stack:** Node.js 22 ESM, native `node:test`, AJV standalone schema generation, Solana classic SPL tooling, static HTML/CSS/JavaScript, GitHub Actions and Pages.

## Global Constraints

- Normative design: `docs/superpowers/specs/2026-07-23-hakky-launchlab-reality-design.md`.
- Proof plan: `docs/superpowers/plans/2026-07-23-hakky-launchlab-proof-lifecycle.md`.
- Public-surface plan: `docs/superpowers/plans/2026-07-23-hakky-public-surface-lifecycle.md`.
- Operations plan: `docs/superpowers/plans/2026-07-23-hakky-launch-readiness-operations.md`.
- The 2026-07-22 live-launch plan is superseded and must not be executed.
- A fresh implementation subagent handles one task; a specification reviewer and a code-quality reviewer gate that task before the next task starts.
- Production edits are serialized because `package.json`, `package-lock.json`, `test-support/launch-fixtures.mjs`, `scripts/check-site.mjs`, and launch documentation are shared surfaces.
- Read-only research and review may fan out in parallel; agents must not concurrently edit the shared worktree.
- Every task begins with its RED test and ends with its focused GREEN command and narrow commit.
- No push, PR, merge, deployment, metadata upload, legal acceptance, wallet connection, mainnet signature, SOL spend, GitHub settings save, X save/post/pin, or server mutation occurs without its exact action-time gate.
- An unavailable public warning remains identity-free, but content-addressed ignored copies of its exact finalized stage receipt and continuity receipt bind the exact warning bytes to that evidence. Verified recovery is same-stage or monotonic only and requires the complete canonical artifact set; no runtime fact override is accepted.
- Current pinned official Raydium SDK/IDL coverage does not define the CPMM lock-program account layouts needed for a verified Burn & Earn rights proof. Implement the named fail-closed coverage result, but do not sign a Raydium launch whose future full-lock/no-fee-right invariant cannot be proved from official source and the exact unsigned transaction.

---

## Execution Order

- [ ] **Foundation 1: Proof Task 1 — normative schemas and generated browser validator**

  Produces the exact launch-v2 and artifact schemas consumed by every later task. Run:

  ```powershell
  rtk node --test test/proof-schemas.test.mjs test/launch-policy.test.mjs
  rtk npm run schemas
  rtk node scripts/render-launch-schema-validator.mjs --check
  ```

- [ ] **Foundation 2: Proof Task 2 — source-pinned LaunchLab decoder**

  Produces the only accepted LaunchLab discriminator/layout/PDA implementation. Preview tooling must import it rather than duplicate it.

- [ ] **Foundation 3: Operations Task 2 — deterministic metadata manifest and readback**

  Produces the manifest interface required by mint-v2, LaunchLab-v2, and unsigned preview verification. Upload remains outside implementation and separately gated.

- [x] **Wave 1 prerequisite: align mainnet and content identities**

  This serialized amendment landed as `28c777d98b1bdb507fc07fcc7166d63696bc1988`. The exact mainnet-beta genesis literal is `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d`. The four lifecycle schemas accept only the Foundation 3 canonical raw CIDv1 sha2-256 IPFS identity or canonical Arweave identity, and Node semantic validation reuses `validateContentAddressedUri` instead of defining a second URI policy.

  The executable prerequisite contract is:

  - Modify exactly `src/solana-rpc.mjs`, `schemas/proof/mainnet-mint-v2.schema.json`, `schemas/proof/mainnet-launchlab-v2.schema.json`, `schemas/proof/mainnet-graduation-v1.schema.json`, `schemas/web/launch-v2.schema.json`, `src/schema-validation.mjs`, `test-support/launch-fixtures.mjs`, `test/launch-policy.test.mjs`, `test/mint-proof.test.mjs`, `test/proof-schemas.test.mjs`, and generated `web/lib/launch-schema.generated.js`.
  - RED: add exact full-genesis equality plus canonical IPFS/Arweave acceptance and malformed/noncanonical mutation cases, then run `rtk node --test test/proof-schemas.test.mjs test/mint-proof.test.mjs test/launch-policy.test.mjs`; require failures against the truncated genesis and broad CID pattern.
  - GREEN: correct the literal, narrow all four schemas, reuse Foundation 3 semantic validation, and regenerate the browser validator with `rtk npm run schemas`.
  - Verify with `rtk node --test test/proof-schemas.test.mjs test/mint-proof.test.mjs test/launch-policy.test.mjs test/metadata-integrity.test.mjs`, `rtk node scripts/render-launch-schema-validator.mjs --check`, `rtk npm run check:repo`, and `rtk git diff --check`.

- [ ] **Wave 1: Operations Task 1, Proof Task 3, then Public Task 1**

  Their primary production files are disjoint after the three foundations, but their interfaces are ordered. Dispatch separate review agents, allow only one shared-worktree writer at a time, and implement in this exact order:

  - Operations Task 1: independent externally funded devnet rehearsal; remove its legacy imports from the mint collector/evaluator before those exports change.
  - Proof Task 3: finalized mint-v2 plus creation-transaction and atomic immutable-metadata binding; it may then update the mint schema and provenance fixtures without breaking the rehearsal.
  - Public Task 1: pure lifecycle view adapter against the final Wave 1 schema/fixture contract.

- [ ] **Wave 2: Proof Tasks 4 and 5**

  Build LaunchLab-v2, then content-hashed curve binding and verified/unavailable promotion. Task 5 must land before site rendering because it defines deployable unavailable records.

- [ ] **Wave 3: Public Task 3, then Operations Task 3**

  Put the warning first on mobile, then build unsigned-transaction preview tooling against the already-pinned decoder. Public Task 2 waits because its graduated branch must be tested against the completed three-artifact contract.

- [ ] **Wave 4: Proof Tasks 6 and 7, then Public Task 2**

  Build graduation-v1 and deterministic graduated promotion. Only after all three artifact bindings pass, render every approved curve/graduated field and exhaustively clear unavailable state.

- [ ] **Wave 5: Public Tasks 4 and 5**

  Complete deployable site checks, local browser certification, and stage-correct social builders/templates.

- [ ] **Wave 6: Operations Tasks 4 and 5**

  Complete public-only recovery evidence and update every active runbook/workflow contract. Task 5 stops at each external approval boundary.

---

## Per-Task Review Gate

For every implementation task:

- [ ] The implementer runs the task's focused RED command and records the expected missing-behavior failure.
- [ ] The implementer writes the minimum production change and runs the focused GREEN command.
- [ ] A specification reviewer compares the exact diff to the design and task requirements.
- [ ] The implementer resolves every Critical or Important specification finding.
- [ ] A code-quality reviewer checks security boundaries, error handling, interface consistency, and test strength.
- [ ] The implementer resolves every Critical or Important quality finding.
- [ ] Root reruns the focused tests, `rtk git diff --check`, and inspects the task commit before dispatching the next task.

## Suite Completion Gate

Run:

```powershell
rtk npm ci
rtk npm run schemas
rtk node scripts/render-launch-schema-validator.mjs --check
rtk git diff --exit-code -- web/lib/launch-schema.generated.js
rtk npm run assets
rtk npm run assets
rtk npm run check
rtk git diff --check
rtk git status --short --branch
```

Expected: every test and policy/site/repository check passes; schema and asset generation are deterministic; the worktree contains only intended reviewed changes; no secret, authenticated RPC URL, wallet material, or proof/session artifact is tracked.

After the local suite passes, run a final base-to-head specification/security review. External publication begins only through Operations Task 5's reviewed-sha push approval, separate exact-head/base PR-create-or-update approval, PR quality, and a pre-merge approval envelope that expressly names both the exact merge and its automatic `main` Pages production deployment, followed by live browser and stage-specific X readback; the same gate repeats for curve verified/unavailable and graduated verified/unavailable records.
