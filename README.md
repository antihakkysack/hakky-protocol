# HAKKY

> We are not anonymous.
> We are HAKKY.
> And the whole wide world
> just. got. sacked.

HAKKY is a personal, fixed-supply Solana meme project building a custom,
immutable, permissionless curve-to-pool market. HakkyAgent is its fictional
proof character: it checks only canonical HAKKY evidence and never makes a meme
coin safe.

## Current state

HAKKY is prelaunch. No official program, mint, market, curve, pool, or launch
transaction is published. Ignore addresses from replies, ads, and DMs.

The website and protocol remain separate release gates. Publishing the site,
deploying a Solana program, initializing the market, signing a transaction, or
spending SOL each requires its own action-time approval and exact readback.

## Planned fixed rules

These values are requirements, not verified live facts:

- 10,000,000 HAKKY display supply and 10,000,000,000,000 base units;
- six decimals under the Classic SPL Token program;
- 8,000,000 HAKKY for the permissionless curve;
- 2,000,000 HAKKY for the initial permanent-pool seed;
- 0 HAKKY team or creator allocation, with no presale or vesting;
- 0% curve fee;
- 0.25% pool-retained fee, rounded upward by at most one input base unit;
- no creator or protocol fee destination;
- null mint and freeze authorities after initialization;
- a finalized program with null upgrade authority before market initialization;
- no more than 1.00 SOL of creator-funded mainnet debit.

Permanent initial liquidity means no privileged withdrawal path for the initial
seed. It does not mean pool reserves never change through valid swaps.

## Evidence boundary

HakkyAgent publishes only HAKKY facts that survive deterministic checks and
canonical readback. It does not audit arbitrary tokens, verify every Solana
transaction, detect every scam, predict price, or guarantee safety.

The local no-mainnet evaluator derives its result from raw candidate artifacts:

```powershell
rtk npm run readiness:no-mainnet -- --build artifacts/build/candidate/final-a --evidence-root artifacts/independent-evidence --output artifacts/readiness/no-mainnet-v1.json
```

That report cannot accept an approval or authorize an effect. Its current
decision remains `NO-GO`.

## Project documents

- [Token policy](docs/TOKEN.md)
- [Launch and verification policy](docs/LAUNCH.md)
- [Current mainnet no-go checklist](docs/MAINNET-NO-GO-CHECKLIST.md)
- [Approved immutable market design](docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md)

## Risk

HAKKY is a high-risk meme coin. There is no promised utility, price, yield,
floor, return, buyback, or recovery mechanism. Nothing in this repository is
financial, legal, medical, religious, or tax advice.
