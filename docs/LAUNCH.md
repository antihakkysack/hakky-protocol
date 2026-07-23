# HAKKY launch and verification policy

**HakkyAgent verifies the facts. You decide the risk.**

HakkyAgent verifies only the published HAKKY launch facts backed by this
repository's deterministic checks and canonical evidence. Its scope does not
include judging arbitrary transactions, certifying any token or transaction as
safe, detecting every scam, giving financial advice, or promising returns.

## Approved Raydium LaunchLab configuration

- full-configuration mode with SOL as the quote asset;
- 80% of supply in the public bonding curve;
- 20% reserved by LaunchLab for post-graduation liquidity;
- 0% creator, team, treasury, marketing, or vesting allocation;
- 24 SOL minimum community-funded graduation target;
- no creator first-buy;
- creator-fee rights disabled;
- post-graduation LP burned;
- total creator-funded creation and transaction cost no more than 1.00 SOL.

All supply may pass through the launch wallet during setup. Before public
trading, all 1,000,000 HAKKY must be in the approved launch mechanism and the
creator wallet balance must be zero.

## Publication state

`prelaunch` means no official mint is shown and no address from replies or DMs
should be trusted. `live` is allowed only after the mainnet mint, launch
transaction, fixed supply, authorities, creator balance, allocation, fees, and
LP policy have independent readback evidence.

## Stop before signing

Stop if cost exceeds 1.00 SOL; any fixed token or allocation value differs;
creator fees cannot be disabled; LP cannot be burned; mint authority would
remain active; freeze authority or an unexpected token extension exists; the
wallet, metadata, links, preview, or live interface is ambiguous.

If a transaction fails, do not announce a launch or create another token
automatically. Save the signature and state, diagnose the existing mint, and
obtain explicit approval for any recovery transaction and cost.

## Devnet rehearsal boundary

Run `npm run rehearsal:devnet -- --external-funding` when the public faucet is
unavailable. The command prints one ephemeral public devnet address, waits for
at least 2 devnet SOL under one ten-minute monotonic deadline, and never writes
its secret key. “Zero payer balance” in its proof means zero payer-owned HAKKY
base units, not zero SOL. It proves finalized classic-SPL devnet state including
the intended vault owner's full HAKKY balance only; it does not simulate
Raydium LaunchLab or mainnet metadata.

## Immutable metadata preparation

Metadata preparation, provider upload, and remote readback are separate gates.
The three repository commands never upload content, connect a wallet, call a
Solana RPC, sign, simulate, send, or pay. They accept only the fixed ignored
paths below:

1. Render and inspect the approved `web/assets/token.png`. It is pinned to
   exactly 74,230 bytes and SHA-256
   `9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0`.
2. Obtain separate action-time approval to upload that exact image through a
   provider/browser flow with no Solana wallet connection or payment request.
   If the provider asks for a wallet, SOL, another token, or any on-chain
   payment, stop before uploading and revise the reviewed plan.
3. Run
   `npm run metadata:prepare -- --image web/assets/token.png --image-uri <approved-content-addressed-image-uri> --out artifacts/metadata`.
   It locally publishes exact `token.png` and canonical `token.json` bytes,
   then commits `draft-manifest.json` last. It performs no network request.
4. Obtain separate action-time approval to upload the exact generated
   `artifacts/metadata/token.json` through the same no-wallet/no-payment
   provider boundary. Record the provider-returned canonical content address.
5. Run
   `npm run metadata:finalize -- --draft-manifest artifacts/metadata/draft-manifest.json --metadata-uri <approved-content-addressed-metadata-uri> --out artifacts/metadata/manifest.json`.
   It rehashes the approved source image and both prepared local leaves,
   rebuilds the canonical metadata bytes, and never uploads.
6. Run
   `npm run metadata:verify -- --manifest artifacts/metadata/manifest.json --out artifacts/metadata/readback.json`.
   Verification issues bounded HTTPS `GET` requests only, requires exact remote
   size and SHA-256 equality for both objects, and fixes `creatorPayment` to
   `{ "signature": null, "debitLamports": "0" }`. One 15-second abort deadline
   covers the complete request/redirect/body operation. Response bodies are
   streamed through the approved 74,230-byte maximum and cancelled on the first
   byte beyond the exact expected length; a non-streaming fallback is allowed
   only after an exact trustworthy `Content-Length` bounds it.

Exact-byte replays are idempotent; a divergent existing artifact fails without
replacement. The ignored metadata manifest and readback are inputs to later
proof and transaction gates, not launch approval. The creation transaction must
use the exact verified metadata URI and create it atomically with
`isMutable: false`; otherwise stop before signing. Post-creation metadata
finalization is prohibited.

Run these local commands only while the repository workspace is trusted and
exclusively controlled. Publication accepts the repository root plus one fixed
relative artifact path and repeats symlink/junction/reparse confinement before
temporary creation, before hard-link commit, and after commit. This is
defense-in-depth, not a race-free sandbox against a privileged concurrent local
process because Node does not expose portable handle-relative `openat`/link
operations. If exclusive control is not true for the command duration, stop.
Permanent tests require the five leaves to remain ignored and untracked; they do
not require them to remain absent after a separately approved provider flow.

## Unsigned LaunchLab transaction gate

The official Raydium UI must expose the exact serialized unsigned transaction
before any wallet signing prompt is accepted. If the UI or wallet cannot expose
those raw bytes, stop. A screenshot, copied form values, API response, or
transaction rebuilt with an SDK is not a substitute.

On the action day, read the selected wallet's visible public key and require
byte-for-byte equality with the approved creator. Then run these public-only,
fixed-path commands:

```powershell
$env:HAKKY_CREATOR = Read-Host "Approved creator public key"
$env:HAKKY_RAYDIUM_URL = Read-Host "Current official Raydium LaunchLab browser URL"
npm run verify:raydium-origin -- --ui-url $env:HAKKY_RAYDIUM_URL --out artifacts/mainnet-session/official-origin.json
npm run verify:wallet-readiness -- --creator $env:HAKKY_CREATOR --metadata-readback artifacts/metadata/readback.json --out artifacts/mainnet-session/wallet-readiness.json
npm run verify:launch-preview -- --transaction artifacts/mainnet-session/unsigned-transaction.base64 --creator $env:HAKKY_CREATOR --metadata-manifest artifacts/metadata/manifest.json --metadata-readback artifacts/metadata/readback.json --official-origin artifacts/mainnet-session/official-origin.json --wallet-readiness artifacts/mainnet-session/wallet-readiness.json --out artifacts/mainnet-session/preview.json
```

The origin receipt expires after 30 minutes and accepts only the exact
`https://raydium.io` origin backed by the current official documentation. The
wallet receipt expires after five minutes, requires finalized mainnet identity,
and fixes the minimum visible balance at 1 SOL. The preview resolves finalized
address-lookup tables, decodes the exact unsigned bytes, reads finalized
pre-state, simulates without blockhash replacement, proves the direct immutable
Metaplex metadata CPI, and recomputes the one-SOL cumulative creator-debit cap.
These commands accept no seed, keypair, program, fee, policy, approval, signing,
or send override.

At the currently pinned Raydium source revision, the exact approved CPMM
Burn & Earn rights layout is not source-covered. The preview therefore exits
with `source-coverage-unavailable` and writes neither `preview.json` nor
`approval-envelope.json`. Do not sign while this stop is present. Removing it
requires a separate reviewed source pin and tests that map every creator,
platform, irreversible, withdrawal, and fee right for the selected migration.

## Public session and recovery evidence

`npm run session:receipt` supports only `init`, `record-status`, and
`build-recovery`. The ignored `session-receipt.json` binds the creator, mint,
launch ID, preview transaction hash, hashed metadata evidence, zero metadata
payment baseline, one-SOL cap, and a monotonic public event history. It never
stores a seed, keypair, wallet dump, authenticated URL, or private credential.

Every operation begins at `prepared`. A wallet rejection before submission may
be recorded as `visible-failed`. Once a canonical signature exists, a UI or RPC
failure is only `visible-pending`; it cannot become terminal until finalized
readback proves success or failure. Signatures, operation identity, purpose,
sequence, timestamps, and cumulative creator debits cannot regress or drift.
There is no `approve`, `sign`, `send`, or `retry` subcommand.

The recovery decoder registry is intentionally empty. `build-recovery` always
stops with `recovery-operation-unsupported` and writes no envelope. A later
recovery must first add one source-reviewed operation-specific decoder and
fixtures, then obtain fresh action-time approval for its exact transaction hash,
signers, transfers, and maximum additional debit. Never synthesize or submit a
replacement transaction from the receipt.

Legal acceptance, wallet connection, each metadata upload, any metadata
payment, the creation signature and exact maximum debit, every recovery or
graduation signature and spend, push, pull-request create/update, merge and its
automatic Pages deployment, GitHub metadata/domain save, and each X
save/post/pin are distinct action-time approval boundaries. A creation approval
covers signature plus debit only when it expressly names both for the exact
transaction. A merge approval covers automatic Pages only when it expressly
names both effects for the exact commit. Evidence never carries approval
forward.

## Mainnet proof record

The proof must record the network and RPC identity, classic token program, mint,
transaction signatures, supply, decimals, mint authority, freeze authority,
creator HAKKY balance, finalized metadata and immutable state, LaunchLab launch
address, curve and liquidity allocation, creator-fee state, graduation target,
quote asset, LP disposal, and official Raydium and Solscan URLs.

The canonical mint and LaunchLab artifacts both use strict schema version `1`
and require `ok: true`. Live publication is fail-closed: the site checker reads
both files, rejects unknown fields, and cross-checks the exact mint, creator,
launch address and signature, supply, decimals, authorities, zero creator
balance, metadata URI/image/links/immutability, 80/20/0 allocation, disabled
creator fees, configured migration policy, 24 SOL target, SOL quote, and
creator spend no greater than 1.00 SOL. LP irreversibility is not claimed until
the separate graduation artifact proves the final disposition.

The mint proof timestamp must not be later than the LaunchLab proof timestamp.
The web record stores the exact artifact observations. The operator supplies a
publication timestamp ordered after them as a command gate; it is not
serialized as an observed fact. Canonical destinations are the Solscan token
route, Solscan transaction route, and Raydium LaunchLab token route; credentials,
non-default ports, fragments, alternate routes, and extra query parameters are
rejected.

After both canonical artifacts are complete, generate the exact curve-live
record with
`npm run build:curve-live-record -- --published-at <exact-ISO-8601-UTC-timestamp>`.
The command accepts no mint, launch, URL, allocation, metadata, or spend
override: it copies those values from the validated artifacts and writes
`web/data/launch.json` only after the complete cross-check passes.
