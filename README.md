# HAKKY

**Rugs hate this little guy.**

HAKKY is a personal, transparent Solana fair-launch meme coin whose launch facts
are checked by HakkyAgent.

**HakkyAgent verifies the facts. You decide the risk.**

## Planned fair-launch commitments

Until canonical proof is published, these policy values are planned commitments:

- 1,000,000 HAKKY fixed supply
- six decimals
- 100% public distribution: 80% bonding curve, 20% post-graduation liquidity
- 0% team allocation
- no presale, vesting, treasury, or creator first-buy
- exact LaunchLab PDA mint authority while the curve is live; null after verified graduation
- freeze authority absent
- creator fees disabled
- CPMM Burn & Earn permanent lock of the full irreversible share, not an SPL burn
- 24 SOL configured minimum; the observed graduation balance is reported separately
- creator-funded launch cost capped at 1.00 SOL

## Verify, don't trust

Before launch, no official mint address exists. Ignore addresses in replies and
DMs. The public lifecycle is `prelaunch`, `curve-live`, then `graduated`.
`hakky.xyz` publishes a mint only from canonical evidence. A creator token
balance is always a finalized, time-qualified observation rather than a
permanent claim.

## HakkyAgent

HakkyAgent checks the HAKKY mint, supply, authorities, creator balance, and the
canonical LaunchLab proof bundle. It does not verify every Solana transaction,
provide a safety guarantee, or guarantee scam detection.

Launch stops on a mutable PlatformConfig, unavailable raw unsigned transaction,
non-atomic immutable metadata, or any non-full-lock LP disposition. See the
reviewed branch -> PR quality -> separately approved merge -> main Pages order
in the launch policy.

Runtime Solana dependencies remain pinned at `@solana/web3.js@1.98.4` and
`@solana/spl-token@0.4.15`. Do not run `npm audit fix --force`; recheck the two
documented upstream exceptions by 2026-08-23.

## Project documents

- [Token policy](docs/TOKEN.md)
- [Launch and verification policy](docs/LAUNCH.md)

## Risk

HAKKY is a high-risk meme coin with no promised utility or returns. Nothing in
this repository is financial, legal, or tax advice.
