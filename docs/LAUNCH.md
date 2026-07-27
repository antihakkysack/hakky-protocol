# HAKKY launch and verification policy

HAKKY is prelaunch. No official program, mint, market, curve, pool, or
transaction is published.

This is the active policy for the custom immutable curve-to-pool design.
Earlier external-venue v2 proof collectors remain internal compatibility code;
they are not the current public launch route.

## Claim boundary

HakkyAgent checks only published HAKKY facts backed by deterministic repository
checks and canonical evidence. It does not:

- audit arbitrary tokens or every Solana transaction;
- certify any program, token, wallet, or transaction as safe;
- guarantee scam detection;
- predict price, liquidity, or demand; or
- provide financial, legal, medical, religious, or tax advice.

## Planned economic envelope

Initialization must match all of these values:

- 10,000,000 HAKKY display supply;
- 10,000,000,000,000 base units and six decimals;
- 8,000,000 HAKKY curve allocation;
- 2,000,000 HAKKY initial permanent-pool seed;
- 0 HAKKY team/creator allocation and no presale or vesting;
- 0% curve fee;
- 0.25% pool-retained fee, rounded upward by at most one input base unit;
- no creator or protocol fee destination; and
- creator-funded mainnet debit at or below 1.00 SOL.

At the initial state, a curve buy needs at least 1,334 HAKKY base units to move
one lamport, an initial pool sell needs 85 base units to return one lamport,
and fee rounding makes one-unit pool inputs ineffective. These thresholds are
deterministic rounding disclosures, not price, liquidity, or return promises.

The mint and freeze authorities must be null after initialization. The exact
program binary must be reproducibly reviewed, deployed, and finalized with a
null upgrade authority before market initialization.

## Required release sequence

Each action remains a separate gate:

1. Review the immutable market design and exact fixed economics.
2. Produce a reproducible program binary and run the complete local test suite.
3. Rehearse deployment, initialization, quote, swap, and invariant checks on
   devnet without presenting rehearsal state as mainnet proof.
4. Obtain action-time approval for the exact mainnet program deployment and
   maximum SOL debit.
5. Read back the deployed program, binary identity, and upgrade authority.
6. Finalize the upgrade authority to null and verify finalized state.
7. Obtain a new action-time approval for the exact market initialization
   transaction and remaining SOL debit.
8. Initialize the immutable metadata, fixed supply, allocations, authorities,
   curve, and permanent-pool seed through the reviewed program.
9. Read back every address, transaction, economic value, authority, vault,
   reserve, and proof artifact at finalized commitment.
10. Only after canonical verification, obtain separate approval to publish the site.
11. After public site readback passes, obtain another separate approval to publish official addresses.
12. After official-address readback passes, obtain another separate approval for the social announcement.

Approval of the website design is not approval to push, deploy, upload
metadata, connect a wallet, sign, send, initialize, or spend.

## Stop conditions

Stop before any mainnet action if:

- the program binary or reproducible hash differs from the reviewed artifact;
- the upgrade authority is not finalized to null before initialization;
- any supply, allocation, decimal, fee, authority, or cap differs;
- metadata can remain mutable;
- a privileged withdrawal, fee, or administrative route exists;
- the quote or transaction contains an unexpected account, instruction,
  signer, amount, expiry, or program;
- total creator-funded debit would exceed 1.00 SOL;
- required RPC or explorer readback is incomplete; or
- any address, cost, wallet prompt, or publication surface is ambiguous.

If an action fails, do not announce a launch and do not create a replacement
token automatically. Preserve the signature and evidence, diagnose the
existing state, and obtain explicit approval for any recovery action.

## Canonical public evidence

The proof terminal may leave prelaunch only after finalized evidence binds:

- program identity, binary hash, deployment transaction, and null upgrade
  authority;
- mint identity, fixed supply, decimals, null mint/freeze authorities, and
  immutable metadata;
- exact curve, market, pool, vault, and reserve accounts;
- 8,000,000 / 2,000,000 / 0 HAKKY allocation;
- 0% curve fee and 0.25% pool-retained fee;
- no creator/protocol fee destination or privileged withdrawal path;
- creator-funded cumulative debit within 1.00 SOL;
- initialization and verification transaction signatures; and
- the exact website record published from those canonical artifacts.

Unavailable or incomplete evidence must fail closed: no official address,
wallet action, or trading destination is shown.

## Public lifecycle and schemas

The public lifecycle is `prelaunch -> curve-live -> pool-live`. Proof
availability is independently `verified` or `unavailable`.
A stage must never regress.
Incomplete evidence may produce only the same-stage `unavailable` record with no official address or trading destination.

The only canonical production proof paths are:

- `proof/mainnet-program.json`;
- `proof/mainnet-market.json`; and
- `proof/mainnet-pool.json`.

The public launch record uses strict schema version `3`.
The canonical program, market, and pool artifacts each use strict schema version `1`.

## Publication boundary

Website source preparation may be completed locally. Obtain separate
action-time approval to push an exact reviewed commit, separate action-time
approval to create or update a pull request, and an approval that expressly
names both merge and automatic Pages deployment. After deployment, read back
the exact site at `1440 x 1000` and `390 x 844`.

Publishing addresses and social copy is a later gate. Each X profile save,
post, or pin needs separate approval; separate approval to post or pin on X is
never implied by website approval. Every Solana mutation requires its own
approval naming the exact action, transaction, and maximum debit.
