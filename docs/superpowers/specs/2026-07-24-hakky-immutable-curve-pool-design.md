# HAKKY Immutable Curve-to-Pool Design

Date: 2026-07-24
Status: architecture and Task 2 amendment approved by the user; amended
controlling written specification pending user review

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

### 3.4 Dependency and public-type boundary

The deployable program and its native processor tests use one coherent public
Solana type family:

```text
solana-program         2.3.0
mpl-token-metadata     5.1.1
spl-token-interface    1.0.0
solana-program-test    2.3.13   native-test only
solana-sdk             2.3.1    native-test only
spl-token              8.0.0    native-test only
```

`mpl-token-metadata` 5.1.1 requires `solana-program <3.0`; the previously
pinned 3.x/4.x mixture produced nominally different `Pubkey`, `AccountInfo`,
and processor types and is forbidden. The exact pins above must pass a clean
locked compile before implementation is accepted.

A separate current-runtime SBF harness may pin `solana-program-test` 4.1.2 and
its matching 4.x SDK packages only if it:

- has no Rust dependency on the HAKKY program crate or the Metaplex 2.x client;
- loads the exact compiled `.so` through the SBF file boundary;
- exchanges only canonical bytes, public addresses, transactions, and account
  observations with the release package; and
- never converts, transmutes, or wraps one Solana-version public type as
  another.

The current-runtime harness is runtime-compatibility evidence. It does not
change the program ABI or permit mixed public types inside the deployable
crate.

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

The Program account data is exactly 36 bytes and must decode wholly as
loader-v3 `Program { programdata_address }`. ProgramData is at least 45 bytes:
`[0,45)` is loader metadata and `[45..]` is executable payload, not trailing
serialized state. On-chain initialization validates owner, variants, linked
address, executable flag, and `upgrade_authority_address = None`. Off-chain
candidate proof additionally requires total ProgramData length `45 + B`, where
`B` is the approved `.so` length, and byte-for-byte equality of `[45..]` with
that `.so`; any spare capacity is rejected.

### 4.2 Fixed PDAs

The release uses a 32-byte `instance_nonce`. Public source contains only:

```text
INSTANCE_COMMITMENT = SHA256("HAKKY_INSTANCE_V1" || instance_nonce)
```

The nonce is generated before the final reproducible build, remains private
until it appears in the initialization instruction, and is never a signer,
authority, password, or source of economic discretion. The program verifies
the domain-separated commitment before deriving any PDA.

All HAKKY PDA seeds are exactly three byte slices, in this order:

1. the raw ASCII role bytes shown below;
2. raw ASCII bytes `v1`;
3. the raw 32-byte revealed nonce.

Derivation uses canonical `find_program_address` under the compiled HAKKY
program ID. The stored bump is the canonical bump returned by that function;
alternate valid bumps are rejected.

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

The public hermetic fixture is fixed to:

```text
program ID  = FAe4sisG95oZ42w7buUn5qEE4TAnfTTFPiguZUHmhiF
initializer = Dav6Vxmr7BEgvQW4osrzWutwgPEqQ4Ji3zWxKp6nX9AD
nonce       = 32 bytes of 0x07
commitment  = 83b540fece88b24496a7f4a876ad146a3cd64cdb74566da2aafbdd4bd6ebf0f4
```

Its canonical PDA results are:

| Role | Address | Bump |
| --- | --- | ---: |
| HAKKY mint | `CmoL1cvAKrxod4AtmY8MXxPKQHTdddu7G8zvFpco7RLN` | `253` |
| Market state | `95HfDKSWGCp1LyZCez8fPMYMR62U2bGes3v5x5bdW689` | `254` |
| Vault authority | `7H19wE3whSwccLQKxseXCs3fsQqT7PB8q5D5j14Tv292` | `254` |
| HAKKY vault | `6eEPFYBQnbpeDc1azQpgFJH5csE1rCmABsjavNqn66Fd` | `255` |
| WSOL vault | `9Yv8ie1Ho9XTKM5uJPxD5zAZEnyxFoxdjcHjgzcAa4xK` | `254` |
| Metadata sink | `GokrtAeJbGdH39zPc6cDQAGSj9Cj4nmimsZ4iWEez1Ye` | `253` |

### 4.3 Market state

`MarketStateV1` is the following canonical 384-byte wire layout:

| Half-open bytes | Encoding and field |
| --- | --- |
| `[0,8)` | exact ASCII magic `HAKKYV1\0` |
| `[8,9)` | layout version `1` |
| `[9,10)` | phase: curve `0`, pool `1`; every other byte rejected |
| `[10,16)` | bumps in order: mint, market, vault authority, HAKKY vault, WSOL vault, metadata sink |
| `[16,48)` | raw instance nonce |
| `[48,80)` | instance commitment |
| `[80,88)` | initialization execution `Clock.slot`, `u64` little-endian |
| `[88,96)` | curve HAKKY base units sold, `u64` little-endian |
| `[96,104)` | accounted HAKKY reserve, `u64` little-endian |
| `[104,112)` | accounted WSOL reserve, `u64` little-endian |
| `[112,144)` | initializer public key bytes |
| `[144,176)` | HAKKY mint public key bytes |
| `[176,208)` | HAKKY vault public key bytes |
| `[208,240)` | WSOL vault public key bytes |
| `[240,272)` | vault-authority public key bytes |
| `[272,384)` | exactly 112 zero reserved bytes |

The codec is manual. `repr(C)`, transmute, struct casting, implicit padding,
bytemuck decoding, and host-endian serialization are forbidden. The stored
slot is the execution slot; finality is established only by the later proof
artifact.

State validation is phase-specific:

```text
curve:
  sold <= S
  accounted_hakky = TOTAL - sold
  accounted_wsol  = C(sold)

pool:
  sold = S
  0 < accounted_hakky <= TOTAL
  accounted_wsol > 0
  accounted_hakky * accounted_wsol >= L * Q
```

Both products use checked `u128`. Curve equations are never applied to
post-transition pool reserves.

Using the public fixture above, initialization slot `0`, the exact stored
fixture identities, and zero reserved bytes, canonical state SHA-256 values
are:

```text
curve initial: phase=0, sold=0, base=10000000000000, quote=0
24e52bacf7131f9dcf39058e9eb83faa2b1f911de7a422414b2f3b3945e66c4d

curve midpoint: phase=0, sold=4000000000000, base=6000000000000,
quote=4800000000
76af8a6a86b36c153f1943663016f669cdfa362f10712f35aa14244fb3b6800c

pool initial: phase=1, sold=8000000000000, base=2000000000000,
quote=24000000000
e99448defa16c7048f668a3e3cb9ef4cbd66efe4e0cf71b9f444b4a81147af63
```

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

Unknown tags, trailing bytes, short data, zero `base_amount`, zero
`quote_limit`, expired deadlines, and noncanonical account sets are rejected.

A deadline is valid exactly when:

```text
Clock.slot <= deadline_slot
```

A transaction with `Clock.slot > deadline_slot` is rejected.
`deadline_slot = u64::MAX` is valid at the program layer; first-party clients
must not generate it and must present a finite explicit expiry.

Canonical instruction vectors are:

```text
initialize, nonce = 0x07 repeated 32 times:
000707070707070707070707070707070707070707070707070707070707070707

buy, base=0x0102030405060708, limit=0x1112131415161718,
deadline=0x2122232425262728:
01080706050403020118171615141312112827262524232221

sell, base=0x3132333435363738, limit=0x4142434445464748,
deadline=0x5152535455565758:
02383736353433323148474645444342415857565554535251
```

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

### 5.3 Stable HAKKY errors and precedence

Every HAKKY-originated rejection uses the following frozen
`ProgramError::Custom(u32)` registry. Errors returned by an invoked external
program propagate unchanged and are never relabeled as HAKKY errors.

| Hex | Variant |
| ---: | --- |
| `0x484b0001` | `WrongProgramId` |
| `0x484b0002` | `InvalidInstructionTag` |
| `0x484b0003` | `InvalidInstructionLength` |
| `0x484b0004` | `ZeroAmount` |
| `0x484b0005` | `InvalidInstanceNonce` |
| `0x484b0006` | `InvalidAccountCount` |
| `0x484b0007` | `InvalidAccountPrivileges` |
| `0x484b0008` | `AccountAlias` |
| `0x484b0009` | `InvalidFixedProgram` |
| `0x484b000a` | `InvalidPda` |
| `0x484b000b` | `InvalidAccountOwner` |
| `0x484b000c` | `InvalidAccountData` |
| `0x484b000d` | `InvalidTokenAccount` |
| `0x484b000e` | `InvalidMarketState` |
| `0x484b000f` | `InvalidPhase` |
| `0x484b0010` | `InvalidInitializer` |
| `0x484b0011` | `ProgramNotImmutable` |
| `0x484b0012` | `AlreadyInitialized` |
| `0x484b0013` | `InvalidPrefund` |
| `0x484b0014` | `CurveDomain` |
| `0x484b0015` | `InsufficientCurveLiquidity` |
| `0x484b0016` | `ArithmeticOverflow` |
| `0x484b0017` | `ZeroQuote` |
| `0x484b0018` | `SlippageExceeded` |
| `0x484b0019` | `DeadlineExpired` |
| `0x484b001a` | `ReserveInvariant` |
| `0x484b001b` | `ActualBelowAccounted` |
| `0x484b001c` | `VaultDeltaMismatch` |
| `0x484b001d` | `PostconditionFailed` |
| `0x484b001e` | `InvalidMetadata` |
| `0x484b001f` | `InvalidLoaderState` |

Validation precedence is:

```text
compiled program ID and instruction shape
-> account count, privileges, aliases, and fixed program identities
-> state bytes, commitment, PDAs, owners, and stored identities
-> phase and token-account semantics
-> deadline
-> arithmetic and slippage
-> pre-CPI actual/accounted reserves
-> exact CPIs
-> post-CPI deltas and invariants
```

Within instruction shape, empty data returns `InvalidInstructionLength`; a
present first byte outside `0..2` returns `InvalidInstructionTag` regardless of
remaining length; a known tag with the wrong total length returns
`InvalidInstructionLength`; only then are integer fields decoded and zero
base/limit values rejected as `ZeroAmount`.

Tests asserting one error isolate that condition so an earlier invalidity
cannot mask it.

### 5.4 Replay semantics

The 25-byte swap ABI intentionally contains no order nonce or expected-state
field. Solana prevents the same signed transaction from landing twice, but the
same HAKKY instruction bytes in a newly signed transaction are a new
trader-authorized order and may execute if current state, balances, slippage,
and deadline still permit it.

HAKKY clients never automatically retry an unknown outcome. They reconcile the
original signature and finalized state, then require a fresh quote, preview,
confirmation, and signature for any new transaction. Replay tests prove
deduplication or safe invariant-preserving second execution; they do not
expect a nonexistent HAKKY replay error.

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
B_after <= TOTAL
B_after * R_after >= B * R
B_after * R_after >= L * Q
```

The program processes the exact user input transfer, exact vault-authorized
output transfer, state update, and postcondition reads atomically. A failed CPI
or postcondition rolls back the complete swap.

The complete accepted pool domain is `0 < B <= TOTAL` and `0 < R <= u64::MAX`.
With that bound, every formula and the largest intermediate multiplication fit
inside `u128`; nevertheless every add, subtract, multiply, ceiling adjustment,
division, and `u64` conversion is checked. In particular, both `4*S` and
`3*sold` in the curve denominator use `checked_mul`.

### 9.3 Meaning of permanent liquidity

The approved public claim is:

> Exactly 2,000,000 HAKKY and 24 SOL became the pool's initial reserves, with
> no LP token, withdrawal right, administrator, or fee claimant.

Legitimate swaps change reserve balances, so public material must not promise
that exactly two million HAKKY remains in the vault forever. The constant-product
math prevents a valid swap from emptying either accounted reserve.

### 9.4 Frozen arithmetic boundaries

Required cross-language vectors include:

```text
C(0)                 = 0
C(1,333)             = 0
C(1,334)             = 1
C(2,000,000,000,000) = 1,846,153,846
C(4,000,000,000,000) = 4,800,000,000
C(6,000,000,000,000) = 10,285,714,285
C(S-1)               = 23,999,999,999
C(S)                 = 24,000,000,000
```

At the initial pool:

```text
buy base_out=1:
  effective_quote=1
  gross_quote=2
  B_after=1,999,999,999,999
  R_after=24,000,000,002
  k_after=48,000,000,003,975,999,999,998

sell gross_base=85:
  effective_base=84
  quote_out=1
  B_after=2,000,000,000,085
  R_after=23,999,999,999
  k_after=48,000,000,000,039,999,999,915
```

Pool-fee boundaries are:

```text
gross:       1   399  400  401  799  800
fee:         1     1    1    2    2    2
effective:   0   398  399  399  797  798
```

For an initial-pool exact-out buy, `base_out=1,999,999,997,391` has
`gross_quote=18,443,963,468,419,611,698` and fits `u64`;
`base_out=1,999,999,997,392` computes
`18,451,035,540,310,899,950` and must return `ArithmeticOverflow` rather than
truncate.

## 10. Donations, surplus, and conservation

Unsolicited HAKKY, WSOL, or lamport transfers do not change pricing.

The program stores accounted reserves and requires:

```text
actual HAKKY vault amount >= accounted HAKKY reserve
actual WSOL vault amount  >= accounted WSOL reserve
```

“Actual WSOL vault amount” means the classic SPL token-account `amount` field,
not the token account's raw lamports. Direct lamport transfers do not update
that amount; external `SyncNative` can create token surplus, but neither action
changes accounted reserves or pricing.

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

Settlement validates and quotes completely before the first CPI, snapshots
both token-account amounts, executes exact input then exact output, writes the
new state, reloads both token accounts, and checks deltas plus
`actual >= accounted`. Any borrow, CPI, reload, delta, or invariant failure
rolls the entire instruction back.

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

Exactly one tracked public release leaf exists:

```text
config/hakky-release-v1.json
```

It contains the lane-independent schema version plus network, program ID,
initializer, instance commitment, fixed program/mint identities, and metadata
URI, but never the nonce preimage or a secret key. Deterministic generation
produces checked-in Rust and JavaScript views. The program, CLI, site, proof
builders, and release tooling consume those generated views and accept no
environment, command-line, network, or runtime identity override. Any change
to the leaf invalidates every candidate build, reproduction, inspection, cost,
simulation, proof, and approval receipt.

The nonce preimage exists only in the ignored restricted private ceremony
directory until initialization reveals it. Candidate identity generation and
the reviewed tracked public leaf precede every candidate build; build tools
never generate or rewrite identity.

Testing uses three non-interchangeable lanes:

1. **Native.** Pure codecs, PDAs, state, math, account parsing, and processor
   tests may enable a nondefault `test-release-config` feature.
   `#[cfg(all(feature = "test-release-config", target_os = "solana"))]`
   produces a compile error, so fixture identities cannot enter SBF. Native
   receipts are not deployable evidence.
2. **Test SBF.** A temporary ignored clean source copy receives an ordinary
   ephemeral public release leaf, builds without the test feature, and writes
   only below `artifacts/test-sbf/`. Its public nonce and receipt are
   permanently labeled `test-sbf` and qualify only for deterministic
   CI/ProgramTest lifecycle coverage.
3. **Candidate SBF.** The tracked public leaf builds the sole deployable
   candidate without test features. Before the nonce's first external
   transmission, candidate lifecycle execution is restricted and offline.
   Both native-version and separately packaged current-runtime ProgramTest
   load the exact `.so`; the current-runtime package shares no Rust public
   types with the program.

Receipts cannot cross lanes. A repository gate rejects every native/test-SBF
program ID, initializer, commitment, PDA, configuration hash, binary hash, and
artifact path from candidate build records, proofs, site data, metadata, cost
ledgers, deployment manifests, audits, and operator handoff.

Two builds from separate clean directories must be byte-identical. A third
independent reproduction must match before mainnet approval. Build logs,
stdout/stderr hashes, tool versions, UTC times, and artifact hashes are
machine-recorded. Each local build also binds the canonical tracked
`config/local-build-operator-v1.json` hash plus organization/operator IDs.
These identify the local controller for exclusion; they do not claim the two
directories are independently operated. The third-party reproduction's signed
organization and operator must differ from every local build record.

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

`ok`, `verified`, `ready`, named checks, audit-complete status, and
independence status are evaluator outputs only. Raw evaluator input rejects
decisive booleans for derivable facts. Evaluators consume bounded raw bytes,
RPC observations, tool outputs, and immutable report hashes, then recompute
hashes, PDAs, authorities, math, chronology, and bindings. One evaluator never
accepts another evaluator's `ok: true` as evidence. Locally authored JSON
cannot make an independent audit or reproduction complete.

Independent evidence uses one authenticated `v1` contract. The tracked
`config/independent-evidence-authorities-v1.json` registry begins with an empty
authority list. Before external review, a separately approved commit binds
each authority ID and organization to exactly one allowed role
(`security-audit`, `economic-review`, or `independent-reproduction`), one HTTPS
source origin, one lowercase 32-byte raw Ed25519 public key, and one engagement
document SHA-256. The entry also freezes the exact engagement HTTPS URL and an
HTTPS evidence-path prefix under the same origin plus the separately approved
whole-second UTC engagement-approval time. Both scope and signed envelope bind
the raw registry SHA-256, so a registry change invalidates all earlier
independent evidence and requires the final rebuild/review cycle.

The only algorithm is Ed25519; raw public keys use fixed SPKI DER prefix
`302a300506032b6570032100`, and detached signatures are exactly 64 bytes
encoded as 128 lowercase hex characters plus LF. The signed message is ASCII
`HAKKY-INDEPENDENT-EVIDENCE-V1\0` followed directly by canonical one-line
UTF-8 JSON plus LF. Its exact closed key order is:

```text
schemaVersion,evidenceClass,authorityId,authorityRegistrySha256,reviewerOrganization,
reviewerIndividual,candidateSha256,sourceCommit,releaseConfigSha256,
scopeSha256,reportBodySha256,engagementSha256,verdict,issuedAtUtc,
conflictDisclosure
```

Retrieval accepts explicit envelope, signature, report-body, and engagement
HTTPS URLs only from the registered origin. Userinfo, query, fragment,
non-default port, redirects, non-200 responses, credentials, dot segments,
percent-encoded path bytes, and origin/path-prefix substitution are rejected.
Envelope/report/engagement bytes are capped at 8 MiB, the source archive at
64 MiB, the build record at 2 MiB, and the executable at 120,000 bytes. The
engagement URL must match exactly. Envelope and
report-body content type is exactly `application/json`; the signature is
`text/plain`; an engagement is either exactly `application/json` or exactly
`application/pdf`.
`issuedAtUtc` is canonical whole-second UTC (`YYYY-MM-DDTHH:mm:ssZ`), not in
the future, and not before the candidate build or engagement approval.
Evaluators verify raw bytes, signature, role, identity, engagement, scope,
candidate/source/config/body hashes, chronology, and distinct-authority
requirements; `verdict:"pass"` is necessary but never sufficient.

The signed `scopeSha256` is recomputed from canonical one-line JSON plus LF
whose exact key order is
`schemaVersion,evidenceClass,authorityRegistrySha256,candidateSha256,`
`sourceCommit,sourceArchiveSha256,cargoLockSha256,releaseConfigSha256,`
`designSpecSha256,curveVectorSha256,buildRecordSha256,executableSha256,`
`executableLength`. The scope generator derives every field from the raw
registry, candidate, canonical uncompressed `git archive --format=tar HEAD`,
Cargo.lock, release config, design spec, vector JSON, and build record. The
evaluator revalidates those same raw bytes. Role bodies are closed:

- security:
  schema `hakky-security-audit-body-v1` and keys
  `schemaVersion,evidenceClass,scopeSha256,methodology,reviewedComponents,findings`;
- economics:
  schema `hakky-economic-review-body-v1` and keys
  `schemaVersion,evidenceClass,scopeSha256,methodology,curveFormula,`
  `poolBuyFormula,poolSellFormula,feeNumerator,feeDenominator,vectorSha256,`
  `checkedCaseCount,findings`;
- reproduction:
  schema `hakky-independent-reproduction-body-v1` and keys
  `schemaVersion,evidenceClass,scopeSha256,builderOrganization,builderOperator,`
  `sourceArchiveSha256,cargoLockSha256,releaseConfigSha256,containerDigest,`
  `commandSha256,buildRecordSha256,executableSha256,executableLength,`
  `stdoutSha256,stderrSha256`.

A finding's exact keys are
`id,severity,status,title,affectedComponent,evidence,rationale,resolutionCommit`.
Critical/high findings must be resolved against scoped source; an accepted
lower finding requires rationale. Economics must bind the exact formulas, fee,
detached vector digest, and at least 10,000 generated cases. Reproduction must
include fetched raw source-archive, build-record, and `.so` bytes; the evaluator
byte-compares the archive with the scoped local archive, validates the record,
and compares the executable bytes to the candidate while enforcing an operator
and organization distinct from every local build record.

The retrieval receipt's exact key order is
`schemaVersion,authorityId,evidenceClass,retrievedAtUtc,sourceOrigin,`
`engagementUrl,envelopeUrl,signatureUrl,reportBodyUrl,sourceArchiveUrl,`
`buildRecordUrl,artifactUrl,httpStatus,contentType,engagementSha256,`
`envelopeSha256,signatureSha256,reportBodySha256,sourceArchiveSha256,`
`buildRecordSha256,artifactSha256`. Source-archive/build-record/artifact fields
are null for reviews and required for reproduction. The evaluator always
recomputes them from sibling raw files.
The authority, signed-envelope, scope, and retrieval schema versions are
`hakky-independent-authorities-v1`, `hakky-independent-report-v1`,
`hakky-independent-scope-v1`, and `hakky-independent-retrieval-v1`.
Git commits are exactly 40 lowercase hex characters; every SHA-256 is exactly
64 lowercase hex characters; lengths/counts are canonical unsigned decimal
strings.

No JSON artifact claims to hash its own complete byte stream. An exact artifact
hash is either a detached `.sha256` sidecar over the exact UTF-8,
LF-terminated file or an explicitly named canonical subobject hash that
excludes the hash field. `curve-pool-v1.json` uses a detached sidecar.

## 14. Security, math, and audit gates

Implementation is test-driven. Required evidence includes:

- unit tests for tags, exact data lengths, nonce commitment, PDA derivation,
  account order, privileges, constants, and every absent capability;
- independent BigInt differential model for every curve and pool quote;
- exhaustive boundary tests at `0`, `1`, maximum-minus-one, maximum, and
  overflow-adjacent values;
- property tests for curve monotonicity, raw cumulative-function telescoping,
  exact endpoints, reserve conservation, one-way transition, pool reserve
  floors, and nondecreasing product; generated triples satisfy `a < b < c`,
  and quote functions are never unwrapped for zero-quote intervals;
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
- deterministic test-SBF and actual candidate-SBF ProgramTest lifecycles using
  exact built binaries from uninitialized PDAs through curve completion and
  pool swaps;
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
2. commit the one public devnet release leaf containing the program ID,
   initializer, and nonce commitment but not the nonce;
3. obtain only free devnet SOL;
4. build the exact candidate twice from that reviewed leaf;
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
   safe second-invocation/replay, and failure-recovery cases;
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

1. finish implementation, devnet rehearsal, browser QA, proof schemas,
   operator handoff, and the separately approved independent-authority
   registry;
2. freeze the verified image CID and exact served metadata bytes;
3. generate the private program-ID signer and instance nonce, then compile the
   program ID and domain-separated nonce commitment;
4. freeze the clean reviewed source commit, toolchain, initializer, metadata
   URI/image CID, instance commitment, and disclosed creator-controlled
   address set; derive every PDA privately;
5. build twice and prove binary length at or below 120,000 bytes;
6. generate authenticated scopes and complete the third independent
   reproduction, independent Solana security review, and independent
   economic/math review against those exact source/config/spec/vector/binary
   hashes;
7. resolve every required finding; any source, lock, registry, config, spec,
   vector, metadata, or binary change restarts steps 4-6 until final builds,
   reproduction, and both reviews bind the same bytes;
8. generate a complete bounded cost and failure/recovery manifest at current
   finalized rent and fee values;
9. prove every reachable canonical-funder prefix stays within one SOL;
10. privately preflight all unrevealed PDA prefund states;
11. generate, decode, locally simulate, and separately approve the exact
   deployment transaction set and maximum debit;
12. deploy once with no automatic retry;
13. reconcile exact ProgramData bytes at finalized commitment;
14. generate, decode, simulate, and separately approve the exact permanent
    finalization transaction and maximum debit;
15. finalize once and prove null authority at finalized commitment;
16. generate, decode, execute against the exact candidate SBF locally and
    offline, and separately approve the exact initialization transaction and
    maximum debit;
17. initialize once and reconcile finalized supply, authorities, metadata,
    state, vaults, creator balances, cost, and complete history;
18. publish only the curve-live claims supported by canonical proofs;
19. at eventual terminal transition, generate and publish the pool proof from
    finalized state without an operator transaction.

No mint initialization may be signed before finalized immutable-program proof,
metadata readback, exact initialization bytes, full simulation, and cost ledger
all pass.

The candidate nonce remains private until the first separately approved
initialization submission. Before that submission, transaction construction,
decoding, and candidate-SBF execution are local and offline; no public RPC
simulation, remote log, proof, CLI argument, browser surface, or shared
unsigned transaction may contain the nonce. At first external transmission the
nonce is considered permanently disclosed whether the transaction succeeds,
fails, expires, or has an unknown outcome. Proof publication waits for
finalized reconciliation.

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
- a native/test-SBF identity, configuration hash, path, or binary hash enters
  a candidate, proof, site, metadata, cost, deployment, audit, or handoff
  artifact;
- the deployable/native-test crate graph mixes incompatible Solana public
  `Pubkey`, `AccountInfo`, processor, instruction, or error types;
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
- pool state has `sold != S`, `accounted HAKKY > TOTAL`, or checked
  `accounted HAKKY * accounted WSOL < L * Q`;
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
- Solana on-chain compilation target (`target_os = "solana"`):
  <https://docs.rs/solana-program/latest/solana_program/#on-chain-vs-off-chain-compilation-targets>
- Solana ProgramTest exact-SBF selection:
  <https://docs.rs/solana-program-test/4.1.2/src/solana_program_test/lib.rs.html>
- Classic SPL Token program and token basics:
  <https://solana.com/docs/tokens/basics>
- Metaplex Token Metadata 5.1.1 dependency contract:
  <https://docs.rs/crate/mpl-token-metadata/5.1.1>
- Token CPI:
  <https://solana.com/docs/tokens/advanced/cpi>
- Verified-build meaning and limitations:
  <https://solana.com/docs/programs/verified-builds>
- Metaplex Token Metadata source:
  <https://github.com/metaplex-foundation/mpl-token-metadata>
- Rejected LaunchLab source-availability evidence:
  <https://github.com/raydium-io/raydium-docs-v1/blob/104dff2efdc72a7897d757083c3f61a68aef9a47/reference/program-addresses.mdx>
