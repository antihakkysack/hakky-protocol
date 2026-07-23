# HAKKY LaunchLab Guard Rejection Analysis

Date: 2026-07-23
Status: `NO-GO` under the user-approved strict-immutability boundary; retained
as a rejected-option analysis

## 1. Decision and precedence

HAKKY will not implement or launch this LaunchLab guard architecture while
strict immutable economics remain the approved policy. The proposed mechanism
would have used a minimal immutable Solana control program to create one exact
Raydium LaunchLab `PlatformConfig`. The program is not a token contract or an
automated market maker. Its only purpose is to make the HAKKY-controlled
PlatformConfig administrator a program-derived address (PDA) that has exactly
one allowed creation path and no update, withdrawal, claim, close, or arbitrary
cross-program-invocation path.

After a reproducible deployment, the program's loader upgrade authority would
have been
permanently removed before the PDA creates the PlatformConfig. The finalized
program bytes and null upgrade authority become required launch evidence.

That mechanism freezes only HAKKY-controlled PlatformConfig administration. It
cannot freeze, constrain, or veto Raydium LaunchLab itself. At finalized
observation slot `434701391`, LaunchLab ProgramData
`D2QX47Tv2uhNNwFcnLCyJtLMZ4WGmc7eXxvyEmD6zNUh` remained owned through the
upgradeable loader, deployed at slot `431439693`, with non-null upgrade
authority `FytDrVzDybM1TwFQPGb8qaxZR7dBCzNeqT3vtQsceZQK`. Its padded executable
region was `2,560,000` bytes with SHA-256
`ed147779160b62a6a4ff3ab5b27774932d75f094eb9cc403050dc8926f798526`;
the `1,181,129`-byte zero-trimmed executable hashed to
`b8b29ce223397528b175fd8dcca6c3dd3b61d2b4155fdc72fea59412311e5692`.

Official Raydium documentation at commit
`104dff2efdc72a7897d757083c3f61a68aef9a47` states that LaunchLab source is not
publicly available. The official IDL at
`e7e0c96fe77bcf6a020b84a44c47a722aac8e359` is ABI semantics, not program
source or build correspondence, and predates the current deployment. The
official CPI adapter at
`115df2779d53bacc7db9d0be2773a4b48a6d372b` is an interface adapter rather than
the LaunchLab implementation. Solana Verified Builds reports the program
unverified and unfrozen.

Therefore exact-binary rehearsal can provide bounded behavioral evidence only;
it cannot establish public-source correspondence or prevent a later Raydium
upgrade before graduation. A stop-on-hash-drift controller can detect a change
before a HAKKY-submitted transaction but cannot prevent the external migrator
from acting on an already-live curve under changed code. Both LaunchLab-to-CPMM
and LaunchLab-to-AMM-v4 inherit this residual platform-admin trust.

This rejection analysis is controlling where it conflicts with earlier HAKKY
documents. In particular, it:

- replaces the incompatible 1,000,000-token assumption with the user-approved
  fixed supply of exactly 10,000,000 HAKKY;
- rejects deploying the minimal LaunchLab control program because it cannot
  deliver strict end-to-end immutability;
- preserves classic SPL Token while requiring a separately reviewed immutable
  custom curve/pool or a demonstrably immutable external venue;
- invalidates the CPMM-versus-AMM-v4 selection inside LaunchLab; Section 2.1 is
  retained only as evidence for the rejected option;
- preserves the existing fail-closed proof lifecycle and separate action-time
  approval boundaries.

No existing or future code may produce a LaunchLab mainnet approval envelope
under the approved strict-immutability policy. Reconsideration requires a new,
explicit user waiver accepting opaque Raydium source and upgrade-admin trust;
that waiver has not been given and is not recommended. The active replacement
design must independently preserve the 10,000,000/80-20/zero economics, one-SOL
cap, immutable code, permissionless participation, proof schemas, budget
accounting, and devnet rehearsal before any mainnet approval envelope exists.

## 2. Community ownership and economic invariants

The launch has these common, fixed, normative values regardless of the selected
migration venue:

| Invariant | Exact value |
| --- | --- |
| Token program | classic SPL Token |
| Name / symbol | Hakky Protocol / HAKKY |
| Decimals | `6` |
| Total display supply | `10,000,000` HAKKY |
| Total base-unit supply | `10,000,000,000,000` |
| Public bonding-curve allocation | `8,000,000` HAKKY / `8,000,000,000,000` base units |
| Migration-liquidity allocation | `2,000,000` HAKKY / `2,000,000,000,000` base units |
| Creator/team allocation | `0` |
| Quote mint | wrapped SOL, `So11111111111111111111111111111111111111112` |
| Configured minimum fundraising threshold | `24,000,000,000` lamports / 24 SOL |
| Creator first buy | absent |
| Presale / treasury / airdrop / vesting | absent |
| HAKKY-configurable platform fee rate | `0` millionths |
| LaunchLab curve creator fee rate | `0` millionths |
| Platform vesting scale | `0` |
| Metadata payment | `0` lamports |
| Creator-funded cumulative mainnet cap | `1,000,000,000` lamports |

The previously modeled 1% HAKKY-configurable platform fee is replaced with
zero. The reviewed GlobalConfig imposes a maximum rather than a minimum, so
zero is the cleaner community-first policy and creates no HAKKY platform-fee
claim. The claim-fee role still points to the economic-sink PDA as a
defense-in-depth authority: it cannot sign Raydium's reviewed claim
instructions, and the guard has no claim path. If any platform fee nevertheless
accrues, it is unclaimable by any HAKKY-controlled path under the reviewed
executable/config and remains in Raydium-controlled fee-vault accounting; it is
not automatically transferred or burned into the sink. Raydium governance
remains an external trust dependency and prevents an absolute claim about all
future upstream behavior.

Raydium protocol and pool fees that are outside HAKKY's PlatformConfig must be
decoded and disclosed separately. They are external venue behavior, not a
HAKKY allocation.

The CPMM tuple does not disable Raydium's post-graduation creator-labelled
venue fee. Under the currently selected AmmConfig it charges 0.05% on the quote
side. Under the reviewed executable/config, the nonsigning
`platform_cp_creator` sink and immutable guard eliminate every
HAKKY-controlled human/program signing path for claiming or redirecting it, but
the fee remains charged and stranded in Raydium accounting. This is not
semantically equivalent to a zero fee and requires explicit user approval
before this specification can be committed as the selected design.

The policy manifest defines a closed, disclosed set of creator-, deployer-, and
team-controlled public addresses, including the launch initializer. Those
addresses receive no launch tokens, presale tokens, vesting position, treasury
allocation, first buy, Fee Key, LP token, locked-position NFT, withdrawal
right, platform fee, creator fee, or other economic claim. Their aggregate
HAKKY balance across all classic token accounts must be observed as zero at the
finalized curve-live proof point. The evidence cannot prove that a human
controls no undisclosed wallet, so public wording must be limited to the
disclosed address set and the encoded zero launch allocation.

This launch allocation does not prohibit the creator from later buying HAKKY on
the same public terms as anyone else. Any later public-market purchase is not a
launch allocation and must never be represented as continued zero ownership.
Public evidence must time-qualify creator-balance observations by finalized
slot and UTC time.

### 2.1 Migration-venue decision

This subsection records the economic comparison that was completed before the
upstream LaunchLab trust blocker was confirmed. Neither branch is selectable
under the approved strict-immutability policy.

One source-pinned Raydium route and one conditional Raydium candidate remain;
they do not have equivalent community economics:

| Route | HAKKY-controlled rights | Creator-labelled user charge | Current proof status |
| --- | --- | --- | --- |
| CPMM | none under HAKKY control; claimant fixed to nonsigning sink | 0.05% on quote side, charged but unclaimable by a HAKKY-controlled path under the reviewed executable/config | source-pinned design path; explicit fee acceptance required |
| AMM-v4 | none if all minted/claimable initial LP is burned and SPL LP supply is zero | no CPMM creator-fee field | historical transaction observed that burn; exact-current-binary proof missing |

Only the explicitly selected branch becomes normative. The mutually exclusive
route constants are:

| Branch | Exact compiled route values | Additional acceptance |
| --- | --- | --- |
| CPMM | curve index `0`; `migrate_type = 1`; `migrate_cpmm_fee_on = 0`; PlatformConfig scales platform `0`, creator `0`, burn `1,000,000`; exact pinned CPMM configuration | accept the current `500`-millionths / 0.05% quote-side creator-labelled fee, stranded from every HAKKY-controlled claim path |
| AMM-v4 | curve index `0`; `migrate_type = 0`; the fee-side selector proved by the pinned source and exact-current-binary rehearsal; PlatformConfig scales platform `0`, creator `0`, burn `1,000,000` as neutral defense in depth; the same structurally required CPMM configuration | accept Raydium-controlled, Raydium-funded OpenBook precreation and migration, including the possibility that Raydium delays or declines |

A non-authorizing `routeCandidate` qualification phase may pin candidate source,
attempt deterministic reproduction, and run bounded local rehearsal before
venue approval. Its artifacts are labelled qualification evidence, cannot
compile or deploy the HAKKY guard, cannot create a launch approval envelope, and
cannot represent the candidate as selected.

After qualification passes, `selectedVenue` must be fixed by explicit user
approval before the program-ID ceremony, release-source freeze, guard
compilation, or route-specific approval-envelope generation. Selecting one
branch invalidates every compiled binary, curve encoding, release rehearsal,
approval envelope, and proof artifact from the other branch; candidate
qualification artifacts remain only as content-hashed provenance inputs and
must be rebound to the selected release snapshot.

The community-first recommendation is to continue the AMM-v4 proof path because
it offers a route to burn all minted/claimable initial LP, leaving SPL LP
supply zero, without the CPMM fee that would be charged but unrecoverable. It
may be selected only if exact-current-binary evidence confirms zero
creator/team charge and zero creator/team right. This is a
recommendation, not an approved architecture substitution. Until the user
explicitly selects a route, only the common constants above are normative and no
route-specific implementation or approval envelope may be produced. Selection
also requires a like-for-like disclosure of AMM-v4 trade, protocol, PnL,
OpenBook, and operator costs; absence of the CPMM creator-labelled fee alone is
not enough to call the route community-best.

The strongest finalized historical AMM-v4 evidence is:

- migration transaction
  `Zc4yPbX9rr1Y8QTRdC37V47frwYW4fNazhy5zeknXYUrr5REBFW9Xwu1G9izc1C8xPrBnr8boFtFdKmpYE9PPMK`,
  slot `430309393`, UTC `2026-07-02T12:46:31Z`, serialized-transaction SHA-256
  `222db19e8f3498c5cb9430fd040cabf20bc96b2ce6cabbb333af8947a715de9a`;
- one SPL `MintTo` of `9,327,378,053,244` LP base units followed by one SPL
  `Burn` of the exact same amount and closure of the temporary LP account to the
  Raydium migrator;
- at finalized slot `434695493`, UTC `2026-07-23T10:11:31Z`, the 82-byte LP
  mint account had raw SHA-256
  `dfa0a0e4308fa9143a9aafd9b7746b435cf21548d17370bbeecbd8620f99f58b`
  and supply `0`; a mint-filtered classic Token Program scan at finalized slot
  `434695512`, UTC `2026-07-23T10:11:39Z`, returned zero LP token accounts;
- no creator or PlatformConfig LP destination, and AMM `lpReserve` equal to the
  burned minted amount plus the unminted `10^lp_decimals` accounting minimum
  (`1,000,000` for this historical six-decimal LP mint);
- no creator signature, creator debit, Fee Key, lock NFT, creator-fee
  instruction, or HAKKY-controlled recovery right in that migration.

That transaction does not certify today's executable pair. It predates both the
current LaunchLab ProgramData deployment at slot `431439693` and the current
AMM-v4 ProgramData deployment at slot `434518095`. At finalized observation
slot `434693743`, UTC `2026-07-23T09:59:16Z`, a 1,000-signature scan of
GlobalConfig AMM migrator
`RAYzrepoBdjSFg7MZj2vy4XBSv2azKRXC72ztUMZMJB` found the historical migration
above as its newest migration; no observed migration used the current
LaunchLab+AMM-v4 pair. AMM-v4 therefore remains a release `NO-GO` until a
faithful local validator/ProgramTest or devnet rehearsal, using the exact
current program bytes and HAKKY tuple, proves the same burn of all
minted/claimable initial LP, zero SPL LP supply, and no-right postconditions.

The observed program provenance at finalized slot `434695627`, UTC
`2026-07-23T10:12:26Z`, used for that gate is:

| Program | ProgramData | Deployed slot | Upgrade authority | Program-byte SHA-256 |
| --- | --- | ---: | --- | --- |
| LaunchLab `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` | `D2QX47Tv2uhNNwFcnLCyJtLMZ4WGmc7eXxvyEmD6zNUh` | `431439693` | `FytDrVzDybM1TwFQPGb8qaxZR7dBCzNeqT3vtQsceZQK` | `ed147779160b62a6a4ff3ab5b27774932d75f094eb9cc403050dc8926f798526` |
| AMM-v4 `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` | `A7ZG7ByDi8DpzT9Ab7CiXhvgYTJQmaDPJkMDoPitaCQV` | `434518095` | `FytDrVzDybM1TwFQPGb8qaxZR7dBCzNeqT3vtQsceZQK` | `b80b1b915b14d2276176b0c3fa111799bf20962b397b97cec65f3482a5021fa3` |
| OpenBook `srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX` | `9K32VSPTg4PHY7Hb2QZq26e5CujwMgt8Bqq4kJrp5zp8` | `168006653` | `8xYs2tGXPayMtgsqs4NuMy7bnWr7DM9tnnkbY2SHVbys` | `078ade55aea60c32e3084c3f56806e097b1bc066c9480d484e51cfd11db88333` |
| classic Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | `3gvYRKWyXRR9xKWe1ZjPhLY5ZJRN7KDB4rFZFGoJfFk2` | `419472000` | null | `8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697` |

The immutable legacy-loader Associated Token Program
`ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` had a 105,032-byte executable
account with raw SHA-256
`6804554e69fd3a58caa191dc4a58f4c67223d30ca28ab8987f39fc18d2f7374d`
at finalized slot `434695595`, UTC `2026-07-23T10:12:13Z`.

These values are evidence snapshots, not permanent constants. Every
action-time rehearsal and approval envelope must re-fetch them and stop on any
drift. The pinned Raydium documentation approved for CPMM does not prove
correspondence between today's AMM-v4 bytes and public source; selecting AMM-v4
also requires an explicit, reviewed source-provenance package.

No exact official Raydium AMM-v4 source commit has yet been demonstrated or
independently verified to reproduce the deployed bytes. The current ProgramData
was deployed at
`2026-07-22T13:29:55Z`; its padded program region hashes to the value in the
table and its trailing-zero-trimmed executable hashes to
`0867504a9b3ea239430700fbabc7230876a0f57c419a67fdb06f8e2f3e499ce7`.
The latest plausible official source candidate,
`c613c87c41edbe21112c9b8341774a70009c6d7b`, predates deployment but lacks a
pinned build toolchain, published deployment binary, signed manifest, or
successful independent deployed-byte verification. An embedded repository URL
establishes only the source family, not commit identity.

The prescribed canonical deterministic reproduction attempt is pinned to
Solana Verified Builds `v0.5.1` commit
`8470dd1fe5dd93209bbfdacaebe444349affe71b`, exact source commit
`c613c87c41edbe21112c9b8341774a70009c6d7b`, exact `Cargo.lock` SHA-256
`3746c0aaf40e0383b14f1f5fff4f40b9e79c12256d6a109d9a45f10d3090044c`,
and base image
`solanafoundation/solana-verifiable-build@sha256:1e077a20f6d52a751e22470f3950a0fbae022f4db92f456bb69c6e0b1499b8a3`.
It must build library `raydium_amm` and produce the zero-trimmed executable hash
`0867504a9b3ea239430700fbabc7230876a0f57c419a67fdb06f8e2f3e499ce7`.
That image selects Solana/Agave `2.1.0` and platform-tools `v1.43`, consistent
with the candidate lockfile. A matching hash establishes correspondence for
this candidate.

Its status is `not executed`: qualification was discontinued after the upstream
LaunchLab source/upgrade-authority blocker made both LaunchLab routes `NO-GO`
under the active policy. The host Docker daemon was subsequently made available,
but running the AMM-v4 reproduction cannot cure LaunchLab's separate trust gap.
If a future explicit trust waiver reopens this branch, execution must produce a
machine-generated result artifact with status `matched` or `mismatched`, the
exact command and environment, image digest, source and lockfile hashes,
captured stdout/stderr artifact hashes, produced binary length, padded and
zero-trimmed binary hashes, and UTC start/end times. An unrecorded or partially
recorded run is no evidence.

A mismatch is not permission to sweep toolchains, features, or source branches.
The candidate `program/Cargo.toml` says the program must be built with
`do.sh`, but that script is absent from the commit, public refs, and repository
history. The repository also lacks a Rust/platform-tools pin, CI deployment
recipe, release binary, checksum, signed manifest, or embedded source revision.
Unless the canonical attempt matches or Raydium supplies the missing exact
build evidence, AMM-v4 source correspondence remains a hard stop.

That candidate AMM source calculates initial liquidity as the integer square
root of the two vault balances, reserves `10^lp_decimals` as unminted minimum
liquidity, and mints only the remaining claimable LP to a caller-supplied token
account. It does not burn the initial LP during AMM initialization. The
historical LaunchLab migration separately burned the claimable minted LP.
Proof wording must therefore distinguish the unminted minimum-liquidity amount
from the minted LP that LaunchLab subsequently burned, and the exact-current
LaunchLab path must be proved independently.

AMM-v4 also retains a disclosed Raydium operator dependency. In the historical
pair, Raydium's `migrate_to_amm_wallet` first created the five deterministic
OpenBook accounts, then submitted migration:

- OpenBook precreation transaction
  `2gnRThRbqDWJGwLG87v7LWeWWbeGHuNCQELL2cMztHmo259Eubx1X8pFcWVg3ewA9ZWUXbQSuZCMzfT4cL2mqFkq`,
  slot `430309388`, finalized net loss `297,443,640` lamports:
  `297,428,640` permanent account rent plus `15,000` transaction fee;
- migration finalized net loss `201,296,281` lamports:
  `51,281,280` permanent AMM rent, `150,000,000` AMM creation fee, and `15,001`
  transaction fee;
- combined Raydium-funded finalized net loss `498,739,921` lamports;
- migration also transiently funded a `2,039,280`-lamport LP token account that
  closed and refunded within the successful transaction, making peak migration
  funding `203,335,561` lamports and pair-start Raydium wallet capacity
  `500,779,201` lamports.

The creator was absent from both transactions. AMM-v4 graduation remains
feasible only if Raydium voluntarily continues to fund this external path; if
Raydium declines, HAKKY waits or stops rather than paying. The one-SOL cap stays
valid by forbidding any debit, reimbursement, guarantee, or transfer from the
canonical HAKKY funder to the Raydium migrator or its derived accounts. The
source-proven transfer of already-public bonding-curve reserves into the exact
bound AMM vaults is community liquidity, not creator funding, and must be
classified separately.
Precreation without subsequent migration strands `297,428,640` lamports of
Raydium-funded account rent and permanently spends its `15,000` fee; a landed
failed migration adds its fee while atomic AMM state changes roll back. HAKKY
has no close/recovery authority and must never reimburse any branch. This
two-step operational dependency must be disclosed rather than described as
HAKKY-controlled economic self-sufficiency.

If AMM-v4 is selected, the guard changes only the compiled curve route and the
off-chain graduation evidence:

- `migrate_type = 0`;
- the exact fee-side selector must be established from the pinned source and
  exact-current-binary rehearsal rather than inferred from its field name;
- PlatformConfig scales `0/0/1,000,000` remain neutral defense-in-depth fields,
  not proof of AMM LP burn;
- the valid CPMM `AmmConfig` remains an inert-but-structurally-required
  `CreatePlatformConfig` account and stored field, with the same exact
  validation and provenance; only CPMM-specific graduation evidence for the
  Lock program, lock NFT, and Burn & Earn is replaced by exact AMM-v4,
  OpenBook, LP-mint, burn, account-funding, and no-right proof.

Selection of AMM-v4 authorizes none of the deployment, spend, wallet, metadata,
publication, or mainnet actions reserved for separate action-time approval.

## 3. Threat model and trust boundary

### 3.1 HAKKY-controlled risks eliminated by the guard

After the successful consumed-marker/PlatformConfig initialization transaction,
the design must make all of these impossible. Between guard-program
finalization and that initialization, the only exceptions are the fixed,
one-time PlatformConfig creation/update and marker/administrator System
operations enumerated in Section 4.2; no caller-selectable variant exists:

- changing PlatformConfig fees, recipients, migration scales, CPMM creator, or
  vesting fields;
- signing as the PlatformConfig administrator for an update;
- upgrading or replacing the HAKKY guard program;
- using the guard for arbitrary CPI;
- withdrawing lamports or tokens from a guard PDA;
- claiming platform, creator, LP, lock-NFT, or migration rights;
- closing the PlatformConfig or a guard-owned account;
- creating a second HAKKY PlatformConfig through the same guard version;
- redirecting any recipient or authority to the creator or deployer.

Deleting an ordinary keypair, hiding a secret, or promising not to call an
update is not an acceptable control. The restriction must follow from
finalized program bytes, PDA derivation, null loader upgrade authority, and the
absence of any callable instruction that can exercise the prohibited rights.

### 3.2 External Raydium and Solana trust retained

This design removes HAKKY-controlled economic administration. It does not make
the entire venue administrator-free. HAKKY still depends on:

- the deployed Raydium LaunchLab program;
- the selected downstream venue programs: Raydium CPMM and lock for the CPMM
  route, or Raydium AMM-v4 and OpenBook for the AMM-v4 route;
- Raydium's upstream upgrade authorities and any mutable downstream
  configuration or operator migration path;
- Solana runtime, loader, classic Token Program, and consensus behavior.

Those are disclosed external infrastructure dependencies. They must not be
described as HAKKY-controlled, fully immutable, audited by HAKKY, or guaranteed
never to change. A change in a required program identity, loader authority,
GlobalConfig, downstream configuration, migrator, or source-covered account
layout is an action-time hard stop and requires a new review.

Program IDs alone do not identify an executable version because an upgrade can
retain the same ID. The action-time manifest must therefore bind the ProgramData
address, loader, deployed slot, upgrade authority, and raw program-byte
SHA-256 for every required upgradeable Raydium program. The guard compiles and
checks the LaunchLab ProgramData address and deployed slot used by its CPIs; the
off-chain controller independently checks the corresponding byte hash. Launch
and graduation transactions bind the applicable LaunchLab and selected
downstream CPMM/lock or AMM-v4/OpenBook versions in the same way. This detects
an upgrade before execution but cannot prevent a later Raydium upgrade, which
remains part of the disclosed external trust boundary.

## 4. Guard program architecture

### 4.1 Program shape

The guard is a small native Solana program with one public instruction:

```text
InitializeHakkyPlatformConfigV1
```

The instruction has no operator-supplied economic data. It accepts only the
accounts needed to create the exact PlatformConfig and derives or validates
every value against compiled policy constants.

The program derives three versioned PDAs:

```text
platform administrator: ["hakky-platform-admin", "v1"]
economic sink:          ["hakky-economic-sink", "v1"]
consumed marker:        ["hakky-platform-consumed", "v1"]
```

All three derivations use the final guard program ID. That program ID must be
recorded in the reviewed policy manifest before a release candidate is built.
Changing the program ID changes all three PDAs and invalidates every prior manifest,
binary hash, simulation, and approval envelope.

The program ID and its derived ProgramData address remain in a local/private
review manifest until direct deployment submission. They must not be pushed to
a public remote before deployment because unsolicited lamports can deny
creation of a deterministic loader account. Immediately after finalized
deployment and authority removal, the exact source, program ID, build manifest,
and binary hash become publication prerequisites before the token launch.

The PlatformConfig address is the exact Raydium PDA derived from
`["platform_config", platform-administrator-PDA]` under the pinned LaunchLab
program ID.

The binary also compiles one exact launch-initializer public key from the
disclosed creator-controlled address set. The initializer is required to sign
the one initialization transaction, but it cannot select any economic value
and has no capability after the consumed marker exists. This prevents an
unapproved third party from front-running the permissionless guard.

### 4.2 Exact creation behavior

The approved transaction contains an exact top-level System Program transfer
that funds the administrator PDA with the full current lamports required for
Raydium's initial allocation and curve-vector reallocation regardless of any
unsolicited prefunding, followed by one
`InitializeHakkyPlatformConfigV1` call. The administrator PDA is a zero-data,
System-owned account. Transaction atomicity rolls back the funding if the
guard fails. A successful transaction must leave the administrator with zero
residual lamports; any different residual is an atomic postcondition failure.

`InitializeHakkyPlatformConfigV1` must:

1. require the exact compiled initializer as a transaction signer;
2. derive and validate the administrator, economic-sink, consumed-marker, and
   Raydium PlatformConfig PDAs;
3. fail before any `invoke_signed` if the consumed marker is already an exact
   zero-data guard-owned account or the PlatformConfig is already a valid
   Raydium account; a System-owned zero-data marker carrying unsolicited dust is
   not treated as consumed;
4. validate the exact Raydium LaunchLab executable account and its
   loader-v3 ProgramData address/deployed slot, the System Program, the CPMM
   configuration address, owner, discriminator, exact bytes/hash and decoded
   fee fields, the GlobalConfig account, and every required
   recipient/authority position; require the economic sink to remain
   System-owned, zero-data, and nonsigning while accepting any balance;
5. read the supplied GlobalConfig account directly and validate its address,
   owner, discriminator, data length, full-byte SHA-256 against the compiled
   expected hash, decoded policy fields, and compatibility with the compiled
   HAKKY curve policy; the off-chain builder separately proves mainnet genesis,
   finalized commitment, slot, and UTC time because an SBF program cannot query
   those RPC facts;
6. validate the administrator as zero-data and System-owned after the canonical
   fixed prefunding transfer;
7. normalize the consumed marker through a closed System Program sequence:
   transfer the current exact zero-data rent from the initializer, sweep the
   pre-transfer unsolicited balance to the sink with marker seeds, allocate
   zero bytes, and assign it to the guard program with marker seeds; this same
   fixed sequence handles an absent or dusted System-owned zero-data account and
   must end with the exact rent balance, zero data, and guard owner before
   Raydium CPI;
8. make exactly these three Raydium CPIs in this order, using
   `invoke_signed` only with the administrator seeds:

   1. `CreatePlatformConfig` with discriminator
      `[176, 90, 196, 175, 253, 113, 220, 20]`, exact creation parameters from
      Section 2, and the economic sink in the claim-fee, lock-NFT,
      transfer-fee-authority, and vesting-wallet positions;
   2. `UpdatePlatformConfig` with discriminator
      `[195, 60, 76, 129, 146, 45, 67, 143]`, fixed variant index `11`, and the
      economic sink as `platform_cp_creator`;
   3. `UpdatePlatformCurveParam` with discriminator
      `[138, 144, 138, 250, 220, 128, 4, 57]`, fixed index `0`, and the exact
      compiled `BondingCurveParam`;

9. reload the PlatformConfig after the third CPI and validate its Raydium
   owner, discriminator, exact `1,435`-byte length, vector length `1`, every
   recipient, scale, fee, branding, CPMM configuration, curve input, derived
   curve field, reserved/padding rule, and source-defined epoch against the
   current Clock sysvar;
10. use one fixed admin-PDA-signed System transfer to sweep the entire residual
    after all Raydium allocations into the economic sink, then require the
    administrator balance to be zero;
11. validate that the consumed marker exists with the exact rent balance,
    guard owner, and zero-data shape;
12. return success only after all postconditions pass.

All three CPIs and the consumed-marker normalization sequence occur within the
one guard instruction. Any CPI or postcondition failure rolls back the transfer,
marker, PlatformConfig, updates, and reallocation atomically.

If Raydium account constraints do not permit the one-sink shape, the instruction
must fail. Introducing another sink or recipient is a design change that
requires review; it is not an implementation-time fallback.

The outer guard account contract is closed and positional. It includes the
compiled initializer as signer+writable marker payer, consumed marker writable,
pinned LaunchLab program and ProgramData readonly, administrator PDA writable,
economic sink writable only for fixed dust/excess receipts, derived
PlatformConfig writable, pinned CPMM configuration readonly under the pinned
IDL least-privilege policy, finalized GlobalConfig readonly, Clock sysvar
readonly, and System Program readonly. Only the named sink roles may alias the
same economic-sink pubkey. Every other alias, extra account, omission, reorder,
signer promotion, or writable promotion is rejected.

The inner CPI account contract is:

| CPI | Exact accounts |
| --- | --- |
| CreatePlatformConfig | administrator signer+writable; claim-fee sink readonly; lock-NFT sink readonly; PlatformConfig writable; CPMM config readonly under the pinned IDL; System readonly; transfer-fee-authority sink readonly; vesting sink readonly |
| UpdatePlatformConfig variant 11 | administrator signer; PlatformConfig writable |
| UpdatePlatformCurveParam index 0 | administrator signer+writable; PlatformConfig writable; GlobalConfig readonly; System readonly |

The encoded curve vector is not an operator input. It must be deterministically
derived from the approved 10,000,000 supply, 8,000,000 curve allocation,
2,000,000 migration allocation, six decimals, 24 SOL minimum, and the selected
finalized GlobalConfig using pinned SDK/IDL semantics. The common exact curve
input is:

```text
index                    = 0
supply                   = 10,000,000,000,000
total_base_sell          = 8,000,000,000,000
total_quote_fund_raising = 24,000,000,000
total_locked_amount      = 0
cliff_period             = 0
unlock_period            = 0
```

The selected branch supplies the only two route-dependent bytes:

| `selectedVenue` | `migrate_type` | `migrate_cpmm_fee_on` |
| --- | ---: | --- |
| `cpmm` | `1` | `0` |
| `amm-v4` | `0` | exact selector frozen only after pinned-source and exact-current-binary rehearsal proof |

No AMM-v4 guard binary may be compiled while its exact fee-side selector
remains unresolved.

The pinned SDK helper must not encode this input because its truthiness fallback
serializes numeric zero as `u8::MAX`. A reviewed exact encoder and an
independent decoder must agree on the committed instruction-argument bytes and
SHA-256. The guard must validate the full stored curve entry after Raydium has
derived it. A source revision, GlobalConfig byte change, instruction-byte
change, or derived-field change invalidates the fixture and stops the flow.

The pinned SDK marks the CPMM configuration writable when constructing
`CreatePlatformConfig`, while the pinned IDL declares it readonly. The guard
uses the narrower IDL privilege. Devnet must prove the deployed program accepts
that least-privilege shape; if it does not, the design stops for review instead
of widening access silently.

### 4.3 Deliberately absent capabilities

The program must contain no instruction, discriminator, fallback, or dispatch
path for:

- a public guard update instruction or any caller-selectable Raydium
  `UpdatePlatformConfig`, `UpdatePlatformCurveParam`, or removal CPI beyond the
  two fixed initialization updates in Section 4.2;
- arbitrary CPI or caller-selected instruction bytes;
- any caller-selectable or unlisted lamport/token transfer outside the fixed
  marker normalization and administrator-residual sweep;
- fee, reward, LP, NFT, or lock-position claim;
- account closure or any caller-selectable/unlisted realloc outside Raydium's
  exact PlatformConfig initialization/update path;
- authority transfer;
- changing a program ID, recipient, curve, fee, allocation, metadata, or
  migration field;
- creating any configuration other than the one exact v1 PlatformConfig.

The economic-sink PDA must never be used as a signer in the one allowed
instruction. The administrator PDA may sign only the three fixed initialization
CPIs and the one fixed excess sweep listed in Section 4.2. The consumed-marker
PDA may sign only its fixed System sweep/allocate/assign normalization sequence.
The consumed marker must be checked before any signing and can never be closed,
reset, or reallocated after it becomes guard-owned. The finalized program must
have no path that signs for either PDA after the one PlatformConfig exists.

### 4.4 Build and finalization

The mainnet binary must:

- be reproducibly built from a pinned Rust, Solana, and SBF toolchain;
- have two clean builds with byte-identical `.so` output;
- be at most `100,000` bytes;
- be deployed with loader `max_len` exactly equal to the binary length;
- match the reviewed binary SHA-256 and source commit;
- have its upgrade authority permanently set to null before the
  PlatformConfig is created;
- be read back at `finalized` commitment with matching ProgramData bytes,
  binary hash, loader, program ID, and null authority.

The Program and ProgramData accounts are necessarily rent-funded during
deployment while an upgrade authority still exists. The guard instruction must
not be invoked, and the project must not fund or create the administrator,
sink, or consumed-marker PDA, until finalized readback proves the binary and
null upgrade authority. A buffer, ProgramData account, or deployment keypair is
not a continuing HAKKY authority once finalization completes, but every
classified project-funded deployment and finalization cost still counts toward
the cap.

The program ID is generated in a separate user-approved local signer ceremony
before compilation. Its secret key is permission-restricted, never printed,
transmitted, committed, or funded as a wallet, and used only to sign creation
of that one Program account. Its public key is committed only in the
local/private manifest before both reproducible builds. Program-account
preparation must tolerate a System-owned zero-data prefund by topping up,
allocating exactly 36 bytes, and assigning to loader-v3 under the program-ID
signature.

Loader-v3 alone signs creation of the derived ProgramData PDA, so HAKKY cannot
normalize a dusted ProgramData address. Immediately before direct deployment,
the controller privately preflights both addresses for zero/compatible state.
A revealed or dusted failed candidate is abandoned, rebuilt under a new program
ID, re-reviewed, and re-approved; its landed fees count toward the cap. This is
a bounded denial-of-service mitigation, not absolute resistance to a malicious
RPC or leader. After finalized deployment and null upgrade authority, the user
chooses the creation signer's documented retirement method; retaining it cannot
restore upgrade authority.

## 5. Finalized GlobalConfig gate

The currently reviewed mainnet GlobalConfig evidence is:

| Field | Reviewed value |
| --- | --- |
| Address | `6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX` |
| Owner | `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` |
| Data length | `371` bytes |
| SHA-256 | `9d79abb574362644124765ec8a29928d34e43384633aecc4241c6cb28c2f4661` |
| Reviewed finalized slot / UTC | `434695362` / `2026-07-23T10:10:35Z` |
| Epoch | `961` |
| Curve type | `0` |
| Index | `0` |
| Migration fee | `0` lamports |
| Trade fee rate | `2,500` millionths / 0.25% |
| Maximum share fee rate | `10,000` millionths / 1% |
| Minimum display supply | `10,000,000` |
| Maximum lock rate | `800,000` millionths / 80% |
| Minimum base sell rate | `200,000` millionths / 20% |
| Minimum base migrate rate | `150,000` millionths / 15% |
| Minimum fundraising amount | `24,000,000,000` lamports |
| Quote mint | wrapped SOL |
| Protocol fee owner | `rayvTLcCMDs7P5tgpuoNA6ZYeLERegeCphdqLSgdKms` |
| Migration fee owner | `rayHQtJKrtvqUs3HnhDW9RKubHRbu87eESKEYD5xosa` |
| AMM-v4 migrator | `RAYzrepoBdjSFg7MZj2vy4XBSv2azKRXC72ztUMZMJB` |
| CPMM migrator | `RAYpQbFNq9i3mu6cKpTKKRwwHFDeK5AuZz8xvxUrCgw` |
| `requires_platform_auth` | `0` |

This table is design evidence, not launch-day authorization. Immediately before
building any action-time transaction, the controller must fetch raw account
bytes at `finalized` commitment, verify the mainnet genesis identity and
account owner, decode with the pinned layout, hash the exact bytes, and record
the context slot and UTC check time.

The action-time values must still establish:

- classic supported curve type;
- minimum supply no greater than 10,000,000 HAKKY;
- 24 SOL configured minimum;
- wrapped SOL quote;
- migration fee `0`, with decoded fee owner retained for drift detection;
- maximum share fee compatible with the zero HAKKY platform/creator fee policy;
- minimum sell and migration rates compatible with the exact 80/20 allocation
  and zero locked amount;
- the route-selected Raydium migrator exactly matches the reviewed wallet,
  remains outside the disclosed creator/team address set, and is the sole payer
  for any route-defined external migration service accounts;
- `requires_platform_auth = 0`;
- curve/allocation limits compatible with the exact HAKKY tuple;
- no new or unknown field under the pinned layout.

The Raydium API, a website label, SDK cache, or operator-entered value is not
authoritative. In particular, the API's 85 SOL default launch amount is a
different field from the finalized GlobalConfig's 24 SOL minimum. They must not
be conflated. Raw finalized account bytes control the minimum-policy check.

If `requires_platform_auth` becomes nonzero, the launch stops. HAKKY cannot
self-create the corresponding access account because its creation is
Raydium-owner authorized.

## 6. PlatformConfig policy

The one created PlatformConfig must bind:

- administrator: guard `platform-administrator` PDA;
- all HAKKY-configurable recipient and auxiliary authority roles:
  the one `economic-sink` PDA;
- platform scale: `0`;
- creator scale: `0`;
- burn scale: `1,000,000`;
- platform fee rate: `0` millionths;
- creator fee rate: `0`;
- platform vesting scale: `0`;
- migration: the explicitly approved `selectedVenue`;
- curve index: `0`;
- route selector and fee-side selector: the exact selected-branch values in
  Section 2.1;
- exact pinned CPMM configuration, structurally required by
  `CreatePlatformConfig` under either branch;
- only the deterministic HAKKY curve vector;
- public name, web, and image values whose exact byte lengths and contents are
  committed in the policy manifest.

For CPMM, the scales `0/0/1,000,000`, `migrate_type = 1`, and
`migrate_cpmm_fee_on = 0` are graduation economics. For AMM-v4,
`migrate_type = 0`; the same scales and CPMM configuration are inert,
structurally required defense-in-depth fields and do not substitute for
AMM-v4 LP-burn and no-right proof.

The currently reviewed community-standard CPMM configuration evidence is:

| Field | Reviewed value |
| --- | --- |
| Address | `D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2` |
| Owner | `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C` |
| Data length / discriminator | `236` / `daf42168cbcb2b6f` |
| SHA-256 | `c7e8d1592b7b9a38c095ad4d18f4111edeb0e93b3a6107adc6883e50bdce5b5c` |
| Reviewed finalized slot | `434690196` |
| Index / pool creation | `0` / enabled |
| Trade fee | `2,500` millionths / 0.25% |
| Protocol share of trade fee | `120,000` millionths / 12% |
| Fund share of trade fee | `40,000` millionths / 4% |
| Pool-creation fee | `150,000,000` lamports |
| Configured CPMM creator fee | `500` millionths / 0.05%, conditional |

Raydium's finalized default LaunchLab PlatformConfig pointed to this account at
the reviewed slot. The account is nevertheless Raydium-admin mutable, and its
current creator-fee field differs from the older pinned documentation table.
Action-time raw bytes control and must match the reviewed policy or trigger a
new review.

For the selected CPMM tuple, pinned sources expose no disabled creator-fee enum:
`migrate_cpmm_fee_on = 0` means quote-token creator fees. The expected migrated
PoolState therefore has creator fees enabled under the currently selected
AmmConfig. The pool creator must be the immutable nonsigning economic sink.
Before launch, pinned-source decoding plus a full devnet migration rehearsal
must prove that only this sink can satisfy the CPMM creator-fee claimant signer
constraint. After migration, the graduation verifier must read the raw
PoolState flag, pool creator, fee counters, and claim history and prove that no
disclosed creator/team/deployer address has a claim path.

This satisfies zero human creator/team fee rights, but not zero charged
creator-labelled venue fees. If the user does not explicitly approve that
distinction, the CPMM design remains blocked. Raydium AMM-v4 is a possible
zero-CPMM-creator-fee alternative with an observed burn of all minted/claimable
initial LP and zero SPL LP supply. Section 2.1 records its conditional design
and historical evidence, but source-proven exact-current-binary semantics and
an explicit venue selection remain hard gates.

The 0.15 SOL pool-creation fee and current CPMM trading-fee split must be
disclosed. If migration pays the creation fee from public curve reserves, it is
not a canonical-funder debit but remains a community economic cost. If the
canonical funding address must pay any part of it, the transaction is a hard
stop: the approved `59,654,480`-lamport route/network/recovery partition cannot
cover `150,000,000` lamports and may not be rebalanced without a separately
reviewed design and explicit user approval.

The creation transaction and finalized readback must agree byte-for-byte on
every decoded field. The verifier must also prove:

- the PlatformConfig address derives from the guard administrator PDA;
- the only entity that could satisfy Raydium's update signer constraint is
  that PDA;
- the immutable guard exposes no update-signing path outside the two fixed
  initialization CPIs in the consumed-marker transaction;
- the guard is already final and has no loader upgrade authority;
- no Raydium PlatformConfig or curve update exists after the one initialization
  transaction in the complete finalized history.

The PlatformConfig account's Raydium-defined vector length and allocation must
be obtained from the exact compiled curve bytes. The launch funds exactly one
entry and only the allocation returned by simulation and the current
rent-exemption RPC. Unused speculative account space is not authorized.

## 7. HAKKY-owned unsigned transaction builder

Official Raydium sources support an arbitrary `platformId`, but do not document
that Raydium's public launch UI can select an arbitrary PlatformConfig.
Therefore this design does not depend on that UI.

A HAKKY-owned local builder must use pinned Raydium IDL/SDK semantics and
produce, without signing or sending:

- exact raw unsigned versioned transaction bytes;
- SHA-256 of those bytes;
- recent blockhash and last valid block height;
- complete ordered static and lookup-table account lists;
- decoded outer and inner instruction plan;
- every signer and writable privilege;
- exact transfers, rent debits, protocol/platform fees, priority-fee ceiling,
  and maximum canonical-funder balance loss;
- the raw finalized GlobalConfig bytes/hash/slot used for derivation;
- guard binary/program/ProgramData/authority proof;
- PlatformConfig address, expected bytes, and decoded policy;
- simulation logs, return data, units consumed, post-account expectations, and
  simulation context slot;
- an approval-envelope expiry that cannot outlive the blockhash.

The builder has no wallet adapter, private-key input, send method, automatic
retry, recovery loop, or hidden mutation. It must be usable in a completely
offline review step after the required public RPC observations have been
captured.

An action-time wallet signature is allowed only after the exact byte hash,
signers, maximum debit, accounts, instructions, simulation, and expiry are
presented for a separate explicit approval. Any blockhash refresh, transaction
rebuild, account change, fee change, simulation change, or byte change cancels
the approval and requires a new preview and approval.

## 8. Proof model and repository integration

### 8.1 Guard provenance artifact

Add one strict append-only artifact:

```text
proof/mainnet-hakky-guard-v1.json
```

Its executable schema must reject unknown fields and require:

- schema version, mainnet genesis identity, source commit, clean-tree state,
  pinned toolchain versions, and deterministic build commands;
- both reproducible build hashes and exact binary length;
- guard program ID, ProgramData address, loader ID, ProgramData raw SHA-256,
  deployment transaction, finalization transaction, finalized slots/times,
  and null upgrade authority;
- compiled initializer, canonical funding address, disclosed
  creator-controlled address set, administrator PDA, economic-sink PDA,
  consumed-marker PDA, every seed/bump value, and the derived Raydium
  PlatformConfig address;
- pinned LaunchLab and selected downstream CPMM/lock or AMM-v4/OpenBook program
  IDs, ProgramData addresses, deployed slots, loader authorities, and raw
  program-byte hashes;
- raw finalized GlobalConfig address, owner, slot, time, byte length, SHA-256,
  and decoded fields;
- PlatformConfig creation transaction, finalized slot/time, raw account
  SHA-256, exact byte length, decoded policy values, exact three-CPI sequence,
  curve-input instruction SHA-256, stored curve-vector SHA-256, consumed-marker
  state, zero administrator residual, and complete account history;
- a decoded instruction-surface report proving the one allowed guard
  instruction and absence of prohibited dispatch paths;
- classified canonical-funder cost ledger through deployment, finalization, and
  PlatformConfig creation;
- individual named checks and `ok: true` only when every invariant passes.

The schema contains a required closed discriminator:

```text
selectedVenue: "cpmm" | "amm-v4"
```

Common fields retain the structurally required CPMM configuration used by
`CreatePlatformConfig`. The `cpmm` branch additionally requires the selected
CPMM/lock identities, AmmConfig bytes, sink claimant, fee-side selector,
0.05% approval receipt, and CPMM rehearsal digest. The `amm-v4` branch forbids
those CPMM graduation claims and instead requires AMM-v4/OpenBook/Token/ATA
provenance, source-correlation status, route selector, Raydium migrator and
OpenBook precreation manifest, exact-current-binary rehearsal digest, full LP
disposition checks proving all minted/claimable initial LP was burned, SPL LP
supply is zero, and the unminted accounting minimum is identified separately;
it also requires no-right checks, external-cost classification, and exact zero
canonical-funder migration debit. Mixing, omitting, or supplying fields from
the wrong branch is invalid.

Every evidence item has orthogonal, closed provenance fields:

- `origin`: `solana-chain`, `local-build`, `local-harness`, `user`, or
  `raydium`;
- `network`: `mainnet-beta`, `devnet`, `local`, or `off-chain`;
- `verification`: `finalized`, `signature-verified`, `reproducible`,
  `simulated`, or `approved`;
- `validUntilBlockHeight`: a canonical nonnegative integer for a
  recent-blockhash transaction, otherwise `null`;
- `purpose`: `release-state`, `source-correspondence`, `route-qualification`,
  `rehearsal`, `authorization`, or `approval`.

The schema validates the allowed tuple for each field and cross-binds its source
artifact hash. Thus a finalized Raydium transaction can truthfully be
`origin: raydium`, `network: mainnet-beta`, and `verification: finalized`; a
Raydium-signed devnet transaction remains `origin: raydium` but
`network: devnet` and cannot authorize mainnet; and an expired signed candidate
retains its signature provenance while failing freshness.

The pre-send production-action gate accepts only the exact transaction whose
`origin` is `raydium`, `network` is `mainnet-beta`, `verification` is
`signature-verified`, and `purpose` is `authorization`, and whose current block
height does not exceed `validUntilBlockHeight`. The separate post-send
reconciliation/graduation gate requires the exact finalized production
transaction whose `origin` is `raydium`, `network` is `mainnet-beta`,
`verification` is `finalized`, and `purpose` is `release-state`. Finalized
post-state can never waive or retroactively satisfy the pre-send authorization
gate. Local signer substitution, simulation, unsigned bytes, devnet execution,
historical analogue, or an expired signed candidate can never satisfy either
production gate.

The artifact is machine-constructed from those typed evidence inputs. It is not
hand-authored and cannot accept runtime overrides for addresses, authorities,
hashes, fees, or economic values.

### 8.2 Launch preview and proof lifecycle

The existing stock-PlatformConfig preview must remain blocked. A guarded launch
may become previewable only when:

1. a schema-valid guard provenance artifact passes;
2. the candidate launch uses its exact PlatformConfig address;
3. current finalized GlobalConfig evidence passes Section 5;
4. complete guard and PlatformConfig history contains no contradictory action;
5. all 10,000,000-supply launch invariants pass;
6. the complete maximum-debit ledger remains within 1 SOL;
7. a full selected-route migration rehearsal passes: CPMM must prove the
   immutable sink as the only creator-fee claimant from raw PoolState; AMM-v4
   must prove exact-current-binary OpenBook precreation, burn of all
   minted/claimable initial LP, zero SPL LP supply, zero creator/team charge or
   right, and zero canonical-funder debit;
8. the user has explicitly selected the migration route and, if CPMM, approved
   the disclosed 0.05% quote-side creator-labelled venue fee;
9. raw unsigned bytes and simulation are available.

`proof/mainnet-mint.json`, `proof/mainnet-launchlab.json`, and
`proof/mainnet-graduation.json` must bind the guard artifact digest and repeat
the relevant program, GlobalConfig, and PlatformConfig identities. Every public
promotion requires exact identity agreement.

Graduation remains a separate evidence gate. The guard proves HAKKY's
PlatformConfig immutability; it does not prove selected-route pool state, LP
burn or locked-position ownership, lock-NFT behavior, downstream fee rights,
external migrator funding, or final null mint authority. Public graduation
claims remain unavailable until pinned source coverage and raw finalized
evidence prove the applicable facts.

### 8.3 Creator-zero evidence

Curve-live proof must enumerate every classic token account for every address in
the disclosed creator/deployer/team set and the mint at a finalized slot and
require an aggregate zero balance. It must also show from transaction/account
evidence that those addresses received no allocation, first buy, vesting, fee
key, platform recipient role, CPMM creator role, LP position, lock NFT, or
withdrawal authority.

The proof is a launch-time observation. If the creator later buys on a public
exchange, public wording must state the later observed balance honestly and
must not rewrite the immutable fact that the launch allocation was zero.

## 9. Creator-funded cost cap

One canonical project funding/fee-payer address from the disclosed
creator-controlled address set supplies every mainnet lamport used by the
project and must equal the compiled initializer. The program-ID signer never
acts as a payer. An unsolicited inbound credit to a deterministic address is
recorded as external dust, not project funding and not creator-funded loss.
Unexpected transaction signers, outbound payers, or project-origin funding
addresses remain hard stops.

The one-SOL cap is measured as the aggregate classified finalized balance loss
of that canonical funding address across the approved transaction set.
Canonical-origin value stranded in a manifest account is a classified subset
of that loss, not an additional charge. No other project funding source is
allowed. Unsolicited or externally funded inbound credits are added back for
cap accounting and cannot offset creator spend; only a provenance-proven return
within the same finalized transaction may reduce that transaction's net charge.
No later transaction may retroactively reduce cap consumption from an earlier
finalized prefix. A lamport transfer within one finalized transaction is
counted once by its final balance deltas, not once as a debit and again as the
recipient's spend.

Loader-v3 drains the deployment buffer inside the successful deploy
transaction before funding ProgramData. That same-transaction finalized credit
is classified as lamport migration and permits the permanent/net loader formula
below; it is not a hypothetical later refund. The controller must model and
bound separate success and failure branches. A failed landed transaction counts
its finalized net balance loss, with the transaction fee identified as one
component; atomic instruction rents and transfers roll back. No plan may
subtract a future, unconfirmed, or operator-initiated refund.

The hard budget partition is:

| Cost term | Maximum lamports |
| --- | ---: |
| Guard Program + ProgramData rent, requiring binary `<= 100,000` bytes | `698,345,520` |
| Consumed marker, PlatformConfig rent/reallocation, and guard initialization outflow | `42,000,000` |
| LaunchLab creation, including all rent and protocol transfers | `200,000,000` |
| Deployment/write/finalization/config network fees, recovery, and route-specific CPMM costs | `59,654,480` |
| Metadata payment | `0` |
| **Cumulative maximum** | **`1,000,000,000`** |

The AMM-v4 external service outlay in Section 2.1 is excluded from the
prelaunch cap as a policy boundary, not as a prediction that Raydium will act.
Exact-current-binary rehearsal, GlobalConfig, and candidate-message decoding
must establish the expected external payer path while the HAKKY controller
forbids the canonical address from signing, paying, reimbursing, or
guaranteeing it. The permissible canonical-funder migration-window debit for
AMM-v4 is exactly `0`; the `59,654,480` partition cannot fund AMM-v4/OpenBook
venue costs. If Raydium does not fund the path, graduation remains pending.
After any migration, the actual finalized precreation/migration pair and
canonical-window balances must prove the expected external payer and zero HAKKY
debit before graduation proof may be published. Unknown or unbounded canonical
liability is a pre-signature hard stop.

The source-proven migration of already-public curve token/SOL reserves into the
exact bound AMM vaults is classified separately as community liquidity and
does not count as creator funding. Any creator, canonical-funder, guard-PDA, or
other HAKKY-origin rent, fee, subsidy, reimbursement, or guarantee for an
OpenBook/AMM service account stops the launch.

The reviewed rent model was:

```text
rent_exempt(n) = 890,880 + 6,960 * n lamports
loader-v3 program rent = 2,345,520 + 6,960 * binary_bytes lamports
```

That model is explanatory only. Every account rent value must be re-queried
from mainnet RPC at action time. The transaction controller must calculate the
complete cumulative maximum before the first signature and stop when:

- any cost term is missing or unbounded;
- the binary exceeds 100,000 bytes;
- loader `max_len` exceeds the exact binary length;
- any category exceeds its partition;
- the cumulative maximum exceeds 1,000,000,000 lamports;
- a failed landed transaction consumes the remaining recovery allowance;
- a new operation would rely on an unconfirmed refund.

The existing session receipt and cost ledger must be extended to include every
canonical-funder transfer, guard buffer creation, write, deploy-time buffer
drain, Program/ProgramData final balance, finalization, authority removal,
administrator prefunding/residual, consumed-marker creation, PlatformConfig
creation/reallocation, failed landed transaction, and recovery. For every
transaction it records pre/post balances, classified internal migrations,
permanent state, fees, and stranded-value classification. It must calculate the
maximum cumulative cost at every reachable finalized prefix of every
whole-session path, including prior failed fees, abandonment/rebuild, and
eventual success; isolated per-transaction or terminal success/failure maxima
cannot hide earlier consumption.

## 10. Testing and independent review

Implementation must be test-driven and include:

- pure unit tests for instruction dispatch, PDA derivation, exact account order
  and privileges, fixed constants, and every rejected capability;
- adversarial tests for extra/reordered accounts, wrong programs, wrong PDAs,
  wrong sinks, wrong curve bytes, duplicate creation, unexpected lamports,
  and caller-supplied data;
- Solana ProgramTest coverage proving the exact Raydium-compatible CPI signer
  model and proving that no update-signing path is callable;
- a deterministic instruction-surface inspection that allows one public guard
  discriminator, the closed System marker/admin normalization sequence, and the
  three fixed inner Raydium discriminators, and fails on any additional public
  discriminator, caller-selected update, transfer destination, or fallback
  path;
- two byte-identical reproducible SBF builds under the pinned toolchain;
- binary-size, exact loader allocation, binary-hash, and null-upgrade-authority
  tests;
- raw GlobalConfig decoding and drift fixtures, including API/account
  disagreement, supply-floor increase, non-WSOL quote, changed threshold, and
  `requires_platform_auth != 0`;
- exact PlatformConfig creation/readback/history fixtures;
- dust adversarial tests for the administrator, marker, sink, program, and
  ProgramData addresses at `0`, `1`, `rent-1`, `rent`, and `rent+1` lamports;
- an exact-mainnet-LaunchLab-ProgramData local replay using snapshot
  GlobalConfig/CPMM accounts that proves the Raydium PlatformConfig PDA can be
  initialized from every System-owned zero-data prefund state; failure of the
  one-lamport case rejects the architecture before guard deployment;
- unsigned-transaction byte stability, decode, simulation, expiry, and
  cumulative-cost tests;
- existing launch proof tests updated to 10,000,000 supply and 80/20 base-unit
  values;
- graduation source-coverage tests that continue to fail closed when a lock,
  NFT, LP, or fee-right layout is missing.

An independent code/security review must cover the final guard source,
compiled instruction surface, reproducible binary, deployment/finalization
procedure, Raydium CPI account constraints, proof schemas, and cost controller.
The project must describe the actual review performed. It must not claim a
third-party audit unless a qualified independent auditor has delivered one.

## 11. Devnet rehearsal

Before any mainnet guard deployment approval, the exact release process must be
rehearsed on devnet with a fresh public address:

1. install and pin the approved Rust/Solana/SBF toolchain;
2. build the guard twice and prove identical binaries;
3. deploy with exact binary `max_len`;
4. remove upgrade authority and prove null authority at finalized commitment;
5. derive the devnet administrator and sink PDAs;
6. atomically prefund the administrator, create the consumed marker, and execute
   the three exact devnet Raydium CPIs or, if Raydium's devnet deployment cannot
   support the same accounts, run the pinned local ProgramTest equivalent and
   record the named limitation;
7. build and simulate the unsigned 10,000,000-supply launch transaction;
8. complete the bonding curve in ProgramTest or devnet and execute the selected
   migration proof:
   - for CPMM, decode raw PoolState and claim accounts and prove that the 0.05%
     quote-side creator-labelled fee can be claimed only by the nonsigning
     sink;
   - for AMM-v4, replay the exact current LaunchLab, AMM-v4, OpenBook, Token,
     and ATA program versions, prove the two-step OpenBook precreation/migration
     path, burn of all minted/claimable initial LP, zero SPL LP supply, zero
     creator/platform Fee Key or LP right, exact HAKKY/WSOL bindings, and zero
     canonical-funder debit;
9. prove no prohibited guard instruction or PDA-signing path;
10. produce devnet guard, transaction, migration, and cost receipts containing public data
   only;
11. rerun the repository quality and browser gates.

For AMM-v4, the primary local rehearsal is a pinned Rust
`solana-program-test`/BanksServer harness loaded with the exact raw Program and
ProgramData accounts for LaunchLab, AMM-v4, OpenBook, classic Token, and the
legacy-loader ATA program. It must also load the complete closed transaction
account set, feature manifest, sysvars, compute and account-lock limits, and
snapshot context. The mainnet genesis hash is recorded only as source-cluster
provenance; ProgramTest creates a synthetic local bank and must not represent
its bank identity as mainnet. Before executable use, the harness must warp
beyond the maximum captured ProgramData deployment slot (`434518095`) and prove
the loader cache executes the raw accounts without rewriting ProgramData
metadata. It must deactivate every feature inactive at the captured snapshot
and preserve captured activation slots, or provide reviewed proof that no
activation-slot-sensitive behavior can affect the transaction.

The harness must not use native processors, `ProgramTest::add_program`,
`--bpf-program`, or a helper that synthesizes or rewrites ProgramData. A
validator started from the same raw `--account` fixtures is secondary
RPC/parity evidence only; `--clone-upgradeable-program` rewrites the deployment
slot and `--upgradeable-program` creates synthetic ProgramData. A startup
regression must prove the raw-loader path. If it fails, the primary harness must
initialize its Bank directly at the hash-bound snapshot slot rather than
altering captured loader accounts.

The exact guard/curve proof starts before PlatformConfig initialization and
must execute the complete initialization and bonding-curve lifecycle using
every invoked executable and account. If LaunchLab `InitializeV2` invokes
Metaplex Metadata or another program, that exact program and its raw
Program/ProgramData provenance join the closed fixture.

The downstream migration-semantics proof may instead begin from a
machine-produced, hash-bound migration-ready fixture generated by exact program
execution. It must be labelled `migration-only`, cross-bind every unchanged
account hash to the exact guard/curve fixture, and document the sole allowed
GlobalConfig migrator-field substitution below. Hand-authored LaunchLab,
bonding-curve, mint, vault, or migration-ready account bytes are forbidden.

The finalized GlobalConfig currently requires external migration signer
`RAYzrepoBdjSFg7MZj2vy4XBSv2azKRXC72ztUMZMJB`. HAKKY does not possess that
key. The rehearsal must therefore remain two explicitly separate proofs:

1. the exact guard/curve proof uses the unchanged finalized GlobalConfig and
   proves the release guard's compiled full-byte hash, PlatformConfig creation,
   10,000,000-supply curve, and zero HAKKY-controlled administration; and
2. the downstream AMM-v4 semantics proof uses a separately hashed, disclosed
   local-only GlobalConfig variant that changes only `migrate_to_amm_wallet` to
   a deterministic test signer and processes normally signature-verified
   transactions.

The second proof is not an end-to-end release rehearsal and cannot satisfy the
guard's exact GlobalConfig hash check. It may prove only that the exact captured
program bytes execute the HAKKY/WSOL transition and satisfy LP-burn/no-right
postconditions. It cannot prove Raydium production authorization or willingness
to fund the path. Bypassing signature verification or merely marking the
Raydium address as a signer is forbidden as authorization evidence.

A Raydium-signed devnet transaction may prove the devnet operator path but is
not mainnet authorization. An unsigned mainnet candidate proves no
authorization, while a fully signed recent-blockhash candidate is evidence only
until its last valid block height and cannot be a durable prelaunch promise.
No rehearsal or candidate may be described otherwise. Before an AMM-v4 launch,
the user must explicitly accept that Raydium controls and funds the external
migration and may delay or decline it, in which case HAKKY waits on the curve.
At graduation time, only a currently valid fully signed Raydium-funded
precreation/migration pair or its finalized transactions may bind the production
signer, payer, closed account set, seed derivations, current GlobalConfig, and
HAKKY tuple. Public graduation still requires finalized post-state proof,
including exact zero canonical-funder migration debit.

The official devnet faucet is currently rate-limited and no rehearsal proof
exists. A later attempt may use one bounded cooldown retry or a fresh address
that the user manually funds through the official faucet. A 2 SOL devnet
balance is only the minimum for the guard/configuration and unsigned-launch
portion when curve completion and migration run in the faithful local
ProgramTest environment. A live devnet curve completion requires at least the
configured 24 SOL plus re-queried guard, config, account-rent, migration, and
transaction-fee headroom; its exact maximum must be simulated and funded before
attempt, not assumed from the 2 SOL minimum. No devnet payer secret is printed
or written: the payer remains in memory. The separately approved program-ID
signer follows the restricted ceremony in Section 4.4.

Devnet success is necessary but not sufficient for mainnet. All program IDs,
GlobalConfig bytes, rent values, transaction bytes, fees, and approvals must be
re-established for mainnet.

## 12. Mainnet action sequence

This sequence is retained for audit history but is unreachable under the active
strict-immutability policy. No step may begin unless the user first replaces
that policy with the explicit Raydium trust waiver described in Section 1.

No step below is authorized by approval of this design. Each external,
irreversible, wallet, spend, repository, hosting, metadata, or social action
retains its separate action-time gate.

The only acceptable mainnet sequence is:

0. before release-source freeze, program-ID ceremony, guard compilation, or
   route-specific approval-envelope generation, obtain explicit user approval
   of `selectedVenue` and its complete route-specific disclosures after its
   non-authorizing candidate qualification passes; record the decision,
   rebind the qualification artifacts to the release snapshot, and invalidate
   every binary, encoding, release rehearsal, approval envelope, and proof
   artifact from the other branch;

1. pin the reviewed source commit, toolchain, canonical funding/fee-payer
   address, and disclosed creator-controlled address set;
2. obtain separate approval for the local program-ID signer ceremony, generate
   it without funding or exposing the secret, and record only its public key in
   the local/private manifest; prove the address and manifest remain unpushed
   and unpublished until finalized deployment;
3. reproduce the exact binary twice and reject a binary over 100,000 bytes;
4. generate a bounded deployment manifest listing every transaction, signer,
   account, rent transfer, signature fee, compute limit, priority-fee ceiling,
   classified balance delta, success/failure branch, and maximum cost;
5. prove the complete cumulative maximum is within 1 SOL;
6. privately preflight the unrevealed Program and ProgramData addresses, and
   replay the exact current LaunchLab ProgramData locally against
   `0`, `1`, `rent-1`, `rent`, and `rent+1` lamport PlatformConfig-prefund
   states; abandon, rebuild, re-review, and re-approve on any incompatible
   address or replay failure;
7. obtain explicit approval for the exact guard deployment transaction set and
   maximum debit;
8. deploy without automatic retries;
9. obtain explicit approval for the exact finalization/authority-removal
   transaction and maximum debit;
10. permanently remove upgrade authority and verify finalized null authority and
   binary hash;
11. document the program-ID signer's user-chosen retirement state;
12. re-fetch and validate raw finalized GlobalConfig bytes;
13. generate, decode, and simulate the exact atomic administrator-funding plus
    one-call guard initialization transaction, including consumed-marker rent,
    all three fixed Raydium CPIs, postconditions, and zero administrator
    residual;
14. separately approve that exact transaction and maximum debit, submit it once,
    and verify the marker, finalized PlatformConfig bytes, and complete history;
15. construct and validate the guard provenance artifact;
16. upload only the separately approved metadata bytes through the
    separately approved no-wallet, no-payment workflow and verify public bytes;
17. generate, decode, simulate, and separately approve the exact token-launch
    transaction;
18. sign/send once, then reconcile finalized state before any retry or recovery;
19. publish only the proof stage supported by the complete canonical evidence.

No PlatformConfig may be created before the guard is finalized. No launch may
be signed before the guard provenance artifact, action-time GlobalConfig,
PlatformConfig readback, metadata readback, unsigned transaction, simulation,
and cost ledger all pass.

## 13. Public surfaces

The website, token document, launch document, social copy, metadata manifest,
and proof fixtures must use:

- exactly 10,000,000 HAKKY and 10,000,000,000,000 base units;
- 8,000,000 curve / 2,000,000 migration liquidity / 0 creator-team;
- "24 SOL configured minimum fundraising threshold";
- zero launch allocation for the creator, with later public purchases expressly
  allowed and separately observed;
- "HAKKY-controlled PlatformConfig administration permanently disabled by an
  immutable guard" only after finalized guard proof exists;
- an explicit disclosure that Raydium program governance and downstream
  venue configuration remain external dependencies;
- the exact HAKKY mint as the token identity; the public PlatformConfig may be
  reused by another permissionless launch and must not be described as an
  exclusive one-token namespace;
- if CPMM remains selected, "Raydium CPMM currently charges a 0.05%
  creator-labelled fee on the quote side; no HAKKY-controlled path can claim
  it under the reviewed executable and configuration, while Raydium governance
  remains external";
- if AMM-v4 is selected, disclose that Raydium's migrator must precreate
  OpenBook accounts and perform migration, while publishing exact finalized
  proof that all minted/claimable initial LP was burned, SPL LP supply is zero,
  the unminted minimum-liquidity accounting amount is identified separately,
  and no creator/team right exists;
- no promise of safety, utility, returns, scam detection, or venue immutability.

The existing `/favicon.ico` browser error must be resolved before public launch
certification. Public `https://hakky.xyz` and repository/social surfaces remain
unchanged until their separately approved publication steps.

## 14. Hard stops

Stop before the next signature or publication when:

- strict immutability remains approved while LaunchLab has non-public source,
  no verified build correspondence, or a non-null upgrade authority;
- `selectedVenue` has not been explicitly approved after qualification and
  before release-source freeze, program-ID ceremony, guard compilation, or
  route-specific approval-envelope generation, or an artifact from the
  nonselected branch is reused;
- any 10,000,000/80/20/0 economic value differs;
- the creator, deployer, team, or HAKKY-controlled wallet receives any launch
  token, fee, LP, NFT, withdrawal, vesting, treasury, or authority right;
- the guard exposes more than its one exact initialization instruction;
- the binary is not reproducible, exceeds 100,000 bytes, or is deployed with
  excess loader capacity;
- guard upgrade authority is not finalized null;
- a guard PDA can sign any prohibited action;
- the LaunchLab, selected CPMM/lock or AMM-v4/OpenBook venue, Token, ATA,
  loader, or system identity differs from the reviewed manifest;
- an upstream ProgramData address, deployed slot, loader authority, or
  program-byte hash differs even when its program ID is unchanged;
- the compiled initializer differs from the canonical funder, the consumed
  marker is already exact/guard-owned, a guard address has a non-System owner
  or nonzero data, or the successful transaction would leave an administrator
  residual;
- the exact-mainnet-ProgramData replay does not prove prefunded PlatformConfig
  initialization, either loader address becomes incompatible, or a replacement
  program-ID attempt would exceed the bounded recovery budget;
- raw finalized GlobalConfig evidence is missing, changed incompatibly, or
  requires platform authorization;
- the API/UI disagrees with raw chain state for the same decoded field;
- exact PlatformConfig bytes, history, or immutable binding cannot be proved;
- custom PlatformConfig launch support would require trusting an undocumented
  UI path;
- raw unsigned transaction bytes, full decode, simulation, expiry, or
  cumulative maximum debit is absent;
- canonical-funder cumulative maximum exceeds 1 SOL;
- the user has not explicitly approved the current 0.05% quote-side
  creator-labelled CPMM venue fee and its nonsigning sink when CPMM is selected;
- CPMM requires any canonical-funder debit for its 0.15 SOL pool-creation fee;
- AMM-v4 is selected but its source provenance, exact-current-binary rehearsal,
  two-step Raydium migrator path, burn of all minted/claimable initial LP, zero
  SPL LP supply, zero creator/team rights, or zero canonical-funder debit
  cannot be proved;
- a locally substituted migrator, signature bypass, devnet transaction,
  unsigned mainnet candidate, or expired signed candidate is represented as
  Raydium mainnet authorization;
- AMM-v4 is selected without explicit acceptance that Raydium may delay or
  decline the externally funded migration and leave HAKKY waiting on the curve;
- the Raydium AMM migrator, OpenBook seed derivations, account sizes, rents,
  payer path, or two-step migration state machine differs from the approved
  AMM-v4 evidence package;
- metadata requires a wallet or payment;
- graduation LP/lock/NFT/fee-right evidence for the selected route remains
  source-incomplete;
- a transaction outcome is unknown or a retry would exceed its explicit
  approval.

## 15. Out of scope

- a custom token contract or custom AMM;
- Token-2022 extensions, taxes, hooks, blacklist, pause, clawback, permanent
  delegate, or transfer restrictions;
- creator/team launch purchases or privileged public-curve access;
- presale, treasury, vesting, airdrop, marketing allocation, or retained supply;
- an administrator, multisig, governance token, or emergency upgrade path for
  the guard;
- automatic wallet connection, signing, sending, retry, or recovery;
- exposure, printing, transmission, or repository storage of a seed phrase,
  private key, exported wallet keypair, password, OTP, or wallet session; the
  narrowly defined local program-ID signer ceremony in Section 4.4 is the only
  non-wallet keypair exception;
- claiming that HAKKY controls or has made immutable Raydium's own programs or
  downstream configurations;
- mainnet deployment, token creation, website release, metadata upload, X
  changes, or GitHub publication under approval of this design alone.

## 16. Primary sources

- Current official Raydium program-address/source-availability disclosure,
  including LaunchLab as source not publicly available:
  <https://github.com/raydium-io/raydium-docs-v1/blob/104dff2efdc72a7897d757083c3f61a68aef9a47/reference/program-addresses.mdx#L21-L39>
- Current LaunchLab verified-build status:
  <https://verify.osec.io/status/LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj>
- Official LaunchLab IDL/ABI, not implementation correspondence:
  <https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_launchpad/raydium_launchpad.json>
- Official LaunchLab CPI adapter, not LaunchLab implementation source:
  <https://github.com/raydium-io/raydium-cpi/blob/115df2779d53bacc7db9d0be2773a4b48a6d372b/programs/launch-cpi/src/lib.rs>
- Approved pinned Raydium PlatformConfig semantics:
  <https://github.com/raydium-io/raydium-docs-v1/blob/10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc/products/launchlab/platform-config.mdx>
- Approved pinned Raydium migration behavior:
  <https://github.com/raydium-io/raydium-docs-v1/blob/10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc/products/launchlab/instructions.mdx>
- Approved pinned GlobalConfig semantics:
  <https://github.com/raydium-io/raydium-docs-v1/blob/10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc/products/launchlab/global-config.mdx>
- Approved pinned CPMM fee behavior:
  <https://github.com/raydium-io/raydium-docs-v1/blob/10dd5f7d9f23f0be7daabd571fc9e7c65ce269dc/products/cpmm/fees.mdx>
- Pinned LaunchLab create/update instruction construction:
  <https://github.com/raydium-io/raydium-sdk-V2/blob/fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c/src/raydium/launchpad/instrument.ts#L747-L972>
- Pinned curve-update instruction construction:
  <https://github.com/raydium-io/raydium-sdk-V2/blob/fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c/src/raydium/launchpad/instrument.ts#L1034-L1073>
- Pinned PlatformConfig PDA derivation:
  <https://github.com/raydium-io/raydium-sdk-V2/blob/fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c/src/raydium/launchpad/pda.ts#L52-L54>
- Pinned minimum-supply validation:
  <https://github.com/raydium-io/raydium-sdk-V2/blob/fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c/src/raydium/launchpad/curve/curve.ts#L194-L224>
- Pinned `CreatePlatformConfig` IDL:
  <https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_launchpad/raydium_launchpad.json#L1514-L1613>
- Pinned `InitializeV2` IDL:
  <https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_launchpad/raydium_launchpad.json#L2186-L2453>
- Pinned GlobalConfig account and authorization fields:
  <https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_launchpad/raydium_launchpad.json#L4953-L5105>
- Pinned PlatformGlobalAccess authority:
  <https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_launchpad/raydium_launchpad.json#L1616-L1691>
- Pinned CPMM AmmConfig layout:
  <https://github.com/raydium-io/raydium-idl/blob/e7e0c96fe77bcf6a020b84a44c47a722aac8e359/raydium_cpmm/raydium_cp_swap.json#L2515-L2604>
- Candidate official AMM-v4 source and initialization LP semantics; exact
  commit/deployed-byte correspondence is not yet approved or proved:
  <https://github.com/raydium-io/raydium-amm/blob/c613c87c41edbe21112c9b8341774a70009c6d7b/program/src/processor.rs#L1133-L1165>
- Solana Verified Builds `v0.5.1` deterministic build implementation:
  <https://github.com/solana-foundation/solana-verifiable-build/tree/8470dd1fe5dd93209bbfdacaebe444349affe71b>
- Agave ProgramTest raw-account/runtime implementation:
  <https://github.com/anza-xyz/agave/blob/v3.0.10/program-test/src/lib.rs>
- Agave test-validator account and upgradeable-program loading behavior:
  <https://github.com/anza-xyz/agave/blob/v3.0.10/test-validator/src/lib.rs>
- Independent AMM-v4 deployed-program verification status:
  <https://verify.osec.io/status/675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8>
- Solana PDA-signed CPI:
  <https://solana.com/docs/core/cpi/cpi-with-pda>
- Solana program deployment and permanent finalization:
  <https://solana.com/docs/programs/deploying>
- Solana transaction fees:
  <https://solana.com/docs/core/fees/fee-structure>
