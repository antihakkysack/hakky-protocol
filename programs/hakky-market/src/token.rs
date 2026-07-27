use solana_program::{instruction::Instruction, program_error::ProgramError, pubkey::Pubkey};
use spl_token_interface::instruction::{self, AuthorityType};

use crate::constants::{TOKEN_DECIMALS, TOKEN_PROGRAM, TOTAL_SUPPLY};

pub fn initialize_mint2_instruction(
    mint: &Pubkey,
    vault_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    instruction::initialize_mint2(&TOKEN_PROGRAM, mint, vault_authority, None, TOKEN_DECIMALS)
}

pub fn initialize_account3_instruction(
    account: &Pubkey,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<Instruction, ProgramError> {
    instruction::initialize_account3(&TOKEN_PROGRAM, account, mint, owner)
}

pub fn mint_total_supply_instruction(
    mint: &Pubkey,
    destination: &Pubkey,
    vault_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    instruction::mint_to(
        &TOKEN_PROGRAM,
        mint,
        destination,
        vault_authority,
        &[],
        TOTAL_SUPPLY,
    )
}

pub fn disable_mint_authority_instruction(
    mint: &Pubkey,
    vault_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    instruction::set_authority(
        &TOKEN_PROGRAM,
        mint,
        None,
        AuthorityType::MintTokens,
        vault_authority,
        &[],
    )
}

pub fn transfer_checked_instruction(
    source: &Pubkey,
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Pubkey,
    amount: u64,
    decimals: u8,
) -> Result<Instruction, ProgramError> {
    instruction::transfer_checked(
        &TOKEN_PROGRAM,
        source,
        mint,
        destination,
        authority,
        &[],
        amount,
        decimals,
    )
}
