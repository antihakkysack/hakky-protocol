# HAKKY launch proof

**HakkyAgent verifies the facts. You decide the risk.**

HakkyAgent verifies only the published HAKKY launch facts backed by this
repository's deterministic checks and canonical evidence. Its scope does not
include judging arbitrary transactions, certifying any token or transaction as
safe, detecting every scam, giving financial advice, or promising returns.

No mainnet proof exists before launch. A proof is publishable only after the
read-only verifier reports `ok: true` and the Raydium launch configuration has
been read back from the official launch page and transaction receipt.

The verifier confirms that its RPC endpoint reports the mainnet-beta genesis
hash before it reads the mint. Proof files contain public addresses and public
RPC hostnames only. They must never contain wallet secrets, authenticated RPC
URLs, or private RPC query parameters.

Before publication, cross-check the proof file's exact `creator` address
against the independently approved creator address in the Raydium LaunchLab
configuration or session receipt. The verifier records the wallet whose token
accounts it summed; it cannot discover or approve the intended creator wallet
on its own.

`mainnet-mint.json` and `mainnet-launchlab.json` use strict schema version `2`.
`mainnet-graduation.json` uses strict schema version `1`. Canonical proof files
are append-only and are written only after every evaluated check passes; a
failed verification may print sanitized public evidence but must not occupy a
canonical path. Creator balances include initialized and frozen classic token
accounts only after each account's decoded mint and owner match the exact
requested identities. Uninitialized, invalid-state, wrong-program, wrong-mint,
or wrong-owner accounts fail verification.

LaunchLab instruction, PDA, and account decoding is pinned to
`@solana/web3.js@1.98.4`, official Raydium
SDK V2 commit `fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c`, official Raydium IDL
commit `e7e0c96fe77bcf6a020b84a44c47a722aac8e359`, and
official Raydium docs commit
`10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc` path
`products/launchlab/platform-config.mdx` (Git-blob SHA-256
`e048a0b3caf3cd8b543a8fd143897b4cdb5ea2de2f8ad58fb93d0837f6486b92`), plus
`@solana/spl-token@0.4.15` (official `solana-program/token-2022` commit
`27c359d1c7d38afdec293720dba4b768aa61aeb7`). The fixed mainnet LaunchLab program is
`LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`. Fixtures under
`test-support/fixtures/launchlab/` are deterministic encodings derived from
the named source paths and line ranges. Every fixture carries an exact
`sourceReferences` array whose repository, commit, path, line range, and purpose
cover its fixed identities, PDA derivations, discriminator/instruction contract,
and applicable raw layouts; live API responses and unpinned branch content are
not evidence. Any upstream commit, IDL, layout, discriminator, account privilege,
seed, program, or SPL Token version change requires a separate source-drift
review and regenerated RED/GREEN fixture proof before it can be accepted.
Keep these versions plus `entities@8.0.0` pinned. Do not run
`npm audit fix --force`; recheck the two documented upstream exceptions by
2026-08-23.

Task 2's corrected raw interface consumes classic SPL token accounts and therefore
exercises only `AccountLayout` (`clients/js-legacy/src/state/account.ts:54-84`).
It has no mint-account input. The exact 82-byte `MintLayout` path is intentionally
not claimed here and remains a downstream Task 6 source pin; adding an unused mint
decoder would broaden this interface without evidence from a current input.

At these pinned revisions, the sole reviewed HAKKY query is exact `cpmm` /
`0` platform / `0` creator / `1000000` burn. The official docs semantics map
that tuple to Burn & Earn with 0/0/10000 basis points, no creator or platform
Fee Key, no withdrawal right, and no fee recipient. The result is immutable
and exact-query-only: operator input, Raydium API data, extra fields, and every
other tuple remain rejected. Graduation account decoding remains raw-only and
does not by itself prove a later on-chain locked quantity or account identity.
PlatformConfig authority decoding likewise consumes transaction-derived metas
and fee payer, including the reviewed pinned-SDK writable CPMM-config privilege
at creation and only the exact fee-payer promotion allowed for updates.

Proof lifecycle is `prelaunch` -> `curve-live` -> `graduated`. Curve proof
requires the exact LaunchLab PDA mint authority and a finalized, time-qualified
creator balance observation. Graduated proof requires null mint/freeze
authorities. The 24 SOL configured minimum is distinct from the observed
graduation balance. CPMM Burn & Earn permanent lock is not an SPL burn, and a
non-full-lock LP disposition can never enter verified proof. A mutable
PlatformConfig, absent raw unsigned transaction, or non-atomic immutable
metadata is also a hard stop.

## Immutable metadata evidence

Metadata proof is prepared in three fail-closed local stages. `metadata:prepare`
pins the approved 74,230-byte image and its SHA-256, builds the fixed HAKKY JSON
with canonical key order/LF/trailing newline, writes both leaves exclusively,
and commits `draft-manifest.json` last. `metadata:finalize` accepts only a raw
canonical CIDv1/raw/sha2-256 IPFS URI or exact Arweave transaction identity,
rehashes both local leaves, recomputes the full canonical metadata bytes, and
writes `manifest.json` without uploading. `metadata:verify` performs only
bounded manual-redirect HTTPS `GET` requests and writes `readback.json` only
after both remote byte lengths and SHA-256 digests exactly match the validated
manifest. One overall 15-second `AbortController` deadline covers fetch,
redirect, and body reads. Native bodies are streamed through the 74,230-byte
maximum and cancelled on overflow; `arrayBuffer()` is permitted only when an
exact trustworthy `Content-Length` proves the body is bounded first.

All five leaves under `artifacts/metadata/` are ignored and fixed-path. Writers
are no-clobber and exact-byte idempotent. A raw IPFS CID must embed the digest of
the exact bytes before prepare, finalize, or readback can proceed; an Arweave
transaction ID is treated as an exact content identity and remote equality is
still mandatory. Same-provider redirects may not change hostname, canonical
path, or content identity. The readback creator-payment record is always the
contract constant `{ "signature": null, "debitLamports": "0" }`.

Artifact publication accepts only the verified repository root plus one fixed
relative metadata path and repeats `lstat`/`realpath` confinement immediately
before temporary creation, before the hard-link commit, and after commit. The
workspace must be trusted and exclusively controlled for the command duration.
This does not claim race-free sandboxing against a privileged concurrent local
process because Node lacks portable handle-relative `openat`/link operations;
stop if exclusive control is false. Permanent tests assert the five leaves stay
ignored and untracked, while current absence is a one-time controller check
before the separately approved provider workflow.

Image and metadata uploads remain separately approved browser/provider actions.
The selected flow must not connect a Solana wallet or request SOL, token, or
on-chain payment; if it does, stop and revise the reviewed plan before upload or
readback. The later creation instruction must consume the exact verified
metadata URI and set `isMutable: false` atomically. A manifest or readback is
evidence only and never carries approval into wallet connection, signing, spend,
publication, or any other action.

## Unsigned LaunchLab preview evidence

The ignored `artifacts/mainnet-session/official-origin.json` and
`wallet-readiness.json` receipts are fresh public evidence, not approval. The
origin verifier accepts only `https://raydium.io`, binds the official
documentation bytes and documented LaunchLab program ID, and expires after 30
minutes. Official documentation may use chunked transfer: its native body is
streamed through a 512,000-byte ceiling, while a declared content length must
also be canonical and exact. Wallet readiness binds the exact visible creator
address, finalized mainnet genesis, finalized balance and slot, fixed one-SOL
requirement, and lowercase public RPC hostname; it expires after five minutes.

The preview consumes the exact raw unsigned transaction from the official flow.
If those bytes cannot be obtained before signing, stop; never use a screenshot
or SDK recreation. It resolves finalized lookup-table bytes, rejects any
signature or transaction drift, preserves every program/signer/account meta,
reads the exact finalized pre-state, and simulates with
`replaceRecentBlockhash: false`. The same outer InitializeV2 instruction must
contain exactly one direct stack-height-2 CreateMetadataAccountV3 CPI matching
the hashed manifest/readback with `isMutable: false`.

The exact HAKKY CPMM query now returns the immutable
`source-coverage-verified` result backed by the pinned official Raydium docs.
Only when every independent identity, metadata, receipt, state, simulation,
debit, and policy check also passes may the verifier emit `preview.json` and
`approval-envelope.json`. A UI setting, screenshot, API result, current
PlatformConfig value, different scale tuple, or operator-authored override
cannot replace the exact source-covered result.

## Mainnet session receipt

The ignored `artifacts/mainnet-session/session-receipt.json` is an evolving
public evidence ledger, not canonical launch proof or approval. Its immutable
root binds the preview transaction, creator, mint, launch ID, metadata manifest
and readback hashes, exact zero metadata-payment baseline, and one-SOL debit
cap. Atomic replacement occurs only after the full prior receipt and next event
validate.

Operation events have strict prepared, submitted, visible-pending,
visible-failed, finalized-success, and finalized-failed transitions. A
pre-submission wallet rejection can be terminal; a post-submission display or
RPC failure cannot. The canonical signature remains pending until finalized
readback supplies a slot and transaction hash. Global sequence, timestamps,
operation identity, purpose, signature, and baseline-plus-latest-operation
debit accounting are monotonic.

The recovery decoder registry is frozen and empty. Every transaction produces
`recovery-operation-unsupported`, so no generic signer/program/transfer/cost
classification and no recovery envelope can be emitted. Enabling one recovery
requires a separate source-pinned decoder and fixture review for that exact
operation. The session command has no approval, signing, sending, or retry
surface, and a receipt never carries action-time approval into another effect.

## Reviewed proof release order

For every curve-live or graduated verified/unavailable transition, start from
finalized stage evidence and validate any content-addressed continuity receipt.
Build verified only from the complete canonical artifact set; otherwise publish
the same-stage unavailable record and its append-only receipts. Never regress a
stage.

Run the complete local gate and both viewport checks, then present exact
base/head SHAs, artifact hashes, stage, availability, and commands for separate
push approval. Obtain a second approval before PR create/update and require
exact-head quality. Obtain a third approval that expressly names both merge and
automatic main Pages deployment. Read back Pages at 1440 x 1000 and 390 x 844.
Finally, obtain separate X post and pin approvals and read back both. A failed
post-chain readback permits only a newly reviewed same-stage unavailable
rollback; unavailable-to-verified recovery requires the complete artifacts and
the entire release sequence again.

The LaunchLab artifact includes the exact metadata image, website, X link, and
canonical Solscan transaction URL in addition to the fields in `docs/LAUNCH.md`.
For a verified curve-live website, both artifacts must exist with `ok: true`,
match the web record exactly, and satisfy mint-check time <= LaunchLab-check
time <= the operator's publication time. The publication time is a command
gate, not a public fact. Prelaunch keeps `token.mint` and `proof` null and does
not require either canonical file. A known lifecycle stage whose canonical
proof cannot be completed uses the exact identity-free
`availability: "unavailable"` branch and retained ignored continuity receipts.

Do not copy proof fields into the web record manually. Once both artifacts are
valid, use
`npm run build:curve-live-record -- --published-at <exact-ISO-8601-UTC-timestamp>`
so the supported curve-live schema is generated and cross-checked before
`web/data/launch.json` is atomically replaced. For an independently observed
stage whose canonical proof is unavailable, use
`npm run build:unavailable-record -- --stage-evidence <ignored-json-path>`;
the command publishes both content-addressed ignored receipts before replacing
the identity-free public record.
