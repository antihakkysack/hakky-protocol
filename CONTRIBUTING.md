# Contributing

HAKKY is a personal project. Small fixes and evidence-backed improvements are
welcome through focused pull requests.

Every change must preserve these non-negotiable rules:

- 1,000,000 HAKKY fixed supply with six decimals;
- 100% public distribution and 0% team allocation;
- no presale, vesting, treasury, creator first-buy, taxes, or hidden controls;
- exact LaunchLab PDA mint authority during `curve-live`, null mint authority
  after verified `graduated`, and null freeze authority throughout;
- a 24 SOL configured minimum kept distinct from the observed graduation balance;
- CPMM Burn & Earn permanent lock kept distinct from an SPL burn;
- no promise of utility, profit, returns, or guaranteed scam detection;
- no third-party agency attribution or unrelated product story.

Stop on a mutable PlatformConfig, missing raw unsigned transaction, non-atomic
immutable metadata, or non-full-lock LP disposition. Run `npm ci`,
`npm run assets`, and `npm run check` before opening a pull request. A feature
branch never deploys Pages: require PR quality, an exact reviewed head SHA, and
separate approval for merge plus its automatic main-branch Pages effect.

Keep wallet secrets and credentials out of issues, commits, and test fixtures.
Keep `@solana/web3.js@1.98.4` and `@solana/spl-token@0.4.15` pinned. Do not run
`npm audit fix --force`; recheck the two documented upstream exceptions by
2026-08-23. Report security problems using the private process in `SECURITY.md`.
