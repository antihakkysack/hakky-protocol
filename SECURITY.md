# Security

## Current status

HAKKY is prelaunch. No official program, mint, market, pool, transaction, or
trading destination is published.

The project is building a custom immutable Solana curve-to-pool program. Local
tests and internal reviews are not a third-party security audit. Independent
qualified Solana security review, independent economic and math review, and a
third independent byte-identical build remain mandatory before mainnet launch.

## Reporting

Open a private GitHub security advisory for code, dependency, protocol, or
impersonation issues. Include only public addresses, URLs, transaction
signatures, screenshots, and reproducible steps.

Never send seed phrases, private keys, wallet files, private release nonces,
authenticated RPC URLs, API tokens, or passwords.

## Immutable launch requirements

The reviewed production design requires:

- exactly 10,000,000 HAKKY with 8,000,000 HAKKY in the curve,
  2,000,000 HAKKY in the initial permanent-pool seed, and 0 HAKKY allocated to
  the creator or team;
- 0% curve fee and an exact 0.25% pool-retained fee;
- null mint and freeze authorities after initialization;
- null upgrade authority before initialization;
- no LP token, privileged withdrawal, rescue, close, pause, update, fee
  recipient, or governance route; and
- every reachable creator-funded mainnet prefix at or below 1.00 SOL.

Stop if the reviewed binary, program identity, account order, signer, amount,
expiry, authority, metadata bytes, fixed economics, or finalized readback
differs. Failed or ambiguous submission is never permission to retry or create
a replacement token.

## Evidence and approval boundaries

Evidence is never approval. Devnet rehearsal, simulation, a green readiness
report, or an approval design does not authorize a mainnet action.

Program deployment, authority finalization, market initialization, each recovery
transaction, metadata upload, wallet connection, signature, transaction send,
SOL debit, branch push, pull-request creation or update, merge, automatic Pages
deployment, domain change, and each social save, post, or pin require separate
action-time approval naming the exact effect and cost where applicable.

No approval carries forward after a transaction, hash, address, destination,
cost, account set, or commit changes.

## Official-address rule

Before verified publication, there is no official HAKKY address. After launch,
accept an address only when `https://hakky.xyz` and the canonical finalized
program, market, and pool proof artifacts agree exactly.
