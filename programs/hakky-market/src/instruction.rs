use solana_program::program_error::ProgramError;

use crate::error::HakkyErrorV1;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HakkyInstructionV1 {
    Initialize {
        instance_nonce: [u8; 32],
    },
    BuyExactHakky {
        base_amount: u64,
        max_quote_in: u64,
        deadline_slot: u64,
    },
    SellExactHakky {
        base_amount: u64,
        min_quote_out: u64,
        deadline_slot: u64,
    },
}

impl HakkyInstructionV1 {
    pub fn decode(data: &[u8]) -> Result<Self, ProgramError> {
        let Some((&tag, _)) = data.split_first() else {
            return Err(HakkyErrorV1::InvalidInstructionLength.into());
        };

        match tag {
            0 => {
                if data.len() != 33 {
                    return Err(HakkyErrorV1::InvalidInstructionLength.into());
                }
                let mut instance_nonce = [0_u8; 32];
                instance_nonce.copy_from_slice(&data[1..33]);
                Ok(Self::Initialize { instance_nonce })
            }
            1 | 2 => {
                if data.len() != 25 {
                    return Err(HakkyErrorV1::InvalidInstructionLength.into());
                }
                let base_amount = read_u64(data, 1);
                let quote_limit = read_u64(data, 9);
                let deadline_slot = read_u64(data, 17);
                if base_amount == 0 || quote_limit == 0 {
                    return Err(HakkyErrorV1::ZeroAmount.into());
                }
                if tag == 1 {
                    Ok(Self::BuyExactHakky {
                        base_amount,
                        max_quote_in: quote_limit,
                        deadline_slot,
                    })
                } else {
                    Ok(Self::SellExactHakky {
                        base_amount,
                        min_quote_out: quote_limit,
                        deadline_slot,
                    })
                }
            }
            _ => Err(HakkyErrorV1::InvalidInstructionTag.into()),
        }
    }
}

fn read_u64(data: &[u8], start: usize) -> u64 {
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&data[start..start + 8]);
    u64::from_le_bytes(bytes)
}
