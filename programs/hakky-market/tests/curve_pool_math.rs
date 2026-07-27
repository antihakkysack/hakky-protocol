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

fn fixed_rows<'a>(text: &'a str, start_marker: &str, end_marker: &str) -> Vec<Vec<&'a str>> {
    let start = text.find(start_marker).unwrap() + start_marker.len();
    let remainder = &text[start..];
    let end = remainder.find(end_marker).unwrap();
    let body = &remainder[..end];
    body.strip_prefix("[\"")
        .unwrap()
        .strip_suffix("\"]")
        .unwrap()
        .split("\"],[\"")
        .map(|row| row.split("\",\"").collect())
        .collect()
}

fn result_outcome(result: Result<u64, ProgramError>) -> String {
    match result {
        Ok(value) => value.to_string(),
        Err(ProgramError::Custom(code)) => format!("error:{code:08x}"),
        Err(error) => panic!("unexpected non-custom error {error:?}"),
    }
}

fn recompute(kind: &str, a: u64, b: u64, c: u64) -> Result<u64, ProgramError> {
    match kind {
        "curveReserve" => curve_reserve(a),
        "curveBuy" => quote_curve_buy_exact_out(a, b),
        "curveSell" => quote_curve_sell_exact_in(a, b),
        "poolBuy" => quote_pool_buy_exact_out(a, b, c),
        "poolSell" => quote_pool_sell_exact_in(a, b, c),
        _ => panic!("unknown vector kind {kind}"),
    }
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
fn fee_rounding_fit_boundary_and_initial_pool_dust_are_exact() {
    let fee_rows = [
        (1_u64, 1_u64, 0_u64),
        (399, 1, 398),
        (400, 1, 399),
        (401, 2, 399),
        (799, 2, 797),
        (800, 2, 798),
    ];
    for (gross, expected_fee, expected_effective) in fee_rows {
        let fee = ceil_div(
            gross as u128 * (POOL_FEE_DENOMINATOR - POOL_EFFECTIVE_NUMERATOR) as u128,
            POOL_FEE_DENOMINATOR as u128,
        )
        .unwrap() as u64;
        assert_eq!(fee, expected_fee);
        assert_eq!(gross - fee, expected_effective);
    }

    assert_eq!(
        quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE, 1_999_999_997_391).unwrap(),
        18_443_963_468_419_611_698
    );
    assert_eq!(
        quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE, 1_999_999_997_392),
        Err(custom(HakkyErrorV1::ArithmeticOverflow))
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
        quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE - 1, 1),
        Err(custom(HakkyErrorV1::ReserveInvariant))
    );
    assert_eq!(
        quote_pool_buy_exact_out(TOTAL_SUPPLY, TERMINAL_QUOTE, TOTAL_SUPPLY - 1),
        Err(custom(HakkyErrorV1::ArithmeticOverflow))
    );
}

#[test]
fn accepted_pool_states_cover_both_sides_of_the_transition_reserves() {
    let buy_base = POOL_SEED / 2;
    let buy_quote = TERMINAL_QUOTE * 2;
    let buy_gross = quote_pool_buy_exact_out(buy_base, buy_quote, 1).unwrap();
    assert!(buy_base < POOL_SEED && buy_quote > TERMINAL_QUOTE);
    assert!(product(buy_base - 1, buy_quote + buy_gross) >= product(buy_base, buy_quote));

    let sell_base = POOL_SEED * 2;
    let sell_quote = TERMINAL_QUOTE / 2;
    let sell_quote_out = quote_pool_sell_exact_in(sell_base, sell_quote, 10_000).unwrap();
    assert!(sell_base > POOL_SEED && sell_quote < TERMINAL_QUOTE);
    assert!(
        product(sell_base + 10_000, sell_quote - sell_quote_out) >= product(sell_base, sell_quote)
    );
}

#[test]
fn pool_sell_accepts_low_base_high_quote_reserves_without_decreasing_k() {
    let base_reserve = POOL_SEED / 2;
    let quote_reserve = TERMINAL_QUOTE * 2;
    let gross_base_in = 10_000;
    let quote_out = quote_pool_sell_exact_in(base_reserve, quote_reserve, gross_base_in).unwrap();
    assert!(base_reserve < POOL_SEED && quote_reserve > TERMINAL_QUOTE);
    assert_eq!(quote_out, 478);

    let base_after = base_reserve + gross_base_in;
    let quote_after = quote_reserve - quote_out;
    let k_before = product(base_reserve, quote_reserve);
    let k_after = product(base_after, quote_after);
    assert!(base_after > 0 && quote_after > 0);
    assert!(k_after >= k_before);
    assert!(k_after >= product(POOL_SEED, TERMINAL_QUOTE));
}

#[test]
fn pool_buy_accepts_high_base_low_quote_reserves_without_decreasing_k() {
    let base_reserve = POOL_SEED * 2;
    let quote_reserve = TERMINAL_QUOTE / 2;
    let base_out = 10_000;
    let gross_quote = quote_pool_buy_exact_out(base_reserve, quote_reserve, base_out).unwrap();
    assert!(base_reserve > POOL_SEED && quote_reserve < TERMINAL_QUOTE);
    assert_eq!(gross_quote, 32);

    let base_after = base_reserve - base_out;
    let quote_after = quote_reserve + gross_quote;
    let k_before = product(base_reserve, quote_reserve);
    let k_after = product(base_after, quote_after);
    assert!(base_after > 0 && quote_after > 0);
    assert!(k_after >= k_before);
    assert!(k_after >= product(POOL_SEED, TERMINAL_QUOTE));
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
        base in 2_603_u64..=TOTAL_SUPPLY,
        quote_offset in 0_u64..=1_000_000_000_u64,
        fraction in 1_u64..1_000_000_u64,
    ) {
        let floor = product(POOL_SEED, TERMINAL_QUOTE);
        let minimum_quote = ceil_div(floor, base as u128).unwrap();
        let quote = minimum_quote
            .saturating_add(quote_offset as u128)
            .min(u64::MAX as u128) as u64;
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
        base in (POOL_SEED + 85)..TOTAL_SUPPLY,
        quote_offset in 0_u64..=1_000_000_000_u64,
        gross in 1_u64..=1_000_000_000_u64,
    ) {
        let floor = product(POOL_SEED, TERMINAL_QUOTE);
        let minimum_quote = ceil_div(floor, base as u128).unwrap() as u64;
        let quote_span = TERMINAL_QUOTE - minimum_quote;
        let quote = minimum_quote + quote_offset % quote_span;
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
    assert!(text.contains(
        "\"seedHex\":\"48414b4b595f43555256455f504f4f4c\",\"caseCount\":\"10000\",\
         \"initialState\":[\"14708535579442662089\",\"849665406132499741\",\
         \"17436620374991249288\",\"9832929837502808094\"],\
         \"initialOutputs\":[\"5685559790167330181\",\"2368613918768109119\",\
         \"11219219450210543372\",\"9918755936004139257\",\"7945129480861828247\",\
         \"12761725465152772007\",\"10315898470543476408\",\"1706352161077581083\"]"
    ));

    let curve_rows = fixed_rows(text, "\"curve\":[", "],\"fees\":[");
    assert_eq!(curve_rows.len(), 8);
    for row in curve_rows {
        assert_eq!(row.len(), 2);
        let sold = row[0].parse::<u64>().unwrap();
        assert_eq!(curve_reserve(sold).unwrap().to_string(), row[1]);
    }

    let fee_rows = fixed_rows(text, "\"fees\":[", "],\"pool\":[");
    assert_eq!(fee_rows.len(), 6);
    for row in fee_rows {
        assert_eq!(row.len(), 3);
        let gross = row[0].parse::<u64>().unwrap();
        let fee = ceil_div(
            gross as u128 * (POOL_FEE_DENOMINATOR - POOL_EFFECTIVE_NUMERATOR) as u128,
            POOL_FEE_DENOMINATOR as u128,
        )
        .unwrap() as u64;
        assert_eq!(fee.to_string(), row[1]);
        assert_eq!((gross - fee).to_string(), row[2]);
    }

    let pool_rows = fixed_rows(text, "\"pool\":[", "],\"fit\":[");
    assert_eq!(pool_rows.len(), 2);
    for row in pool_rows {
        assert_eq!(row.len(), 9);
        let kind = row[0];
        let base = row[1].parse::<u64>().unwrap();
        let quote = row[2].parse::<u64>().unwrap();
        let amount = row[3].parse::<u64>().unwrap();
        let effective = if kind == "buy" {
            ceil_div(quote as u128 * amount as u128, (base - amount) as u128).unwrap()
        } else {
            amount as u128 * POOL_EFFECTIVE_NUMERATOR as u128 / POOL_FEE_DENOMINATOR as u128
        };
        assert_eq!(effective.to_string(), row[4]);
        let outcome = if kind == "buy" {
            quote_pool_buy_exact_out(base, quote, amount)
        } else {
            quote_pool_sell_exact_in(base, quote, amount)
        };
        assert_eq!(result_outcome(outcome), row[5]);
        let base_after = if kind == "buy" {
            base - amount
        } else {
            base + amount
        };
        let quote_delta = row[5].parse::<u64>().unwrap();
        let quote_after = if kind == "buy" {
            quote + quote_delta
        } else {
            quote - quote_delta
        };
        assert_eq!(base_after.to_string(), row[6]);
        assert_eq!(quote_after.to_string(), row[7]);
        assert_eq!(product(base_after, quote_after).to_string(), row[8]);
    }

    let fit_rows = fixed_rows(text, "\"fit\":[", "],\"rejections\":[");
    assert_eq!(fit_rows.len(), 2);
    for row in fit_rows {
        assert_eq!(row.len(), 2);
        let base_out = row[0].parse::<u64>().unwrap();
        assert_eq!(
            result_outcome(quote_pool_buy_exact_out(
                POOL_SEED,
                TERMINAL_QUOTE,
                base_out
            )),
            row[1]
        );
    }

    let rejection_rows = fixed_rows(text, "\"rejections\":[", "]},\"cases\":[");
    assert_eq!(rejection_rows.len(), 6);
    for row in rejection_rows {
        assert_eq!(row.len(), 5);
        let actual = recompute(
            row[0],
            row[1].parse::<u64>().unwrap(),
            row[2].parse::<u64>().unwrap(),
            row[3].parse::<u64>().unwrap(),
        );
        assert_eq!(result_outcome(actual), row[4]);
    }

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

    let expected_kinds = [
        "curveReserve",
        "curveBuy",
        "curveSell",
        "poolBuy",
        "poolSell",
    ];
    let mut kind_counts = [0_usize; 5];
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
        let expected_kind_index = expected_index % expected_kinds.len();
        assert_eq!(kind, expected_kinds[expected_kind_index]);
        kind_counts[expected_kind_index] += 1;
        let a = vector_value(fields[2], "\"a\":\"").parse::<u64>().unwrap();
        let b = vector_value(fields[3], "\"b\":\"").parse::<u64>().unwrap();
        let c = vector_value(fields[4], "\"c\":\"").parse::<u64>().unwrap();
        let expected = vector_value(fields[5], "\"outcome\":\"");
        let actual_outcome = result_outcome(recompute(kind, a, b, c));
        assert_eq!(actual_outcome, expected, "vector {expected_index}");
    }
    assert_eq!(kind_counts, [2_000; 5]);
}
