use solana_program::{hash::hashv, program_error::ProgramError, pubkey::Pubkey};

use crate::{
    constants::{EXPECTED_PROGRAM_ID, EXPECTED_PROGRAM_ID_BYTES, INSTANCE_COMMITMENT},
    error::HakkyErrorV1,
};

pub const INSTANCE_DOMAIN: &[u8] = b"HAKKY_INSTANCE_V1";
const VERSION_SEED: &[u8] = b"v1";
const MINT_SEED: &[u8] = b"hakky-mint";
const MARKET_SEED: &[u8] = b"hakky-market";
const VAULT_AUTHORITY_SEED: &[u8] = b"hakky-vault-authority";
const HAKKY_VAULT_SEED: &[u8] = b"hakky-base-vault";
const WSOL_VAULT_SEED: &[u8] = b"hakky-quote-vault";
const METADATA_SINK_SEED: &[u8] = b"hakky-metadata-sink";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MarketPdasV1 {
    pub mint: Pubkey,
    pub market: Pubkey,
    pub vault_authority: Pubkey,
    pub hakky_vault: Pubkey,
    pub wsol_vault: Pubkey,
    pub metadata_sink: Pubkey,
    bumps: [u8; 6],
}

impl MarketPdasV1 {
    pub fn derive_canonical(instance_nonce: &[u8; 32]) -> Result<Self, ProgramError> {
        if EXPECTED_PROGRAM_ID.to_bytes() != EXPECTED_PROGRAM_ID_BYTES {
            return Err(HakkyErrorV1::WrongProgramId.into());
        }
        validate_instance_nonce(instance_nonce)?;

        let (mint, mint_bump) = derive_one(MINT_SEED, instance_nonce)?;
        let (market, market_bump) = derive_one(MARKET_SEED, instance_nonce)?;
        let (vault_authority, vault_authority_bump) =
            derive_one(VAULT_AUTHORITY_SEED, instance_nonce)?;
        let (hakky_vault, hakky_vault_bump) = derive_one(HAKKY_VAULT_SEED, instance_nonce)?;
        let (wsol_vault, wsol_vault_bump) = derive_one(WSOL_VAULT_SEED, instance_nonce)?;
        let (metadata_sink, metadata_sink_bump) =
            derive_one(METADATA_SINK_SEED, instance_nonce)?;

        let result = Self {
            mint,
            market,
            vault_authority,
            hakky_vault,
            wsol_vault,
            metadata_sink,
            bumps: [
                mint_bump,
                market_bump,
                vault_authority_bump,
                hakky_vault_bump,
                wsol_vault_bump,
                metadata_sink_bump,
            ],
        };
        let addresses = result.addresses();
        for left in 0..addresses.len() {
            for right in (left + 1)..addresses.len() {
                if addresses[left] == addresses[right] {
                    return Err(HakkyErrorV1::InvalidPda.into());
                }
            }
        }
        Ok(result)
    }

    pub const fn bumps(&self) -> [u8; 6] {
        self.bumps
    }

    pub const fn addresses(&self) -> [Pubkey; 6] {
        [
            self.mint,
            self.market,
            self.vault_authority,
            self.hakky_vault,
            self.wsol_vault,
            self.metadata_sink,
        ]
    }
}

pub fn validate_instance_nonce(instance_nonce: &[u8; 32]) -> Result<(), ProgramError> {
    let digest = hashv(&[INSTANCE_DOMAIN, instance_nonce]);
    if digest.to_bytes() != INSTANCE_COMMITMENT {
        return Err(HakkyErrorV1::InvalidInstanceNonce.into());
    }
    Ok(())
}

fn derive_one(role: &[u8], instance_nonce: &[u8; 32]) -> Result<(Pubkey, u8), ProgramError> {
    let seeds: &[&[u8]] = &[role, VERSION_SEED, instance_nonce];
    let Some((canonical, bump)) =
        Pubkey::try_find_program_address(seeds, &EXPECTED_PROGRAM_ID)
    else {
        return Err(HakkyErrorV1::InvalidPda.into());
    };
    let bump_seed = [bump];
    let signer_seeds: &[&[u8]] = &[role, VERSION_SEED, instance_nonce, &bump_seed];
    let reconstructed = Pubkey::create_program_address(signer_seeds, &EXPECTED_PROGRAM_ID)
        .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidPda))?;
    if reconstructed != canonical {
        return Err(HakkyErrorV1::InvalidPda.into());
    }
    Ok((canonical, bump))
}
