# HAKKY Solana Fair-Launch Pivot — Design Specification

**Date:** 2026-07-22

**Status:** Approved design; implementation not started

**Repository:** `antihakkysack/hakky-protocol`

**Public surfaces:** `hakky.xyz`, `x.com/antihakkysack`

## 1. Objective

Replace the current BTC-backed cBTC protocol with a simple, transparent Solana
meme coin called **HAKKY**. The public identity centers on **AntiHakkySack**, a
fictional AI sentinel and transparency mascot for Solana's meme-coin trenches.

The launch must be easy to understand and independently verifiable:

- exactly 1,000,000 HAKKY;
- 100% public distribution;
- no presale, team allocation, vesting, or creator first-buy;
- no ability to mint more tokens or freeze holder accounts;
- public launch through Raydium LaunchLab;
- creator-funded launch spending capped at 1.00 SOL;
- no claims of utility, investment returns, or guaranteed scam detection.
- no third-party agency name, attribution, internal doctrine reference, or
  business branding on any repository or public surface; HAKKY is a personal
  project.

The old BTC/Solidity implementation will be removed from the current branch.
It will remain recoverable through Git history and will not be copied into a
`legacy` directory.

## 2. Non-goals

This launch will not include:

- BTC custody, cBTC, proof of reserves, provenance screening, attestations, or
  Ethereum/Sepolia contracts;
- a presale, private round, airdrop, founder allocation, or marketing wallet;
- token taxes, reflection mechanics, blacklist controls, transfer hooks,
  permanent delegates, or hidden administrative privileges;
- price targets, profit promises, artificial volume, coordinated trading, or
  undisclosed paid promotion;
- a functional security scanner at launch;
- a required Hetzner backend or another centralized service in the website's
  critical path.

## 3. Brand and story

### 3.1 Identity

- **Project:** Hakky Protocol
- **Token:** HAKKY
- **Character:** AntiHakkySack / Agent 001
- **Tagline:** Keep crypto clean.
- **Category:** transparent, anti-rug Solana meme coin
- **Visual direction:** Meme Broadcast
- **Mascot:** Sack Sentinel

### 3.2 Core story

> Solana's trenches are full of rugs, scams, and dirty tricks—each one leaving
> another hakky sack behind. Hakky Protocol activated AntiHakkySack, Agent 001,
> to expose the chaos, teach the community what to watch for, and keep crypto
> clean. HAKKY is the meme-powered public signal behind that mission. No
> presale. No team bag. No hidden mint. The first thing AntiHakkySack cleaned
> was its own launch.

AntiHakkySack begins as a fictional AI character, narrator, and educational
voice. The project must not describe it as a working autonomous agent, trading
system, audit service, or guaranteed scam detector. If real analysis tools are
built later, they will be announced only after they work and can be verified.

### 3.3 Voice

The voice is sharp, funny, self-aware, skeptical of hype, and unusually clear
about risk. It can be loud without making deceptive claims.

Approved headline examples:

- **Rugs hate this little guy.**
- **The first thing it cleaned was its own launch.**
- **Every rug leaves a hakky sack behind.**

## 4. Visual system

The approved **Meme Broadcast** direction uses a bright, social-first identity:

- acid yellow: `#F8FF4A`;
- hot pink: `#FF7AEB`;
- electric purple: `#7138FF`;
- ink: `#160C2C`;
- orange mascot body: `#FF965D`;
- white accents and thick dark outlines;
- bold condensed or heavy grotesk headlines;
- monospaced labels for verification details;
- sticker shapes, slight rotations, hard shadows, and meme-ready crops.

The **Sack Sentinel** is a hacked-looking sack transformed into an AI agent. It
has a tied sack silhouette, dark visor, bright eyes, and an Agent 001 badge. It
must remain recognizable at avatar size and adaptable to banners, website
illustrations, reaction images, and short animations.

## 5. Token specification

| Field | Approved value |
| --- | --- |
| Network | Solana mainnet |
| Program | Classic SPL Token |
| Name | Hakky Protocol |
| Symbol | HAKKY |
| Total supply | 1,000,000 HAKKY |
| Decimals | 6 |
| Quote asset | SOL |
| Team allocation | 0% |
| Presale | None |
| Vesting | None |
| Creator first-buy | None |
| Transfer tax | None |
| Mint authority | Permanently revoked before public trading |
| Freeze authority | Not enabled / null |
| Metadata | Finalized, verified, then made immutable |

The full base-unit supply is `1,000,000,000,000` because one million tokens at
six decimals equals one trillion base units.

## 6. Raydium LaunchLab design

Use Raydium LaunchLab full-configuration mode rather than Pump.fun or a manually
seeded pool.

Approved launch configuration:

- 80% of total supply enters the public bonding curve;
- 20% is reserved by the launch mechanism for post-graduation liquidity;
- 0% goes to the creator, team, treasury, marketing, or vesting wallets;
- minimum supported community-funded graduation target: 24 SOL;
- SOL quote asset;
- no creator first-buy;
- creator fee rights disabled;
- post-graduation LP burned so the creator cannot withdraw liquidity;
- creator-funded creation and transaction spending must not exceed 1.00 SOL.

All one million tokens may temporarily pass through the launch wallet while the
mint and LaunchLab vault are prepared. Before public trading, the entire supply
must be deposited into the approved launch mechanism, with no residual HAKKY in
the creator wallet.

Raydium settings and fees can change. The live interface and transaction preview
are authoritative at signing time. The launch stops if the approved settings are
not available or cannot be verified.

## 7. Website design

Rebuild `hakky.xyz` as a static, responsive site. Remove all cBTC, BTC backing,
proof-of-reserves, compliance, attestation, Sepolia, and reserve-API content.

### 7.1 Navigation

- Lore
- Fair Launch
- Verify
- FAQ
- X
- GitHub

### 7.2 Homepage sequence

1. **Hero:** Sack Sentinel, “Rugs hate this little guy,” story summary, and
   calls to meet the agent and verify the launch.
2. **Launch status ribbon:** before launch, state that there is no official mint
   address and warn users to ignore impostors.
3. **Proof strip:** 1,000,000 fixed supply, 0% team allocation, zero presale
   tokens, and the 1 SOL creator launch cap.
4. **Lore:** explain the problem and establish AntiHakkySack as a fictional
   narrator rather than a security guarantee.
5. **Distribution:** show 80% public bonding curve and 20% post-graduation
   liquidity, totaling 100% public distribution.
6. **Verification:** show supply, mint authority, freeze authority, team
   allocation, Raydium link, mint address, and transaction evidence.
7. **Risk disclosure:** identify HAKKY as a high-risk meme coin with no promised
   utility or returns.

### 7.3 Pre-launch and post-launch states

Before verification, the site must not show a mint address or buy button. It
must show an explicit “not live” warning.

After successful on-chain readback, the site may expose:

- the verified mint address with a copy control;
- Solscan and Raydium links;
- the launch transaction signature;
- exact supply, decimals, and null-authority results;
- the approved curve, liquidity, and fee configuration;
- a clear high-risk disclaimer.

## 8. X profile and launch communications

Update `x.com/antihakkysack` only after the new assets and copy are approved.

### 8.1 Profile

- **Display name:** `AntiHakkySack 🧼`
- **Bio:** `AI sentinel for Solana's dirty trenches. No presale. No team bag. 1,000,000 $HAKKY. Fair launch on Raydium. Keep crypto clean.`
- **Link:** `https://hakky.xyz`
- **Avatar:** Sack Sentinel close-up
- **Banner:** Meme Broadcast composition with story hook and fair-launch proof

### 8.2 Posting sequence

1. Pre-launch introduction post with no contract address.
2. Launch-day proof post only after exact on-chain verification.
3. Pin the proof post containing the mint address, supply, revoked authorities,
   Raydium link, and Solscan evidence.

Posts must not include price targets, profit promises, fabricated scarcity,
manufactured urgency, or undisclosed promotion.

## 9. Repository target state

The implementation plan will produce a focused repository containing:

- a new root `README.md`;
- a canonical token specification and fair-launch commitments;
- the static website under `web/`;
- launch copy and social assets under `launch/`;
- a read-only Solana verification script;
- a machine-readable launch manifest and post-launch proof artifact;
- automated tests for the verifier and website checks;
- deployment configuration for the existing `hakky.xyz` static hosting path.

The current `contracts/`, `services/`, and `provision/` product surfaces will be
removed from the current branch once any reusable hosting configuration has been
identified. Related CI, package scripts, security text, and documentation will
be rewritten so no BTC-era product claim survives accidentally.

All third-party agency references must also be removed from source files,
documentation, metadata, generated assets, website copy, and social copy. A
known current match exists in `launch/README.md`; the implementation must still
run a case-insensitive repository-wide scan rather than relying on that single
known location. HAKKY must be represented solely as the owner's personal
project.

The local checkout currently contains a user-owned uncommitted change in
`contracts/hardhat.config.js`. Before removing `contracts/`, implementation must
export that exact diff to a recoverable out-of-tree patch, verify the patch can
be read back, and report its location. The pivot must not silently discard the
user's existing work even though the file no longer belongs in the new branch.

## 10. Hosting and Hetzner

The first launch uses the existing static `hakky.xyz` hosting path. The website
will not depend on the Hetzner server, live APIs, databases, or cron jobs.

The existing Hetzner server remains untouched during the initial pivot. It can
later host a real AntiHakkySack agent or read-only verification API under a
separate design, security review, credential handoff, and deployment approval.
Decommissioning the old API or server is a separate destructive action and is
not authorized by this specification.

## 11. Operational flow

### 11.1 Build

1. Produce the Sack Sentinel asset set.
2. Pivot repository content and remove the old product from the current branch.
3. Build the static website and verification tooling.
4. Deploy the pre-launch website with the impostor warning.

### 11.2 Rehearse

1. Create a disposable devnet token using the approved supply and authorities.
2. Exercise authority revocation and the read-only verification script.
3. Validate LaunchLab parameters without a mainnet transaction.
4. Test website content, links, accessibility, and desktop/mobile rendering.

### 11.3 Prepare channels

1. Prepare X profile changes and the introduction post.
2. Ask the user to sign in through the available browser.
3. Confirm immediately before saving profile changes or publishing a post.

### 11.4 Launch

1. Connect the user's wallet through the official Raydium interface.
2. Review and simulate the exact transaction.
3. Confirm the operation envelope and total creator-funded cost.
4. Obtain explicit approval.
5. The user signs in their wallet. Private keys and seed phrases never leave
   the wallet.
6. Read back exact on-chain state.
7. Publish the mint address and proof only after every launch invariant passes.

## 12. Stop conditions and recovery

Stop before signing if any of the following is true:

- total creator-funded cost would exceed 1.00 SOL;
- supply, decimals, allocation, quote asset, graduation target, or curve differs
  from the approved design;
- creator fees cannot be disabled;
- LP cannot be burned or the creator would retain an LP withdrawal right;
- mint authority would remain active at public trading;
- freeze authority or an unexpected token extension is present;
- metadata, social links, or wallet identity cannot be verified;
- the live interface or transaction preview is ambiguous.

If a transaction fails or only part of the sequence completes:

- do not announce a launch or publish a mint address;
- save the transaction signature and exact on-chain state;
- do not broaden the mutation or create a replacement token automatically;
- diagnose whether the same mint can be completed safely;
- present the recovery operation and cost for explicit approval.

## 13. Verification and evidence

### 13.1 Automated checks

- verifier unit tests for supply, decimals, mint authority, and freeze authority;
- static build, link, and accessibility checks;
- repository scan proving no active BTC/cBTC/Sepolia/product-reserve claims remain;
- secret scan proving no wallet secrets are committed;
- desktop and mobile website render checks.

### 13.2 Mainnet readback

Before public announcement, record:

- network and RPC endpoint identity;
- mint address;
- transaction signature(s);
- total supply and decimals;
- mint and freeze authorities;
- creator wallet HAKKY balance;
- LaunchLab launch address and curve allocation;
- creator-fee configuration;
- graduation target and quote asset;
- LP disposal policy;
- Raydium and Solscan URLs.

The readback is stored in a machine-readable proof artifact and rendered on the
website in human-readable form.

## 14. External-action gates

The repository and website can be prepared locally after the implementation
plan is approved. These actions require an additional action-time confirmation:

- deploying the rebuilt public website;
- saving X profile changes;
- publishing or pinning X posts;
- connecting a wallet and submitting a mainnet transaction;
- spending any SOL;
- accessing, changing, or decommissioning the Hetzner server.

## 15. Acceptance criteria

The project is ready for the mainnet approval gate when:

1. the repository contains no active BTC-protocol product claim or code path;
2. a case-insensitive repository and public-surface scan finds no third-party
   agency name, attribution, internal doctrine reference, or business branding;
3. the pre-launch website matches the approved Meme Broadcast/Sack Sentinel
   direction on desktop and mobile;
4. the website clearly states that no official mint address exists yet;
5. the token and launch manifest matches every approved parameter;
6. devnet rehearsal and automated tests pass;
7. X profile assets and posts are ready for review;
8. the mainnet transaction is simulated and the creator-funded cost is no more
   than 1.00 SOL;
9. the exact live operation can be explained before the user signs it.

The launch is complete only after the mainnet transaction succeeds, exact
on-chain readback passes, the proof artifact is saved, and the verified website
and X proof post are live.

## 16. Primary technical references

- Solana SPL Token basics: <https://solana.com/docs/tokens/basics>
- Raydium LaunchLab overview: <https://docs.raydium.io/user-flows/launchlab-overview>
- Raydium LaunchLab creation guide: <https://docs.raydium.io/id/user-flows/creating-a-launchlab-token>
- Raydium creator-fee guide: <https://docs.raydium.io/user-flows/how-creator-fees-work>
