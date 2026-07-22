# HakkyAgent final whole-branch fixes report

Date: 2026-07-23 (Asia/Bangkok)

## Scope and result

- Worktree: `C:\hakky-protocol\.worktrees\hakky-solana-pivot`
- Branch: `codex/hakky-solana-pivot`
- Reviewed base: `0befad104817fc6f0c9d04496f37f3b89b644f2b`
- Code HEAD before this report commit: `f236aa252f2b048bb88dc3cdd96e6d5d3903acce`
- Result: all five final whole-branch findings were implemented with regression-first evidence.
- Approved account destinations, token facts, generated assets, canonical proof paths, and prelaunch/live status were not changed.
- No push, deployment, X edit, wallet use, mainnet action, SOL spend, Hetzner access, faucet retry, or browser retry was performed.

The implementation was checked against both approved tracked designs:
`docs/superpowers/specs/2026-07-22-hakkyagent-naming-design.md` and
`docs/superpowers/specs/2026-07-22-hakky-solana-meme-coin-design.md`.

## Findings closed

### 1. Shared HakkyAgent claim boundary

- `src/agent-claim-boundary.mjs` is the shared implementation used by both the
  repository checker and identity test.
- Claim text is normalized with NFKC, format/zero-width/invisible/bidi
  characters are removed, and whitespace is collapsed before evaluation.
- The boundary rejects transaction good/bad/safe labeling, arbitrary-token
  auditing, scam prediction, removal of financial risk, universal/every/all
  transaction verification in verb and noun forms, scam detection/detector
  claims, and guaranteed safety or returns.
- Explicit local negations remain accepted for every prohibited class. FAQ
  questions remain questions rather than being treated as affirmative claims.
- `docs/TOKEN.md` and `src/social-copy.mjs` are now active identity/claim
  surfaces. Historical specifications remain outside the active rule.

### 2. Tracked secret scan

- Current fine-grained and classic GitHub token prefixes are recognized with
  conservative alphanumeric/underscore bodies and length floors. Synthetic
  fixtures construct the prefixes and nonfunctional bodies from fragments.
- Multiline YAML credential values are checked when a sensitive key is followed
  by an indented plain scalar, an indented block marker, or a standard block
  scalar.
- Placeholder values, exact environment references, unrelated fields, and
  nested containers remain accepted. A standard placeholder block is not
  misclassified.
- The existing ordered assignment/dataflow checks and tracked-file-only scope
  remain intact. No external scanner dependency was added.

### 3. Public metadata host policy

- HTTPS metadata hosts ending in a dot are rejected, including loopback names
  whose suffix could otherwise bypass the `localhost` checks.
- Complete live-record tests cover WHATWG-normalized IPv4 shorthand, integer,
  hexadecimal and octal loopback forms, private shorthand, and IPv4-mapped IPv6
  loopback forms.
- Current public HAKKY and ordinary public HTTPS metadata URLs continue to pass.

### 4. Proof publication commit point

- The exclusive hard link is the publication commit point. Before that point,
  errors still fail and no successful publication is reported.
- After the hard link succeeds, an owned-temp unlink failure returns
  `published: true` with `TEMP_UNLINK_FAILED`, the owned temporary path, and
  explicit `Do not retry publication` guidance.
- The verifier CLI prints the warning and exits zero because canonical bytes are
  already published; it no longer describes that outcome as a pre-publication
  failure.
- Temp ownership is tracked only after the exclusive `wx` open succeeds. A
  pre-existing temp-name collision is preserved and never unlinked.
- Create-once behavior remains enforced: an existing canonical proof still
  raises `EEXIST` and retains its original bytes.

### 5. Retired display-name enforcement

- Active display-name scanning now uses NFKC, format/invisible/bidi removal,
  case folding, and a compact Unicode letter/number identity key.
- Mixed-case, lowercase, fullwidth, zero-width, and bidi variants of the retired
  project name, mascot label, and numbered badge are rejected.
- The four approved lowercase account-address forms are masked only after their
  exact raw spelling and conservative punctuation boundary pass. Mixed-case or
  invisible address/name variants do not inherit that exception.

## TDD evidence

All shell commands were run through RTK. Production changes followed the
corresponding failing regression.

- Claim boundary RED: focused identity/repository run reported 30 tests, 27
  passed and 3 failed at the missing prohibited-class and active-surface gates.
  GREEN: 30/30.
- Expanded universal-verification wording RED: 1 of 2 focused claim tests
  failed. GREEN: 2/2.
- Secret scan RED: repository-hygiene reported 27 tests, 25 passed and 2 failed
  for current GitHub formats and multiline YAML. GREEN: 27/27.
- Standard YAML placeholder block RED: 1 of 2 multiline-YAML tests failed.
  GREEN: 2/2.
- Metadata host RED: launch-policy reported 15 tests, 14 passed and 1 failed on
  trailing-dot loopback. GREEN: 15/15.
- Publication warning RED: both new committed-publication tests failed. GREEN:
  2/2, followed by the full mint-proof suite at 22/22 before the ownership
  refinement.
- Exclusive temp ownership RED: 0/1. GREEN: 1/1.
- Retired identity normalization RED: 0/1. GREEN: 1/1; final standalone
  repository-hygiene suite: 28/28.
- Final combined focused suite: 73/73.

## Final verification

Two final repetitions were run from the final code state:

1. `rtk npm ci` - passed; 165 packages installed.
2. `rtk npm run assets` - passed with no generated-file drift.
3. `rtk npm run check` - passed; 126 tests, 0 failures; repository and site
   checks both clean.

The complete sequence passed twice with the same 126/126 result.

Additional fresh checks:

- `rtk proxy node --test test/hakkyagent-identity.test.mjs test/repository-hygiene.test.mjs test/launch-policy.test.mjs test/mint-proof.test.mjs` - 73/73.
- `rtk npm run check:repo` - `{ "ok": true, "violations": [] }`.
- `rtk npm run check:site` - `ok: true` with empty missing, policy, safety, and
  canonical issue arrays.
- `rtk proxy node --check` - passed for all nine changed JavaScript source,
  script, policy, and test files.
- Workflow structural test - 1/1 passed for no manual Pages dispatch and the
  reusable quality dependency.
- `rtk git diff --check 0befad104817fc6f0c9d04496f37f3b89b644f2b` - passed.
- Full-range code diff before this report: 9 files, 439 insertions and 33
  deletions.
- Generated assets, `package-lock.json`, `web/data/launch.json`, and canonical
  mainnet proof paths had no diff.

## Commits and files

- `ac08563488975ae27fdd0622d303b5712ef8193f` - `ci: harden identity and secret boundaries`
- `11e2803bdf0e8ffad2261bae5817936327f8c5f7` - `launch: reject normalized private metadata hosts`
- `f236aa252f2b048bb88dc3cdd96e6d5d3903acce` - `verify: report committed proof cleanup warnings`
- This report is committed separately after its contents are verified.

Changed code/test files:

- `src/agent-claim-boundary.mjs`
- `scripts/check-repo.mjs`
- `test/hakkyagent-identity.test.mjs`
- `test/repository-hygiene.test.mjs`
- `web/lib/launch-policy.js`
- `test/launch-policy.test.mjs`
- `src/proof-output.mjs`
- `scripts/verify-token.mjs`
- `test/mint-proof.test.mjs`

## Decisions and residual observations

- The YAML addition is deliberately narrow and line-structured rather than a
  heavy parser: it covers the required scalar/block forms while preserving the
  existing false-positive and dataflow behavior.
- Bracketed IPv6 metadata hosts remain conservatively rejected; no public-host
  allowance was broadened in this fix.
- The project remains intentionally prelaunch. No canonical mainnet mint or
  LaunchLab proof was created or tracked.
- `npm ci` continues to report 8 dependency vulnerabilities (5 moderate, 3
  high) and the upstream `uuid@8.3.2` deprecation warning. Dependency upgrades
  were outside this bounded pass.
- Solana tests continue to emit the existing pure-JavaScript bigint fallback
  warning; all affected tests pass.
