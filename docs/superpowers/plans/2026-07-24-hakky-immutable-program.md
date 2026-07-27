# HAKKY Immutable Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact native Solana program whose exact permissionless
HAKKY bonding curve atomically becomes its permanent no-LP constant-product
pool.

**Architecture:** A single crate owns fixed codecs, checked integer math,
closed account validation, fixed classic-SPL/Metaplex CPIs, and a 384-byte
market state. One tracked public release leaf deterministically renders Rust
and JavaScript identity views; no nonce preimage, secret, or runtime override
enters the binary. Native, deterministic test-SBF, and actual candidate-SBF
lanes are disjoint, and a separately packaged current-runtime harness loads
only exact `.so` bytes.

**Tech Stack:** Rust 1.95.0 for host checks, pinned verifiable SBF image
`solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68`,
native container
`rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3`,
`solana-program` 2.3.0, `spl-token-interface` 1.0.0, `spl-token` 8.0.0,
`mpl-token-metadata` 5.1.1, native `solana-program-test` 2.3.13,
native `solana-sdk` 2.3.1, isolated current-runtime
`solana-program-test` 4.1.2, Tokio 1.53.1, proptest 1.11.0,
cargo-fuzz 0.13.2, Node.js ESM for ceremony and evidence extraction.

**Approval checkpoint:** The repository's existing program manifest remains on
the pre-amendment mixed dependency graph until this written contract is
reviewed. Task 2 performs the approved alignment; no implementation file is
changed during the specification-review gate.

## Global Constraints

- The normative design is
  `docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md`.
- All economic constants and program identities are compile-time values.
- The final program exposes one entrypoint and only tags `0`, `1`, and `2`.
- Instruction lengths are exactly `33`, `25`, and `25` bytes.
- `MarketStateV1` uses the exact Section 4.3 offset table, manual
  little-endian encoding, phase bytes `0|1`, and 112 zero reserved bytes.
- Total supply is `10,000,000,000,000`; curve maximum is
  `8,000,000,000,000`; pool seed is `2,000,000,000,000`.
- Terminal WSOL reserve is `24,000,000,000`.
- Curve math is `floor(Q*s/(4*S-3*s))`.
- Pool fee constants are `D=1,000,000`, `F=997,500`.
- Every multiply/divide is checked `u128`; every persisted/output amount fits
  `u64`.
- Pool state always has `sold=S`, `0<base<=TOTAL`, `quote>0`, and checked
  `base*quote >= L*Q`.
- `HakkyErrorV1` uses the exact append-only numeric registry in design
  Section 5.3.
- On-chain PDA derivation is fallible and canonical; no caller-provided bump,
  unchecked PDA, `unwrap`, or `expect` is allowed.
- The only CPI program IDs are System, classic SPL Token, and pinned Metaplex
  Token Metadata.
- Initialization requires its own loader-v3 ProgramData authority to be
  `None`.
- No admin, pause, rescue, deposit, withdrawal, LP, fee claim, migration,
  close, reallocation, arbitrary transfer, fallback, or unknown tag exists.
- Program binary is a hard stop above 120,000 bytes.
- Candidate identity is committed before candidate build; build tools never
  create or rewrite identity.
- Native, test-SBF, and candidate-SBF receipts never satisfy one another's
  gates, and test identities are forbidden from candidate/public artifacts.
- Native integration tests that require the hermetic release identity run with
  `--features test-release-config`; pure math tests run under default features,
  and every test-SBF/candidate-SBF build runs without that feature.
- No mainnet signer, transaction, spend, deploy, finalization, initialization,
  or publication is authorized by this plan.

---

### Task 1: Bootstrap the pinned workspace and devnet release configuration

**Execution status:** complete and independently reviewed at `e7f0e1a`. Do not
rerun its original identity generator. Task 2 migrates the existing public
values into the sole tracked release leaf, aligns dependencies, and makes all
future identity generation write the leaf plus both generated views before any
candidate build.

**Files:**
- Create: `Cargo.toml`
- Create: `rust-toolchain.toml`
- Create: `.cargo/config.toml`
- Create: `programs/hakky-market/Cargo.toml`
- Create: `programs/hakky-market/src/lib.rs`
- Create: `programs/hakky-market/src/release_config.rs`
- Create: `src/devnet-release-config.mjs`
- Create: `scripts/generate-devnet-release-config.mjs`
- Create: `test/release-config.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: no prior program interface.
- Produces:
  `renderRustReleaseConfig({ programId, initializer, instanceCommitment })`
  and a crate exporting `process_instruction`.

- [ ] **Step 1: Write the failing release-config tests**

```javascript
// test/release-config.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { Keypair } from "@solana/web3.js";
import {
  INSTANCE_DOMAIN,
  instanceCommitment,
  renderRustReleaseConfig,
} from "../src/devnet-release-config.mjs";

const program = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, i) => i));
const initializer = Keypair.fromSeed(
  Uint8Array.from({ length: 32 }, (_, i) => 255 - i),
);
const nonce = Uint8Array.from({ length: 32 }, () => 7);

test("renders only public compile-time release values", () => {
  const commitment = instanceCommitment(nonce);
  const rendered = renderRustReleaseConfig({
    programId: program.publicKey,
    initializer: initializer.publicKey,
    instanceCommitment: commitment,
  });

  assert.equal(INSTANCE_DOMAIN, "HAKKY_INSTANCE_V1");
  assert.match(rendered, /EXPECTED_PROGRAM_ID_BYTES/);
  assert.match(rendered, /INITIALIZER_BYTES/);
  assert.match(rendered, /INSTANCE_COMMITMENT/);
  assert.match(rendered, /https:\/\/hakky\.xyz\/metadata\/hakky-v1\.json/);
  assert.doesNotMatch(rendered, /\[101,88,|secretKey|instance_nonce/i);
});

test("domain-separated commitment is deterministic and nonce-sensitive", () => {
  assert.deepEqual(instanceCommitment(nonce), instanceCommitment(nonce));
  const changed = Uint8Array.from(nonce);
  changed[31] = 8;
  assert.notDeepEqual(instanceCommitment(nonce), instanceCommitment(changed));
});
```

- [ ] **Step 2: Run RED and verify the missing module failure**

Run:

```powershell
rtk node --test test/release-config.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for
`src/devnet-release-config.mjs`.

- [ ] **Step 3: Add exact workspace and crate manifests**

```toml
# Cargo.toml
[workspace]
members = ["programs/hakky-market"]
resolver = "2"

[profile.release]
codegen-units = 1
lto = "fat"
opt-level = "z"
overflow-checks = true
panic = "abort"
strip = true
```

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.95.0"
components = ["clippy", "rustfmt"]
profile = "minimal"
```

```toml
# .cargo/config.toml
[net]
retry = 2

[term]
color = "always"
```

```toml
# programs/hakky-market/Cargo.toml
[package]
name = "hakky-market"
version = "0.1.0"
edition = "2021"
publish = false

[lib]
crate-type = ["cdylib", "lib"]
name = "hakky_market"

[features]
default = []
no-entrypoint = []
test-release-config = []

[dependencies]
mpl-token-metadata = "=5.1.1"
solana-program = "=2.3.0"
spl-token-interface = "=1.0.0"

[dev-dependencies]
proptest = "=1.11.0"
solana-program-test = "=2.3.13"
solana-sdk = "=2.3.1"
spl-token = { version = "=8.0.0", features = ["no-entrypoint"] }
tokio = { version = "=1.53.1", features = ["macros", "rt-multi-thread"] }
```

```rust
// programs/hakky-market/src/lib.rs
#![forbid(unsafe_code)]

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
};

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    Err(solana_program::program_error::ProgramError::InvalidInstructionData)
}
```

- [ ] **Step 4: Implement the deterministic public-config renderer**

```javascript
// src/devnet-release-config.mjs
import { createHash } from "node:crypto";

export const INSTANCE_DOMAIN = "HAKKY_INSTANCE_V1";
export const METADATA_URI = "https://hakky.xyz/metadata/hakky-v1.json";

export function instanceCommitment(instanceNonce) {
  if (!(instanceNonce instanceof Uint8Array) || instanceNonce.length !== 32) {
    throw new TypeError("instance nonce must be exactly 32 bytes");
  }
  return createHash("sha256")
    .update(Buffer.from(INSTANCE_DOMAIN, "ascii"))
    .update(instanceNonce)
    .digest();
}

function rustArray(bytes) {
  return `[${[...bytes].join(", ")}]`;
}

export function renderRustReleaseConfig({
  programId,
  initializer,
  instanceCommitment: commitment,
}) {
  if (commitment.length !== 32) {
    throw new TypeError("instance commitment must be exactly 32 bytes");
  }
  return `use solana_program::pubkey::Pubkey;

pub const EXPECTED_PROGRAM_ID_BYTES: [u8; 32] = ${rustArray(programId.toBytes())};
pub const INITIALIZER_BYTES: [u8; 32] = ${rustArray(initializer.toBytes())};
pub const INSTANCE_COMMITMENT: [u8; 32] = ${rustArray(commitment)};
pub const METADATA_URI: &str = "${METADATA_URI}";

pub const EXPECTED_PROGRAM_ID: Pubkey =
    Pubkey::new_from_array(EXPECTED_PROGRAM_ID_BYTES);
pub const INITIALIZER: Pubkey = Pubkey::new_from_array(INITIALIZER_BYTES);
`;
}
```

The CLI generates fresh program and initializer keypairs plus a 32-byte nonce,
writes secrets only below ignored `artifacts/devnet/private/` with restrictive
permissions, writes public addresses/hashes to
`artifacts/devnet/public-release-config.json`, and writes the rendered public
Rust constants to `programs/hakky-market/src/release_config.rs`. Its stdout is
only canonical public JSON.

- [ ] **Step 5: Run GREEN, generate the new devnet identities, and prove no secret is tracked**

Run:

```powershell
rtk node --test test/release-config.test.mjs
rtk node scripts/generate-devnet-release-config.mjs
rtk git status --short
rtk git check-ignore artifacts/devnet/private/program-keypair.json
rtk git check-ignore artifacts/devnet/private/initializer-keypair.json
rtk git check-ignore artifacts/devnet/private/instance-nonce.hex
```

Expected: 2 tests pass; stdout contains only `programId`, `initializer`,
`instanceCommitment`, and paths; all three private files are ignored; only
public source/config files appear in Git status.

- [ ] **Step 6: Resolve the exact dependency graph in the pinned Rust image**

Run:

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo generate-lockfile
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --workspace --locked
```

Expected: Cargo resolves the exact pinned versions into `Cargo.lock`; the
stub crate compiles; the test command succeeds. If the exact pins cannot
resolve together, stop this task and report the resolver output without
changing a version.

- [ ] **Step 7: Commit**

```powershell
rtk git add .gitignore Cargo.toml Cargo.lock rust-toolchain.toml .cargo/config.toml programs/hakky-market/Cargo.toml programs/hakky-market/src/lib.rs programs/hakky-market/src/release_config.rs src/devnet-release-config.mjs scripts/generate-devnet-release-config.mjs test/release-config.test.mjs
rtk git commit -m "program: bootstrap immutable market crate"
```

---

### Task 2: Add exact constants, instruction codec, PDAs, and state codec

**Files:**
- Create: `config/hakky-release-v1.json`
- Create: `src/hakky-release-config.generated.mjs`
- Create: `programs/hakky-market/src/constants.rs`
- Create: `programs/hakky-market/src/error.rs`
- Create: `programs/hakky-market/src/instruction.rs`
- Create: `programs/hakky-market/src/pda.rs`
- Create: `programs/hakky-market/src/state.rs`
- Create: `programs/hakky-market/src/test_release_config.rs`
- Create: `programs/hakky-market/tests/instruction_state.rs`
- Modify: `programs/hakky-market/Cargo.toml`
- Modify: `src/devnet-release-config.mjs`
- Modify: `scripts/generate-devnet-release-config.mjs`
- Modify: `test/release-config.test.mjs`
- Modify: `programs/hakky-market/src/lib.rs`
- Modify: `Cargo.lock`

**Interfaces:**
- Consumes: the one tracked `config/hakky-release-v1.json`.
- Produces:
  deterministic Rust/JavaScript release views,
  `HakkyInstructionV1::decode(&[u8])`,
  `MarketPdasV1::derive_canonical(nonce)`,
  `MarketStateV1::{decode, encode, validate}`.

- [ ] **Step 1: Write failing dependency/config/codec tests**

```rust
// programs/hakky-market/tests/instruction_state.rs
use hakky_market::{
    constants::*,
    error::HakkyErrorV1,
    instruction::HakkyInstructionV1,
    pda::MarketPdasV1,
    state::{MarketStateV1, MARKET_STATE_LEN, RESERVED_RANGE},
};

#[test]
fn exact_constants_and_instruction_lengths_are_closed() {
    assert_eq!(TOTAL_SUPPLY, 10_000_000_000_000);
    assert_eq!(CURVE_MAX, 8_000_000_000_000);
    assert_eq!(POOL_SEED, 2_000_000_000_000);
    assert_eq!(TERMINAL_QUOTE, 24_000_000_000);
    assert_eq!(POOL_FEE_DENOMINATOR, 1_000_000);
    assert_eq!(POOL_EFFECTIVE_NUMERATOR, 997_500);

    let init = [0_u8; 33];
    assert!(matches!(
        HakkyInstructionV1::decode(&init).unwrap(),
        HakkyInstructionV1::Initialize { .. }
    ));
    assert_eq!(
        HakkyInstructionV1::decode(&[0_u8; 32]),
        Err(HakkyErrorV1::InvalidInstructionLength.into())
    );
    assert_eq!(
        HakkyInstructionV1::decode(&[0_u8; 34]),
        Err(HakkyErrorV1::InvalidInstructionLength.into())
    );
    assert_eq!(
        HakkyInstructionV1::decode(&[3_u8]),
        Err(HakkyErrorV1::InvalidInstructionTag.into())
    );
}

#[test]
fn error_codes_and_state_offsets_are_frozen() {
    let actual = HakkyErrorV1::ALL.map(|error| error as u32);
    let expected = core::array::from_fn(|index| 0x484b0001 + index as u32);
    assert_eq!(actual, expected);
    assert_eq!(MARKET_STATE_LEN, 384);
    assert_eq!(RESERVED_RANGE, 272..384);
    let state = MarketStateV1::initial_fixture();
    let encoded = state.encode();
    assert_eq!(encoded.len(), MARKET_STATE_LEN);
    assert_eq!(&encoded[0..8], b"HAKKYV1\0");
    assert_eq!(encoded[8], 1);
    assert_eq!(encoded[9], 0);
    assert_eq!(MarketStateV1::decode(&encoded).unwrap(), state);

    let mut corrupted = encoded;
    corrupted[MARKET_STATE_LEN - 1] = 1;
    assert_eq!(
        MarketStateV1::decode(&corrupted),
        Err(HakkyErrorV1::InvalidMarketState.into())
    );
}

#[test]
fn approved_fixture_pdas_are_canonical() {
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    assert_eq!(pdas.mint.to_string(),
        "CmoL1cvAKrxod4AtmY8MXxPKQHTdddu7G8zvFpco7RLN");
    assert_eq!(pdas.bumps(), [253, 254, 254, 255, 254, 253]);
}
```

Extend `test/release-config.test.mjs` so it asserts:

- the tracked JSON is the sole identity input;
- Rust and generated JavaScript match every identity byte;
- generation accepts no identity override;
- no nonce preimage is present;
- the approved hermetic program ID, initializer, commitment, all six PDAs,
  and their hashes are absent from candidate config and generated views; and
- the exact `target_os="solana"` compile-error guard is present. Task 5 runs
  the first real negative SBF build with that feature and requires failure.

Add an overlapping-invalidity table that freezes instruction-shape precedence:
empty data; unknown tag with wrong length; known tag with wrong length and zero
fields; and exact-length zero amount/limit. Assert the exact custom error code
for every row. Task 4 extends the same table across account count, privileges,
aliases, fixed identities, state, phase/token semantics, deadline, arithmetic,
pre-CPI reserves, CPI propagation, and postconditions so no reordering can
silently change the public error contract.

- [ ] **Step 2: Run RED and record the expected failures**

```powershell
rtk node --test test/release-config.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test instruction_state
```

Expected: FAIL because the tracked leaf/generated JavaScript and Rust modules
do not exist and the current dependency graph still mixes 2.x/3.x/4.x public
Solana types.

- [ ] **Step 3: Align the native public types and create the sole release leaf**

Set the crate pins exactly to:

```toml
[features]
default = []
no-entrypoint = []
test-release-config = []

[dependencies]
mpl-token-metadata = "=5.1.1"
solana-program = "=2.3.0"
spl-token-interface = "=1.0.0"

[dev-dependencies]
proptest = "=1.11.0"
solana-program-test = "=2.3.13"
solana-sdk = "=2.3.1"
spl-token = { version = "=8.0.0", features = ["no-entrypoint"] }
tokio = { version = "=1.53.1", features = ["macros", "rt-multi-thread"] }
```

Migrate the existing public devnet values into
`config/hakky-release-v1.json` without opening or rewriting the ignored nonce:

```json
{"schemaVersion":"hakky-release-config-v1","network":"devnet","programId":"Bp5ULfE8tLo7X24kHxWhUmRmWWzD9HdpNa7wxipngfxc","initializer":"66T1nXejFJ4uKhFQv6y9qagfxgpBfZ4jqvWK2gAhPCo8","instanceCommitment":"6baeb27b178da81aa7d3898507e62cfbd95c1bedafa845f624dd802fdf20143c","systemProgram":"11111111111111111111111111111111","loaderProgram":"BPFLoaderUpgradeab1e11111111111111111111111","tokenProgram":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","wsolMint":"So11111111111111111111111111111111111111112","metadataProgram":"metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s","rentSysvar":"SysvarRent111111111111111111111111111111111","metadataUri":"https://hakky.xyz/metadata/hakky-v1.json"}
```

Render both generated views from those exact bytes. Build commands read but
never rewrite this leaf.

- [ ] **Step 4: Implement the exact error and instruction codecs**

```rust
#[repr(u32)]
pub enum HakkyErrorV1 {
    WrongProgramId = 0x484b0001,
    InvalidInstructionTag = 0x484b0002,
    InvalidInstructionLength = 0x484b0003,
    ZeroAmount = 0x484b0004,
    InvalidInstanceNonce = 0x484b0005,
    InvalidAccountCount = 0x484b0006,
    InvalidAccountPrivileges = 0x484b0007,
    AccountAlias = 0x484b0008,
    InvalidFixedProgram = 0x484b0009,
    InvalidPda = 0x484b000a,
    InvalidAccountOwner = 0x484b000b,
    InvalidAccountData = 0x484b000c,
    InvalidTokenAccount = 0x484b000d,
    InvalidMarketState = 0x484b000e,
    InvalidPhase = 0x484b000f,
    InvalidInitializer = 0x484b0010,
    ProgramNotImmutable = 0x484b0011,
    AlreadyInitialized = 0x484b0012,
    InvalidPrefund = 0x484b0013,
    CurveDomain = 0x484b0014,
    InsufficientCurveLiquidity = 0x484b0015,
    ArithmeticOverflow = 0x484b0016,
    ZeroQuote = 0x484b0017,
    SlippageExceeded = 0x484b0018,
    DeadlineExpired = 0x484b0019,
    ReserveInvariant = 0x484b001a,
    ActualBelowAccounted = 0x484b001b,
    VaultDeltaMismatch = 0x484b001c,
    PostconditionFailed = 0x484b001d,
    InvalidMetadata = 0x484b001e,
    InvalidLoaderState = 0x484b001f,
}

pub enum HakkyInstructionV1 {
    Initialize { instance_nonce: [u8; 32] },
    BuyExactHakky {
        base_amount: u64,
        max_quote_in: u64,
        deadline_slot: u64,
    },
    SellExactHakky {
        base_amount: u64,
        min_quote_out: u64,
        deadline_slot: u64,
    },
}
```

`decode` matches `(tag, data.len())` only against `(0,33)`, `(1,25)`, and
`(2,25)`, uses exact little-endian slices, rejects zero base amounts for swap
tags and zero quote limits, and has no wildcard success branch. Golden tests
assert all three exact hex strings from design Section 5.

- [ ] **Step 5: Implement checked canonical PDAs**

```rust
pub const INSTANCE_DOMAIN: &[u8] = b"HAKKY_INSTANCE_V1";

pub fn validate_instance_nonce(nonce: &[u8; 32]) -> Result<(), ProgramError> {
    let digest = solana_program::hash::hashv(&[INSTANCE_DOMAIN, nonce]);
    if digest.to_bytes() != INSTANCE_COMMITMENT {
        return Err(HakkyErrorV1::InvalidInstanceNonce.into());
    }
    Ok(())
}
```

`derive_canonical` first verifies the compiled program ID and commitment, then
uses only fallible `try_find_program_address`. Signer reconstruction uses
`create_program_address` with the stored bump and must equal the canonical
address. It accepts no caller bump or account address, contains no
`unwrap`/`expect`, and proves all six PDAs pairwise distinct.

- [ ] **Step 6: Implement the manual 384-byte state codec**

Copy the exact offset table from design Section 4.3 as named constants and add
compile-time end/length assertions. Do not use `repr(C)`, transmute, bytemuck,
implicit padding, or host-endian encoding. `validate` recomputes commitment,
canonical PDAs/bumps, stored identities, and:

```text
curve: sold<=S, base=TOTAL-sold, quote=C(sold)
pool:  sold=S, 0<base<=TOTAL, quote>0, checked base*quote>=L*Q
```

The native fixture module is selected only by the nondefault feature and
contains the approved
`FAe4sisG95oZ42w7buUn5qEE4TAnfTTFPiguZUHmhiF` fixture. Add:

```rust
#[cfg(all(feature = "test-release-config", target_os = "solana"))]
compile_error!("test release identities must never compile to SBF");
```

- [ ] **Step 7: Run GREEN, type-family proof, and clippy**

```powershell
rtk node --test test/release-config.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test instruction_state
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo tree -p hakky-market --locked -d
```

Expected: config and focused tests pass; clippy emits no warning; the program
package has one compatible 2.x public `Pubkey`/`AccountInfo`/processor family.
If the exact pins fail a clean compile, stop and amend the written architecture
instead of introducing a type bridge.

- [ ] **Step 8: Commit**

```powershell
rtk git add config/hakky-release-v1.json src/devnet-release-config.mjs src/hakky-release-config.generated.mjs scripts/generate-devnet-release-config.mjs test/release-config.test.mjs programs/hakky-market Cargo.lock
rtk git commit -m "program: freeze release identity and wire contract"
```

---

### Task 3: Implement independently testable curve and pool arithmetic

**Files:**
- Create: `programs/hakky-market/src/math.rs`
- Create: `programs/hakky-market/tests/curve_pool_math.rs`
- Create: `programs/hakky-market/test-vectors/curve-pool-v1.json`
- Create: `programs/hakky-market/test-vectors/curve-pool-v1.json.sha256`
- Create: `scripts/render-curve-pool-vectors.mjs`
- Create: `test/curve-pool-vectors.test.mjs`
- Modify: `programs/hakky-market/src/lib.rs`

**Interfaces:**
- Consumes: exact constants from Task 2.
- Produces:
  `curve_reserve`,
  `quote_curve_buy_exact_out`,
  `quote_curve_sell_exact_in`,
  `quote_pool_buy_exact_out`,
  `quote_pool_sell_exact_in`, and `ceil_div`.

- [ ] **Step 1: Write failing Rust boundary/property and Node vector tests**

```rust
use hakky_market::{constants::*, math::*};
use proptest::prelude::*;

#[test]
fn curve_endpoints_and_transition_price_are_exact() {
    assert_eq!(curve_reserve(0).unwrap(), 0);
    assert_eq!(curve_reserve(CURVE_MAX).unwrap(), TERMINAL_QUOTE);
    assert_eq!(4_u128 * TERMINAL_QUOTE as u128 * POOL_SEED as u128,
               TERMINAL_QUOTE as u128 * CURVE_MAX as u128);
}

proptest! {
    #[test]
    fn curve_differences_telescope(a in 0_u64..(CURVE_MAX - 1)) {
        let b = a + 1 + (CURVE_MAX - a - 1) / 2;
        let c = CURVE_MAX;
        prop_assert!(a < b && b < c);
        prop_assert_eq!(
            curve_reserve(b).unwrap() - curve_reserve(a).unwrap()
                + curve_reserve(c).unwrap() - curve_reserve(b).unwrap(),
            curve_reserve(c).unwrap() - curve_reserve(a).unwrap()
        );
    }
}
```

Add explicit tests for zero deltas, every maximum-minus-one boundary,
overflow-adjacent values, buy `ceil/ceil`, sell `floor/floor`, positive reserve
floors, fee rounding, `a=S-1,d=1`, checked `base*quote>=L*Q`, and
`k_after >= k_before`.

Create `test/curve-pool-vectors.test.mjs` now. It imports the not-yet-created
renderer, requires the frozen generator identity/seed/case count, verifies the
detached sidecar against exact JSON bytes, and checks the independently frozen
endpoint, dust, fee, overflow, and rejection vectors.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/curve-pool-vectors.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --test curve_pool_math
```

Expected: FAIL because `math` and the vector renderer do not exist.

- [ ] **Step 3: Implement the minimal checked math**

```rust
pub fn curve_reserve(sold: u64) -> Result<u64, ProgramError> {
    if sold > CURVE_MAX {
        return Err(HakkyErrorV1::CurveDomain.into());
    }
    let numerator = (TERMINAL_QUOTE as u128)
        .checked_mul(sold as u128)
        .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
    let triple_sold = (sold as u128)
        .checked_mul(3)
        .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
    let denominator = (CURVE_MAX as u128)
        .checked_mul(4)
        .and_then(|x| x.checked_sub(triple_sold))
        .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
    u64::try_from(numerator / denominator)
        .map_err(|_| HakkyErrorV1::ArithmeticOverflow.into())
}
```

Pool buy exact-out uses:

```text
effective_quote = ceil(R*b/(B-b))
gross_quote     = ceil(effective_quote*1,000,000/997,500)
```

Pool sell exact-in uses:

```text
effective_base = floor(b*997,500/1,000,000)
quote_out      = floor(R*effective_base/(B+effective_base))
```

Every quote function rejects a zero result and proves nonzero post-reserves and
nondecreasing product before returning.

- [ ] **Step 4: Add the independent Node BigInt vector generator**

The generator is a spec-owned reference implementation and imports neither
Rust output nor production JavaScript math. Freeze `xoshiro256**`, seed
`48414b4b595f43555256455f504f4f4c`, schema version
`hakky-curve-pool-v1`, case ordering, valid cases, and rejection cases. It
writes canonical one-line JSON plus final LF for endpoints, dust/rounding
boundaries, overflow boundaries, and 10,000 cases. A detached lowercase
hex `.sha256` sidecar hashes those exact JSON bytes; the JSON contains no
self-hash field. Rust and production JavaScript independently verify the
sidecar and recompute every result.

- [ ] **Step 5: Run GREEN**

```powershell
rtk node --test test/curve-pool-vectors.test.mjs
rtk node scripts/render-curve-pool-vectors.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --test curve_pool_math
```

Expected: Node vector tests pass; Rust accepts every independently generated
case; property tests pass.

- [ ] **Step 6: Commit**

```powershell
rtk git add programs/hakky-market/src/math.rs programs/hakky-market/src/lib.rs programs/hakky-market/tests/curve_pool_math.rs programs/hakky-market/test-vectors/curve-pool-v1.json programs/hakky-market/test-vectors/curve-pool-v1.json.sha256 scripts/render-curve-pool-vectors.mjs test/curve-pool-vectors.test.mjs
rtk git commit -m "program: implement curve and pool math"
```

---

### Task 4: Add closed account validation and fixed CPI builders

**Files:**
- Create: `programs/hakky-market/src/accounts.rs`
- Create: `programs/hakky-market/src/loader.rs`
- Create: `programs/hakky-market/src/token.rs`
- Create: `programs/hakky-market/src/metadata.rs`
- Create: `programs/hakky-market/tests/adversarial_accounts.rs`
- Modify: `programs/hakky-market/src/lib.rs`

**Interfaces:**
- Consumes: Task 2 PDAs/state and release constants.
- Produces:
  `InitializeAccountsV1::parse`,
  `SwapAccountsV1::parse`,
  `assert_finalized_self`,
  fixed token CPI helpers, and
  `create_immutable_metadata`.

- [ ] **Step 1: Write failing adversarial account tests**

Create canonical `AccountInfo` fixtures, then mutate one property per case:
omitted, appended, reordered, aliased, signer-promoted, writable-promoted,
wrong owner, wrong mint, wrong System/loader/Token/Metadata program, wrong
ProgramData address, delegated user account, frozen user account, and token
close authority. Assert the exact stable `HakkyErrorV1` code for each mutation.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test adversarial_accounts
```

Expected: FAIL because account parsers do not exist.

- [ ] **Step 3: Implement exact positional parsers**

```rust
pub struct SwapAccountsV1<'a, 'info> {
    pub trader: &'a AccountInfo<'info>,
    pub state: &'a AccountInfo<'info>,
    pub mint: &'a AccountInfo<'info>,
    pub base_vault: &'a AccountInfo<'info>,
    pub quote_vault: &'a AccountInfo<'info>,
    pub vault_authority: &'a AccountInfo<'info>,
    pub trader_base: &'a AccountInfo<'info>,
    pub trader_quote: &'a AccountInfo<'info>,
    pub wsol_mint: &'a AccountInfo<'info>,
    pub token_program: &'a AccountInfo<'info>,
}
```

`parse` requires exactly ten accounts, validates every signer/writable bit,
rejects any duplicate key across positions, and validates every fixed ID and
token-account field before returning. It rederives all six canonical PDAs
internally from the stored nonce and rejects every caller-provided identity or
bump that differs.

- [ ] **Step 4: Implement the raw loader-v3 finalization check**

Require exact 36-byte Program account data and decode it wholly as
loader-v3 `Program { programdata_address }`. Require ProgramData length at
least 45; decode only `[0,45)` as loader metadata and treat `[45..]` as
executable payload, not trailing serialized state. Require pinned loader
ownership, linked address, executable Program, and authority `None`.
Off-chain candidate proof additionally requires total length `45+B` and exact
payload equality with the approved `.so`. Production parsing never trusts
`solana program show` text, and the SBF fixture test proves it supplied these
raw loader accounts rather than relying on `add_program(..., None)`.

- [ ] **Step 5: Implement only fixed CPI helpers**

Token helpers create only `InitializeMint2`, `InitializeAccount3`, `MintTo`,
`SetAuthority(MintTokens,None)`, and `TransferChecked` instructions for the
fixed Token program. Metadata uses
`CreateMetadataAccountV3` with exact name, symbol, URI, zero seller fee,
`is_mutable=false`, no optional fields, mint authority signed by the
vault-authority PDA, and update authority signed by the metadata-sink PDA.
No helper accepts a destination program ID.

- [ ] **Step 6: Run GREEN**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test adversarial_accounts
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
```

Expected: all adversarial mutations fail with their named code and canonical
fixtures pass.

- [ ] **Step 7: Commit**

```powershell
rtk git add programs/hakky-market/src programs/hakky-market/tests/adversarial_accounts.rs
rtk git commit -m "program: validate closed accounts and CPIs"
```

---

### Task 5: Implement atomic one-shot initialization and prefund adoption

**Files:**
- Create: `programs/hakky-market/src/processor.rs`
- Create: `programs/hakky-market/tests/initialization_prefund.rs`
- Create: `programs/hakky-market/tests/support/mod.rs`
- Create: `scripts/build-hakky-test-sbf.mjs`
- Create: `test/test-sbf-lane.test.mjs`
- Modify: `programs/hakky-market/src/lib.rs`

**Interfaces:**
- Consumes: Tasks 2-4.
- Produces:
  `processor::process_initialize` and the tag-dispatch entrypoint.

- [ ] **Step 1: Write failing initialization lifecycle tests**

Run the same fixture first through native ProgramTest 2.3.13 and then through a
deterministic test-SBF loaded with `prefer_bpf(true)`. The test-SBF builder
copies tracked source into an ignored temporary directory, replaces only that
copy's public release leaf with the registered test identity, builds without
`test-release-config`, labels its receipt `lane:"test-sbf"`, and deletes the
source copy after hashing the `.so`. Use classic SPL Token and a strict
metadata test processor that decodes the exact Metaplex instruction bytes and
account metas. Cover:

- finalized loader state succeeds; non-null authority fails;
- initializer mismatch fails;
- wrong nonce fails before account creation;
- prefunds `0`, `1`, `rent-1`, `rent`, `rent+1`, and `2*rent` succeed for
  every allocatable HAKKY PDA and retain excess lamports;
- wrong owner, nonzero data, partial mint/token state, and duplicate init fail;
- exact supply, six decimals, null freeze and final mint authority, vault
  ownership, delegates, close authorities, state, and metadata postconditions;
- forced metadata failure rolls back all account/supply/state changes.

`test/test-sbf-lane.test.mjs` additionally rejects the test program ID,
initializer, commitment, all six PDAs, config hash, `.so` hash, and
`artifacts/test-sbf/` path from every candidate/public artifact family. It
also invokes the pinned SBF builder once with `test-release-config` and
requires the exact compile-error guard to fail the build before any `.so`
appears.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test initialization_prefund
rtk node --test test/test-sbf-lane.test.mjs
```

Expected: FAIL because `process_initialize` and the isolated test-SBF builder
do not exist.

- [ ] **Step 3: Implement the exact dispatch**

```rust
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if program_id != &constants::EXPECTED_PROGRAM_ID {
        return Err(HakkyErrorV1::WrongProgramId.into());
    }
    match HakkyInstructionV1::decode(data)? {
        HakkyInstructionV1::Initialize { instance_nonce } => {
            processor::process_initialize(program_id, accounts, instance_nonce)
        }
        HakkyInstructionV1::BuyExactHakky { .. } => {
            processor::process_buy(program_id, accounts, data)
        }
        HakkyInstructionV1::SellExactHakky { .. } => {
            processor::process_sell(program_id, accounts, data)
        }
    }
}
```

- [ ] **Step 4: Implement System-owned zero-data PDA adoption**

For market, mint, base vault, and quote vault, compute exact rent, transfer only
the shortfall, then `allocate` and `assign` with the PDA signer. Reject an
already allocated or initialized account. Never transfer excess lamports out.

- [ ] **Step 5: Implement the exact atomic initialization sequence**

Validate finalized self and all accounts; validate commitment; adopt/create
PDAs; initialize mint and vaults; mint total supply; create immutable metadata;
set mint authority to `None`; write initial state; re-read every changed
account and assert all postconditions. Any error propagates and rolls back the
transaction.

- [ ] **Step 6: Run GREEN**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test initialization_prefund
rtk node scripts/build-hakky-test-sbf.mjs
rtk node --test test/test-sbf-lane.test.mjs
rtk docker run --rm -e SBF_OUT_DIR=/workspace/artifacts/test-sbf/current -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test initialization_prefund
```

Expected: every prefund boundary passes, every hostile/duplicate/partial case
fails, rollback leaves no initialized HAKKY state, and the same lifecycle passes
against the exact test `.so` without test identities entering candidate paths.

- [ ] **Step 7: Commit**

```powershell
rtk git add programs/hakky-market/src programs/hakky-market/tests scripts/build-hakky-test-sbf.mjs test/test-sbf-lane.test.mjs
rtk git commit -m "program: add atomic immutable initialization"
```

---

### Task 6: Implement curve buys, curve sells, and automatic transition

**Files:**
- Create: `programs/hakky-market/tests/curve_lifecycle.rs`
- Modify: `programs/hakky-market/src/processor.rs`
- Modify: `programs/hakky-market/src/state.rs`

**Interfaces:**
- Consumes: Tasks 2-5.
- Produces: curve-phase `process_buy`, curve-phase `process_sell`, and the
  one-way terminal transition.

- [ ] **Step 1: Write failing curve lifecycle tests**

Test exact quote deltas, zero-quote rejection, slippage, inclusive deadline
(`Clock.slot <= deadline_slot`), expired deadline, oversell, sell-over-sold,
user token validation, actual input/output vault deltas, sealed-surplus
exclusion, direct lamport transfer versus SPL `amount`, external
`SyncNative`-created surplus, rollback on transfer failure, same-state round
trip, final buy to exact `S/Q/L`, and a competing second final buy that fails
without oversell or double transition.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test curve_lifecycle
```

Expected: FAIL because swap branches return an error.

- [ ] **Step 3: Implement curve settlement**

Read and validate state/accounts, snapshot both vault amounts, compute the exact
cumulative delta, and before either CPI require both actual token amounts to be
at least the old accounted reserves. Transfer exact input first and exact
output second, update sold and accounted reserves, switch to pool only when
`sold == CURVE_MAX`, encode state, then re-read both token accounts and require
the exact input/output deltas plus each actual amount at least its new
accounted reserve. The lifecycle tests assert exact `ActualBelowAccounted`,
`VaultDeltaMismatch`, and `PostconditionFailed` codes at the frozen precedence
points, including overlapping-invalidity cases.

- [ ] **Step 4: Run GREEN**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test curve_lifecycle
```

Expected: all curve, slippage, deadline, donation, rollback, and terminal
transition cases pass.

- [ ] **Step 5: Commit**

```powershell
rtk git add programs/hakky-market/src/processor.rs programs/hakky-market/src/state.rs programs/hakky-market/tests/curve_lifecycle.rs
rtk git commit -m "program: settle curve and transition atomically"
```

---

### Task 7: Implement permanent pool swaps and full adversarial lifecycle

**Files:**
- Create: `programs/hakky-market/tests/pool_lifecycle.rs`
- Create: `programs/hakky-market/tests/rollback_concurrency.rs`
- Modify: `programs/hakky-market/src/processor.rs`

**Interfaces:**
- Consumes: Tasks 2-6.
- Produces: permanent pool buy/sell settlement with no new instruction tag.

- [ ] **Step 1: Write failing pool lifecycle tests**

Start every fixture from the exact terminal curve transaction. Test buy
exact-out and sell exact-in boundaries, fee rounding, slippage, expiry,
nonzero reserve floors, product nondecrease, actual vault deltas, donations
sealed before and during swaps, failed CPI/postcondition rollback, invalid
phase, state corruption, and proof that no instruction can revert the phase or
move reserves except the reviewed swap. Replay coverage distinguishes runtime
deduplication of one signed transaction from a newly signed second invocation:
the latter is a new trade and may succeed only against current state,
slippage, balance, and deadline while preserving every invariant.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked --features test-release-config --test pool_lifecycle --test rollback_concurrency
```

Expected: FAIL because pool-phase branches are missing.

- [ ] **Step 3: Implement minimal pool settlement**

Use Task 3 quote functions. Add the entire gross input to the accounted input
reserve, subtract only the exact output, enforce positive reserves and
`base<=TOTAL`, `k_after >= k_before`, and `k_after >= L*Q`. Before either CPI,
require both actual token amounts to be at least the old accounted reserves.
Execute both token CPIs, write state, re-read both token accounts, require exact
actual deltas, and require each actual amount to be at least its new accounted
reserve. Assert the exact stable error for every pre/post failure and its
overlapping-invalidity precedence. Do not add a fee field, recipient, LP
supply, deposit, withdraw, sync, skim, or close path.

- [ ] **Step 4: Run GREEN and the complete host suite**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --workspace --locked
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo fmt --all --check
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
```

Expected: all Rust tests pass, formatting is clean, and clippy has no warning.

- [ ] **Step 5: Commit**

```powershell
rtk git add programs/hakky-market
rtk git commit -m "program: add permanent retained-fee pool"
```

---

### Task 8: Build exact SBF, inspect its surface, and add fuzz targets

**Files:**
- Create: `Containerfile.fuzz`
- Create: `programs/hakky-market/fuzz/Cargo.toml`
- Create: `programs/hakky-market/fuzz/fuzz_targets/instruction.rs`
- Create: `programs/hakky-market/fuzz/fuzz_targets/state.rs`
- Create: `programs/hakky-market/fuzz/fuzz_targets/accounts.rs`
- Create: `programs/hakky-market/fuzz/fuzz_targets/math.rs`
- Create: `programs/hakky-market-sbf-tests/Cargo.toml`
- Create: `programs/hakky-market-sbf-tests/tests/candidate_runtime.rs`
- Create: `scripts/build-hakky-sbf.mjs`
- Create: `scripts/inspect-hakky-program.mjs`
- Create: `scripts/run-hakky-fuzz.mjs`
- Create: `scripts/test-hakky-native.mjs`
- Create: `scripts/test-hakky-test-sbf.mjs`
- Create: `scripts/test-hakky-candidate-sbf.mjs`
- Create: `test-support/program-surface-fixtures.mjs`
- Create: `test/build-hakky-sbf.test.mjs`
- Create: `test/program-lanes.test.mjs`
- Create: `test/run-hakky-fuzz.test.mjs`
- Create: `test/program-surface.test.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `Cargo.toml`
- Modify: `Cargo.lock`

**Interfaces:**
- Consumes: complete reviewed crate.
- Produces: ignored exact candidate `.so`, lane/config-bound build receipt,
  raw-evidence size/export/behavior/CPI inspection, isolated current-runtime
  exact-SBF result, and bounded fuzz receipts.

- [ ] **Step 1: Write failing surface-policy tests**

```javascript
// test/program-surface.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateProgramSurface,
  MAX_PROGRAM_BYTES,
} from "../scripts/inspect-hakky-program.mjs";
import {
  exactTagProbeReceipt,
  fixedInvokeCallsiteReceipt,
} from "../test-support/program-surface-fixtures.mjs";

test("accepts one entrypoint, tags 0..2, and fixed CPI programs", () => {
  const result = evaluateProgramSurface({
    binaryBytes: Buffer.alloc(119_999),
    readelfText: "1: 00000000 0 FUNC GLOBAL DEFAULT 1 entrypoint\n",
    tagProbe: exactTagProbeReceipt([0, 1, 2]),
    invokeCallsites: fixedInvokeCallsiteReceipt(),
  });
  assert.equal(MAX_PROGRAM_BYTES, 120_000);
  assert.equal(result.ok, true);
});

test("rejects one excess byte or one extra tag", () => {
  assert.equal(evaluateProgramSurface({
    binaryBytes: Buffer.alloc(120_001),
    readelfText: "entrypoint\n",
    tagProbe: exactTagProbeReceipt([0, 1, 2]),
    invokeCallsites: fixedInvokeCallsiteReceipt(),
  }).ok, false);
  assert.equal(evaluateProgramSurface({
    binaryBytes: Buffer.alloc(1),
    readelfText: "entrypoint\n",
    tagProbe: exactTagProbeReceipt([0, 1, 2, 3]),
    invokeCallsites: fixedInvokeCallsiteReceipt(),
  }).ok, false);
});
```

The test helpers create raw fixture receipts in test code; production
inspection itself runs the pinned tools and candidate SBF probe. Its CLI
accepts paths to raw candidate bytes and tool output, never caller-supplied
`instructionTags`, `cpiProgramIds`, `ok`, or `verified` arrays/booleans.

In this same RED step, create:

- `test/build-hakky-sbf.test.mjs`, freezing candidate/test lane names, paths,
  clean-tree refusal, release/config/lock binding, test-identity exclusion,
  output containment, and no wallet/home mount;
- `test/program-lanes.test.mjs`, freezing the three wrapper commands,
  test-SBF versus candidate-SBF evidence separation, exact ProgramTest package
  version, `prefer_bpf(true)`, and absence of a native processor fallback; and
- `test/run-hakky-fuzz.test.mjs`, freezing the pinned image/toolchain,
  instruction/state/accounts/math target list, exact run counts, receipt
  fields, timeout behavior, and failure propagation.

The isolated `candidate_runtime.rs` test is also written before its package
exists and asserts that only a caller-supplied exact `.so` path is loaded.

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/program-surface.test.mjs test/build-hakky-sbf.test.mjs test/program-lanes.test.mjs test/run-hakky-fuzz.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --locked -p hakky-market-sbf-tests --test candidate_runtime
```

Expected: FAIL because the inspector, build/lane/fuzz wrappers, and isolated
current-runtime package do not exist.

- [ ] **Step 3: Implement build and inspection commands**

`build-hakky-sbf.mjs` has distinct `test-sbf` and `candidate-sbf` modes.
Candidate mode requires a clean tree, reads the tracked release leaf without
rewriting it, compiles with no test feature/dev graph, and writes under
`artifacts/build/candidate/`. Its receipt fixes
`lane:"candidate-sbf"`, release-config hash, source hash, stdout/stderr hashes,
Cargo.lock, features, `.so` hash, and test-identity exclusion result.

The inspector reads the actual `.so`, raw `readelf`/`objdump` outputs, source
callsite extraction, and a behavior receipt produced by running the exact SBF
for every first byte `0..255` and malformed/exact data lengths. Only tags
`0..2` may pass instruction decoding. It derives fixed CPI targets from the
closed callsites and binary/source binding; it does not accept asserted tag or
CPI arrays.

`programs/hakky-market-sbf-tests` pins ProgramTest 4.1.2 and matching 4.x SDK
packages, has no dependency on `hakky-market`, Metaplex, or any 2.x public
Solana type, reads the release JSON as bytes, and loads the exact candidate
`.so` with `prefer_bpf(true)`. CI may run nonce-free decoder/account/loader
tests. Full candidate initialization uses the private nonce only in the
restricted offline ceremony and emits a sanitized receipt.

Add exact package commands:

```json
{
  "scripts": {
    "program:test-native": "node scripts/test-hakky-native.mjs",
    "program:build-test-sbf": "node scripts/build-hakky-test-sbf.mjs",
    "program:test-test-sbf": "node scripts/test-hakky-test-sbf.mjs",
    "program:build-candidate": "node scripts/build-hakky-sbf.mjs --lane candidate-sbf",
    "program:test-candidate-sbf": "node scripts/test-hakky-candidate-sbf.mjs",
    "program:inspect-candidate": "node scripts/inspect-hakky-program.mjs",
    "program:fuzz": "node scripts/run-hakky-fuzz.mjs"
  }
}
```

- [ ] **Step 4: Add fuzz targets**

Instruction fuzzing calls only the strict decoder; state fuzzing calls only the
384-byte decoder/validator; account fuzzing constructs adversarial positional
`AccountInfo` surfaces and calls only the closed account validator; math
fuzzing explores all `u64` inputs and treats a clean error as valid. No fuzz
dependency enters the release crate graph.

`Containerfile.fuzz` is:

```dockerfile
FROM rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3
RUN rustup toolchain install nightly-2026-07-20 --profile minimal
RUN cargo +nightly-2026-07-20 install cargo-fuzz --version 0.13.2 --locked
```

The bounded wrapper builds that file, records its image ID, and runs:

```powershell
cargo +nightly-2026-07-20 fuzz run instruction -- -runs=10000
cargo +nightly-2026-07-20 fuzz run state -- -runs=10000
cargo +nightly-2026-07-20 fuzz run accounts -- -runs=10000
cargo +nightly-2026-07-20 fuzz run math -- -runs=100000
```

Any crash, timeout before the fixed run count, sanitizer finding, unbounded
allocation, or missing receipt fails the task.

- [ ] **Step 5: Run pre-commit native, test-SBF, and fuzz verification**

```powershell
rtk npm run program:test-native
rtk npm run program:build-test-sbf
rtk npm run program:test-test-sbf
rtk npm run program:fuzz
rtk node --test test/program-surface.test.mjs test/build-hakky-sbf.test.mjs test/program-lanes.test.mjs test/run-hakky-fuzz.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --workspace --locked
```

Expected: native and test-SBF lanes pass, fuzz run counts complete, and all
host tests remain green. If the exact test/fuzz pins do not resolve, this task
is blocked; do not weaken a pin or lane boundary.

- [ ] **Step 6: Commit**

```powershell
rtk git add .gitignore Cargo.toml Cargo.lock Containerfile.fuzz package.json programs/hakky-market/fuzz programs/hakky-market-sbf-tests scripts/build-hakky-sbf.mjs scripts/inspect-hakky-program.mjs scripts/run-hakky-fuzz.mjs scripts/test-hakky-native.mjs scripts/test-hakky-test-sbf.mjs scripts/test-hakky-candidate-sbf.mjs test-support/program-surface-fixtures.mjs test/program-surface.test.mjs test/build-hakky-sbf.test.mjs test/program-lanes.test.mjs test/run-hakky-fuzz.test.mjs
rtk git commit -m "program: gate exact SBF surface and size"
```

- [ ] **Step 7: From the clean committed tree, verify the candidate lane**

```powershell
rtk git status --porcelain
rtk npm run program:build-candidate
rtk npm run program:test-candidate-sbf
rtk npm run program:inspect-candidate
```

Expected: status is empty before the build; the exact candidate passes
nonce-free current-runtime checks plus the restricted offline lifecycle when
the private nonce is available; the binary is at most 120,000 bytes; and
inspection derives `ok:true` from raw evidence. Candidate receipts are ignored
artifacts and must leave the tree clean. Missing SBF tools, an unavailable
private nonce, or an oversized binary blocks completion without weakening the
pin, privacy boundary, or ceiling.

## Program Plan Completion Gate

```powershell
rtk npm run program:test-native
rtk npm run program:build-test-sbf
rtk npm run program:test-test-sbf
rtk npm run program:build-candidate
rtk npm run program:test-candidate-sbf
rtk npm run program:inspect-candidate
rtk npm run program:fuzz
rtk node --test test/release-config.test.mjs test/curve-pool-vectors.test.mjs test/program-surface.test.mjs test/build-hakky-sbf.test.mjs test/program-lanes.test.mjs test/run-hakky-fuzz.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo fmt --all --check
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3 cargo test --workspace --locked
rtk git diff --check
rtk git status --short
```

Expected: clean source, exact release configuration, all Rust/Node tests pass,
one closed entrypoint, exact derived tags/CPIs, SBF no larger than 120,000
bytes, complete bounded fuzz receipts, and no secret, test identity, or binary
artifact tracked in a candidate/public path. This completes the local program
implementation only; actual-Metaplex-binary hostile-prefund proof, exact-built
SBF ProgramTest lifecycle, reproducible builds, audits, devnet, cost, metadata,
browser, and mainnet gates remain owned by the later plans.
