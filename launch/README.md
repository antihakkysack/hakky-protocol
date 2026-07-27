# HAKKY launch kit

- [X profile copy](x-profile.md)
- [Prelaunch post](prelaunch-post.md)
- [Posting sequence](content-calendar.md)
- Proof-post generator: `src/social-copy.mjs`
- Avatar: `assets/x-avatar.png`
- Banner: `assets/x-banner.png`

HAKKY is prelaunch. No official program, mint, market, pool, transaction, or
trading link belongs in public copy until canonical finalized proof exists.

The public lifecycle is `prelaunch`, `curve-live`, then `pool-live`.
Availability is independently `verified` or `unavailable`. A known stage with
incomplete evidence uses only the same-stage unavailable warning; it must never
regress or publish an unverified address.

Every public claim must preserve the fixed 10,000,000 HAKKY supply,
8,000,000 HAKKY curve allocation, 2,000,000 HAKKY initial permanent-pool seed,
0 HAKKY creator/team allocation, 0% curve fee, exact 0.25% pool-retained fee,
null authorities, no privileged withdrawal, and the 1.00 SOL creator-funded
cap.

Do not add price, volume, return, urgency, guaranteed-safety, exchange,
aggregator, wallet-support, or permanent-reserve claims.

At the initial state, a curve buy needs at least 1,334 HAKKY base units to move
one lamport, an initial pool sell needs 85 base units to return one lamport,
and fee rounding makes one-unit pool inputs ineffective. State these only as
rounding disclosures, never as trading recommendations.

Website source, proof artifacts, and social copy are separate release gates.
Exact push, pull-request creation or update, merge plus automatic Pages
deployment, and each X save, post, or pin require separate action-time
approval. Both desktop and mobile public readback must pass before any launch
post is approved.
