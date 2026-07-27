#![no_main]

use hakky_market::instruction::HakkyInstructionV1;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let _ = HakkyInstructionV1::decode(data);
});
