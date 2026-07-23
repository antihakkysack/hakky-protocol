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
