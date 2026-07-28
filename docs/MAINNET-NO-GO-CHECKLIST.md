# HAKKY mainnet no-go checklist

Snapshot date: 2026-07-28 (Asia/Bangkok)

HAKKY remains prelaunch. This checklist records preparation; it does not
authorize a wallet connection, signature, transaction, payment, upload,
deployment, initialization, website publication, official-address
publication, or social post.

## Current candidate identity

- Candidate program ID:
  `Bp5ULfE8tLo7X24kHxWhUmRmWWzD9HdpNa7wxipngfxc`
- Candidate executable: `hakky_market.so`
- Executable length: `107784` bytes; release ceiling: `120000` bytes
- Executable SHA-256:
  `a4c0be6ed7c7bb131aae255e421d978b9726e1254a704dcc8f7adbf19f35d3aa`
- Digest-pinned build image:
  `solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68`
- Reproduced clean source commit: read `sourceCommit` from the selected
  `final-a` build record and require the same value in the final-suite,
  runtime, scope, browser-QA, and readiness receipts.
- Local build records:
  `artifacts/build/candidate/final-a/build-record.json` and
  `artifacts/build/candidate/final-b/build-record.json`
- Byte-comparison receipt:
  `artifacts/build/candidate/reproduction-v1.json`
- Exact candidate runtime receipt:
  `artifacts/build/candidate/final-a/runtime-receipt.json`
- Machine no-mainnet report:
  `artifacts/readiness/no-mainnet-v1.json`

The two local builds are byte-identical. They use separate clean directories
under one local controller identity; they are not an independent third-party
reproduction. The selected `final-a` binary passed the exact candidate
ProgramTest decoder surface in a pinned Rust 1.95.0 container with networking
disabled, no native processor fallback, and no repository, vendor, or Cargo
home bind mount. The final reviewed build, full-suite receipt, browser-QA
receipt, independent-review scopes, and readiness report must all name the
same final source commit.

## Current creator-cost evidence

The latest read-only finalized devnet snapshot collected at
`2026-07-27T17:37:30.366Z` measured:

- permanent rent: `767242560` lamports;
- deployment writes: `120`;
- maximum creator-funded prefix: `770477560` lamports;
- cap: `1000000000` lamports; and
- headroom: `229522440` lamports.

That receipt was fresh when the machine readiness report was generated. Cost
receipts are freshness-qualified for fifteen minutes and become historical
afterward. Run `npm run cost:verify -- --build-record
artifacts/build/candidate/final-a/build-record.json --network devnet` again
immediately before any cost review. A fresh result above the cap is a stop
condition.

## Technical gates

- [x] Approved meme-first cyber-tactical design remains locally implemented.
- [x] The call sign opens the experience:
  “We are not anonymous. We are HAKKY. And the whole wide world just. got.
  sacked.”
- [x] The privacy-safe Reddit lore ledger contains 1,490 written items and
  excludes music videos.
- [x] Token image and metadata bytes are fixed locally.
- [x] Native Rust, exact SBF, clippy, formatting, size, surface, and fuzz
  checks have successful local evidence for the recorded candidate hash.
- [x] The exact `final-a` candidate runtime passed all 256 first-byte decoder
  probes plus malformed-length rejection with no host bind mounts.
- [x] Two clean local candidate builds are byte-identical.
- [x] The one-SOL prefix model covers every deployment-write failure,
  abandoned buffer/program, initialization failure, and success path.
- [x] The image-only IPFS verifier is closed to one CID file, two fixed
  gateways, bounded streamed bytes, and no wallet/payment input.
- [x] A final full-suite receipt passes against the selected candidate source
  commit and is machine-validated by the no-mainnet readiness evaluator.
- [ ] A third authenticated builder must reproduce the final `.so` bytes.
- [x] Candidate-bound request scopes are prepared for the third reproduction,
  independent Solana security audit, and independent economic/math review.
- [x] The reviewer handoff defines exact inputs, hash checks, signed-result
  requirements, and fail-closed return paths for all three reviews.
- [ ] The reviewed Metaplex executable must be bound to its deployed program
  and exercised in the exact-SBF prefund lane.
- [ ] The full immutable deploy/finalize/initialize/curve/pool lifecycle must
  pass on free devnet SOL with finalized readback and zero automatic retry.
- [x] The creator-cost receipt was fresh when the current readiness report was
  generated and measured below one SOL; refresh it immediately before any
  later cost review.
- [ ] An independent Solana security reviewer must sign the exact final
  source/config/binary scope and close all findings.
- [ ] An independent economic/math reviewer must sign the exact final
  formulas/vectors/economic scope and close all findings.
- [ ] Findings must be resolved before a final clean rebuild and complete
  regression run.

## Content and publication gates

- [ ] Upload exactly `web/assets/token.png` through the separately approved
  image-only Pinata flow; stop on any wallet, payment, directory, or broader
  access request.
- [ ] Record the returned canonical CID and pass the two-gateway byte verifier.
- [ ] Rebuild the exact metadata JSON only if its approved CID binding changes.
- [ ] Publish metadata to the exact HTTPS path and pass byte-for-byte readback.
- [x] A dated local browser-QA receipt covers `1440 x 1000` and `390 x 844`
  with no overflow, console error, page error, failed request, wallet/trading
  control, or trade destination. The screenshots, observation, and receipt
  remain ignored local evidence under `artifacts/qa/`.
- [ ] Obtain separate approval to push the exact reviewed commit.
- [ ] Obtain separate approval to create or update a pull request.
- [ ] Obtain approval that explicitly names both merge and automatic website
  deployment.
- [ ] Read back the public site before publishing any official address.
- [ ] Obtain separate approval to publish official addresses.
- [ ] Obtain separate approval for each social profile save, post, or pin.

## Mainnet action gates

The following approvals are action-time approvals. A design approval, code
approval, review approval, or earlier cost approval cannot satisfy them.

- [ ] Approve the exact mainnet deployment transaction envelope and maximum
  creator-funded debit.
- [ ] After finalized binary readback, separately approve permanent removal of
  the program upgrade authority.
- [ ] After finalized null-authority readback, separately approve the exact
  immutable market initialization transaction and its remaining debit.

After every submitted signature, record it before polling. An unknown result
must be reconciled at finalized commitment. Do not automatically retry, create
a replacement token, fall back to mainnet from devnet, or use paid SOL for the
free-devnet rehearsal.

## Release decision

**NO-GO for mainnet effects and public launch.**

The machine report currently passes program binding, the complete source-bound
test suite, exact candidate runtime, binary size, two local reproductions,
creator-cost cap at report time, desktop/mobile browser QA, and operator
handoff. It keeps the third-party reviews, actual-Metaplex prefund proof,
devnet lifecycle, IPFS, metadata readback, finding resolution/final rebuild,
publication, and action-time approvals open. These gates are mandatory.
