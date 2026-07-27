use mpl_token_metadata::{
    instructions::{CreateMetadataAccountV3, CreateMetadataAccountV3InstructionArgs},
    types::DataV2,
};
use solana_program::{instruction::Instruction, pubkey::Pubkey};

use crate::constants::{METADATA_URI, RENT_SYSVAR, SYSTEM_PROGRAM, TOKEN_NAME, TOKEN_SYMBOL};

pub fn create_immutable_metadata(
    metadata: &Pubkey,
    mint: &Pubkey,
    vault_authority: &Pubkey,
    payer: &Pubkey,
    metadata_sink: &Pubkey,
) -> Instruction {
    CreateMetadataAccountV3 {
        metadata: *metadata,
        mint: *mint,
        mint_authority: *vault_authority,
        payer: *payer,
        update_authority: (*metadata_sink, true),
        system_program: SYSTEM_PROGRAM,
        rent: Some(RENT_SYSVAR),
    }
    .instruction(CreateMetadataAccountV3InstructionArgs {
        data: DataV2 {
            name: TOKEN_NAME.into(),
            symbol: TOKEN_SYMBOL.into(),
            uri: METADATA_URI.into(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        is_mutable: false,
        collection_details: None,
    })
}
