# HAKKY independent review handoff

This handoff covers three separate external gates:

1. independent Solana security audit;
2. independent economic and integer-math review; and
3. third-party reproducible build.

It prepares review material only. It does not authorize publication, wallet
access, signing, spending, deployment, initialization, or any devnet or
mainnet mutation.

## Canonical review identity

Use the selected candidate under:

- `artifacts/build/candidate/final-a/hakky_market.so`;
- `artifacts/build/candidate/final-a/build-record.json`; and
- `artifacts/build/candidate/final-a/runtime-receipt.json`.

The authoritative source commit, source archive hash, build-record hash,
candidate hash, candidate byte length, design hash, release-config hash, curve
vector hash, and authority-registry hash are recorded in each class-specific
`scope.json`. Do not copy those values into a review report by hand.

The following values must agree before review starts:

- `sourceCommit` across the build record, final-suite receipt, runtime receipt,
  browser-QA receipt, all three review scopes, and readiness report;
- `executableSha256` and `executableLength` across the build record, runtime
  receipt, reproduction receipt, all three review scopes, and readiness report;
  and
- `sourceArchiveSha256` across all three review scopes.

Any mismatch invalidates the package.

## Reviewer packages

Each reviewer receives one class-specific package:

- `artifacts/reviewer-handoff/security-audit.tar`;
- `artifacts/reviewer-handoff/economic-review.tar`; or
- `artifacts/reviewer-handoff/independent-reproduction.tar`.

Every package contains:

- the class-specific `scope.json`;
- the exact `source.tar` bound by that scope;
- the selected candidate executable;
- its clean build record and exact-runtime receipt;
- the two-local-build reproduction receipt;
- the final-suite receipt;
- the authority registry; and
- a package manifest containing the byte length and SHA-256 of every included
  file.

The package is a transport wrapper. `scope.json` remains the canonical review
identity.

## Security audit

The security reviewer must inspect the complete source archive and exact
candidate scope, including:

- instruction decoding and account-meta validation;
- signer and PDA derivation requirements;
- mint, freeze, metadata, program-upgrade, vault, and pool authorities;
- supply and allocation invariants;
- curve-to-pool lifecycle and one-way stage transitions;
- arithmetic bounds, rounding, slippage, stale-state, replay, and malformed
  input behavior;
- privilege, withdrawal, fee, and recovery routes;
- CPI program identities and executable ownership checks; and
- the actual Metaplex executable/prefund lane when that separate proof becomes
  available.

The returned result must close every finding or mark the release as failed.

## Economic and integer-math review

The economic reviewer must independently recompute:

- 10,000,000 HAKKY display supply at six decimals;
- 8,000,000 HAKKY curve allocation;
- 2,000,000 HAKKY permanent-pool seed;
- zero creator/team allocation and zero presale;
- zero curve fee and 0.25% pool-retained fee;
- every checked integer formula, rounding direction, minimum-effective-input
  threshold, terminal curve state, and pool invariant;
- absence of a creator or protocol fee destination; and
- the creator-funded one-SOL cap model, including every failure prefix.

The reviewer must use the canonical vector and release configuration embedded
in `source.tar`, not a separately supplied spreadsheet or prose summary.

## Independent reproduction

The third builder must:

1. use the exact `source.tar` and its recorded SHA-256;
2. build with the digest-pinned image and locked/offline dependency set stated
   by the build record;
3. avoid using either local `final-a` or `final-b` output as a build input;
4. record the produced executable byte length and SHA-256; and
5. compare the produced bytes with the candidate hash in `scope.json`.

The build counts as independent only when performed by an authenticated party
outside the local controller identity.

## Authenticated result requirements

Before accepting any result, add the engaged reviewer to
`config/independent-evidence-authorities-v1.json` with:

- a stable authority ID and organization;
- the single authorized evidence class;
- an HTTPS source origin and exact evidence path prefix;
- an Ed25519 public key;
- a SHA-256 commitment to the engagement terms; and
- the UTC engagement-approval time.

Regenerate all three scopes after changing the registry. A result is accepted
only when it is:

- hosted at the registered HTTPS origin and path;
- signed by the registered Ed25519 key;
- bound to the exact class-specific scope hash;
- explicit about pass/fail status and findings; and
- consumed successfully by the no-mainnet readiness evaluator.

Do not register a placeholder, shared operator key, anonymous reviewer, or
self-issued evidence as independent evidence.

## Findings and rebuild rule

Any source, configuration, vector, dependency, or build change made to resolve
a finding creates a new candidate. Archive the superseded evidence, rebuild
twice from the new final commit, rerun the complete suite and exact-candidate
runtime, regenerate all scopes and packages, and require the reviewers to bind
their closure to the new hashes.

No external report, however favorable, authorizes a launch action.
