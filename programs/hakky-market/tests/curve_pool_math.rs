#![cfg(feature = "test-release-config")]

use hakky_market::{
    constants::*,
    error::HakkyErrorV1,
    math::{
        ceil_div, curve_reserve, quote_curve_buy_exact_out, quote_curve_sell_exact_in,
        quote_pool_buy_exact_out, quote_pool_sell_exact_in,
    },
};
use proptest::prelude::*;
use solana_program::{hash::hash, program_error::ProgramError};
use std::fmt::Write;

fn custom(error: HakkyErrorV1) -> ProgramError {
    ProgramError::Custom(error as u32)
}

fn product(base: u64, quote: u64) -> u128 {
    (base as u128) * (quote as u128)
}

fn vector_value<'a>(field: &'a str, name: &str) -> &'a str {
    field
        .strip_prefix(name)
        .and_then(|value| value.strip_suffix('"'))
        .unwrap()
}

fn lowercase_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        write!(&mut output, "{byte:02x}").unwrap();
    }
    output
}

#[test]
fn curve_endpoints_and_transition_price_are_exact() {
    assert_eq!(curve_reserve(0).unwrap(), 0);
    assert_eq!(curve_reserve(1_333).unwrap(), 0);
    assert_eq!(curve_reserve(1_334).unwrap(), 1);
    assert_eq!(curve_reserve(2_000_000_000_000).unwrap(), 1_846_153_846);
    assert_eq!(curve_reserve(4_000_000_000_000).unwrap(), 4_800_000_000);
    assert_eq!(curve_reserve(6_000_000_000_000).unwrap(), 10_285_714_285);
    assert_eq!(curve_reserve(CURVE_MAX - 1).unwrap(), TERMINAL_QUOTE - 1);
    assert_eq!(curve_reserve(CURVE_MAX).unwrap(), TERMINAL_QUOTE);
    assert_eq!(
        4_u128 * TERMINAL_QUOTE as u128 * POOL_SEED as u128,
        TERMINAL_QUOTE as u128 * CURVE_MAX as u128
    );
}

#[test]
fn curve_quotes_use_cumulative_differences_and_reject_dust() {
    assert_eq!(quote_curve_buy_exact_out(1_333, 1).unwrap(), 1);
    assert_eq!(quote_curve_buy_exact_out(CURVE_MAX - 1, 1).unwrap(), 1);
    assert_eq!(quote_curve_sell_exact_in(CURVE_MAX, 1).unwrap(), 1);
    assert_eq!(
        quote_curve_buy_exact_out(0, 1),
        Err(custom(HakkyErrorV1::ZeroQuote))
    );
    assert_eq!(
        quote_curve_sell_exact_in(1, 1),
        Err(custom(HakkyErrorV1::ZeroQuote))
    );
}

#[test]
fn curve_rejections_have_frozen_error_codes() {
    let rows = [
        (quote_curve_buy_exact_out(0, 0), HakkyErrorV1::ZeroAmount),
        (quote_curve_sell_exact_in(0, 0), HakkyErrorV1::ZeroAmount),
        (
            quote_curve_buy_exact_out(CURVE_MAX + 1, 1),
            HakkyErrorV1::CurveDomain,
        ),
        (
            quote_curve_sell_exact_in(CURVE_MAX + 1, 1),
            HakkyErrorV1::CurveDomain,
        ),
        (
            quote_curve_buy_exact_out(CURVE_MAX, 1),
            HakkyErrorV1::InsufficientCurveLiquidity,
        ),
        (
            quote_curve_sell_exact_in(0, 1),
            HakkyErrorV1::InsufficientCurveLiquidity,
        ),
    ];
    for (actual, expected) in rows {
        assert_eq!(actual, Err(custom(expected)));
    }
    assert_eq!(
        curve_reserve(CURVE_MAX + 1),
        Err(custom(HakkyErrorV1::CurveDomain))
    );
    assert_eq!(
        curve_reserve(u64::MAX),
        Err(custom(HakkyErrorV1::CurveDomain))
    );
}

#[test]
fn ceil_div_is_exact_without_addition_overflow() {
    assert_eq!(ceil_div(0, 1).unwrap(), 0);
    assert_eq!(ceil_div(1, 1).unwrap(), 1);
    assert_eq!(ceil_div(1, 2).unwrap(), 1);
    assert_eq!(ceil_div(2, 2).unwrap(), 1);
    assert_eq!(ceil_div(3, 2).unwrap(), 2);
    assert_eq!(ceil_div(u128::MAX, u128::MAX).unwrap(), 1);
    assert_eq!(ceil_div(u128::MAX, 2).unwrap(), 1_u128 << 127);
    assert_eq!(
        ceil_div(1, 0),
        Err(custom(HakkyErrorV1::ArithmeticOverflow))
    );
}

#[test]
fn initial_pool_rounding_vectors_are_exact() {
    assert_eq!(
        quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE, 1).unwrap(),
        2
    );
    let buy_base_after = POOL_SEED - 1;
    let buy_quote_after = TERMINAL_QUOTE + 2;
    assert_eq!(
        product(buy_base_after, buy_quote_after),
        48_000_000_003_975_999_999_998
    );

    assert_eq!(
        quote_pool_sell_exact_in(POOL_SEED, TERMINAL_QUOTE, 85).unwrap(),
        1
    );
    let sell_base_after = POOL_SEED + 85;
    let sell_quote_after = TERMINAL_QUOTE - 1;
    assert_eq!(
        product(sell_base_after, sell_quote_after),
        48_000_000_000_039_999_999_915
    );
}

#[test]
fn pool_buy_uses_ceil_then_ceil_and_retains_the_fee() {
    let base_reserve = POOL_SEED;
    let quote_reserve = TERMINAL_QUOTE;
    let base_out = POOL_SEED / 2;
    let effective_quote = TERMINAL_QUOTE as u128;
    let expected_gross = ceil_div(
        effective_quote * POOL_FEE_DENOMINATOR as u128,
        POOL_EFFECTIVE_NUMERATOR as u128,
    )
    .unwrap() as u64;
    assert_eq!(
        quote_pool_buy_exact_out(base_reserve, quote_reserve, base_out).unwrap(),
        expected_gross
    );
    assert_eq!(expected_gross, 24_060_150_376);
    assert!(
        product(base_reserve - base_out, quote_reserve + expected_gross)
            >= product(base_reserve, quote_reserve)
    );
}

#[test]
fn pool_sell_uses_floor_then_floor_and_retains_the_fee() {
    let gross_base = 10_000;
    let effective_base =
        (gross_base as u128 * POOL_EFFECTIVE_NUMERATOR as u128) / POOL_FEE_DENOMINATOR as u128;
    let expected_quote =
        (TERMINAL_QUOTE as u128 * effective_base / (POOL_SEED as u128 + effective_base)) as u64;
    assert_eq!(
        quote_pool_sell_exact_in(POOL_SEED, TERMINAL_QUOTE, gross_base).unwrap(),
        expected_quote
    );
    assert_eq!(expected_quote, 119);
    assert!(
        product(POOL_SEED + gross_base, TERMINAL_QUOTE - expected_quote)
            >= product(POOL_SEED, TERMINAL_QUOTE)
    );
}

#[test]
fn pool_rejections_cover_zero_dust_reserve_floors_and_max_minus_one() {
    assert_eq!(
        quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE, 0),
        Err(custom(HakkyErrorV1::ZeroAmount))
    );
    assert_eq!(
        quote_pool_sell_exact_in(POOL_SEED, TERMINAL_QUOTE, 0),
        Err(custom(HakkyErrorV1::ZeroAmount))
    );
    assert_eq!(
        quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE, POOL_SEED),
        Err(custom(HakkyErrorV1::InsufficientCurveLiquidity))
    );
    assert_eq!(
        quote_pool_sell_exact_in(POOL_SEED, TERMINAL_QUOTE, 1),
        Err(custom(HakkyErrorV1::ZeroQuote))
    );
    assert_eq!(
        quote_pool_buy_exact_out(0, TERMINAL_QUOTE, 1),
        Err(custom(HakkyErrorV1::ReserveInvariant))
    );
    assert_eq!(
        quote_pool_sell_exact_in(POOL_SEED, 0, 85),
        Err(custom(HakkyErrorV1::ReserveInvariant))
    );
    assert_eq!(
        quote_pool_buy_exact_out(TOTAL_SUPPLY, TERMINAL_QUOTE, TOTAL_SUPPLY - 1),
        Err(custom(HakkyErrorV1::ArithmeticOverflow))
    );
}

#[test]
fn pool_overflow_adjacent_inputs_are_checked() {
    assert_eq!(
        quote_pool_buy_exact_out(POOL_SEED, u64::MAX, 1),
        Err(custom(HakkyErrorV1::ArithmeticOverflow))
    );
    assert_eq!(
        quote_pool_sell_exact_in(TOTAL_SUPPLY, TERMINAL_QUOTE, 1),
        Err(custom(HakkyErrorV1::ReserveInvariant))
    );
    assert_eq!(
        quote_pool_buy_exact_out(TOTAL_SUPPLY + 1, TERMINAL_QUOTE, 1),
        Err(custom(HakkyErrorV1::ReserveInvariant))
    );
    assert_eq!(
        quote_pool_sell_exact_in(POOL_SEED, u64::MAX, u64::MAX),
        Err(custom(HakkyErrorV1::ArithmeticOverflow))
    );
}

proptest! {
    #[test]
    fn curve_is_monotone(a in 0_u64..CURVE_MAX, gap in 1_u64..=1_000_000_u64) {
        let b = a.saturating_add(gap).min(CURVE_MAX);
        prop_assert!(curve_reserve(a).unwrap() <= curve_reserve(b).unwrap());
    }

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

    #[test]
    fn accepted_pool_buys_keep_positive_reserves_and_nondecreasing_k(
        base in POOL_SEED..=TOTAL_SUPPLY,
        quote in TERMINAL_QUOTE..=1_000_000_000_000_u64,
        fraction in 1_u64..1_000_000_u64,
    ) {
        let out = 1 + ((base - 1) as u128 * fraction as u128 / 1_000_000_u128) as u64;
        if let Ok(gross_quote) = quote_pool_buy_exact_out(base, quote, out) {
            let base_after = base - out;
            let quote_after = quote.checked_add(gross_quote).unwrap();
            prop_assert!(base_after > 0 && quote_after > 0);
            prop_assert!(product(base_after, quote_after) >= product(base, quote));
            prop_assert!(product(base_after, quote_after) >= product(POOL_SEED, TERMINAL_QUOTE));
        }
    }

    #[test]
    fn accepted_pool_sells_keep_positive_reserves_and_nondecreasing_k(
        base in POOL_SEED..TOTAL_SUPPLY,
        quote in TERMINAL_QUOTE..=1_000_000_000_000_u64,
        gross in 1_u64..=1_000_000_000_u64,
    ) {
        let bounded_gross = gross.min(TOTAL_SUPPLY - base);
        if let Ok(quote_out) = quote_pool_sell_exact_in(base, quote, bounded_gross) {
            let base_after = base + bounded_gross;
            let quote_after = quote - quote_out;
            prop_assert!(base_after > 0 && quote_after > 0);
            prop_assert!(product(base_after, quote_after) >= product(base, quote));
            prop_assert!(product(base_after, quote_after) >= product(POOL_SEED, TERMINAL_QUOTE));
        }
    }
}

#[test]
fn every_generated_vector_and_detached_sidecar_are_verified() {
    let bytes = include_bytes!("../test-vectors/curve-pool-v1.json");
    let sidecar = include_str!("../test-vectors/curve-pool-v1.json.sha256");
    let actual_hash = lowercase_hex(hash(bytes).as_ref());
    assert_eq!(sidecar, format!("{actual_hash}\n"));
    assert!(bytes.ends_with(b"\n"));
    assert!(!bytes[..bytes.len() - 1].contains(&b'\n'));

    let text = core::str::from_utf8(bytes).unwrap();
    assert!(text.starts_with(
        "{\"schemaVersion\":\"hakky-curve-pool-v1\",\"generator\":{\"identity\":\"xoshiro256**\""
    ));
    assert!(
        text.contains("\"seedHex\":\"48414b4b595f43555256455f504f4f4c\",\"caseCount\":\"10000\"")
    );

    let cases_start = text.find("\"cases\":[").unwrap() + "\"cases\":[".len();
    let cases_end = text.rfind("]}").unwrap();
    let body = &text[cases_start..cases_end];
    let cases: Vec<&str> = body
        .strip_prefix('{')
        .unwrap()
        .strip_suffix('}')
        .unwrap()
        .split("},{")
        .collect();
    assert_eq!(cases.len(), 10_000);

    for (expected_index, case) in cases.into_iter().enumerate() {
        let fields: Vec<&str> = case.split(',').collect();
        assert_eq!(fields.len(), 6);
        assert_eq!(
            vector_value(fields[0], "\"index\":\"")
                .parse::<usize>()
                .unwrap(),
            expected_index
        );
        let kind = vector_value(fields[1], "\"kind\":\"");
        let a = vector_value(fields[2], "\"a\":\"").parse::<u64>().unwrap();
        let b = vector_value(fields[3], "\"b\":\"").parse::<u64>().unwrap();
        let c = vector_value(fields[4], "\"c\":\"").parse::<u64>().unwrap();
        let expected = vector_value(fields[5], "\"outcome\":\"");
        let actual = match kind {
            "curveReserve" => curve_reserve(a),
            "curveBuy" => quote_curve_buy_exact_out(a, b),
            "curveSell" => quote_curve_sell_exact_in(a, b),
            "poolBuy" => quote_pool_buy_exact_out(a, b, c),
            "poolSell" => quote_pool_sell_exact_in(a, b, c),
            _ => panic!("unknown vector kind {kind}"),
        };
        let actual_outcome = match actual {
            Ok(value) => value.to_string(),
            Err(ProgramError::Custom(code)) => format!("error:{code:08x}"),
            Err(error) => panic!("unexpected non-custom error {error:?}"),
        };
        assert_eq!(actual_outcome, expected, "vector {expected_index}");
    }
}
