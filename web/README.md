# HAKKY website

Static personal-project site for `hakky.xyz`. Serve it locally with:

```powershell
rtk npm run preview
```

The public runtime is intentionally prelaunch-only:

- `data/launch.json` must match the exact schema-v3 planned record;
- `addresses` and `proof` remain `null`;
- the browser adapter writes only six safe proof-terminal strings;
- failed loading, JSON, validation, or DOM state restores the exact
  `PROOF UNAVAILABLE` warning;
- no wallet, trading control, market link, remote script, remote font, or
  third-party embed is present; and
- the public tree contains no official program, mint, transaction, or user
  address.

Planned economics are 10,000,000 HAKKY total, split
8,000,000 / 2,000,000 / 0 between curve, initial permanent-pool seed, and
team/creator allocation. The planned curve fee is 0%; the pool-retained fee is
0.25%; creator-funded mainnet debit is capped at 1.00 SOL.

Run `rtk npm run check:site` before any publication handoff. Pushing,
deploying, and every Solana mutation require separate action-time approval.
