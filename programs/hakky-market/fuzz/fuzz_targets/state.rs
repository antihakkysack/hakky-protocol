#![no_main]

use hakky_market::state::MarketStateV1;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let _ = MarketStateV1::decode(data);
});
