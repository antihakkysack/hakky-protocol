use core::ops::Range;

use solana_program::{program_error::ProgramError, pubkey::Pubkey};

use crate::{
    constants::{
        CURVE_MAX, INITIALIZER, INSTANCE_COMMITMENT, POOL_SEED, TERMINAL_QUOTE, TOTAL_SUPPLY,
    },
    error::HakkyErrorV1,
    pda::{validate_instance_nonce, MarketPdasV1},
};

pub const MARKET_STATE_LEN: usize = 384;
pub const MAGIC_RANGE: Range<usize> = 0..8;
pub const LAYOUT_VERSION_OFFSET: usize = 8;
pub const PHASE_OFFSET: usize = 9;
pub const BUMPS_RANGE: Range<usize> = 10..16;
pub const INSTANCE_NONCE_RANGE: Range<usize> = 16..48;
pub const INSTANCE_COMMITMENT_RANGE: Range<usize> = 48..80;
pub const INITIALIZATION_SLOT_RANGE: Range<usize> = 80..88;
pub const CURVE_SOLD_RANGE: Range<usize> = 88..96;
pub const ACCOUNTED_HAKKY_RANGE: Range<usize> = 96..104;
pub const ACCOUNTED_WSOL_RANGE: Range<usize> = 104..112;
pub const INITIALIZER_RANGE: Range<usize> = 112..144;
pub const MINT_RANGE: Range<usize> = 144..176;
pub const HAKKY_VAULT_RANGE: Range<usize> = 176..208;
pub const WSOL_VAULT_RANGE: Range<usize> = 208..240;
pub const VAULT_AUTHORITY_RANGE: Range<usize> = 240..272;
pub const RESERVED_RANGE: Range<usize> = 272..384;

const MAGIC: &[u8; 8] = b"HAKKYV1\0";
const LAYOUT_VERSION: u8 = 1;
const _: [(); MARKET_STATE_LEN] = [(); RESERVED_RANGE.end];
const _: [(); 112] = [(); RESERVED_RANGE.end - RESERVED_RANGE.start];

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketStateV1 {
    pub phase: u8,
    pub bumps: [u8; 6],
    pub instance_nonce: [u8; 32],
    pub instance_commitment: [u8; 32],
    pub initialization_slot: u64,
    pub curve_sold: u64,
    pub accounted_hakky: u64,
    pub accounted_wsol: u64,
    pub initializer: Pubkey,
    pub mint: Pubkey,
    pub hakky_vault: Pubkey,
    pub wsol_vault: Pubkey,
    pub vault_authority: Pubkey,
}

impl MarketStateV1 {
    pub fn decode(data: &[u8]) -> Result<Self, ProgramError> {
        if data.len() != MARKET_STATE_LEN
            || &data[MAGIC_RANGE] != MAGIC
            || data[LAYOUT_VERSION_OFFSET] != LAYOUT_VERSION
            || data[PHASE_OFFSET] > 1
            || data[RESERVED_RANGE].iter().any(|byte| *byte != 0)
        {
            return Err(HakkyErrorV1::InvalidMarketState.into());
        }

        let mut bumps = [0_u8; 6];
        bumps.copy_from_slice(&data[BUMPS_RANGE]);
        let state = Self {
            phase: data[PHASE_OFFSET],
            bumps,
            instance_nonce: read_array_32(data, INSTANCE_NONCE_RANGE),
            instance_commitment: read_array_32(data, INSTANCE_COMMITMENT_RANGE),
            initialization_slot: read_u64(data, INITIALIZATION_SLOT_RANGE),
            curve_sold: read_u64(data, CURVE_SOLD_RANGE),
            accounted_hakky: read_u64(data, ACCOUNTED_HAKKY_RANGE),
            accounted_wsol: read_u64(data, ACCOUNTED_WSOL_RANGE),
            initializer: Pubkey::new_from_array(read_array_32(data, INITIALIZER_RANGE)),
            mint: Pubkey::new_from_array(read_array_32(data, MINT_RANGE)),
            hakky_vault: Pubkey::new_from_array(read_array_32(data, HAKKY_VAULT_RANGE)),
            wsol_vault: Pubkey::new_from_array(read_array_32(data, WSOL_VAULT_RANGE)),
            vault_authority: Pubkey::new_from_array(read_array_32(data, VAULT_AUTHORITY_RANGE)),
        };
        state.validate()?;
        Ok(state)
    }

    pub fn encode(&self) -> [u8; MARKET_STATE_LEN] {
        let mut data = [0_u8; MARKET_STATE_LEN];
        data[MAGIC_RANGE].copy_from_slice(MAGIC);
        data[LAYOUT_VERSION_OFFSET] = LAYOUT_VERSION;
        data[PHASE_OFFSET] = self.phase;
        data[BUMPS_RANGE].copy_from_slice(&self.bumps);
        data[INSTANCE_NONCE_RANGE].copy_from_slice(&self.instance_nonce);
        data[INSTANCE_COMMITMENT_RANGE].copy_from_slice(&self.instance_commitment);
        data[INITIALIZATION_SLOT_RANGE].copy_from_slice(&self.initialization_slot.to_le_bytes());
        data[CURVE_SOLD_RANGE].copy_from_slice(&self.curve_sold.to_le_bytes());
        data[ACCOUNTED_HAKKY_RANGE].copy_from_slice(&self.accounted_hakky.to_le_bytes());
        data[ACCOUNTED_WSOL_RANGE].copy_from_slice(&self.accounted_wsol.to_le_bytes());
        data[INITIALIZER_RANGE].copy_from_slice(self.initializer.as_ref());
        data[MINT_RANGE].copy_from_slice(self.mint.as_ref());
        data[HAKKY_VAULT_RANGE].copy_from_slice(self.hakky_vault.as_ref());
        data[WSOL_VAULT_RANGE].copy_from_slice(self.wsol_vault.as_ref());
        data[VAULT_AUTHORITY_RANGE].copy_from_slice(self.vault_authority.as_ref());
        data
    }

    pub fn validate(&self) -> Result<(), ProgramError> {
        validate_instance_nonce(&self.instance_nonce)
            .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidMarketState))?;
        if self.instance_commitment != INSTANCE_COMMITMENT
            || self.initializer != INITIALIZER
            || self.phase > 1
        {
            return Err(HakkyErrorV1::InvalidMarketState.into());
        }
        let pdas = MarketPdasV1::derive_canonical(&self.instance_nonce)
            .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidMarketState))?;
        if self.bumps != pdas.bumps()
            || self.mint != pdas.mint
            || self.hakky_vault != pdas.hakky_vault
            || self.wsol_vault != pdas.wsol_vault
            || self.vault_authority != pdas.vault_authority
        {
            return Err(HakkyErrorV1::InvalidMarketState.into());
        }

        if self.phase == 0 {
            let Some(expected_hakky) = TOTAL_SUPPLY.checked_sub(self.curve_sold) else {
                return Err(HakkyErrorV1::InvalidMarketState.into());
            };
            let Some(expected_wsol) = curve_reserve(self.curve_sold) else {
                return Err(HakkyErrorV1::InvalidMarketState.into());
            };
            if self.curve_sold > CURVE_MAX
                || self.accounted_hakky != expected_hakky
                || self.accounted_wsol != expected_wsol
            {
                return Err(HakkyErrorV1::InvalidMarketState.into());
            }
        } else {
            let Some(product) =
                u128::from(self.accounted_hakky).checked_mul(u128::from(self.accounted_wsol))
            else {
                return Err(HakkyErrorV1::InvalidMarketState.into());
            };
            let Some(minimum) = u128::from(POOL_SEED).checked_mul(u128::from(TERMINAL_QUOTE))
            else {
                return Err(HakkyErrorV1::InvalidMarketState.into());
            };
            if self.curve_sold != CURVE_MAX
                || self.accounted_hakky == 0
                || self.accounted_hakky > TOTAL_SUPPLY
                || self.accounted_wsol == 0
                || product < minimum
            {
                return Err(HakkyErrorV1::InvalidMarketState.into());
            }
        }
        Ok(())
    }

    #[cfg(feature = "test-release-config")]
    pub fn initial_fixture() -> Self {
        let instance_nonce = [7_u8; 32];
        let pdas = match MarketPdasV1::derive_canonical(&instance_nonce) {
            Ok(value) => value,
            Err(error) => panic!("approved fixture PDA derivation failed: {error:?}"),
        };
        Self {
            phase: 0,
            bumps: pdas.bumps(),
            instance_nonce,
            instance_commitment: INSTANCE_COMMITMENT,
            initialization_slot: 0,
            curve_sold: 0,
            accounted_hakky: TOTAL_SUPPLY,
            accounted_wsol: 0,
            initializer: INITIALIZER,
            mint: pdas.mint,
            hakky_vault: pdas.hakky_vault,
            wsol_vault: pdas.wsol_vault,
            vault_authority: pdas.vault_authority,
        }
    }
}

fn curve_reserve(sold: u64) -> Option<u64> {
    if sold > CURVE_MAX {
        return None;
    }
    let sold = u128::from(sold);
    let curve_max = u128::from(CURVE_MAX);
    let numerator = u128::from(TERMINAL_QUOTE).checked_mul(sold)?;
    let denominator = curve_max
        .checked_mul(4)?
        .checked_sub(sold.checked_mul(3)?)?;
    u64::try_from(numerator.checked_div(denominator)?).ok()
}

fn read_array_32(data: &[u8], range: Range<usize>) -> [u8; 32] {
    let mut bytes = [0_u8; 32];
    bytes.copy_from_slice(&data[range]);
    bytes
}

fn read_u64(data: &[u8], range: Range<usize>) -> u64 {
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&data[range]);
    u64::from_le_bytes(bytes)
}
