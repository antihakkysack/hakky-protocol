# HAKKY Mainnet and Public-Surface Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the verified prelaunch experience, refresh the owner’s X profile, execute the bounded Raydium LaunchLab mainnet launch with user signing, capture exact proof, and publish only verified launch links.

**Architecture:** Treat repository deployment, X changes, wallet signing, proof promotion, and public announcement as separate external-action gates. Use the official Raydium UI for all signing and the repository’s read-only verifier for Solana mint evidence. Keep `web/data/launch.json` in prelaunch state until mint and LaunchLab readback pass every invariant.

**Tech Stack:** GitHub Pages, GitHub Actions, `hakky.xyz`, X web UI, Solana mainnet-beta JSON RPC, Raydium LaunchLab, Solscan, Node.js 22 verification scripts.

## Global Constraints

- This plan starts only after `2026-07-22-hakky-pivot-build.md` passes fully and the tracked worktree is clean.
- Mainnet token: Hakky Protocol / HAKKY, classic SPL Token, exactly 1,000,000 tokens, six decimals.
- Distribution: 80% public bonding curve, 20% post-graduation liquidity, 0% team, no vesting, no presale, no creator first-buy.
- Authorities: mint authority null before public trading; freeze authority null; no transfer tax, hook, blacklist, permanent delegate, or unexpected extension.
- Metadata: approved name, symbol, image, website, and X link are finalized, verified, and immutable before announcement.
- Raydium: LaunchLab full configuration, SOL quote, 24 SOL graduation target, creator fee rights disabled, LP burned.
- Spending: total creator-funded mainnet cost must be no more than 1.00 SOL.
- No wallet seed phrase, private key, exported keypair, authenticated RPC URL, password, OTP, or recovery code may be requested, copied, stored, or committed.
- Every deploy, X save/post/pin, push, wallet connect, and mainnet signature requires an immediate action-time confirmation.
- Removal covers the active default branch, GitHub About panel, website, and X profile; shared Git history is not rewritten or force-pushed.
- The existing Hetzner server remains untouched.
- A failed or partial transaction is never announced as a launch.

## Runtime Evidence Files

```text
artifacts/mainnet-session/session-receipt.json  # ignored recovery record during execution
proof/mainnet-mint.json                         # committed read-only mint proof
proof/mainnet-launchlab.json                    # committed Raydium configuration proof
web/data/launch.json                            # promoted from prelaunch to live only after both proofs pass
```

Both canonical proof files use the exact supported schema version `1` and are
publishable only with `ok: true`. `scripts/check-site.mjs` does not read or
require either file while the web record is `prelaunch`. A `live` record fails
the quality gate unless both files exist, parse, match their strict schemas,
and bind exactly to every published web proof field.

---

### Task 1: Publish and Verify the Prelaunch Website

**Files:**
- Read: `web/data/launch.json`
- Read: `launch/assets/x-avatar.png`
- Read: `launch/assets/x-banner.png`
- Read: `.github/workflows/pages.yml`
- External: GitHub repository, repository About panel, and `https://hakky.xyz`

**Interfaces:**
- Consumes: passing build plan and prelaunch launch record.
- Produces: publicly verified prelaunch site with no mint address or trading action.

- [ ] **Step 1: Re-run the complete local gate**

Run:

```powershell
rtk npm ci
rtk npm run assets
rtk npm run check
rtk proxy git diff --check
rtk git status --short
```

Expected: all checks pass; generated assets create no diff; tracked worktree is clean; `web/data/launch.json` has `"status":"prelaunch"`, `"proof":null`, and `"mint":null`.

- [ ] **Step 2: Inspect the exact outgoing commit range**

Run:

```powershell
rtk git log --oneline --decorate origin/main..HEAD
rtk git diff --stat origin/main..HEAD
```

Expected: only the approved HAKKY pivot, brand, website, verifier, docs, tests, and CI changes appear. No unrelated user work, secrets, authenticated URLs, or Hetzner changes appear.

- [ ] **Step 3: Obtain action-time approval to push**

Present the branch name, outgoing commits, destination repository, and the fact that the Pages workflow will deploy `web/` automatically. Ask for a clear approval immediately before the push.

- [ ] **Step 4: Push and wait for GitHub Pages**

Run after approval:

```powershell
rtk git push origin HEAD
```

Expected: push succeeds. Monitor the `pages` and `quality` GitHub Actions until both complete successfully. Do not edit workflow permissions in response to a failure without diagnosing the exact check.

- [ ] **Step 5: Prepare the repository About-panel update**

Inspect the current public About panel and prepare this exact replacement:

```text
Description: HAKKY — 1,000,000 supply, 100% public Solana fair launch. Keep crypto clean.
Website: https://hakky.xyz
Topics: solana, meme-coin, fair-launch, hakky, antihakkysack
```

Expected: no unrelated company, product, BTC, reserve, or Ethereum attribution remains in the proposed values.

- [ ] **Step 6: Obtain action-time confirmation and save the About panel**

Show the exact description, website, and topics immediately before saving. After approval, save once and read the public repository page again.

- [ ] **Step 7: Verify the live prelaunch surface**

Read `https://hakky.xyz` in a browser and verify desktop and mobile:

- “Rugs hate this little guy.” renders above the fold;
- the explicit no-official-mint warning renders;
- there is no mint address, copy-address control, Raydium action, or buy action;
- 1,000,000 supply, 0% team, no presale, and 1 SOL cap render correctly;
- Sack Sentinel assets load;
- X and GitHub links are correct;
- page source and visible copy contain no legacy product or third-party business attribution;
- HTTPS and custom domain are healthy.

Expected: screenshots and live URL constitute prelaunch deployment evidence.

---

### Task 2: Refresh the X Profile and Publish the Prelaunch Introduction

**Files:**
- Read: `launch/x-profile.md`
- Read: `launch/prelaunch-post.md`
- Read: `launch/assets/x-avatar.png`
- Read: `launch/assets/x-banner.png`
- External: `https://x.com/antihakkysack`

**Interfaces:**
- Consumes: approved profile copy/assets and verified prelaunch site.
- Produces: updated public X profile and one prelaunch introduction post with no mint address.

- [ ] **Step 1: Ask the user to sign into X in the available browser**

Use the existing profile URL. If the browser is signed out, ask the user to complete sign-in. Do not inspect passwords, cookies, session stores, OTPs, or recovery methods. If X presents a CAPTCHA, ask before solving it.

- [ ] **Step 2: Prepare the exact profile mutation**

Read the current profile and show this envelope:

```text
Account: @antihakkysack
Display name: AntiHakkySack 🧼
Bio: AI sentinel for Solana's dirty trenches. No presale. No team bag. 1,000,000 $HAKKY. Fair launch on Raydium. Keep crypto clean.
Website: https://hakky.xyz
Avatar: launch/assets/x-avatar.png
Banner: launch/assets/x-banner.png
```

Expected: the bio fits X’s field limit and contains no mint address or return claim.

- [ ] **Step 3: Obtain action-time confirmation and save the profile**

Immediately before clicking the final save control, ask the user to confirm the exact five changes above. After confirmation, save once and collect a fresh profile snapshot.

Expected: display name, bio, website, avatar, and banner all match the approved assets and copy.

- [ ] **Step 4: Prepare and validate the exact prelaunch post**

Use the exact text from `launch/prelaunch-post.md`:

```text
AntiHakkySack is online. 🧼

Agent 001 entered Solana's trenches with zero team tokens, no presale, and no hidden mint.

1,000,000 $HAKKY. 100% public fair launch on Raydium.

No official mint address exists yet. Ignore impostors.

https://hakky.xyz
```

Expected: X composer accepts the text, no media is required, and the post contains no contract address.

- [ ] **Step 5: Obtain action-time confirmation and publish**

Ask immediately before posting. After approval, publish once, open the resulting public post, and verify its text and link. Do not pin this prelaunch post; the verified proof post will be pinned after launch.

---

### Task 3: Execute the Bounded Raydium LaunchLab Mainnet Operation

**Files:**
- Create during execution: `artifacts/mainnet-session/session-receipt.json`
- Read: `docs/TOKEN.md`
- Read: `docs/LAUNCH.md`
- Read: `web/data/launch.json`
- External: official Raydium LaunchLab, connected Solana wallet, Solana mainnet.

**Interfaces:**
- Consumes: approved launch policy and user-controlled wallet.
- Produces: mint address, launch ID, transaction signatures, exact cost, and immutable public launch state.

- [ ] **Step 1: Refresh current official Raydium and Solana mechanics**

Read the current official Raydium LaunchLab creation, fee, creator-fee, LP-disposal, and metadata behavior documentation plus current Solana token-authority and token-metadata documentation on launch day. Record any difference from the approved spec. Do not rely on screenshots or documentation captured during planning.

Expected: LaunchLab still supports exact configurable supply, 80/20 allocation, 24 SOL graduation target, disabled creator fees, burned LP, SOL quote, no initial buy, and immutable finalized metadata. If any approved setting is unavailable, stop before connecting the wallet.

- [ ] **Step 2: Resolve wallet identity and budget without exposing credentials**

Ask the user which Solana wallet address will be the creator. Read its public address and SOL balance from the connected wallet UI or public RPC. Confirm mainnet-beta. Do not request an exported keypair or seed phrase.

Expected: the public creator address is recorded; the wallet can cover the simulated operation while the authorized spend remains capped at 1.00 SOL.

- [ ] **Step 3: Open only the official LaunchLab creation surface**

Navigate directly to:

```text
https://raydium.io/launchlab/create
```

Verify the origin and TLS page before connecting. Do not use a sponsored search result, reply link, DM link, clone, third-party launch platform, or custom quote token.

- [ ] **Step 4: Enter the exact launch configuration**

Configure:

```text
Name: Hakky Protocol
Symbol: HAKKY
Supply: 1000000
Decimals: 6
Token program: classic SPL Token
Quote: SOL
Curve allocation: 80%
Post-graduation liquidity allocation: 20%
Team/vesting allocation: 0%
Graduation target: 24 SOL
Creator first-buy: 0 SOL
Creator fees: disabled
LP disposal: burn
Website: https://hakky.xyz
X: https://x.com/antihakkysack
Image: launch/assets/x-avatar.png
Metadata after verification: immutable
```

Expected: the review screen shows all one million tokens assigned to curve plus liquidity and no creator/vesting balance.

- [ ] **Step 5: Inspect the transaction preview and calculate the full operation envelope**

Record every requested signature, estimated network/rent/platform cost, destination program, token mint, token program, authority, supply, vault transfer, creator fee setting, and LP policy. Sum all creator-funded SOL costs across the complete sequence.

Stop if:

- total creator-funded cost exceeds 1.00 SOL;
- any first-buy is nonzero;
- creator or vesting tokens are present;
- mint authority remains active at public trading;
- freeze authority is non-null;
- creator fees are enabled;
- LP is not irreversibly burned;
- quote asset or graduation target differs;
- an unexpected extension, transfer fee, hook, delegate, or blacklist appears;
- metadata name, symbol, image, website, X link, or immutable state differs;
- more signatures are requested than the explained operation envelope.

- [ ] **Step 6: Present the exact final approval envelope**

Show the user:

- creator public address;
- token name, symbol, supply, decimals, and program;
- 80/20/0 distribution;
- SOL quote and 24 SOL graduation target;
- zero creator first-buy and disabled creator fees;
- burned LP policy;
- each transaction/signature purpose;
- total maximum creator-funded SOL cost;
- the fact that the action is irreversible.

Ask for explicit approval immediately before the first mainnet signature.

- [ ] **Step 7: Let the user sign the approved transactions**

After approval, proceed through the official wallet prompts. The user signs inside their wallet. Do not copy or type credentials. After each signature, record the returned transaction signature and visible status in the ignored session receipt.

If any step fails or is only partially confirmed, stop. Do not create another mint or retry with a broader transaction. Read the exact on-chain state of the existing mint/launch and present a bounded recovery operation for approval.

- [ ] **Step 8: Capture exact immediate readback**

Record:

- mint address;
- launch ID/address;
- all transaction signatures;
- creator address;
- total creator-funded SOL spent;
- exact supply and decimals;
- mint and freeze authorities;
- creator HAKKY balance;
- curve/liquidity/team allocations;
- quote asset and graduation target;
- creator-fee setting;
- LP disposal setting;
- metadata name, symbol, URI, public links, and immutable state;
- official Raydium launch URL;
- Solscan mint and transaction URLs.

Expected: no public announcement occurs in this task.

---

### Task 4: Generate Proof and Promote `hakky.xyz` to Live

**Files:**
- Create: `proof/mainnet-mint.json`
- Create: `proof/mainnet-launchlab.json`
- Modify: `web/data/launch.json`
- External: Solana RPC, Solscan, Raydium, GitHub Pages.

**Interfaces:**
- Consumes: exact Task 3 readback and the read-only verifier.
- Produces: committed proof artifacts and verified live website state.

- [ ] **Step 1: Set task-specific public identifiers from the receipt**

In PowerShell, read the exact values from the session receipt into task-specific variables:

```powershell
$env:HAKKY_MINT = Read-Host "Verified mint address"
$env:HAKKY_CREATOR = Read-Host "Creator public address"
$env:HAKKY_LAUNCH_ID = Read-Host "Raydium launch ID"
$env:HAKKY_LAUNCH_TX = Read-Host "Launch transaction signature"
```

Expected: each value matches the official Raydium receipt and public explorer. These variables contain public identifiers only.

- [ ] **Step 2: Run the read-only mint verifier**

Run:

```powershell
rtk npm run verify:token -- --mint $env:HAKKY_MINT --creator $env:HAKKY_CREATOR --out proof/mainnet-mint.json
```

Expected: command exits zero and creates the canonical schema-version `1`
artifact exactly once. Every check is `ok: true`: mainnet target, classic SPL
Token program, fixed supply, six decimals, null mint authority, null freeze
authority, and zero balance across every initialized or frozen classic token
account decoded for the exact creator and mint. Failed evaluation must not
create `proof/mainnet-mint.json`.

- [ ] **Step 3: Independently verify Raydium configuration**

Open the official launch page using the recorded launch ID and cross-check it against the launch transaction on Solscan. Create `proof/mainnet-launchlab.json` with the file-editing tool only after every value is known. The completed JSON must contain exactly these fields and types:

| Field | Required runtime value |
| --- | --- |
| `schemaVersion` | number `1` |
| `checkedAt` | current ISO-8601 timestamp string |
| `mint` | exact verified mint-address string |
| `launchId` | exact Raydium launch-address string |
| `launchTransaction` | exact confirmed transaction-signature string |
| `creator` | exact creator public-address string |
| `creatorSpendSol` | number from the confirmed transactions; must be at most `1` |
| `quoteAsset` | string `SOL` |
| `curveAllocationBps` | number `8000` |
| `liquidityAllocationBps` | number `2000` |
| `teamAllocationBps` | number `0` |
| `graduationTargetSol` | number `24` |
| `creatorFirstBuySol` | number `0` |
| `creatorFeeEnabled` | boolean `false` |
| `lpPolicy` | string `burn` |
| `metadataName` | string `Hakky Protocol` |
| `metadataSymbol` | string `HAKKY` |
| `metadataUri` | exact public metadata-JSON URL string |
| `metadataImage` | string `https://hakky.xyz/assets/token.png` |
| `metadataWebsite` | string `https://hakky.xyz` |
| `metadataX` | string `https://x.com/antihakkysack` |
| `metadataImmutable` | boolean `true` after on-chain metadata readback |
| `raydiumUrl` | exact `https://raydium.io/launchpad/token/?mint=<mint>` URL |
| `solscanUrl` | exact `https://solscan.io/token/<mint>` URL |
| `solscanTransactionUrl` | exact `https://solscan.io/tx/<launchTransaction>` URL |
| `ok` | boolean `true` only after all fields agree across Raydium and Solana readback |

Do not create the file with sample addresses, sample signatures, or incomplete fields. Do not mark `ok: true` unless each public value has two-source agreement between Raydium and Solana readback.
The URL fields reject credentials, non-default ports, fragments, alternate
routes, and extra query parameters.

- [ ] **Step 4: Promote the launch record with exact proof values**

Use the file-editing tool to change `web/data/launch.json`:

- `status` becomes `live`;
- `token.mint` becomes the verified mint;
- `proof` contains the verified mint, creator, launch ID, launch transaction,
  exact Solscan mint/transaction URLs, and exact Raydium URL;
- `proof` also contains verified supply, decimals, null authorities, zero creator balance, immutable metadata, 80/20/0 allocation, disabled creator fees, burned LP, creator spend, and verification time;
- `proof.mintVerifiedAt` exactly equals `proof/mainnet-mint.json.checkedAt`;
- `proof.launchVerifiedAt` exactly equals `proof/mainnet-launchlab.json.checkedAt`;
- `proof.verifiedAt` is the final exact ISO-8601 promotion check time, with
  `mintVerifiedAt <= launchVerifiedAt <= verifiedAt`;
- all approved fixed policy fields remain unchanged.

Run:

```powershell
rtk npm run check
rtk proxy git diff --check
rtk git diff -- web/data/launch.json proof/mainnet-mint.json proof/mainnet-launchlab.json
```

Expected: all checks pass; the diff contains public proof only; no wallet secret, authenticated RPC URL, or unrelated file is present.

- [ ] **Step 5: Obtain approval, commit, and push the proof promotion**

Show the exact proof diff and destination. Ask immediately before commit/push. After approval:

```powershell
rtk git add web/data/launch.json proof/mainnet-mint.json proof/mainnet-launchlab.json
rtk git commit -m "launch: publish verified HAKKY mainnet proof"
rtk git push origin HEAD
```

Expected: quality and Pages workflows pass.

- [ ] **Step 6: Verify the live post-launch website**

On `https://hakky.xyz`, verify:

- status says live and instructs verification;
- mint address exactly matches both proof files;
- creator identity and zero creator balance match both proof files;
- the exact launch transaction signature is visible and links to its canonical
  Solscan transaction route;
- Solscan and Raydium links open the exact mint/launch;
- 1,000,000 supply and 80/20/0 distribution remain correct;
- six decimals, creator-fee off, LP burn, exact creator spend versus the 1.00
  SOL cap, and the final verification timestamp render visibly;
- metadata name, symbol, image, links, and immutable state match the approved launch;
- prelaunch warning and “not published” text no longer render;
- risk disclosure remains visible;
- desktop/mobile renders and console remain clean.

Expected: website evidence is captured before any X launch announcement.

---

### Task 5: Publish and Pin the Verified X Proof Post

**Files:**
- Read: `src/social-copy.mjs`
- Read: `proof/mainnet-mint.json`
- Read: `proof/mainnet-launchlab.json`
- External: `https://x.com/antihakkysack`

**Interfaces:**
- Consumes: verified mint and live `hakky.xyz` proof page.
- Produces: exact launch proof post, pinned on the owner’s X profile.

- [ ] **Step 1: Generate the post from the verified mint**

Run:

```powershell
rtk node --input-type=module -e "import { buildProofPost } from './src/social-copy.mjs'; console.log(buildProofPost({ mint: process.env.HAKKY_MINT }));"
```

Expected: output contains the exact mint, fixed supply, 0% team, no presale, null authorities, LP burn statement, `hakky.xyz`, and high-risk disclaimer; length is no more than 280 characters.

- [ ] **Step 2: Compare post claims to proof artifacts**

Verify every claim in the generated post against `proof/mainnet-mint.json`, `proof/mainnet-launchlab.json`, and the live website. Stop if any mismatch exists.

- [ ] **Step 3: Obtain action-time approval and publish once**

Open the X composer on `@antihakkysack`, enter the generated text exactly, and show the final composer state. Ask immediately before clicking Post. After approval, publish once.

- [ ] **Step 4: Obtain action-time approval and pin the post**

Open the new public post, verify its mint and link, then ask immediately before pinning. Pin after approval. Do not delete the earlier prelaunch introduction.

- [ ] **Step 5: Final cross-surface readback**

Verify the public X profile, pinned post, `hakky.xyz`, GitHub README, proof files, Raydium launch page, and Solscan mint all agree on:

- project and symbol;
- mint address;
- 1,000,000 supply and six decimals;
- 0% team and no presale;
- mint/freeze authorities;
- immutable metadata and official links;
- launch platform and proof links;
- no promised utility or returns;
- personal-project ownership.

Run locally:

```powershell
rtk npm run check
rtk git status --short
```

Expected: checks pass, tracked worktree is clean, and Hetzner remains unchanged. Report the exact mint, transaction signatures, proof URLs, creator spend, and any unresolved item without calling the launch fully complete until all surfaces agree.
