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
`solana-program` 3.0.0, classic SPL Token 9.0.0 / interface 3.0.0,
Metaplex Token Metadata client 5.1.1, Node.js 22-compatible ESM,
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

### Program plan owns

```text
Cargo.toml
Cargo.lock
rust-toolchain.toml
.cargo/config.toml
programs/hakky-market/**
scripts/generate-devnet-release-config.mjs
scripts/build-hakky-sbf.mjs
scripts/inspect-hakky-program.mjs
test/release-config.test.mjs
test/program-surface.test.mjs
```

### Client/proof/site plan owns

```text
src/hakky-*.mjs
src/immutable-program-proof.mjs
src/canonical-proof.mjs
src/schema-validation.mjs
src/solana-wire.mjs
schemas/proof/immutable-program-v1.schema.json
schemas/proof/hakky-market-v1.schema.json
schemas/proof/hakky-pool-v1.schema.json
schemas/web/launch-v3.schema.json
scripts/hakky-client.mjs
scripts/verify-immutable-program.mjs
scripts/verify-hakky-market.mjs
scripts/verify-hakky-pool.mjs
scripts/build-curve-live-record.mjs
scripts/build-pool-live-record.mjs
scripts/build-unavailable-record.mjs
web/**
test/*hakky*.test.mjs
test/*immutable*.test.mjs
test/solana-wire.test.mjs
test-support/immutable-curve-pool-fixtures.mjs
```

### Release/devnet plan owns

```text
Containerfile.sbf
src/release-manifest.mjs
src/cost-ledger.mjs
schemas/release/**
scripts/verify-sbf-reproduction.mjs
scripts/build-cost-ledger.mjs
scripts/rehearse-immutable-devnet.mjs
scripts/verify-image-ipfs.mjs
.github/workflows/quality.yml
.github/workflows/pages.yml
README.md
SECURITY.md
CONTRIBUTING.md
docs/LAUNCH.md
docs/TOKEN.md
proof/README.md
launch/**
```

Shared files `package.json`, `package-lock.json`, `scripts/check-repo.mjs`, and
`scripts/check-site.mjs` are edited only in the explicitly ordered integration
tasks below.

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

- [ ] **Wave 1: Program Tasks 1-3**

  Establish the pinned toolchain contract, ignored devnet release-config
  ceremony, constants, exact codecs, state layout, and independently tested
  curve/pool arithmetic.

- [ ] **Wave 2: Program Tasks 4-7**

  Implement validation, fixed CPIs, atomic initialization, curve swaps,
  one-way transition, pool swaps, hostile-account behavior, and exact SBF
  lifecycle tests.

- [ ] **Wave 3: Program Task 8**

  Produce the SBF binary, enforce the 120,000-byte ceiling, inspect the closed
  instruction/CPI surface, and export reviewed Rust vectors.

- [ ] **Wave 4: Client/Proof/Site Tasks 1-4**

  Implement independent JavaScript constants, PDAs, codecs, BigInt math, state
  decoding, RPC reads, transaction builders, mandatory previews, and the
  no-secret unsigned CLI.

- [ ] **Wave 5: Client/Proof/Site Tasks 5-7**

  Replace LaunchLab schemas and proof builders, migrate lifecycle records, and
  remove obsolete active Raydium/LaunchLab code only after replacements pass.

- [ ] **Wave 6: Client/Proof/Site Tasks 8-10**

  Add the direct trading UI, exact metadata JSON gate, public copy, and full
  repository/site checks.

- [ ] **Wave 7: Release/Devnet Tasks 1-3**

  Add reproducible container builds, binary/release manifests, cost-prefix
  ledger, immutable program/market/pool proof commands, and CI.

- [ ] **Wave 8: Release/Devnet Task 4**

  Generate a fresh devnet payer/program ID/nonce, obtain only free devnet SOL,
  deploy/finalize/initialize the exact candidate, exercise representative
  curve and pool operations, and produce devnet proofs. More than 24 devnet
  SOL plus rent/fee headroom is required; unavailable free funding is a
  recorded external blocker, not permission to buy SOL.

- [ ] **Wave 9: Release/Devnet Tasks 5-7**

  Complete the separately approved image-only Pinata workflow when
  authenticated, two-gateway byte verification, local browser QA at
  `1440x1000` and `390x844`, operator documentation, and the final no-mainnet
  audit.

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
rtk npm run program:build
rtk npm run program:inspect
rtk npm run program:reproduce
rtk npm run cost:verify
rtk git diff --check
rtk git status --short --branch
```

Expected: Rust and Node tests pass; schemas/assets/SBF output reproduce; the
program exposes only the reviewed surface; the binary is no larger than
120,000 bytes; every modeled canonical-funder prefix is within one SOL; no
secret or ignored session artifact is tracked; active public material contains
no LaunchLab, Raydium, graduation, migration, LP, or platform-admin dependency.

Local suite completion is not launch readiness by itself. The objective remains
open until independent audits, independent reproduction, full devnet ceremony,
metadata and browser gates, and the final evidence-backed no-mainnet audit are
complete.
