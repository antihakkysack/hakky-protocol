use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
};

use crate::{
    constants::{
        METADATA_PROGRAM, METADATA_URI, RENT_SYSVAR, SYSTEM_PROGRAM, TOKEN_NAME, TOKEN_SYMBOL,
    },
    error::HakkyErrorV1,
};

const CREATE_METADATA_ACCOUNT_V3_DISCRIMINATOR: u8 = 33;
const METADATA_V1_KEY: u8 = 4;
const FUNGIBLE_TOKEN_STANDARD: u8 = 2;
const MAX_NAME_LENGTH: usize = 32;
const MAX_SYMBOL_LENGTH: usize = 10;
const MAX_URI_LENGTH: usize = 200;
pub const METADATA_ACCOUNT_LEN: usize = 607;

fn push_borsh_string(data: &mut Vec<u8>, value: &str) {
    data.extend_from_slice(&(value.len() as u32).to_le_bytes());
    data.extend_from_slice(value.as_bytes());
}

pub fn create_immutable_metadata(
    metadata: &Pubkey,
    mint: &Pubkey,
    vault_authority: &Pubkey,
    payer: &Pubkey,
    metadata_sink: &Pubkey,
) -> Instruction {
    let mut data =
        Vec::with_capacity(16 + TOKEN_NAME.len() + TOKEN_SYMBOL.len() + METADATA_URI.len());
    data.push(CREATE_METADATA_ACCOUNT_V3_DISCRIMINATOR);
    push_borsh_string(&mut data, TOKEN_NAME);
    push_borsh_string(&mut data, TOKEN_SYMBOL);
    push_borsh_string(&mut data, METADATA_URI);
    data.extend_from_slice(&0_u16.to_le_bytes());
    data.extend_from_slice(&[
        0, // creators: None
        0, // collection: None
        0, // uses: None
        0, // is_mutable: false
        0, // collection_details: None
    ]);

    Instruction {
        program_id: METADATA_PROGRAM,
        accounts: vec![
            AccountMeta::new(*metadata, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new_readonly(*vault_authority, true),
            AccountMeta::new(*payer, true),
            AccountMeta::new_readonly(*metadata_sink, true),
            AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
            AccountMeta::new_readonly(RENT_SYSVAR, false),
        ],
        data,
    }
}

struct MetadataCursor<'a> {
    data: &'a [u8],
    offset: usize,
}

impl<'a> MetadataCursor<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, offset: 0 }
    }

    fn read<const N: usize>(&mut self) -> Result<[u8; N], ProgramError> {
        let end = self
            .offset
            .checked_add(N)
            .ok_or(HakkyErrorV1::InvalidMetadata)?;
        let source = self
            .data
            .get(self.offset..end)
            .ok_or(HakkyErrorV1::InvalidMetadata)?;
        let mut bytes = [0_u8; N];
        bytes.copy_from_slice(source);
        self.offset = end;
        Ok(bytes)
    }

    fn read_u8(&mut self) -> Result<u8, ProgramError> {
        Ok(self.read::<1>()?[0])
    }

    fn read_u16(&mut self) -> Result<u16, ProgramError> {
        Ok(u16::from_le_bytes(self.read()?))
    }

    fn read_u32(&mut self) -> Result<u32, ProgramError> {
        Ok(u32::from_le_bytes(self.read()?))
    }

    fn read_pubkey(&mut self) -> Result<Pubkey, ProgramError> {
        Ok(Pubkey::new_from_array(self.read()?))
    }

    fn read_exact_puffed_string(
        &mut self,
        expected: &str,
        padded_length: usize,
    ) -> Result<(), ProgramError> {
        let length =
            usize::try_from(self.read_u32()?).map_err(|_| HakkyErrorV1::InvalidMetadata)?;
        if length != padded_length || expected.len() > padded_length {
            return Err(HakkyErrorV1::InvalidMetadata.into());
        }
        let end = self
            .offset
            .checked_add(length)
            .ok_or(HakkyErrorV1::InvalidMetadata)?;
        let value = self
            .data
            .get(self.offset..end)
            .ok_or(HakkyErrorV1::InvalidMetadata)?;
        self.offset = end;
        if !value.starts_with(expected.as_bytes())
            || value[expected.len()..].iter().any(|byte| *byte != 0)
        {
            return Err(HakkyErrorV1::InvalidMetadata.into());
        }
        Ok(())
    }

    fn read_none(&mut self) -> Result<(), ProgramError> {
        if self.read_u8()? != 0 {
            return Err(HakkyErrorV1::InvalidMetadata.into());
        }
        Ok(())
    }

    fn trailing_is_zero(&self) -> bool {
        self.data[self.offset..].iter().all(|byte| *byte == 0)
    }
}

pub fn validate_immutable_metadata(
    data: &[u8],
    expected_mint: &Pubkey,
    expected_update_authority: &Pubkey,
) -> Result<(), ProgramError> {
    if data.len() != METADATA_ACCOUNT_LEN {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    let mut cursor = MetadataCursor::new(data);
    if cursor.read_u8()? != METADATA_V1_KEY
        || cursor.read_pubkey()? != *expected_update_authority
        || cursor.read_pubkey()? != *expected_mint
    {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    cursor.read_exact_puffed_string(TOKEN_NAME, MAX_NAME_LENGTH)?;
    cursor.read_exact_puffed_string(TOKEN_SYMBOL, MAX_SYMBOL_LENGTH)?;
    cursor.read_exact_puffed_string(METADATA_URI, MAX_URI_LENGTH)?;
    if cursor.read_u16()? != 0 {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    cursor.read_none()?; // creators
    if cursor.read_u8()? != 0 || cursor.read_u8()? != 0 {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    let Some((_, edition_bump)) = Pubkey::try_find_program_address(
        &[
            b"metadata",
            METADATA_PROGRAM.as_ref(),
            expected_mint.as_ref(),
            b"edition",
        ],
        &METADATA_PROGRAM,
    ) else {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    };
    if cursor.read_u8()? != 1 || cursor.read_u8()? != edition_bump {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    if cursor.read_u8()? != 1 || cursor.read_u8()? != FUNGIBLE_TOKEN_STANDARD {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    cursor.read_none()?; // collection
    cursor.read_none()?; // uses
    cursor.read_none()?; // collection_details
    cursor.read_none()?; // programmable_config
    if !cursor.trailing_is_zero() {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    Ok(())
}
