# HAKKY launch kit

- [X profile copy](x-profile.md)
- [Prelaunch post](prelaunch-post.md)
- [Posting sequence](content-calendar.md)
- Proof-post generator: `src/social-copy.mjs`
- Avatar: `assets/x-avatar.png`
- Banner: `assets/x-banner.png`

HakkyAgent verifies the facts. You decide the risk. HakkyAgent covers only
published HAKKY launch facts backed by the repository's deterministic checks and
canonical evidence; it does not provide a safety guarantee or promise scam detection.

The public lifecycle is `prelaunch`, `curve-live`, then `graduated`. Until
canonical proof is published, fixed supply and public allocation are planned
commitments. Curve-live requires the exact LaunchLab PDA mint authority;
graduated requires null mint/freeze authorities. Creator balance is always a
finalized, time-qualified observation.

Every public mint address must come from the verified mainnet proof. Do not add
price, volume, return, urgency, or undisclosed-promotion claims.

The 24 SOL configured minimum is distinct from the observed graduation balance.
CPMM Burn & Earn permanent lock is not an SPL burn. Stop on a mutable
PlatformConfig, absent raw unsigned transaction, non-atomic immutable metadata,
or non-full-lock LP disposition.

Every lifecycle publication follows the reviewed feature branch -> PR quality
-> separately approved merge plus automatic main Pages deployment -> both
viewport readback -> separately approved X post and pin sequence. If proof is
incomplete after an observed stage, publish only the same-stage unavailable
warning; never regress the lifecycle claim.

For each transition, validate the finalized stage receipt and any
content-addressed continuity receipt, commit only stage-appropriate artifacts,
and run the complete local and both-viewport gate. Obtain separate approvals
for the exact push, PR create/update, and merge plus automatic Pages deployment.
Read back Pages before requesting separate X post and pin approvals. A failed
readback permits only a newly reviewed same-stage unavailable rollback; later
verified recovery requires the complete canonical artifact set and full release
sequence again.
