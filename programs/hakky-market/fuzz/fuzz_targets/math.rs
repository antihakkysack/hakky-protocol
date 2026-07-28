#![no_main]

use hakky_market::math::{
    curve_reserve, quote_curve_buy_exact_out, quote_curve_sell_exact_in, quote_pool_buy_exact_out,
    quote_pool_sell_exact_in,
};
use libfuzzer_sys::fuzz_target;

fn u64_at(data: &[u8], offset: usize) -> u64 {
    let mut bytes = [0_u8; 8];
    if let Some(source) = data.get(offset..offset.saturating_add(8)) {
        if source.len() == 8 {
            bytes.copy_from_slice(source);
        }
    }
    u64::from_le_bytes(bytes)
}

fuzz_target!(|data: &[u8]| {
    let left = u64_at(data, 1);
    let middle = u64_at(data, 9);
    let right = u64_at(data, 17);
    match data.first().copied().unwrap_or_default() % 5 {
        0 => {
            let _ = curve_reserve(left);
        }
        1 => {
            let _ = quote_curve_buy_exact_out(left, middle);
        }
        2 => {
            let _ = quote_curve_sell_exact_in(left, middle);
        }
        3 => {
            let _ = quote_pool_buy_exact_out(left, middle, right);
        }
        _ => {
            let _ = quote_pool_sell_exact_in(left, middle, right);
        }
    }
});
