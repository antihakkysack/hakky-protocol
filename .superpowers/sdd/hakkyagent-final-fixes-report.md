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

---

# Consolidated reviewer closure: inline YAML and WHATWG references

Date: 2026-07-23 (Asia/Bangkok)

## Scope and result

- Follow-up base: `ce428851e8bd3f7462e98cd9228e1aa87b219da5`.
- Code commit: `5d7fa816d9c9aa6c7103eda027035af061b7878f`
  (`security: close YAML and entity bypasses`).
- Scope stayed frozen to the two consolidated reviewer findings: same-line
  YAML sequence mapping credentials and standards-complete detection-only HTML
  character-reference normalization.
- Approved product facts, literal X/GitHub account destinations, public copy,
  and prelaunch state were not changed.
- No push, deployment, post, funding, transaction, wallet, devnet, mainnet,
  Hetzner, or browser-control action was performed.

## Findings closed

### Inline YAML sequence mapping credentials

- The ordinary same-line assignment scanner now receives YAML context and
  accepts one or more YAML sequence markers as the boundary before a mapping
  key. This covers root, indented, quoted-key, and nested-list forms such as
  `- api_key: <opaque value>` and `- - api_key: <opaque value>`.
- The exception is enabled only for `.yaml` and `.yml` files; the general
  assignment grammar was not broadened for other source formats.
- Existing credential-name classification and value policy are reused without
  a parallel allowlist. Placeholders, environment references, maps, sequences,
  and unrelated noncredential properties remain allowed.

### Standards-complete rendered character references

- Replaced the partial local alias table with exact `entities@8.0.0`, pinned in
  `package.json` and `package-lock.json`. The dependency supplies the complete
  WHATWG named-character-reference table and maintained HTML decoding logic.
- Detection normalization calls `decodeHTML` in its default legacy text mode,
  matching browser text parsing for named references and numeric references
  with or without semicolons. Decoding remains single-pass and detection-only.
- Regressions cover `NegativeMediumSpace`, `ExponentialE`, arbitrarily long
  legal leading-zero decimal and hexadecimal references, and the requested
  missing-semicolon `&#101ry` form.
- The repository-level regressions exercise both prohibited HakkyAgent claims
  and retired identity markers. Literal approved X and GitHub destinations are
  still masked before decoding, while encoded/extended aliases remain rejected.
- Primary semantics: WHATWG HTML Living Standard character-reference parsing
  states and normative named-character-reference table:
  https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
  and https://html.spec.whatwg.org/multipage/named-characters.html.
- Decoder source: https://github.com/fb55/entities.

## TDD evidence

- YAML RED: the two focused tests reported 1 pass and 1 failure. All four
  unsafe root/indented/nested/quoted list mappings returned no violations,
  proving the same-line sequence prefix was the missing boundary.
- YAML GREEN: the same focused tests passed 2/2 after the YAML-only boundary
  change.
- Character-reference RED: the two focused identity/repository tests failed
  0/2. Only the earlier partial-table controls were detected; the complete
  named, long numeric/hex, and missing-semicolon probes bypassed detection.
- Character-reference GREEN: the same tests passed 2/2 after integrating the
  standards-complete decoder.
- Combined focused regressions passed 4/4. The complete affected identity and
  repository-hygiene suites passed 42/42.

## Final verification

All shell commands were run through RTK.

1. `rtk npm ci` - passed; 166 packages installed and 167 packages audited.
2. `rtk npm run assets` - passed.
3. `rtk npm run check` - passed; 135/135 tests, with repository and site
   checks both clean.
4. A second `rtk npm run assets` - passed with no generated asset drift.

Additional checks:

- `node --check` passed for `scripts/check-repo.mjs`,
  `src/rendered-text.mjs`, and both changed test modules.
- `git diff --check` and the staged code diff check passed.
- The dependency lock change is limited to the exact direct
  `entities@8.0.0` entry; the pre-existing extraneous lock entry was preserved
  to avoid unrelated lockfile churn.
- `npm ci` continues to report the existing 8 dependency vulnerabilities
  (5 moderate, 3 high), so the direct decoder addition did not increase the
  observed audit count.

## Residual gates and observations

- The project remains intentionally prelaunch. Canonical mainnet mint and
  LaunchLab proof artifacts are still absent and were not created.
- The bounded devnet rehearsal remains externally gated by public faucet
  availability; it was not retried.
- Desktop/mobile browser certification remains externally gated by the
  user-enabled ChatGPT Chrome Extension; it was not attempted.
- `npm ci` continues to emit the upstream `uuid@8.3.2` deprecation warning.
- Solana tests continue to emit the existing pure-JavaScript bigint fallback
  warning; all affected tests pass.

---

# Reviewer closure follow-up

Date: 2026-07-23 (Asia/Bangkok)

## Scope and result

- Follow-up base: `b99ab7e`.
- Confirmed reviewer findings closed: 4 Important, 0 Critical.
- Code commit: `4bdede951e979a8b0aed26049a83346598fb0f58`
  (`security: close final validation bypasses`).
- Scope stayed limited to tracked secret scanning, detection-only rendered-text
  normalization, public metadata host classification, and their regression
  fixtures. Approved public facts, account destinations, and prelaunch state
  were not changed.
- No push, deployment, post, funding, transaction, wallet, devnet, mainnet,
  Hetzner, or browser-control action was performed.

## Findings closed

### YAML sequence credential values

- Multiline YAML credential headers now accept an optional sequence-item
  prefix before a sensitive key.
- Both `- api_key:` followed by an indented scalar and `- api_key: |` followed
  by a block scalar are rejected when their values are opaque.
- List-item placeholders, environment references, and nested containers retain
  the existing allowlist behavior.

### Current GitHub installation tokens

- `ghs_` scanning now follows GitHub's current recommended body shape,
  `[A-Za-z0-9.\-_]{36,}`, without an obsolete upper length bound.
- A synthetic stateless JWT-shaped fixture longer than 520 characters, with
  two dots, hyphens, and underscores, is detected.
- Short values, unrelated prefixes, and values embedded inside a larger
  identifier remain false-positive controls.
- Primary source: GitHub Changelog, "GitHub App installation tokens:
  Per-request override header" (2026-05-15), including the May 26 regex update.

### Rendered character-reference bypasses

- Added a detection-only character-reference decoder for valid decimal,
  hexadecimal, relevant HTML/XML named, whitespace/invisible, punctuation,
  and compatibility mathematical-letter references.
- Shared HakkyAgent claim checking decodes before Unicode/invisible
  normalization, so rendered variants of `every` and `HakkyAgent` cannot bypass
  the prohibited-claim boundary.
- Retired display/account identity checking decodes after masking the exact
  literal approved account destinations. Encoded aliases are rejected, while
  the unchanged literal X and GitHub destinations remain allowed.
- Unknown named references remain literal and harmless encoded copy retains
  negative controls.

### Public metadata host policy

- Added an auditable pure-JavaScript host classifier shared by launch-policy
  validation. It rejects IANA special-use domain suffixes and subdomains,
  single-label hosts, invalid DNS label shapes, and trailing-dot hosts.
- IPv4 CIDRs cover this-network/private/link-local/loopback, CGNAT,
  protocol assignments, documentation, AS112/AMT/6to4 special blocks,
  benchmarking, multicast, future-use, and limited broadcast space.
- IPv6 accepts assigned global unicast space only and rejects IETF protocol,
  translation, discard/dummy, benchmarking, documentation, 6to4, AS112,
  returned 6bone, unique-local, link/site-local, multicast, and other reserved
  ranges.
- Current project hosts remain valid, and public IPv4/IPv6 controls pass.
  The previous passing `.test` fixture and `cdn.example.com` control were
  replaced with `cdn.hakky.xyz`; reserved example hosts are now negative cases.
- Registry basis: IANA IPv4/IPv6 Special-Purpose Address registries and IANA
  Special-Use Domain Names registry; RFC 6761 supplies the documented
  `.test`, `.localhost`, `.invalid`, and example-domain behavior.

## TDD evidence

- YAML/token RED: repository hygiene reported 30 tests, 28 passed and 2 failed
  at the intended list-item and long punctuated `ghs_` boundaries. GREEN:
  30/30.
- Rendered-entity RED: the combined identity/repository suite reported 40
  tests, 38 passed and 2 failed. GREEN: 40/40.
- Metadata RED: launch policy reported 17 tests, 14 passed and 3 failed for
  missing IPv4/special-domain rejection and public-IPv6 classification.
  GREEN: 17/17.
- Final focused integration: 72/72.

## Final verification

All shell commands were run through RTK.

1. `rtk npm ci` - passed; 165 packages installed.
2. `rtk npm run assets` - passed.
3. `rtk npm run check` - passed; 133/133, repository and site checks clean.
4. A second `rtk npm run assets` - passed with no generated drift.
5. After staging the two new tracked modules, a second complete
   `rtk npm run check` passed 133/133 with repository and site checks clean.

Additional checks:

- Standalone `check:repo`: `{ "ok": true, "violations": [] }`.
- Standalone `check:site`: `ok: true` with empty missing, issue, safety, and
  canonical arrays.
- `node --check` passed for all ten changed JavaScript modules and tests.
- `git diff --check` and staged diff checks passed.
- The second asset render left `launch/assets`, `web/assets`, `package-lock.json`,
  and `web/data/launch.json` unchanged.
- Code commit scope: 10 files, 394 insertions, 33 deletions.

## Residual gates and observations

- The project remains intentionally prelaunch. Canonical mainnet mint and
  LaunchLab proof artifacts are still absent and were not created.
- The bounded devnet rehearsal remains externally gated by public faucet
  availability; it was not retried.
- Desktop/mobile browser certification remains externally gated by the
  user-enabled ChatGPT Chrome Extension; it was not attempted.
- `npm ci` continues to report 8 dependency vulnerabilities (5 moderate, 3
  high) and the upstream `uuid@8.3.2` deprecation warning. Dependency upgrades
  remain outside this bounded closure.
- Solana tests continue to emit the existing pure-JavaScript bigint fallback
  warning; all affected tests pass.
