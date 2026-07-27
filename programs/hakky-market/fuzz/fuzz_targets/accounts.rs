#![no_main]

use hakky_market::accounts::SwapAccountsV1;
use libfuzzer_sys::fuzz_target;
use solana_program::{account_info::AccountInfo, pubkey::Pubkey};

fuzz_target!(|input: &[u8]| {
    let count = input.first().copied().unwrap_or_default() as usize % 18;
    let key = Pubkey::new_from_array([input.get(1).copied().unwrap_or_default(); 32]);
    let owner = Pubkey::new_from_array([input.get(2).copied().unwrap_or_default(); 32]);
    let mut lamports = u64::from(input.get(3).copied().unwrap_or_default());
    let mut data = input
        .get(4..)
        .unwrap_or_default()
        .iter()
        .copied()
        .take(512)
        .collect::<Vec<_>>();
    let account = AccountInfo::new(
        &key,
        input.get(4).is_some_and(|byte| byte & 1 == 1),
        input.get(4).is_some_and(|byte| byte & 2 == 2),
        &mut lamports,
        &mut data,
        &owner,
        false,
        0,
    );
    let accounts = vec![account; count];
    let _ = SwapAccountsV1::parse(&accounts);
});
