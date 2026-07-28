# HAKKY Immutable Launch Implementation Plan Suite

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this suite task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify the approved immutable HAKKY Curve-to-Pool
program, direct clients, proof lifecycle, public site, and no-mainnet release
gates without performing a mainnet launch.

**Architecture:** One compact native Rust Solana program owns the complete
economic state and exposes only initialize, buy, and sell. A Node.js client and
proof layer independently reproduce its codecs and math, while static web and
operator tooling consume closed versioned artifacts. Reproducible-build,
cost-ledger, devnet, browser, audit, and action-time approval gates remain
orthogonal and fail closed.

**Tech Stack:** Rust 1.95.0 for host checks, pinned verifiable SBF image
`solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68`,
Solana Verify 0.5.1,
coherent native family `solana-program` 2.3.0, classic SPL Token 8.0.0 /
interface 1.0.0, Metaplex Token Metadata client 5.1.1,
native ProgramTest 2.3.13/SDK 2.3.1, isolated exact-SBF current-runtime
ProgramTest 4.1.2, Node.js 22-compatible ESM,
`@solana/web3.js` 1.98.4, `@solana/spl-token` 0.4.15, native `node:test`,
AJV 8.20.0, static HTML/CSS/JavaScript, Docker, GitHub Actions and Pages.

## Global Constraints

- Normative design:
  `docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md`.
- Program plan:
  `docs/superpowers/plans/2026-07-24-hakky-immutable-program.md`.
- Client/proof/site plan:
  `docs/superpowers/plans/2026-07-24-hakky-clients-proofs-site.md`.
- Release/devnet plan:
  `docs/superpowers/plans/2026-07-24-hakky-release-devnet-gates.md`.
- Total supply is exactly `10,000,000,000,000` HAKKY base units with six
  decimals.
- Curve maximum is exactly `8,000,000,000,000` HAKKY base units.
- Permanent-pool seed is exactly `2,000,000,000,000` HAKKY base units and
  `24,000,000,000` WSOL base units.
- Creator/team launch allocation and every LP, fee, withdrawal, update,
  rescue, close, pause, migration, and governance right are zero or absent.
- Curve cumulative reserve is exactly
  `floor(Q*s/(4*S-3*s))`, with checked `u128` arithmetic.
- Pool input-fee ratio is exactly `2,500 / 1,000,000`; the fee is retained in
  the input reserve and rounded upward to an input-mint base unit.
- The program exposes only instruction tags `0`, `1`, and `2` with exact data
  lengths `33`, `25`, and `25` bytes.
- The HAKKY program must be immutable before initialization and must reject a
  non-null loader-v3 ProgramData upgrade authority.
- Runtime economics, identities, metadata, and PDA seeds accept no caller
  override.
- `config/hakky-release-v1.json` is the sole tracked identity leaf and is
  committed before candidate build; the nonce preimage never enters it.
- Native, deterministic test-SBF, and candidate-SBF lanes have distinct
  identities, commands, receipts, paths, and evidence classes.
- A test identity/config/path/binary hash is forbidden from every
  candidate/public artifact, and the deployable/native crate graph has one
  compatible Solana public-type family.
- State uses the frozen 384-byte offset table and stable error registry; pool
  state requires `sold=S`, `0<base<=TOTAL`, `quote>0`, and
  `base*quote>=L*Q`.
- Executable length must be at most `120,000` bytes.
- Maximum cumulative canonical-funder debit must be at most
  `1,000,000,000` lamports for every reachable finalized prefix.
- Public lifecycle is `prelaunch -> curve-live -> pool-live`; proof
  availability is independently `verified | unavailable`.
- Canonical proof paths are `proof/mainnet-program.json`,
  `proof/mainnet-market.json`, and `proof/mainnet-pool.json`.
- Metadata URI is exactly
  `https://hakky.xyz/metadata/hakky-v1.json`; the only currently authorized
  Pinata upload input is `web/assets/token.png`.
- Initial trading access is the open-source HAKKY website, CLI, or direct
  program invocation. No aggregator, exchange, wallet, price, return, safety,
  bot-prevention, or permanent-reserve listing is promised.
- Every production task follows RED -> observed expected failure -> minimal
  GREEN -> focused tests -> narrow commit -> task review.
- Implementation writers are serialized in the shared worktree. Read-only
  research and review may run in parallel.
- No push, PR, merge, deployment, wallet connection, signature, transaction
  submission, retry, SOL spend, Pinata upload, website publication, X mutation,
  or mainnet action occurs without its exact action-time approval.
- Independent qualified Solana security audit, independent economic/math
  review, third independent byte-identical build, and all resulting fixes
  remain mandatory mainnet hard gates.

---

## Plan Ownership and File Boundaries

Each task's exact `Files:` list is authoritative. The primary ownership maps
below are routing aids only; a glob never authorizes an unlisted edit or
deletion. Client Task 7's deletion manifest is frozen before implementation.

### Program plan owns

```text
Cargo.toml
Cargo.lock
rust-toolchain.toml
.cargo/config.toml
config/hakky-release-v1.json
Containerfile.fuzz
programs/hakky-market/**
programs/hakky-market-sbf-tests/**
src/devnet-release-config.mjs
src/hakky-release-config.generated.mjs
scripts/generate-devnet-release-config.mjs
scripts/render-curve-pool-vectors.mjs
scripts/build-hakky-test-sbf.mjs
scripts/build-hakky-sbf.mjs
scripts/inspect-hakky-program.mjs
scripts/run-hakky-fuzz.mjs
scripts/test-hakky-*.mjs
test/release-config.test.mjs
test/curve-pool-vectors.test.mjs
test/build-hakky-sbf.test.mjs
test/program-lanes.test.mjs
test/run-hakky-fuzz.test.mjs
test-support/program-surface-fixtures.mjs
test/program-surface.test.mjs
```

### Client/proof/site plan owns

```text
src/hakky-*.mjs
src/immutable-program-proof.mjs
src/independent-evidence.mjs
src/independent-scope.mjs
src/canonical-proof.mjs
src/schema-validation.mjs
src/solana-rpc.mjs
src/solana-wire.mjs
src/proof-output.mjs
src/social-copy.mjs
schemas/proof/immutable-program-v1.schema.json
schemas/proof/hakky-market-v1.schema.json
schemas/proof/hakky-pool-v1.schema.json
schemas/web/launch-v3.schema.json
schemas/evidence/**
config/independent-evidence-authorities-v1.json
scripts/hakky-client.mjs
scripts/verify-immutable-program.mjs
scripts/verify-hakky-market.mjs
scripts/verify-hakky-pool.mjs
scripts/fetch-independent-evidence.mjs
scripts/build-independent-scope.mjs
scripts/build-curve-live-record.mjs
scripts/build-pool-live-record.mjs
scripts/build-unavailable-record.mjs
scripts/render-launch-schema-validator.mjs
scripts/prepare-metadata.mjs
scripts/finalize-metadata-manifest.mjs
scripts/verify-metadata-upload.mjs
web/**
the exact Client Tasks 1-10 test files
test-support/immutable-curve-pool-fixtures.mjs
```

### Release/devnet plan owns

```text
Containerfile.sbf
config/local-build-operator-v1.json
src/release-manifest.mjs
src/cost-ledger.mjs
src/image-ipfs-proof.mjs
src/no-mainnet-readiness.mjs
schemas/release/**
scripts/verify-sbf-reproduction.mjs
scripts/build-cost-ledger.mjs
scripts/rehearse-immutable-devnet.mjs
scripts/verify-image-ipfs.mjs
scripts/build-no-mainnet-readiness.mjs
.github/workflows/**
docs/qa/**
the exact Release Tasks 1-7 test files
README.md
SECURITY.md
CONTRIBUTING.md
docs/LAUNCH.md
docs/TOKEN.md
proof/README.md
launch/README.md
```

Shared writers are serialized exactly:

| Shared path | Permitted writer order |
| --- | --- |
| `Cargo.toml`, `Cargo.lock` | Program Task 2 -> Program Task 8 |
| `.gitignore` | completed Program Task 1 -> Program Task 8 -> Release Task 1 |
| `scripts/build-hakky-sbf.mjs` | Program Task 8 -> Release Task 1 |
| `programs/hakky-market-sbf-tests/tests/release_runtime.rs` | Release Task 3 only, inside Program Task 8's created package |
| `package.json` | Program Task 8 -> Client Tasks 4, 6, 7, 8 -> Release Task 5 -> Release Tasks 1, 2, 3, 4, 7 |
| `package-lock.json` | Client Task 8 only |
| `scripts/check-repo.mjs` | Client Task 10 only |
| `scripts/check-site.mjs` | Client Task 8 -> Release Task 6 |
| `README.md`, `docs/LAUNCH.md`, `docs/TOKEN.md`, `proof/README.md`, `launch/README.md` | Client Task 10 -> Release Task 7 |
| `launch/content-calendar.md`, `launch/prelaunch-post.md` | Client Task 10 only |

No other cross-plan writer is allowed. A later writer preserves and tests the
earlier contract; it does not replace it wholesale.

## Specification Coverage

| Design section | Implemented and proved by |
| --- | --- |
| 1. Decision and precedence | Index global constraints; Client Task 7; Client Task 10 |
| 2. Normative economics | Program Tasks 2-3; Client Tasks 1 and 5 |
| 3. Trust boundary | Program Task 4; Release Task 3; final audit |
| 4. Program/account model | Program Tasks 2, 4, and 5 |
| 5. Closed instruction surface | Program Task 2; Client Task 1; Program Task 8 |
| 6. Atomic initialization | Program Task 5; Release Tasks 3-4 |
| 7. Permissionless curve | Program Tasks 3 and 6; Client Task 1 |
| 8. Automatic pool phase | Program Task 6; Client Tasks 5-7 |
| 9. Permanent CPMM | Program Tasks 3 and 7; Client Tasks 1 and 8 |
| 10. Donations and conservation | Program Tasks 6-7; proof mutation matrices |
| 11. One-SOL cap | Release Task 2 |
| 12. Reproducible immutable deployment | Program Task 8; Release Tasks 1 and 4 |
| 13. Proof lifecycle | Client Tasks 5-7; Release Task 7 |
| 14. Security/math/audit gates | Program Tasks 3-8; Release Tasks 1, 3, and 7 |
| 15. Devnet rehearsal | Release Task 4 |
| 16. Public clients | Client Tasks 3-4 and 8 |
| 17. Metadata/IPFS | Client Task 9; Release Task 5 |
| 18. Mainnet sequence | Release Task 7; no transaction execution in this suite |
| 19. Hard stops | All evaluators plus final no-mainnet checklist |
| 20. Out of scope | Repository hygiene and program-surface scans |
| 21. Primary sources | Dependency/source pins and release receipts |

## Execution Order

- [ ] **Wave 1: Completed Program Task 1, then amended Tasks 2-3**

  Preserve reviewed Task 1, align one compatible native Solana type family,
  create the sole tracked public release leaf and generated views, freeze exact
  codecs/state/errors/PDAs, and implement independently tested curve/pool
  arithmetic plus detached vector digest.

- [ ] **Wave 2: Program Tasks 4-7**

  Implement validation, fixed CPIs, atomic initialization, curve swaps,
  one-way transition, pool swaps, hostile-account behavior, and exact SBF
  lifecycle tests.

- [ ] **Wave 3: Program Task 8**

  Produce disjoint test/candidate SBF receipts, enforce the 120,000-byte
  ceiling, derive rather than accept instruction/CPI surface evidence, run the
  isolated current-runtime harness and bounded fuzzing, and reject all test
  identity leakage.

- [ ] **Wave 4: Client/Proof/Site Tasks 1-4**

  Implement independent JavaScript constants, PDAs, codecs, BigInt math, state
  decoding, RPC reads, transaction builders, mandatory previews, and the
  no-secret unsigned CLI.

- [ ] **Wave 5: Client/Proof/Site Tasks 5-7**

  Replace LaunchLab schemas and proof builders, migrate lifecycle records, and
  remove obsolete active Raydium/LaunchLab code only after replacements pass.

- [ ] **Wave 6A: Client/Proof/Site Task 8**

  Add the direct trading UI and its deterministic browser bundle.

- [ ] **Wave 6B: Release/Devnet Task 5**

  Run the separately approved image-only Pinata workflow when authenticated
  and obtain the two-gateway byte-verified CID. If authentication is absent,
  record the external blocker: Client Task 9 and every later candidate build
  remain blocked.

- [ ] **Wave 6C: Client/Proof/Site Tasks 9-10**

  Generate exact metadata from that verified CID, invalidate any earlier
  candidate approval, align public copy, and run full repository/site checks.

- [ ] **Wave 7: Release/Devnet Tasks 1-3**

  Add reproducible candidate builds, lane/config-bound manifests, cost-prefix
  ledger, test-SBF CI, nonce-free candidate runtime checks, restricted offline
  candidate lifecycle, immutable program/market/pool proof commands, and CI.

- [ ] **Wave 8: Release/Devnet Task 4**

  Consume the already generated ignored devnet payer/program/nonce material
  whose public identities were frozen before Wave 1 and match the tracked
  release leaf and candidate receipts. Obtain only free devnet SOL,
  deploy/finalize/initialize that exact candidate, exercise representative
  curve and pool operations, and produce devnet proofs. Missing or mismatched
  private material blocks the wave; generating any replacement identity
  returns execution to Wave 1 and invalidates every intervening build and
  receipt. More than 24 devnet SOL plus rent/fee headroom is required;
  unavailable free funding is a recorded external blocker, not permission to
  buy SOL.

- [ ] **Wave 9: Release/Devnet Tasks 6-7**

  Complete local browser QA at `1440x1000` and `390x844`, operator
  documentation, and the final no-mainnet audit.

## Per-Task Review Gate

- [ ] Record the base commit before dispatch.
- [ ] Extract exactly one task brief for a fresh implementer subagent.
- [ ] Require the task's RED command and expected failing assertion.
- [ ] Require the focused GREEN command and exact pass count/output.
- [ ] Generate a base-to-head review package.
- [ ] Dispatch a task reviewer for both specification compliance and code
  quality.
- [ ] Resolve and re-review every Critical or Important finding.
- [ ] Append the reviewed commit range to
  `.superpowers/sdd/progress.md`.
- [ ] Root verifies the focused tests, staged scope, and clean status before
  dispatching the next implementation task.

## Suite Completion Gate

Run from the isolated worktree:

```powershell
rtk cargo fmt --all --check
rtk cargo test --workspace --locked
rtk npm ci
rtk npm run schemas
rtk npm run assets
rtk npm run check
rtk npm run program:test-native
rtk npm run program:build-test-sbf
rtk npm run program:test-test-sbf
rtk npm run program:fuzz
rtk git status --porcelain
rtk npm run program:build-candidate -- --output artifacts/build/candidate/suite-a
rtk npm run program:build-candidate -- --output artifacts/build/candidate/suite-b
rtk npm run program:test-candidate-sbf -- --build artifacts/build/candidate/suite-a
rtk npm run program:inspect-candidate -- --build artifacts/build/candidate/suite-a
rtk npm run program:reproduce-candidate -- --left artifacts/build/candidate/suite-a --right artifacts/build/candidate/suite-b
rtk npm run cost:verify -- --build-record artifacts/build/candidate/suite-a/build-record.json --network devnet
rtk npm run readiness:no-mainnet -- --build artifacts/build/candidate/suite-a --evidence-root artifacts/independent-evidence
rtk git diff --check
rtk git status --porcelain
```

Expected: Rust and Node tests pass; schemas/assets/SBF output reproduce; the
program exposes only the reviewed surface; the binary is no larger than
120,000 bytes; every modeled canonical-funder prefix is within one SOL; no
secret, test identity, or ignored session artifact is tracked in a
candidate/public path; active public material contains no LaunchLab, Raydium,
graduation, migration, LP, or platform-admin dependency.

Local suite completion is not launch readiness by itself. The objective remains
open until independent audits, independent reproduction, full devnet ceremony,
metadata and browser gates, and the final evidence-backed no-mainnet audit are
complete.
