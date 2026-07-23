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
market state. Release identity is rendered from an ignored devnet ceremony
into compile-time public constants; no secret or runtime economics enter the
binary. Host tests progress from pure codecs/math to exact-built-SBF lifecycle
coverage.

**Tech Stack:** Rust 1.95.0 for host checks, pinned verifiable SBF image
`solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68`,
`solana-program` 3.0.0, `spl-token-interface` 3.0.0, `spl-token` 9.0.0,
`mpl-token-metadata` 5.1.1, `solana-program-test` 4.1.2,
`solana-sdk` 4.0.1, Tokio 1.53.1, proptest 1.11.0, cargo-fuzz 0.13.2,
Node.js ESM for ceremony and surface checks.

## Global Constraints

- The normative design is
  `docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md`.
- All economic constants and program identities are compile-time values.
- The final program exposes one entrypoint and only tags `0`, `1`, and `2`.
- Instruction lengths are exactly `33`, `25`, and `25` bytes.
- `MarketStateV1` is exactly 384 bytes and rejects nonzero reserved bytes.
- Total supply is `10,000,000,000,000`; curve maximum is
  `8,000,000,000,000`; pool seed is `2,000,000,000,000`.
- Terminal WSOL reserve is `24,000,000,000`.
- Curve math is `floor(Q*s/(4*S-3*s))`.
- Pool fee constants are `D=1,000,000`, `F=997,500`.
- Every multiply/divide is checked `u128`; every persisted/output amount fits
  `u64`.
- The only CPI program IDs are System, classic SPL Token, and pinned Metaplex
  Token Metadata.
- Initialization requires its own loader-v3 ProgramData authority to be
  `None`.
- No admin, pause, rescue, deposit, withdrawal, LP, fee claim, migration,
  close, reallocation, arbitrary transfer, fallback, or unknown tag exists.
- Program binary is a hard stop above 120,000 bytes.
- No mainnet signer, transaction, spend, deploy, finalization, initialization,
  or publication is authorized by this plan.

---

### Task 1: Bootstrap the pinned workspace and devnet release configuration

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

[dependencies]
mpl-token-metadata = "=5.1.1"
solana-program = "=3.0.0"
spl-token-interface = "=3.0.0"

[dev-dependencies]
proptest = "=1.11.0"
solana-program-test = "=4.1.2"
solana-sdk = "=4.0.1"
spl-token = { version = "=9.0.0", features = ["no-entrypoint"] }
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
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo generate-lockfile
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --workspace --locked
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
- Create: `programs/hakky-market/src/constants.rs`
- Create: `programs/hakky-market/src/error.rs`
- Create: `programs/hakky-market/src/instruction.rs`
- Create: `programs/hakky-market/src/pda.rs`
- Create: `programs/hakky-market/src/state.rs`
- Create: `programs/hakky-market/tests/instruction_state.rs`
- Modify: `programs/hakky-market/src/lib.rs`

**Interfaces:**
- Consumes: `release_config::{EXPECTED_PROGRAM_ID, INSTANCE_COMMITMENT}`.
- Produces:
  `HakkyInstructionV1::decode(&[u8])`,
  `MarketPdasV1::derive(program_id, nonce)`,
  `MarketStateV1::{decode, encode, validate}`.

- [ ] **Step 1: Write failing codec/state tests**

```rust
// programs/hakky-market/tests/instruction_state.rs
use hakky_market::{
    constants::*,
    instruction::HakkyInstructionV1,
    state::{MarketStateV1, MARKET_STATE_LEN},
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
    assert!(HakkyInstructionV1::decode(&[0_u8; 32]).is_err());
    assert!(HakkyInstructionV1::decode(&[0_u8; 34]).is_err());
    assert!(HakkyInstructionV1::decode(&[3_u8]).is_err());
}

#[test]
fn state_is_exactly_384_bytes_and_reserved_bytes_are_zero() {
    assert_eq!(MARKET_STATE_LEN, 384);
    let state = MarketStateV1::initial_fixture();
    let encoded = state.encode();
    assert_eq!(encoded.len(), MARKET_STATE_LEN);
    assert_eq!(MarketStateV1::decode(&encoded).unwrap(), state);

    let mut corrupted = encoded;
    corrupted[MARKET_STATE_LEN - 1] = 1;
    assert!(MarketStateV1::decode(&corrupted).is_err());
}
```

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test instruction_state
```

Expected: FAIL because the modules and types do not exist.

- [ ] **Step 3: Implement the exact instruction enum**

```rust
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
tags, and has no wildcard success branch.

- [ ] **Step 4: Implement fixed PDA derivation and commitment validation**

```rust
pub const INSTANCE_DOMAIN: &[u8] = b"HAKKY_INSTANCE_V1";

pub fn validate_instance_nonce(nonce: &[u8; 32]) -> Result<(), ProgramError> {
    let digest = solana_program::hash::hashv(&[INSTANCE_DOMAIN, nonce]);
    if digest.to_bytes() != INSTANCE_COMMITMENT {
        return Err(HakkyError::InvalidInstanceNonce.into());
    }
    Ok(())
}
```

Derive six canonical PDAs with exact seed triples from the spec and store all
six bumps in `MarketPdasV1`.

- [ ] **Step 5: Implement a manual 384-byte state codec**

Use fixed offsets and little-endian helpers. The encoded fields are magic,
layout version, phase, six bumps, nonce, commitment, initialization slot, sold,
accounted HAKKY, accounted WSOL, initializer, mint, base vault, quote vault,
vault authority, and zero reserved bytes. `validate` recomputes the commitment,
PDAs, stored identities, phase-specific reserve equations, and curve sold
range.

- [ ] **Step 6: Run GREEN and clippy**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test instruction_state
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo clippy --workspace --all-targets --locked -- -D warnings
```

Expected: focused tests pass and clippy emits no warning.

- [ ] **Step 7: Commit**

```powershell
rtk git add programs/hakky-market/src programs/hakky-market/tests/instruction_state.rs
rtk git commit -m "program: add closed codecs and state"
```

---

### Task 3: Implement independently testable curve and pool arithmetic

**Files:**
- Create: `programs/hakky-market/src/math.rs`
- Create: `programs/hakky-market/tests/curve_pool_math.rs`
- Create: `programs/hakky-market/test-vectors/curve-pool-v1.json`
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

- [ ] **Step 1: Write failing Rust boundary/property tests**

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
    fn curve_differences_telescope(a in 0_u64..CURVE_MAX) {
        let b = a + (CURVE_MAX - a) / 2;
        let c = CURVE_MAX;
        prop_assert_eq!(
            quote_curve_buy_exact_out(a, b - a).unwrap()
                + quote_curve_buy_exact_out(b, c - b).unwrap(),
            quote_curve_buy_exact_out(a, c - a).unwrap()
        );
    }
}
```

Add explicit tests for zero deltas, every maximum-minus-one boundary,
overflow-adjacent values, buy `ceil/ceil`, sell `floor/floor`, positive reserve
floors, fee rounding, and `k_after >= k_before`.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test curve_pool_math
```

Expected: FAIL because `math` does not exist.

- [ ] **Step 3: Implement the minimal checked math**

```rust
pub fn curve_reserve(sold: u64) -> Result<u64, ProgramError> {
    if sold > CURVE_MAX {
        return Err(HakkyError::CurveDomain.into());
    }
    let numerator = (TERMINAL_QUOTE as u128)
        .checked_mul(sold as u128)
        .ok_or(HakkyError::ArithmeticOverflow)?;
    let denominator = (4_u128)
        .checked_mul(CURVE_MAX as u128)
        .and_then(|x| x.checked_sub(3_u128 * sold as u128))
        .ok_or(HakkyError::ArithmeticOverflow)?;
    u64::try_from(numerator / denominator)
        .map_err(|_| HakkyError::ArithmeticOverflow.into())
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

The generator implements the same formulas without importing Rust output,
writes canonical JSON for endpoints, rounding boundaries, 10,000 deterministic
random cases, and includes a SHA-256 over the canonical vector bytes. The Rust
test reads and checks every vector.

- [ ] **Step 5: Run GREEN**

```powershell
rtk node --test test/curve-pool-vectors.test.mjs
rtk node scripts/render-curve-pool-vectors.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test curve_pool_math
```

Expected: Node vector tests pass; Rust accepts every independently generated
case; property tests pass.

- [ ] **Step 6: Commit**

```powershell
rtk git add programs/hakky-market/src/math.rs programs/hakky-market/src/lib.rs programs/hakky-market/tests/curve_pool_math.rs programs/hakky-market/test-vectors/curve-pool-v1.json scripts/render-curve-pool-vectors.mjs test/curve-pool-vectors.test.mjs
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
close authority. Assert the exact stable `HakkyError` code for each mutation.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test adversarial_accounts
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
token-account field before returning.

- [ ] **Step 4: Implement the raw loader-v3 finalization check**

Decode the Program account to its exact ProgramData address, decode the
ProgramData metadata, require pinned loader ownership, require the authority
option to be `None`, and reject malformed/trailing state. Production parsing
must not trust `solana program show` text.

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
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test adversarial_accounts
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo clippy --workspace --all-targets --locked -- -D warnings
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
- Modify: `programs/hakky-market/src/lib.rs`

**Interfaces:**
- Consumes: Tasks 2-4.
- Produces:
  `processor::process_initialize` and the tag-dispatch entrypoint.

- [ ] **Step 1: Write failing initialization lifecycle tests**

Use ProgramTest with classic SPL Token and a strict metadata test processor
that decodes the exact Metaplex instruction and account metas. Cover:

- finalized loader state succeeds; non-null authority fails;
- initializer mismatch fails;
- wrong nonce fails before account creation;
- prefunds `0`, `1`, `rent-1`, `rent`, `rent+1`, and `2*rent` succeed for
  every allocatable HAKKY PDA and retain excess lamports;
- wrong owner, nonzero data, partial mint/token state, and duplicate init fail;
- exact supply, six decimals, null freeze and final mint authority, vault
  ownership, delegates, close authorities, state, and metadata postconditions;
- forced metadata failure rolls back all account/supply/state changes.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test initialization_prefund
```

Expected: FAIL because `process_initialize` does not exist.

- [ ] **Step 3: Implement the exact dispatch**

```rust
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if program_id != &release_config::EXPECTED_PROGRAM_ID {
        return Err(HakkyError::WrongProgramId.into());
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
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test initialization_prefund
```

Expected: every prefund boundary passes, every hostile/duplicate/partial case
fails, and rollback leaves no initialized HAKKY state.

- [ ] **Step 7: Commit**

```powershell
rtk git add programs/hakky-market/src programs/hakky-market/tests
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
exclusion, rollback on transfer failure, same-state round trip, final buy to
exact `S/Q/L`, and a competing second final buy that fails without oversell or
double transition.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test curve_lifecycle
```

Expected: FAIL because swap branches return an error.

- [ ] **Step 3: Implement curve settlement**

Read and validate state/accounts, snapshot both vault amounts, compute the exact
cumulative delta, transfer exact input first and exact output second, update
sold and accounted reserves, switch to pool only when `sold == CURVE_MAX`,
encode state, then re-read token accounts and require exact input/output deltas
plus `actual >= accounted`.

- [ ] **Step 4: Run GREEN**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test curve_lifecycle
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
sealed before and during swaps, failed CPI/postcondition rollback, replay,
invalid phase, state corruption, and proof that no instruction can revert the
phase or move reserves except the reviewed swap.

- [ ] **Step 2: Run RED**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --locked --test pool_lifecycle --test rollback_concurrency
```

Expected: FAIL because pool-phase branches are missing.

- [ ] **Step 3: Implement minimal pool settlement**

Use Task 3 quote functions. Add the entire gross input to the accounted input
reserve, subtract only the exact output, enforce positive reserves and
`k_after >= k_before`, execute both token CPIs, write state, and assert exact
actual deltas. Do not add a fee field, recipient, LP supply, deposit, withdraw,
sync, skim, or close path.

- [ ] **Step 4: Run GREEN and the complete host suite**

```powershell
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --workspace --locked
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo fmt --all --check
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo clippy --workspace --all-targets --locked -- -D warnings
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
- Create: `programs/hakky-market/fuzz/Cargo.toml`
- Create: `programs/hakky-market/fuzz/fuzz_targets/instruction.rs`
- Create: `programs/hakky-market/fuzz/fuzz_targets/state.rs`
- Create: `programs/hakky-market/fuzz/fuzz_targets/math.rs`
- Create: `scripts/build-hakky-sbf.mjs`
- Create: `scripts/inspect-hakky-program.mjs`
- Create: `test/program-surface.test.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: complete reviewed crate.
- Produces: ignored exact `.so`, build receipt, size result, export/symbol
  inspection, and bounded fuzz commands.

- [ ] **Step 1: Write failing surface-policy tests**

```javascript
// test/program-surface.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateProgramSurface,
  MAX_PROGRAM_BYTES,
} from "../scripts/inspect-hakky-program.mjs";

test("accepts one entrypoint, tags 0..2, and fixed CPI programs", () => {
  const result = evaluateProgramSurface({
    byteLength: 119_999,
    exportedSymbols: ["entrypoint"],
    instructionTags: [0, 1, 2],
    cpiProgramIds: [
      "11111111111111111111111111111111",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    ],
  });
  assert.equal(MAX_PROGRAM_BYTES, 120_000);
  assert.equal(result.ok, true);
});

test("rejects one excess byte or one extra tag", () => {
  assert.equal(evaluateProgramSurface({
    byteLength: 120_001,
    exportedSymbols: ["entrypoint"],
    instructionTags: [0, 1, 2],
    cpiProgramIds: [],
  }).ok, false);
  assert.equal(evaluateProgramSurface({
    byteLength: 1,
    exportedSymbols: ["entrypoint"],
    instructionTags: [0, 1, 2, 3],
    cpiProgramIds: [],
  }).ok, false);
});
```

- [ ] **Step 2: Run RED**

```powershell
rtk node --test test/program-surface.test.mjs
```

Expected: FAIL because the inspection module does not exist.

- [ ] **Step 3: Implement build and inspection commands**

`build-hakky-sbf.mjs` invokes only the pinned container/toolchain contract,
writes under ignored `artifacts/build/`, hashes stdout, stderr, Cargo.lock,
source tree, and `.so`, and rejects a non-clean tracked tree. The inspector
requires a single entrypoint/export, exact byte length, tags, fixed CPI IDs,
and absence of forbidden management vocabulary in source/symbol/disassembly
evidence.

Add exact package commands:

```json
{
  "scripts": {
    "program:build": "node scripts/build-hakky-sbf.mjs",
    "program:inspect": "node scripts/inspect-hakky-program.mjs"
  }
}
```

- [ ] **Step 4: Add fuzz targets**

Instruction fuzzing calls only the strict decoder; state fuzzing calls only the
384-byte decoder/validator; math fuzzing explores all `u64` inputs and treats a
clean error as valid. No fuzz dependency enters the release crate graph.

- [ ] **Step 5: Build and run bounded verification**

```powershell
rtk npm run program:build
rtk npm run program:inspect
rtk node --test test/program-surface.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --workspace --locked
```

Expected: exact SBF build succeeds, binary is at most 120,000 bytes, inspection
reports `ok: true`, and all host tests remain green. If SBF tools are absent
from the pinned build image or the binary exceeds the ceiling, this task is
BLOCKED; do not weaken the pin or ceiling.

- [ ] **Step 6: Commit**

```powershell
rtk git add .gitignore package.json package-lock.json programs/hakky-market/fuzz scripts/build-hakky-sbf.mjs scripts/inspect-hakky-program.mjs test/program-surface.test.mjs
rtk git commit -m "program: gate exact SBF surface and size"
```

## Program Plan Completion Gate

```powershell
rtk npm run program:build
rtk npm run program:inspect
rtk node --test test/release-config.test.mjs test/curve-pool-vectors.test.mjs test/program-surface.test.mjs
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo fmt --all --check
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo clippy --workspace --all-targets --locked -- -D warnings
rtk docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.95.0 cargo test --workspace --locked
rtk git diff --check
rtk git status --short
```

Expected: clean source, exact release configuration, all Rust/Node tests pass,
one closed entrypoint, exact tags/CPIs, SBF no larger than 120,000 bytes, and
no secret or binary artifact tracked. This completes the local program
implementation only; actual-Metaplex-binary hostile-prefund proof, exact-built
SBF ProgramTest lifecycle, reproducible builds, audits, devnet, cost, metadata,
browser, and mainnet gates remain owned by the later plans.
