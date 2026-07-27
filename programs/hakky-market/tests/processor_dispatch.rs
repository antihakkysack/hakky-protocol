use hakky_market::{constants::EXPECTED_PROGRAM_ID, error::HakkyErrorV1, process_instruction};
use solana_program::{program_error::ProgramError, pubkey::Pubkey};

fn custom(error: HakkyErrorV1) -> ProgramError {
    ProgramError::Custom(error as u32)
}

#[test]
fn wrong_program_id_precedes_instruction_decoding() {
    assert_eq!(
        process_instruction(&Pubkey::new_unique(), &[], &[]),
        Err(custom(HakkyErrorV1::WrongProgramId)),
    );
}

#[test]
fn exact_tags_dispatch_only_after_the_single_strict_decoder() {
    let initialize = [0_u8; 33];
    let buy = {
        let mut data = [0_u8; 25];
        data[0] = 1;
        data[1..9].copy_from_slice(&1_u64.to_le_bytes());
        data[9..17].copy_from_slice(&1_u64.to_le_bytes());
        data
    };
    let sell = {
        let mut data = buy;
        data[0] = 2;
        data
    };

    for data in [&initialize[..], &buy[..], &sell[..]] {
        assert_eq!(
            process_instruction(&EXPECTED_PROGRAM_ID, &[], data),
            Err(custom(HakkyErrorV1::InvalidAccountCount)),
        );
    }

    assert_eq!(
        process_instruction(&EXPECTED_PROGRAM_ID, &[], &[3]),
        Err(custom(HakkyErrorV1::InvalidInstructionTag)),
    );
}
