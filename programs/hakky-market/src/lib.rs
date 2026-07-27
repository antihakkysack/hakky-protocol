#![forbid(unsafe_code)]
#![allow(unexpected_cfgs)]

#[cfg(all(feature = "test-release-config", target_os = "solana"))]
compile_error!("test release identities must never compile to SBF");

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

pub mod accounts;
pub mod constants;
pub mod error;
pub mod instruction;
pub mod loader;
pub mod math;
pub mod metadata;
pub mod pda;
pub mod processor;
pub mod state;
pub mod token;

#[cfg(feature = "test-release-config")]
mod test_release_config;

use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if program_id != &constants::EXPECTED_PROGRAM_ID {
        return Err(error::HakkyErrorV1::WrongProgramId.into());
    }

    match instruction::HakkyInstructionV1::decode(data)? {
        instruction::HakkyInstructionV1::Initialize { instance_nonce } => {
            processor::process_initialize(program_id, accounts, instance_nonce)
        }
        instruction::HakkyInstructionV1::BuyExactHakky {
            base_amount,
            max_quote_in,
            deadline_slot,
        } => processor::process_buy(
            program_id,
            accounts,
            base_amount,
            max_quote_in,
            deadline_slot,
        ),
        instruction::HakkyInstructionV1::SellExactHakky {
            base_amount,
            min_quote_out,
            deadline_slot,
        } => processor::process_sell(
            program_id,
            accounts,
            base_amount,
            min_quote_out,
            deadline_slot,
        ),
    }
}
