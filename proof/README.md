# HAKKY canonical proof

HAKKY is prelaunch. No canonical mainnet proof exists yet, and this directory
must not contain fabricated addresses or rehearsal state presented as mainnet.
HakkyAgent may present only HAKKY facts that are bound by the closed canonical
artifacts below; it does not provide a safety guarantee.

The immutable proof lifecycle is:

`prelaunch -> curve-live -> pool-live`

Proof availability is independent:

`verified | unavailable`

A lifecycle stage must never regress. When finalized evidence is incomplete,
the public record may expose only the same-stage `unavailable` branch with no
official address or trading destination.

## Canonical paths

The only production proof paths are:

- `proof/mainnet-program.json`
- `proof/mainnet-market.json`
- `proof/mainnet-pool.json`

The canonical program, market, and pool artifacts each use strict schema
version `1`. The public launch record uses strict schema version `3`.

Canonical artifacts are written only by their closed read-only verifiers after
every required check passes. A failed verifier may emit sanitized diagnostics,
but it must not occupy a canonical path. Do not hand-edit, copy, or infer proof
fields.

## Required evidence

Program proof binds the program identity, executable hash and length,
deployment transaction, loader-v3 ProgramData identity, and finalized null
upgrade authority.

Market proof binds the mint, immutable metadata, fixed supply and decimals,
null mint and freeze authorities, exact state and vault PDAs, the
8,000,000 / 2,000,000 / 0 allocation, 0% curve fee, initialization transaction,
and cumulative creator-funded debit.

Pool proof binds the one-way pool transition, exact initial terminal reserves,
the 0.25% pool-retained fee, conservation checks, and the absence of any LP
token, privileged withdrawal, rescue, close, update, or fee-recipient route.

Each artifact must use finalized mainnet-beta evidence, exact raw-account and
transaction hashes, closed schemas, and append-only publication semantics.
Devnet artifacts are rehearsal evidence only.

The ignored `artifacts/readiness/no-mainnet-v1.json` report is an operator
audit, not a canonical proof and never authorizes a transaction or
publication. It must not be copied into this directory.

## Metadata boundary

The only currently authorized provider upload input is the exact
`web/assets/token.png` image. That upload has not been performed. Uploading
metadata JSON, connecting a wallet, paying a provider, or making any Solana
transaction is not authorized by the image-only approval.

The final metadata URI is exactly
`https://hakky.xyz/metadata/hakky-v1.json`. Its served bytes, image CID, local
manifest, two-gateway readback, immutable on-chain account, and canonical
proof must agree byte-for-byte before publication.

## Publication boundary

Proof creation does not authorize a push or publication. Exact branch push,
pull-request creation or update, merge plus automatic Pages deployment, domain
changes, and social post or pin operations require separate action-time
approval and readback.
