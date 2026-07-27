use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::constants::{TOKEN_DECIMALS, TOKEN_PROGRAM, TOTAL_SUPPLY};

pub const MINT_LEN: usize = 82;
pub const TOKEN_ACCOUNT_LEN: usize = 165;
pub const TOKEN_STATE_INITIALIZED: u8 = 1;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MintView {
    pub mint_authority: Option<Pubkey>,
    pub supply: u64,
    pub decimals: u8,
    pub is_initialized: bool,
    pub freeze_authority: Option<Pubkey>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TokenAccountView {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub delegate: Option<Pubkey>,
    pub state: u8,
    pub is_native: Option<u64>,
    pub delegated_amount: u64,
    pub close_authority: Option<Pubkey>,
}

fn pubkey_at(data: &[u8], offset: usize) -> Result<Pubkey, ProgramError> {
    let bytes: [u8; 32] = data
        .get(offset..offset + 32)
        .ok_or(ProgramError::InvalidAccountData)?
        .try_into()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    Ok(Pubkey::new_from_array(bytes))
}

fn u64_at(data: &[u8], offset: usize) -> Result<u64, ProgramError> {
    let bytes: [u8; 8] = data
        .get(offset..offset + 8)
        .ok_or(ProgramError::InvalidAccountData)?
        .try_into()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    Ok(u64::from_le_bytes(bytes))
}

fn option_tag(data: &[u8], offset: usize) -> Result<u32, ProgramError> {
    let bytes: [u8; 4] = data
        .get(offset..offset + 4)
        .ok_or(ProgramError::InvalidAccountData)?
        .try_into()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    Ok(u32::from_le_bytes(bytes))
}

fn option_pubkey_at(data: &[u8], offset: usize) -> Result<Option<Pubkey>, ProgramError> {
    match option_tag(data, offset)? {
        0 => Ok(None),
        1 => Ok(Some(pubkey_at(data, offset + 4)?)),
        _ => Err(ProgramError::InvalidAccountData),
    }
}

fn option_u64_at(data: &[u8], offset: usize) -> Result<Option<u64>, ProgramError> {
    match option_tag(data, offset)? {
        0 => Ok(None),
        1 => Ok(Some(u64_at(data, offset + 4)?)),
        _ => Err(ProgramError::InvalidAccountData),
    }
}

pub fn decode_mint(data: &[u8]) -> Result<MintView, ProgramError> {
    if data.len() != MINT_LEN {
        return Err(ProgramError::InvalidAccountData);
    }
    let is_initialized = match data[45] {
        0 => false,
        1 => true,
        _ => return Err(ProgramError::InvalidAccountData),
    };
    Ok(MintView {
        mint_authority: option_pubkey_at(data, 0)?,
        supply: u64_at(data, 36)?,
        decimals: data[44],
        is_initialized,
        freeze_authority: option_pubkey_at(data, 46)?,
    })
}

pub fn decode_token_account(data: &[u8]) -> Result<TokenAccountView, ProgramError> {
    if data.len() != TOKEN_ACCOUNT_LEN || data[108] > 2 {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(TokenAccountView {
        mint: pubkey_at(data, 0)?,
        owner: pubkey_at(data, 32)?,
        amount: u64_at(data, 64)?,
        delegate: option_pubkey_at(data, 72)?,
        state: data[108],
        is_native: option_u64_at(data, 109)?,
        delegated_amount: u64_at(data, 121)?,
        close_authority: option_pubkey_at(data, 129)?,
    })
}

pub fn initialize_mint2_instruction(
    mint: &Pubkey,
    vault_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let mut data = Vec::with_capacity(35);
    data.extend_from_slice(&[20, TOKEN_DECIMALS]);
    data.extend_from_slice(vault_authority.as_ref());
    data.push(0);
    Ok(Instruction {
        program_id: TOKEN_PROGRAM,
        accounts: vec![AccountMeta::new(*mint, false)],
        data,
    })
}

pub fn initialize_account3_instruction(
    account: &Pubkey,
    mint: &Pubkey,
    owner: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let mut data = Vec::with_capacity(33);
    data.push(18);
    data.extend_from_slice(owner.as_ref());
    Ok(Instruction {
        program_id: TOKEN_PROGRAM,
        accounts: vec![
            AccountMeta::new(*account, false),
            AccountMeta::new_readonly(*mint, false),
        ],
        data,
    })
}

pub fn mint_total_supply_instruction(
    mint: &Pubkey,
    destination: &Pubkey,
    vault_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    let mut data = Vec::with_capacity(9);
    data.push(7);
    data.extend_from_slice(&TOTAL_SUPPLY.to_le_bytes());
    Ok(Instruction {
        program_id: TOKEN_PROGRAM,
        accounts: vec![
            AccountMeta::new(*mint, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*vault_authority, true),
        ],
        data,
    })
}

pub fn disable_mint_authority_instruction(
    mint: &Pubkey,
    vault_authority: &Pubkey,
) -> Result<Instruction, ProgramError> {
    Ok(Instruction {
        program_id: TOKEN_PROGRAM,
        accounts: vec![
            AccountMeta::new(*mint, false),
            AccountMeta::new_readonly(*vault_authority, true),
        ],
        data: vec![6, 0, 0],
    })
}

pub fn transfer_checked_instruction(
    source: &Pubkey,
    mint: &Pubkey,
    destination: &Pubkey,
    authority: &Pubkey,
    amount: u64,
    decimals: u8,
) -> Result<Instruction, ProgramError> {
    let mut data = Vec::with_capacity(10);
    data.push(12);
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(decimals);
    Ok(Instruction {
        program_id: TOKEN_PROGRAM,
        accounts: vec![
            AccountMeta::new(*source, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data,
    })
}
