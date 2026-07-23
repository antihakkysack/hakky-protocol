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
   `{ "signature": null, "debitLamports": "0" }`.

Exact-byte replays are idempotent; a divergent existing artifact fails without
replacement. The ignored metadata manifest and readback are inputs to later
proof and transaction gates, not launch approval. The creation transaction must
use the exact verified metadata URI and create it atomically with
`isMutable: false`; otherwise stop before signing. Post-creation metadata
finalization is prohibited.

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
creator fees, burned LP, 24 SOL target, SOL quote, and creator spend no greater
than 1.00 SOL.

The mint proof timestamp must not be later than the LaunchLab proof timestamp.
The web record stores both exact artifact timestamps and a final promotion
timestamp ordered after them. Canonical destinations are the Solscan token
route, Solscan transaction route, and Raydium LaunchLab token route; credentials,
non-default ports, fragments, alternate routes, and extra query parameters are
rejected.

After both canonical artifacts are complete, generate the exact live record
with `npm run build:live-record -- --verified-at <exact-ISO-8601-UTC-timestamp>`.
The command accepts no mint, launch, URL, allocation, metadata, or spend
override: it copies those values from the validated artifacts and writes
`web/data/launch.json` only after the complete cross-check passes.
