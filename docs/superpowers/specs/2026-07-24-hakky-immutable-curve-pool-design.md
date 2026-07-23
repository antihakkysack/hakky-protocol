# HAKKY Immutable Curve-to-Pool Design

Date: 2026-07-24
Status: architecture approved by the user; controlling written specification
pending user review

## 1. Decision and precedence

HAKKY will use one single-purpose, open-source native Solana program whose
permissionless bonding curve becomes a permanent constant-product pool in
place. The same two token vaults serve both phases. There is no migration CPI,
external venue, LP mint, liquidity position, operator, administrator, fee
recipient, withdrawal path, or recovery authority.

The program must be reproducibly built and its loader-v3 upgrade authority must
be permanently removed before HAKKY initialization. Initialization itself
checks the raw Program and ProgramData accounts and rejects a non-null upgrade
authority. Once initialized, no person, wallet, multisig, governance process,
or program-controlled PDA can change the economics or remove the reserves.

This specification supersedes all active HAKKY material that requires Raydium
LaunchLab, a Raydium PlatformConfig, CPMM or AMM-v4 migration, OpenBook
precreation, Burn & Earn, an LP lock, a migration operator, or a selectable
migration venue. The rejected design and its evidence remain recorded in:

```text
docs/superpowers/specs/2026-07-23-hakky-immutable-launch-guard-design.md
```

Classic SPL Token remains the token program. Raydium documentation and binaries
are no longer normative dependencies. Metaplex Token Metadata remains as a
presentation-only dependency under the explicit boundary in Section 3.

No approval of this design authorizes a mainnet deployment, program
finalization, mint initialization, wallet signature, SOL spend, metadata
publication, website publication, repository push, or social action. Every
external or irreversible action retains its separate action-time approval.

## 2. Normative community economics

These values are compiled constants and accept no runtime override:

| Invariant | Exact value |
| --- | --- |
| Token program | classic SPL Token, `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| Name / symbol | Hakky Protocol / HAKKY |
| Decimals | `6` |
| Total display supply | `10,000,000` HAKKY |
| Total base-unit supply | `10,000,000,000,000` |
| Public curve maximum | `8,000,000` HAKKY / `8,000,000,000,000` base units |
| Permanent pool seed | `2,000,000` HAKKY / `2,000,000,000,000` base units |
| Creator/team allocation | `0` |
| Quote mint | wrapped SOL, `So11111111111111111111111111111111111111112` |
| Curve terminal quote reserve | `24,000,000,000` WSOL base units / 24 SOL |
| Creator first buy | absent |
| Presale / treasury / airdrop / vesting | absent |
| Curve fee | `0` |
| Pool input fee | `2,500` millionths / 25 basis points / 0.25% |
| Pool fee destination | none; the fee remains inside the input reserve |
| LP token or liquidity position | none |
| Creator-funded cumulative on-chain cap | `1,000,000,000` lamports |
| Metadata-service payment | `0` lamports |

The 24 SOL terminal reserve is contributed by public curve buyers. It is not a
creator contribution and does not enter the creator-funded one-SOL cap.
Development, legal, audit, and hosting expenses are also outside that on-chain
lamport ledger and must never be reported as token allocations.

The initializer, deployer, program-ID signer, disclosed creator wallets, and
team wallets receive no token, LP, fee, vault, close, delegate, update,
withdrawal, rescue, pause, or governance right. Their aggregate HAKKY balance
across every classic token account must be observed as zero at the finalized
curve-live proof point.

The evidence can prove only the disclosed address set and the encoded zero
allocation. It cannot prove that a human controls no undisclosed wallet.
Public wording must preserve that boundary.

After the curve is publicly live, the creator may buy HAKKY through the same
public interface and rules as anyone else. Such a later purchase is not a
launch allocation, and every creator-balance claim must be qualified by
finalized slot and UTC time.

There is no per-wallet cap, allowlist, blacklist, transfer tax, bot filter, or
identity restriction. Those mechanisms are either sybilable or incompatible
with equal permissionless access. Slippage and deadline controls protect the
submitted transaction but do not promise a particular market outcome.

## 3. Trust boundary

### 3.1 Economically trusted components

The economic core depends only on:

- the Solana runtime and consensus;
- the System Program for account creation during initialization;
- the classic SPL Token program for the HAKKY mint, HAKKY vault, WSOL vault,
  and user token transfers;
- the finalized HAKKY program bytes.

The exact System, loader, classic Token, WSOL, and sysvar identities are pinned
in the release manifest. No swap instruction accepts a caller-selected program
ID or arbitrary CPI.

### 3.2 Presentation-only dependency

The initialization transaction invokes the pinned Metaplex Token Metadata
program once:

```text
metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
```

It creates HAKKY metadata with:

- exact name `Hakky Protocol`;
- exact symbol `HAKKY`;
- exact compiled URI `https://hakky.xyz/metadata/hakky-v1.json`;
- `isMutable = false`;
- the `metadata-sink` PDA as update authority, signed only for this creation
  CPI by `invoke_signed`;
- zero seller fee;
- no creators array, collection, uses, rule set, or programmable-token field.

The HAKKY program contains no metadata update path. Nevertheless, Metaplex is an
external upgradeable program and the HTTPS JSON behind a metadata URI can be
changed by its host. This is a disclosed presentation trust, not an economic
control. The image must be content-addressed on IPFS and verified byte-for-byte.
The JSON bytes and their SHA-256 are published in the proof package.

Uploading a metadata JSON file to IPFS is not authorized by the user's existing
image-only Pinata approval. Unless a later separate approval is given, the
compiled metadata URI above points to exact versioned HTTPS JSON on
`hakky.xyz`, whose image field is the verified `ipfs://` image URI.

The release manifest pins the exact Metaplex instruction, source commit, and
deployed program-data observation used by the implementation. If source
correspondence, the account contract, hostile-prefund behavior, or the deployed
binary cannot support this immutable one-call shape, initialization stops. The
implementation may not add a later metadata authority or update instruction as
a fallback.

### 3.3 Explicitly removed trust

The economic core has no dependency on:

- Raydium LaunchLab, CPMM, AMM-v4, CLMM, Lock, or Routing;
- OpenBook, Phoenix, Manifest, Orca, Meteora, or SPL Token Swap;
- a migration wallet, market maker, crank, fee owner, protocol administrator,
  multisig, DAO, oracle, relayer, indexer, API, or hosted UI;
- an off-chain price, reserve, or permission decision.

The website, SDK, CLI, indexer, and quote service are replaceable clients. Raw
program state and deterministic math are authoritative.

## 4. Program and account model

### 4.1 Deployment accounts

The release uses loader-v3:

- one executable Program account;
- one ProgramData account allocated to exactly the reproducible binary length;
- no excess `max_len`;
- a temporary deployment authority only until permanent finalization;
- null ProgramData upgrade authority before initialization.

The program must reject initialization unless its own Program account is
executable under the pinned loader, its ProgramData address matches the
Program account, and the raw ProgramData authority option is `None`.

### 4.2 Fixed PDAs

The release uses a 32-byte `instance_nonce`. Public source contains only:

```text
INSTANCE_COMMITMENT = SHA256("HAKKY_INSTANCE_V1" || instance_nonce)
```

The nonce is generated before the final reproducible build, remains private
until it appears in the initialization instruction, and is never a signer,
authority, password, or source of economic discretion. The program verifies
the domain-separated commitment before deriving any PDA.

All HAKKY PDA seeds include the ASCII version suffix `v1` and the revealed
nonce:

| Role | Exact seed components | Owner after initialization |
| --- | --- | --- |
| HAKKY mint | `["hakky-mint", "v1", instance_nonce]` | classic SPL Token |
| Market state | `["hakky-market", "v1", instance_nonce]` | HAKKY program |
| Vault authority | `["hakky-vault-authority", "v1", instance_nonce]` | no allocated state required |
| HAKKY vault | `["hakky-base-vault", "v1", instance_nonce]` | classic SPL Token |
| WSOL vault | `["hakky-quote-vault", "v1", instance_nonce]` | classic SPL Token |
| Metadata sink | `["hakky-metadata-sink", "v1", instance_nonce]` | no allocated state required |

The Metaplex metadata PDA is derived under the pinned Metadata program from the
HAKKY mint by its source-defined seeds.

The HAKKY mint is a PDA, not an exported keypair. The mint and vault addresses
therefore derive from the selected program ID plus the committed nonce and
cannot be substituted at runtime. The commitment reduces the public
pre-initialization address-griefing window; safe adoption rules and hostile
prefund tests remain mandatory because transaction submission reveals the
nonce.

### 4.3 Market state

`MarketStateV1` is a fixed 384-byte, zero-copy-safe layout with:

- eight-byte magic/version domain;
- layout version `1`;
- phase: `curve` or `pool`;
- every PDA bump;
- revealed instance nonce and compiled instance commitment;
- finalized initialization slot;
- curve base units sold;
- accounted HAKKY reserve;
- accounted WSOL reserve;
- initialization signer public key for evidence only;
- exact HAKKY mint, HAKKY vault, WSOL vault, and vault-authority public keys;
- reserved bytes that must remain zero.

It contains no administrator, fee recipient, mutable configuration, close
authority, pause flag, emergency role, migration role, oracle, allowlist,
upgrade address, or arbitrary destination.

The program has no instruction capable of reallocating, closing, or assigning
the state account. A state account with the wrong size, magic, version, owner,
PDA, reserved bytes, or stored identities is invalid.

### 4.4 Vaults

The HAKKY vault is one classic token account:

- mint: exact HAKKY mint PDA;
- owner: exact vault-authority PDA;
- initial amount: `10,000,000,000,000`;
- delegate: none;
- close authority: none;
- state: initialized.

The WSOL vault is one classic native-mint token account:

- mint: exact WSOL mint;
- owner: exact vault-authority PDA;
- initial token amount: `0`;
- native rent reserve: exact action-time value;
- delegate: none;
- close authority: none;
- state: initialized.

The program has no close or arbitrary transfer instruction. The only vault
outflows are the exact swap outputs described in Sections 7 and 8.

## 5. Closed instruction surface

The program exposes exactly three public instruction tags and no Anchor
fallback, IDL dispatcher, management namespace, or unknown-tag handler:

| Tag | Instruction | Data length |
| ---: | --- | ---: |
| `0` | `InitializeHakkyMarketV1` | `33` bytes |
| `1` | `BuyExactHakkyV1` | `25` bytes |
| `2` | `SellExactHakkyV1` | `25` bytes |

Initialization data is:

```text
tag             u8
instance_nonce  [u8; 32]
```

The program verifies the domain-separated nonce commitment before it derives
or accepts any PDA. All integer fields below are little-endian unsigned values.
Buy and sell data are:

```text
tag             u8
base_amount     u64
quote_limit     u64
deadline_slot   u64
```

For a buy, `base_amount` is exact HAKKY output and `quote_limit` is maximum
WSOL input. For a sell, `base_amount` is exact HAKKY input and `quote_limit` is
minimum WSOL output.

Unknown tags, trailing bytes, short data, zero amounts, expired deadlines, and
noncanonical account sets are rejected.

A deadline is valid exactly when:

```text
Clock.slot <= deadline_slot
```

A transaction with `Clock.slot > deadline_slot` is rejected.

### 5.1 Initialization account contract

The outer account list is closed and positional:

1. compiled initializer, signer+writable payer;
2. exact HAKKY Program account, readonly;
3. exact ProgramData account, readonly;
4. exact loader-v3 program, readonly;
5. MarketState PDA, writable;
6. HAKKY mint PDA, writable;
7. HAKKY vault PDA, writable;
8. WSOL vault PDA, writable;
9. vault-authority PDA, readonly;
10. Metaplex metadata PDA, writable;
11. metadata-sink PDA, readonly;
12. exact WSOL mint, readonly;
13. System Program, readonly;
14. classic SPL Token program, readonly;
15. pinned Metaplex Token Metadata program, readonly;
16. Rent sysvar, readonly.

No account may be omitted, appended, reordered, or signer- or
writable-promoted. No two account positions may alias.

The initializer public key is compiled only to prevent third-party
initialization during the post-deployment gap. It receives no stored signing
right and has no valid instruction after initialization.

### 5.2 Swap account contract

Both swap instructions use this closed positional list:

1. trader, signer;
2. MarketState PDA, writable;
3. HAKKY mint PDA, readonly;
4. HAKKY vault PDA, writable;
5. WSOL vault PDA, writable;
6. vault-authority PDA, readonly;
7. trader HAKKY token account, writable;
8. trader WSOL token account, writable;
9. exact WSOL mint, readonly;
10. classic SPL Token program, readonly.

The trader token accounts must be initialized classic token accounts owned by
the trader signer, with the exact respective mints, `delegate = None`, and
`close_authority = None`. Frozen accounts, any delegated authority, multisig
substitution, wrong token program, wrong mint, and every alias are rejected.

The program does not depend on the Associated Token Account program. A client
may create or close standard user accounts in the same outer transaction, but
those instructions are outside the HAKKY program and must be decoded by the
transaction preview.

## 6. Atomic initialization

Initialization is callable exactly once and only after loader authority is
null. Its only non-tag input is the committed instance nonce; it accepts no
economic or metadata parameters.

In one atomic transaction the program:

1. validates its own Program/ProgramData raw state and null authority;
2. validates the compiled initializer;
3. validates the instance commitment and derives the exact PDA accounts;
4. adopts or creates those exact PDA accounts;
5. initializes the HAKKY mint with six decimals, vault-authority mint authority,
   and no freeze authority;
6. initializes the HAKKY and WSOL vault token accounts;
7. mints exactly `10,000,000,000,000` HAKKY base units to the HAKKY vault;
8. creates exact immutable Metaplex metadata, with the metadata-sink PDA
   signing only that CPI;
9. permanently sets HAKKY mint authority to `None`;
10. writes `MarketStateV1` in `curve` phase with sold `0`, accounted HAKKY
   reserve `10,000,000,000,000`, and accounted WSOL reserve `0`;
11. re-reads every changed account and validates all postconditions.

Any failure rolls back every step.

The mint supply is created once at initialization. Curve trades transfer
already-minted HAKKY; users never receive mint authority and the program never
mints again.

### 6.1 Prefunding and address griefing

Before adoption, every allocatable HAKKY PDA account must be System-owned with
zero data and may have any nonnegative lamport prefund. On Solana, a
never-funded address is represented by that same zero-lamport System-owned
state. An already initialized account, including an exact-looking prior state,
must be rejected as a duplicate initialization.

For a System-owned zero-data PDA, the program signs fixed System
allocate/assign operations and transfers only the exact rent delta. Excess
lamports are sealed surplus. An unexpected owner, nonzero data, incompatible
size, partial token initialization, or contradictory exact state is a hard
stop.

The Metaplex metadata PDA is not owned by HAKKY. The pinned Metaplex source
path uses its canonical PDA signer to create or allocate the account, but this
is accepted only after source-correspondence review and exact-binary
ProgramTest/devnet proof. Private preflight must test `0`, `1`, `rent-1`,
`rent`, `rent+1`, and larger prefund states for every HAKKY allocatable PDA and
the Metaplex metadata PDA. A one-lamport dust transfer must not make the
architecture unusable. Failure of the pinned Metaplex binary to safely adopt a
System-owned, zero-data prefund is a hard stop with no metadata-free or mutable
fallback.

Initialization has no automatic retry. An unknown outcome is reconciled from
finalized state before any recovery decision.

## 7. Permissionless bonding curve

Define:

```text
S = 8,000,000,000,000   maximum curve HAKKY base units
L = 2,000,000,000,000   terminal pool HAKKY base units
Q = 24,000,000,000      terminal WSOL base units
s = current curve HAKKY base units sold, 0 <= s <= S
```

The cumulative curve reserve is:

```text
C(s) = floor(Q * s / (4*S - 3*s))
```

All products and divisions use checked `u128` arithmetic. The denominator is
strictly positive over the accepted domain. The result must fit `u64`.

Exact identities:

```text
C(0) = 0
C(S) = Q = 24,000,000,000
```

For a curve-phase buy of exact base amount `d`:

```text
0 < d <= S - s
quote_in = C(s + d) - C(s)
quote_in > 0
quote_in <= max_quote_in
```

For a curve-phase sell of exact base amount `d`:

```text
0 < d <= s
quote_out = C(s) - C(s - d)
quote_out > 0
quote_out >= min_quote_out
```

Using differences of the same cumulative integer function makes any path
between two sold states telescope to the same total quote amount. A same-state
buy/sell round trip returns the same token amounts apart from network fees and
intervening trades. Zero-lamport dust trades are rejected.

The curve charges no protocol, creator, or pool fee. During curve phase:

```text
accounted HAKKY reserve = 10,000,000,000,000 - s
accounted WSOL reserve  = C(s)
```

The program requires actual vault amounts to be at least those accounted
values before and after settlement.

### 7.1 Terminal price continuity

The continuous marginal price at the terminal curve point is:

```text
C'(S) = 4Q / S
      = 0.012 WSOL base unit per HAKKY base unit
      = 12,000 lamports per displayed HAKKY
```

The initial permanent-pool spot price is:

```text
Q / L = 24,000,000,000 / 2,000,000,000,000
      = 0.012 WSOL base unit per HAKKY base unit
```

Thus the curve terminal marginal price equals the initial pool spot price
without an oracle or migration repricing.

This equality is a mathematical property of the approved formula. It is not a
promise that external markets value HAKKY at that price.

## 8. Automatic permanent-pool phase

The final buy that changes `s` to `S` atomically changes the state phase from
`curve` to `pool` after successful settlement and postcondition checks.

At that transition:

```text
accounted HAKKY reserve = L = 2,000,000,000,000
accounted WSOL reserve  = Q = 24,000,000,000
```

The same HAKKY vault, WSOL vault, vault-authority PDA, and MarketState account
remain in place. There is no asset transfer to another program, migration
instruction, market-creation transaction, external signer, crank, LP mint, or
position NFT.

The phase transition is one-way. The program exposes no instruction or branch
that can return to curve phase. If the public curve never reaches `S`, it
remains permanently open for permissionless buys and sells; no operator can
force completion.

## 9. Permanent constant-product swaps

The pool stores authoritative accounted reserves:

```text
B = accounted HAKKY reserve
R = accounted WSOL reserve
D = 1,000,000
F = 997,500
```

The fixed rational input-fee rate is:

```text
(D - F) / D = 2,500 / 1,000,000 = 0.25%
fee(gross_input) = ceil(gross_input * 2,500 / 1,000,000)
effective_input  = gross_input - fee(gross_input)
                 = floor(gross_input * 997,500 / 1,000,000)
```

The entire gross input enters the relevant vault and accounted reserve. The
difference between gross and effective input stays permanently in the pool,
increasing or preserving `B * R`. No account receives or can claim it. Integer
settlement rounds the retained fee upward to an input-mint base unit, so the UI
and CLI must disclose that a dust-sized trade can retain up to one base unit
more than the exact rational percentage.

### 9.1 Buy exact HAKKY

For exact HAKKY output `b`:

```text
0 < b < B
effective_quote = ceil(R * b / (B - b))
gross_quote_in  = ceil(effective_quote * D / F)
gross_quote_in > 0
gross_quote_in <= max_quote_in
```

Settlement:

```text
B_after = B - b
R_after = R + gross_quote_in
```

### 9.2 Sell exact HAKKY

For exact HAKKY input `b`:

```text
0 < b
effective_base = floor(b * F / D)
effective_base > 0
quote_out = floor(R * effective_base / (B + effective_base))
quote_out > 0
quote_out < R
quote_out >= min_quote_out
```

Settlement:

```text
B_after = B + b
R_after = R - quote_out
```

All ceiling divisions use a reviewed overflow-safe `ceil_div` over checked
`u128`. Every result must fit `u64`.

For both directions the program proves:

```text
B_after > 0
R_after > 0
B_after * R_after >= B * R
```

The program processes the exact user input transfer, exact vault-authorized
output transfer, state update, and postcondition reads atomically. A failed CPI
or postcondition rolls back the complete swap.

### 9.3 Meaning of permanent liquidity

The approved public claim is:

> Exactly 2,000,000 HAKKY and 24 SOL became the pool's initial reserves, with
> no LP token, withdrawal right, administrator, or fee claimant.

Legitimate swaps change reserve balances, so public material must not promise
that exactly two million HAKKY remains in the vault forever. The constant-product
math prevents a valid swap from emptying either accounted reserve.

## 10. Donations, surplus, and conservation

Unsolicited HAKKY, WSOL, or lamport transfers do not change pricing.

The program stores accounted reserves and requires:

```text
actual HAKKY vault amount >= accounted HAKKY reserve
actual WSOL vault amount  >= accounted WSOL reserve
```

The difference is sealed surplus:

- it is excluded from curve and pool quotes;
- it cannot be withdrawn, claimed, swept, closed, or redirected;
- it cannot satisfy an input transfer;
- it cannot make an accounted reserve decrease;
- it is reported separately in proof artifacts.

There is no `sync`, `skim`, `donate`, `collect`, or surplus-adoption
instruction. This prevents an unsolicited transfer from manipulating price or
creating a privileged recovery claim.

Every valid vault outflow must be paired in the same successful swap with the
opposite exact user input and the reviewed state transition. For each swap, the
program snapshots both vault amounts and requires the actual input-vault delta
to equal the instruction's exact gross input and the actual output-vault delta
to equal the instruction's exact output. Pre-existing sealed surplus cannot
satisfy either equality. No other instruction can sign as the vault authority.

## 11. Creator-funded one-SOL cap

### 11.1 Fresh rent snapshot

At finalized mainnet slot `434775182` with UTC block time
`2026-07-23T19:28:37.000Z`, the queried rent model was:

```text
rent_exempt_minimum(n bytes) = 890,880 + 6,960*n lamports
```

Observed examples:

| Account bytes | Lamports |
| ---: | ---: |
| Program `36` | `1,141,440` |
| Mint `82` | `1,461,600` |
| Token account `165` | `2,039,280` |
| MarketState `384` | `3,563,520` |
| Metadata maximum `679` | `5,616,720` |

These are evidence snapshots, not permanent constants. Every action-time
manifest re-queries finalized rent and invalidates prior cost approval on drift.

### 11.2 Binary-size formula

For exact executable length `B`, permanent rent for:

- Program account;
- ProgramData account of exactly `B + 45` bytes;
- one 82-byte mint;
- one 384-byte MarketState;
- two 165-byte token vaults;
- one maximum 679-byte metadata account;

is:

```text
permanent_rent(B) = 17,065,920 + 6,960*B lamports
```

The normative executable ceiling is:

```text
B <= 120,000 bytes
```

At exactly 120,000 bytes:

```text
permanent_rent = 852,265,920 lamports
remaining cap  = 147,734,080 lamports
```

The remaining cap must cover every deployment/write/finalization/init
signature fee, bounded compute-unit price, transaction-rent account, temporary
buffer failure prefix, recovery transaction, and classified canonical-funder
debit.

The analytical ceiling before any fee/recovery reserve is about 141 KB, but it
is not an approved release option. A binary over 120,000 bytes is a hard stop,
even if a point estimate appears below one SOL.

### 11.3 Ledger semantics

The cost controller uses exact lamports and requires:

```text
maximum cumulative canonical-funder debit <= 1,000,000,000
```

It records every reachable finalized prefix and failure branch. Only refunds
inside the same successful transaction net directly. A later refund is a
separate external credit and must be finalized before a subsequent debit can
reuse the cap.

A funded deployment buffer remains a debit until it is successfully closed or
consumed and reconciled. An abandoned final program is unrecoverable and counts
permanently. No retry, replacement program ID, metadata fallback, or recovery
branch may cause any prefix to exceed the cap.

The 24 SOL accumulated from public buyers and all user swap inputs are excluded
from the creator-funded ledger but remain fully reconciled community reserves.

## 12. Reproducible build and immutable deployment

The implementation is compact native Rust without Anchor unless an independent
size and instruction-surface review proves an equally small closed result.

The release package pins:

- clean source commit and submodule state;
- compiled program ID, initializer public key, domain-separated instance
  commitment, and exact metadata constants;
- Rust toolchain;
- Solana/Agave CLI and SBF tools;
- Cargo.lock and every feature flag;
- container image by immutable digest;
- exact build commands and environment;
- exact executable length and SHA-256.

Two builds from separate clean directories must be byte-identical. A third
independent reproduction must match before mainnet approval. Build logs,
stdout/stderr hashes, tool versions, UTC times, and artifact hashes are
machine-recorded.

The deployment manifest uses exact binary `max_len`. After deployment and
before finalization, raw on-chain ProgramData bytes must equal the approved
binary. Finalization permanently sets upgrade authority to `None`. A finalized
readback must prove:

- exact Program and ProgramData addresses;
- pinned loader owner;
- exact executable bytes, length, and SHA-256;
- exact deployed slot;
- null upgrade authority.

Initialization remains impossible until that null-authority state is visible to
the HAKKY program.

The program-ID keypair is used only for deployment. Its public key may be
recorded in the private release manifest before deployment; the secret is never
printed, transmitted, committed, or included in a proof. Its retirement state
after successful deployment is chosen and recorded by the user.

The instance nonce is generated with a cryptographically secure random source
and stored only in the restricted private release manifest until
initialization. Public source and build records expose its commitment, not its
preimage. The exact approved initialization transaction necessarily reveals
the nonce; after finalized reconciliation, the nonce is public evidence and
has no continuing privilege or confidentiality purpose.

## 13. Proof artifacts and public lifecycle

The LaunchLab-specific proof model is superseded by closed schemas:

```text
schemas/proof/immutable-program-v1.schema.json
schemas/proof/hakky-market-v1.schema.json
schemas/proof/hakky-pool-v1.schema.json
schemas/web/launch-v3.schema.json
```

Canonical mainnet paths are:

```text
proof/mainnet-program.json
proof/mainnet-market.json
proof/mainnet-pool.json
```

The public stages are:

```text
prelaunch -> curve-live -> pool-live
```

Proof availability is orthogonal:

```text
verified | unavailable
```

Unknown fields are rejected at every schema level. All quantities are canonical
unsigned decimal strings. Every chain observation uses `finalized` commitment,
raw account bytes, a context slot, UTC block time, exact SHA-256, and a public
RPC host.

### 13.1 Immutable program proof

The program artifact requires:

- source commit, toolchain, lockfile, container digest, and clean-tree proof;
- two local build records plus independent reproduction;
- executable length at or below 120,000 bytes;
- exact Program/ProgramData raw bytes and hashes;
- deployment and finalization transactions;
- ProgramData authority `None`;
- complete instruction-surface inspection proving only tags `0`, `1`, and `2`;
- closed CPI target inspection;
- complete canonical-funder cost ledger and `ok: true`.

### 13.2 Market initialization proof

The market artifact requires:

- exact initialization transaction bytes, signatures, slot, time, and full
  instruction/CPI decode;
- revealed instance nonce, domain separator, recomputed commitment, and exact
  PDA derivations;
- exact PDA seeds, bumps, owners, sizes, raw hashes, and stored identities;
- classic mint supply `10,000,000,000,000`, decimals `6`, null mint authority,
  and null freeze authority;
- HAKKY vault amount `10,000,000,000,000` at initialization;
- WSOL vault amount `0`;
- no token delegate or close authority;
- exact immutable metadata and image/JSON hashes;
- curve state sold `0`, reserves `10,000,000,000,000` / `0`;
- disclosed creator/team aggregate HAKKY balance `0`;
- no creator first buy or same-transaction token destination;
- cumulative creator-funded debit within one SOL.

### 13.3 Pool transition proof

The pool artifact requires:

- the finalized terminal buy transaction and complete history binding;
- prior verified program and market artifacts by path, schema version, and
  SHA-256;
- one-way phase `pool`;
- curve sold exactly `8,000,000,000,000`;
- accounted initial pool reserves exactly `2,000,000,000,000` HAKKY and
  `24,000,000,000` WSOL;
- actual vault balances at least those values, with sealed surplus separate;
- no migration, LP mint, position, fee recipient, or authority account;
- null mint/freeze authorities unchanged;
- no creator/team right and time-qualified balance evidence;
- pool invariant and fee constants;
- `ok: true` only when every named check passes.

### 13.4 Provenance model

Every evidence input records orthogonal:

- origin;
- network;
- verification method;
- freshness/finality;
- purpose;
- exact content hash.

A simulation cannot satisfy finalized state. A local build cannot satisfy
on-chain deployment. A devnet transaction cannot satisfy mainnet. A website or
API cannot satisfy raw-account evidence.

Artifacts are machine-generated, append-only, and reject runtime fact
overrides. Public record replacement is atomic and may never silently downgrade
a failed verified binding to a weaker claim.

## 14. Security, math, and audit gates

Implementation is test-driven. Required evidence includes:

- unit tests for tags, exact data lengths, nonce commitment, PDA derivation,
  account order, privileges, constants, and every absent capability;
- independent BigInt differential model for every curve and pool quote;
- exhaustive boundary tests at `0`, `1`, maximum-minus-one, maximum, and
  overflow-adjacent values;
- property tests for curve monotonicity, telescoping, exact endpoints, reserve
  conservation, one-way transition, pool reserve floors, and nondecreasing
  product;
- adversarial account tests for every reorder, omission, extra account, unsafe
  alias, owner/mint/program substitution, signer promotion, writable
  promotion, delegate, frozen state, and partial initialization;
- wrong-nonce, nonce-reveal, dust/prefund, and sealed-surplus tests, including
  hostile prefunding of the exact Metaplex metadata PDA;
- concurrent/final-buy tests proving no oversell or double transition;
- deadline and slippage tests;
- failed-CPI and failed-postcondition rollback tests;
- deterministic instruction-surface inspection proving no hidden dispatcher,
  fallback, admin, close, arbitrary transfer, or arbitrary CPI;
- SBF ProgramTest lifecycle using the exact built binary from uninitialized
  PDAs through curve completion and pool swaps;
- fuzzing of instruction bytes, accounts, state bytes, and full arithmetic
  domains;
- two reproducible builds and a separately reproduced binary;
- dependency, license, secret, and supply-chain scans.

Because the program becomes permanently unrepairable, mainnet is a hard `NO-GO`
until:

1. an independent qualified Solana security review is complete;
2. an independent economic/math review validates integer rounding and price
   continuity;
3. every critical/high finding is resolved;
4. every accepted lower-severity finding and rationale is public;
5. final reviewed source reproduces the release binary after all fixes.

Internal agent review is useful evidence but must not be called a third-party
audit.

## 15. Devnet and local rehearsal

Before any mainnet transaction approval, a fresh devnet ceremony must rehearse
the exact release process:

1. generate fresh devnet payer and program-ID signers plus a fresh instance
   nonce without printing secrets;
2. compile the devnet program ID and nonce commitment;
3. obtain only free devnet SOL;
4. build the exact candidate twice;
5. deploy with exact `max_len`;
6. read back exact bytes;
7. permanently remove upgrade authority;
8. prove finalized null authority;
9. execute exact initialization with the committed nonce;
10. prove the nonce commitment, PDA derivations, fixed supply, null token
   authorities, metadata, vaults, and zero
   creator allocation;
11. execute permissionless curve buys and sells across boundary cases;
12. supply enough devnet WSOL to complete the exact 24 SOL curve;
13. prove the atomic one-way transition;
14. execute pool buys and sells and prove nondecreasing product;
15. run wrong-nonce, dust, metadata-prefund, donation, alias, slippage, expiry,
   replay, and failure-recovery
   cases;
16. generate public devnet proof and cost receipts containing no unrevealed
   secret;
17. rerun the full repository, browser, and artifact gates.

A full live devnet curve completion needs more than 24 devnet SOL plus account
rent and transaction-fee headroom. A 2 SOL faucet balance is insufficient.
ProgramTest may accelerate exhaustive curve volume but cannot replace the live
deployment/finalization/initialization and representative swap rehearsal.

The devnet payer may remain memory-only for a bounded rehearsal. A program-ID
signer may use a restricted temporary file with owner-only ACL only when the
Solana deployment tool requires a path; it is removed after finalization and
never enters the repository, terminal output, proof, or logs.

Unknown or failed devnet outcomes are reconciled before retry. Devnet success is
necessary but not sufficient for mainnet.

## 16. Public access and client deliverables

HAKKY trading is permissionless on-chain from curve initialization onward. No
HAKKY-operated server is required for settlement.

The launch package must nevertheless provide:

- public program, mint, state, and vault addresses;
- reviewed and reproducible source;
- TypeScript and Rust state decoders;
- deterministic quote functions matching on-chain arithmetic;
- transaction builders with exact account lists;
- an independent CLI for buy, sell, quote, and proof verification;
- an open-source web trading interface;
- a read-only proof page;
- explorer links and raw-account instructions;
- public risk, fee, slippage, deadline, and no-recovery disclosures.

The web UI must decode its own generated transaction before wallet presentation
and show:

- exact program ID;
- buy or sell direction;
- exact input/output constraint;
- current phase;
- minimum output or maximum input;
- 0% curve fee or the exact 0.25% pool-retained rate plus its one-base-unit
  upward rounding rule;
- expiry slot;
- absence of any creator or protocol fee destination.

Jupiter, wallet, explorer, price-service, or aggregator integration is not
promised. Initial access is through the HAKKY open-source web interface, CLI,
or direct program invocation. Any later aggregator integration is separately
reviewed and must not introduce a privileged router or custody dependency.

Public copy must distinguish:

- fixed 10,000,000 supply from permissionless trading;
- eight million curve allocation from two million initial pool seed;
- permanent initial liquidity from a promise that reserve balances never
  change;
- a pool-retained trading charge from a creator/protocol fee;
- immutable HAKKY economics from external Solana runtime and presentation
  dependencies;
- verified source correspondence from a security audit;
- zero launch allocation from later creator public-market purchases.

## 17. Metadata and IPFS gate

Only `web/assets/token.png` is authorized for the current Pinata free public
IPFS workflow. The exact approved bytes have SHA-256:

```text
9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0
```

The workflow must:

- require Pinata authentication but no wallet;
- require no payment;
- upload exactly that file and no directory or additional JSON;
- read back the CID;
- fetch through at least two public gateways;
- verify both returned byte streams against the approved SHA-256;
- record public URLs, CID, MIME type, size, and verification time;
- stop if Pinata requests wallet connection, payment, or broader access.

The resulting image CID becomes a compile-time metadata input. Any CID or byte
change invalidates the build, proofs, unsigned transactions, and approvals.

After the verified CID is known, the repository generates the exact UTF-8,
no-BOM, LF-terminated bytes served at the compiled URI from this one-line
template:

```json
{"name":"Hakky Protocol","symbol":"HAKKY","description":"HAKKY is a fixed-supply Solana token with an immutable permissionless curve-to-pool market and zero creator allocation at launch.","image":"ipfs://<VERIFIED_IMAGE_CID>"}
```

`<VERIFIED_IMAGE_CID>` is a generation placeholder, not a launch-time runtime
value. The release package pins the resolved JSON bytes and SHA-256, verifies
the HTTPS response byte-for-byte before initialization, and serves it as
`application/json; charset=utf-8`. Changing the hosted bytes after launch
cannot change on-chain economics, but would violate the public proof and is
reported as presentation-proof failure.

## 18. Mainnet readiness and action sequence

Completing this specification and its implementation does not authorize the
following sequence. Each numbered mutation requires an exact action-time
approval.

The only acceptable sequence is:

1. finish implementation, security review, economic review, devnet rehearsal,
   browser QA, proof schemas, and operator handoff;
2. generate the private program-ID signer and instance nonce, then compile the
   program ID and domain-separated nonce commitment;
3. freeze the clean reviewed source commit, toolchain, initializer, metadata
   URI/image CID, instance commitment, and disclosed creator-controlled
   address set; derive every PDA privately;
4. build twice plus independent reproduction;
5. prove binary length at or below 120,000 bytes;
6. generate a complete bounded cost and failure/recovery manifest at current
   finalized rent and fee values;
7. prove every reachable canonical-funder prefix stays within one SOL;
8. privately preflight all unrevealed PDA prefund states;
9. generate, decode, simulate, and separately approve the exact deployment
   transaction set and maximum debit;
10. deploy once with no automatic retry;
11. reconcile exact ProgramData bytes at finalized commitment;
12. generate, decode, simulate, and separately approve the exact permanent
    finalization transaction and maximum debit;
13. finalize once and prove null authority at finalized commitment;
14. generate, decode, simulate, and separately approve the exact initialization
    transaction and maximum debit;
15. initialize once and reconcile finalized supply, authorities, metadata,
    state, vaults, creator balances, cost, and complete history;
16. publish only the curve-live claims supported by canonical proofs;
17. at eventual terminal transition, generate and publish the pool proof from
    finalized state without an operator transaction.

No mint initialization may be signed before finalized immutable-program proof,
metadata readback, exact initialization bytes, full simulation, and cost ledger
all pass.

The current goal stops before step 9 unless the user separately authorizes a
specific mainnet transaction set. Mainnet launch is not part of design approval.

## 19. Hard stops

Stop before the next build approval, signature, submission, or publication
when:

- any 10,000,000 / 8,000,000 / 2,000,000 / zero-allocation value differs;
- the curve formula, rounding, endpoint, or terminal-price proof differs;
- the pool fee differs from exactly 0.25% retained in the input reserve;
- any fee recipient, LP mint, liquidity position, withdrawal, deposit, claim,
  admin, pause, rescue, close, migration, arbitrary transfer, or arbitrary CPI
  path exists;
- initialization can execute before ProgramData authority is null;
- a nonce other than the committed preimage is accepted, any HAKKY PDA omits
  that nonce, or the nonce is exposed before the approved initialization
  submission;
- the program exposes any public tag beyond `0`, `1`, and `2`;
- a PDA, program, mint, account order, owner, signer, writable flag, or CPI
  target differs from the reviewed manifest;
- the mint or freeze authority is non-null after initialization;
- the HAKKY vault does not receive exactly the fixed total supply;
- curve state can exceed eight million sold or transition with reserves other
  than exactly two million HAKKY and 24 SOL;
- the phase can revert from pool to curve;
- an accounted reserve can exceed its actual vault or reach zero through a
  valid pool swap;
- donations affect pricing or become recoverable;
- arithmetic can overflow, divide by zero, produce an unbounded result, or
  violate nondecreasing product;
- source does not reproduce exact bytes;
- binary length exceeds 120,000 bytes;
- loader capacity exceeds exact binary length;
- upgrade authority is not finalized null;
- any reachable canonical-funder prefix exceeds one SOL;
- a critical/high audit finding remains, an accepted finding is undisclosed, or
  final fixes are not re-reviewed and rebuilt;
- the exact live devnet lifecycle has not passed;
- metadata image bytes/CID differ or upload requires wallet/payment;
- raw transaction bytes, full decode, simulation, expiry, maximum debit, or
  separate action approval is missing;
- a transaction outcome is unknown or a retry would exceed its approval;
- public copy promises aggregator access, price, returns, safety, bot
  prevention, or permanent reserve quantities beyond the exact evidence.

## 20. Out of scope

- Token-2022 extensions, taxes, hooks, blacklist, pause, clawback, permanent
  delegate, transfer restrictions, or confidential transfers;
- a creator/team launch allocation, presale, treasury, vesting, airdrop, first
  buy, privileged curve access, or retained supply;
- treating the instance nonce as a key, durable secret, administrator,
  capability, or recovery mechanism;
- liquidity deposits, LP shares, staking, farming, governance, buyback, fee
  distribution, rewards, or yield;
- an oracle, peg, price guarantee, floor, market intervention, or forced curve
  completion;
- a HAKKY administrator, DAO, multisig, emergency key, or upgrade path;
- dependence on Raydium or another external venue for economic correctness;
- guaranteed Jupiter, wallet, exchange, or aggregator listing;
- automatic wallet connection, signature, send, retry, or recovery;
- claiming that immutable code is risk-free or externally audited before the
  required reports exist;
- mainnet deployment, finalization, initialization, token launch, public-site
  release, metadata upload, social mutation, repository push, or merge under
  this design approval alone.

## 21. Primary sources

- Solana program deployment, exact authority removal, and immutability:
  <https://solana.com/docs/programs/deploying>
- Solana program/account model:
  <https://solana.com/docs/core/programs>
- Solana account ownership:
  <https://solana.com/docs/core/accounts>
- Solana PDA-signed CPI:
  <https://solana.com/docs/core/cpi/cpi-with-pda>
- Classic SPL Token program and token basics:
  <https://solana.com/docs/tokens/basics>
- Token CPI:
  <https://solana.com/docs/tokens/advanced/cpi>
- Verified-build meaning and limitations:
  <https://solana.com/docs/programs/verified-builds>
- Metaplex Token Metadata source:
  <https://github.com/metaplex-foundation/mpl-token-metadata>
- Rejected LaunchLab source-availability evidence:
  <https://github.com/raydium-io/raydium-docs-v1/blob/104dff2efdc72a7897d757083c3f61a68aef9a47/reference/program-addresses.mdx>
