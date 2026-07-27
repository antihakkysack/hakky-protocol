#![cfg(feature = "test-release-config")]

use hakky_market::{
    constants::*,
    error::HakkyErrorV1,
    instruction::HakkyInstructionV1,
    pda::MarketPdasV1,
    state::{
        MarketStateV1, ACCOUNTED_HAKKY_RANGE, ACCOUNTED_WSOL_RANGE, BUMPS_RANGE, CURVE_SOLD_RANGE,
        HAKKY_VAULT_RANGE, INITIALIZATION_SLOT_RANGE, INITIALIZER_RANGE, INSTANCE_COMMITMENT_RANGE,
        INSTANCE_NONCE_RANGE, LAYOUT_VERSION_OFFSET, MAGIC_RANGE, MARKET_STATE_LEN, MINT_RANGE,
        PHASE_OFFSET, RESERVED_RANGE, VAULT_AUTHORITY_RANGE, WSOL_VAULT_RANGE,
    },
};
use solana_program::{hash::hash, program_error::ProgramError};

fn custom(error: HakkyErrorV1) -> ProgramError {
    ProgramError::Custom(error as u32)
}

fn bytes(hex: &str) -> Vec<u8> {
    hex.as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let text = core::str::from_utf8(pair).expect("test hex is ASCII");
            u8::from_str_radix(text, 16).expect("test hex is valid")
        })
        .collect()
}

fn hex(bytes: &[u8]) -> String {
    use core::fmt::Write;
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        write!(&mut output, "{byte:02x}").expect("String writes cannot fail");
    }
    output
}

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
        Err(custom(HakkyErrorV1::InvalidInstructionLength))
    );
    assert_eq!(
        HakkyInstructionV1::decode(&[0_u8; 34]),
        Err(custom(HakkyErrorV1::InvalidInstructionLength))
    );
    assert_eq!(
        HakkyInstructionV1::decode(&[3_u8]),
        Err(custom(HakkyErrorV1::InvalidInstructionTag))
    );
}

#[test]
fn instruction_shape_precedence_is_frozen() {
    let mut zero_buy = [0_u8; 25];
    zero_buy[0] = 1;
    let mut zero_sell = [0_u8; 25];
    zero_sell[0] = 2;
    let rows: &[(&[u8], HakkyErrorV1)] = &[
        (&[], HakkyErrorV1::InvalidInstructionLength),
        (&[3, 0], HakkyErrorV1::InvalidInstructionTag),
        (&[1, 0], HakkyErrorV1::InvalidInstructionLength),
        (&zero_buy, HakkyErrorV1::ZeroAmount),
        (&zero_sell, HakkyErrorV1::ZeroAmount),
    ];
    for (data, expected) in rows {
        assert_eq!(
            HakkyInstructionV1::decode(data),
            Err(custom(*expected)),
            "unexpected precedence for {data:?}"
        );
    }

    let mut zero_limit = [0_u8; 25];
    zero_limit[0] = 1;
    zero_limit[1..9].copy_from_slice(&1_u64.to_le_bytes());
    assert_eq!(
        HakkyInstructionV1::decode(&zero_limit),
        Err(custom(HakkyErrorV1::ZeroAmount))
    );
}

#[test]
fn canonical_instruction_vectors_decode_exactly() {
    let initialize = bytes("000707070707070707070707070707070707070707070707070707070707070707");
    assert_eq!(
        HakkyInstructionV1::decode(&initialize).unwrap(),
        HakkyInstructionV1::Initialize {
            instance_nonce: [7_u8; 32]
        }
    );
    let buy = bytes("01080706050403020118171615141312112827262524232221");
    assert_eq!(
        HakkyInstructionV1::decode(&buy).unwrap(),
        HakkyInstructionV1::BuyExactHakky {
            base_amount: 0x0102030405060708,
            max_quote_in: 0x1112131415161718,
            deadline_slot: 0x2122232425262728,
        }
    );
    let sell = bytes("02383736353433323148474645444342415857565554535251");
    assert_eq!(
        HakkyInstructionV1::decode(&sell).unwrap(),
        HakkyInstructionV1::SellExactHakky {
            base_amount: 0x3132333435363738,
            min_quote_out: 0x4142434445464748,
            deadline_slot: 0x5152535455565758,
        }
    );
}

#[test]
fn error_codes_and_state_offsets_are_frozen() {
    let actual = HakkyErrorV1::ALL.map(|error| error as u32);
    let expected = core::array::from_fn(|index| 0x484b0001 + index as u32);
    assert_eq!(actual, expected);
    assert_eq!(MARKET_STATE_LEN, 384);
    assert_eq!(MAGIC_RANGE, 0..8);
    assert_eq!(LAYOUT_VERSION_OFFSET, 8);
    assert_eq!(PHASE_OFFSET, 9);
    assert_eq!(BUMPS_RANGE, 10..16);
    assert_eq!(INSTANCE_NONCE_RANGE, 16..48);
    assert_eq!(INSTANCE_COMMITMENT_RANGE, 48..80);
    assert_eq!(INITIALIZATION_SLOT_RANGE, 80..88);
    assert_eq!(CURVE_SOLD_RANGE, 88..96);
    assert_eq!(ACCOUNTED_HAKKY_RANGE, 96..104);
    assert_eq!(ACCOUNTED_WSOL_RANGE, 104..112);
    assert_eq!(INITIALIZER_RANGE, 112..144);
    assert_eq!(MINT_RANGE, 144..176);
    assert_eq!(HAKKY_VAULT_RANGE, 176..208);
    assert_eq!(WSOL_VAULT_RANGE, 208..240);
    assert_eq!(VAULT_AUTHORITY_RANGE, 240..272);
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
        Err(custom(HakkyErrorV1::InvalidMarketState))
    );
}

#[test]
fn approved_fixture_pdas_are_canonical_and_distinct() {
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    assert_eq!(
        pdas.mint.to_string(),
        "CmoL1cvAKrxod4AtmY8MXxPKQHTdddu7G8zvFpco7RLN"
    );
    assert_eq!(
        pdas.market.to_string(),
        "95HfDKSWGCp1LyZCez8fPMYMR62U2bGes3v5x5bdW689"
    );
    assert_eq!(
        pdas.vault_authority.to_string(),
        "7H19wE3whSwccLQKxseXCs3fsQqT7PB8q5D5j14Tv292"
    );
    assert_eq!(
        pdas.hakky_vault.to_string(),
        "6eEPFYBQnbpeDc1azQpgFJH5csE1rCmABsjavNqn66Fd"
    );
    assert_eq!(
        pdas.wsol_vault.to_string(),
        "9Yv8ie1Ho9XTKM5uJPxD5zAZEnyxFoxdjcHjgzcAa4xK"
    );
    assert_eq!(
        pdas.metadata_sink.to_string(),
        "GokrtAeJbGdH39zPc6cDQAGSj9Cj4nmimsZ4iWEez1Ye"
    );
    assert_eq!(pdas.bumps(), [253, 254, 254, 255, 254, 253]);

    let addresses = pdas.addresses();
    for left in 0..addresses.len() {
        for right in (left + 1)..addresses.len() {
            assert_ne!(addresses[left], addresses[right]);
        }
    }
}

#[test]
fn state_fixture_hashes_and_phase_rules_are_frozen() {
    let curve_initial = MarketStateV1::initial_fixture();
    assert_eq!(
        hex(hash(&curve_initial.encode()).as_ref()),
        "24e52bacf7131f9dcf39058e9eb83faa2b1f911de7a422414b2f3b3945e66c4d"
    );

    let mut curve_midpoint = curve_initial.clone();
    curve_midpoint.curve_sold = 4_000_000_000_000;
    curve_midpoint.accounted_hakky = 6_000_000_000_000;
    curve_midpoint.accounted_wsol = 4_800_000_000;
    curve_midpoint.validate().unwrap();
    assert_eq!(
        hex(hash(&curve_midpoint.encode()).as_ref()),
        "76af8a6a86b36c153f1943663016f669cdfa362f10712f35aa14244fb3b6800c"
    );

    let mut pool_initial = curve_initial;
    pool_initial.phase = 1;
    pool_initial.curve_sold = CURVE_MAX;
    pool_initial.accounted_hakky = POOL_SEED;
    pool_initial.accounted_wsol = TERMINAL_QUOTE;
    pool_initial.validate().unwrap();
    assert_eq!(
        hex(hash(&pool_initial.encode()).as_ref()),
        "e99448defa16c7048f668a3e3cb9ef4cbd66efe4e0cf71b9f444b4a81147af63"
    );

    let mut invalid_pool = pool_initial;
    invalid_pool.accounted_hakky = 0;
    assert_eq!(
        invalid_pool.validate(),
        Err(custom(HakkyErrorV1::InvalidMarketState))
    );
}

#[test]
fn invalid_phase_has_its_frozen_error_before_phase_specific_state_rules() {
    let mut state = MarketStateV1::initial_fixture();
    state.phase = 2;
    assert_eq!(state.validate(), Err(custom(HakkyErrorV1::InvalidPhase)));
    assert_eq!(
        MarketStateV1::decode(&state.encode()),
        Err(custom(HakkyErrorV1::InvalidPhase))
    );

    let mut invalid_identity_and_phase = state.encode();
    invalid_identity_and_phase[MINT_RANGE.start] ^= 1;
    assert_eq!(
        MarketStateV1::decode(&invalid_identity_and_phase),
        Err(custom(HakkyErrorV1::InvalidMarketState))
    );
}

#[test]
fn every_state_invariant_branch_returns_invalid_market_state() {
    let curve_initial = MarketStateV1::initial_fixture();
    let mut pool_initial = curve_initial.clone();
    pool_initial.phase = 1;
    pool_initial.curve_sold = CURVE_MAX;
    pool_initial.accounted_hakky = POOL_SEED;
    pool_initial.accounted_wsol = TERMINAL_QUOTE;

    let mut cases = Vec::new();

    let mut curve_sold_bound = curve_initial.clone();
    curve_sold_bound.curve_sold = CURVE_MAX + 1;
    cases.push(("curve sold bound", curve_sold_bound));

    let mut curve_base_equation = curve_initial.clone();
    curve_base_equation.accounted_hakky -= 1;
    cases.push(("curve base equation", curve_base_equation));

    let mut curve_quote_equation = curve_initial;
    curve_quote_equation.accounted_wsol = 1;
    cases.push(("curve quote equation", curve_quote_equation));

    let mut pool_sold_equality = pool_initial.clone();
    pool_sold_equality.curve_sold -= 1;
    cases.push(("pool sold equality", pool_sold_equality));

    let mut pool_zero_base = pool_initial.clone();
    pool_zero_base.accounted_hakky = 0;
    cases.push(("pool zero base", pool_zero_base));

    let mut pool_base_upper_bound = pool_initial.clone();
    pool_base_upper_bound.accounted_hakky = TOTAL_SUPPLY + 1;
    cases.push(("pool base upper bound", pool_base_upper_bound));

    let mut pool_zero_quote = pool_initial.clone();
    pool_zero_quote.accounted_wsol = 0;
    cases.push(("pool zero quote", pool_zero_quote));

    let mut pool_product_floor = pool_initial;
    pool_product_floor.accounted_wsol -= 1;
    cases.push(("pool product floor", pool_product_floor));

    for (label, state) in cases {
        assert_eq!(
            state.validate(),
            Err(custom(HakkyErrorV1::InvalidMarketState)),
            "{label}"
        );
    }
}

#[test]
fn wrong_nonce_is_rejected_before_pda_derivation() {
    assert_eq!(
        MarketPdasV1::derive_canonical(&[8_u8; 32]),
        Err(custom(HakkyErrorV1::InvalidInstanceNonce))
    );
}
