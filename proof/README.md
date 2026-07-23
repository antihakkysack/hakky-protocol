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

LaunchLab instruction, PDA, and account decoding is pinned to official Raydium
SDK V2 commit `fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c`, official Raydium IDL
commit `e7e0c96fe77bcf6a020b84a44c47a722aac8e359`, and
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

Task 2's corrected raw interface consumes classic SPL token accounts and therefore
exercises only `AccountLayout` (`clients/js-legacy/src/state/account.ts:54-84`).
It has no mint-account input. The exact 82-byte `MintLayout` path is intentionally
not claimed here and remains a downstream Task 6 source pin; adding an unused mint
decoder would broaden this interface without evidence from a current input.

At these pinned revisions, the HAKKY CPMM target has no source-covered LP-rights
approval path. The exact `cpmm` / `0` platform / `0` creator / `1000000` burn
query returns `source-coverage-unavailable` with reason
`cpmm-burn-scale-lp-rights-unmapped`. This is a hard stop: it cannot be replaced
by operator input, Raydium API data, or a semantic conclusion inferred from
current accounts. Graduation account decoding remains raw-only and returns no
LP disposition, burned/locked quantity, withdrawal-right, or fee-right claim.
PlatformConfig authority decoding likewise consumes transaction-derived metas
and fee payer, including the reviewed pinned-SDK writable CPMM-config privilege
at creation and only the exact fee-payer promotion allowed for updates.

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
manifest.

All five leaves under `artifacts/metadata/` are ignored and fixed-path. Writers
are no-clobber and exact-byte idempotent. A raw IPFS CID must embed the digest of
the exact bytes before prepare, finalize, or readback can proceed; an Arweave
transaction ID is treated as an exact content identity and remote equality is
still mandatory. Same-provider redirects may not change hostname, canonical
path, or content identity. The readback creator-payment record is always the
contract constant `{ "signature": null, "debitLamports": "0" }`.

Image and metadata uploads remain separately approved browser/provider actions.
The selected flow must not connect a Solana wallet or request SOL, token, or
on-chain payment; if it does, stop and revise the reviewed plan before upload or
readback. The later creation instruction must consume the exact verified
metadata URI and set `isMutable: false` atomically. A manifest or readback is
evidence only and never carries approval into wallet connection, signing, spend,
publication, or any other action.

The LaunchLab artifact includes the exact metadata image, website, X link, and
canonical Solscan transaction URL in addition to the fields in `docs/LAUNCH.md`.
For a live website, both artifacts must exist with `ok: true`, match the web
record exactly, and satisfy mint-check time <= LaunchLab-check time <= final
web-verification time. Prelaunch keeps `token.mint` and `proof` null and does not
require either canonical file.

Do not copy proof fields into the web record manually. Once both artifacts are
valid, use
`npm run build:live-record -- --verified-at <exact-ISO-8601-UTC-timestamp>` so
the supported live schema is generated and cross-checked before
`web/data/launch.json` is written.
