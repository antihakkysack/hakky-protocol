#![forbid(unsafe_code)]
#![allow(unexpected_cfgs)]

#[cfg(all(feature = "test-release-config", target_os = "solana"))]
compile_error!("test release identities must never compile to SBF");

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

pub mod constants;
pub mod error;
pub mod instruction;
pub mod math;
pub mod pda;
pub mod state;

#[cfg(feature = "test-release-config")]
mod test_release_config;

use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _data: &[u8],
) -> ProgramResult {
    Err(solana_program::program_error::ProgramError::InvalidInstructionData)
}
