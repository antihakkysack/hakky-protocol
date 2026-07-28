# Contributing

HAKKY is a personal project. Small, evidence-backed improvements are welcome
through focused pull requests.

Every change must preserve these non-negotiable rules:

- exactly 10,000,000 HAKKY with six decimals;
- 8,000,000 HAKKY for the permissionless curve;
- 2,000,000 HAKKY for the initial permanent-pool seed;
- 0 HAKKY team or creator allocation, with no presale or vesting;
- 0% curve fee and an exact 0.25% pool-retained fee;
- null mint and freeze authorities after initialization;
- a finalized program with null upgrade authority before initialization;
- no LP token, privileged withdrawal, rescue, close, pause, update, or
  governance route; and
- creator-funded mainnet debit at or below 1.00 SOL.

Run these approval-neutral checks before opening a pull request:

```powershell
npm ci
npm run schemas
npm run assets
npm run check
git diff --check
```

Keep wallet secrets, private nonces, credentials, authenticated URLs, and
ignored ceremony artifacts out of issues, commits, logs, and fixtures. Never
replace pinned dependencies or run a forced audit rewrite without a separate
source and compatibility review.

A feature branch does not deploy Pages. Push, pull-request creation or update,
merge, automatic Pages deployment, metadata upload, wallet connection, signing,
transaction submission, SOL spending, and social publication each require
their own separate action-time approval.

Report security problems through the private process in `SECURITY.md`.
