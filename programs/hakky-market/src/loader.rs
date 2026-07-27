use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

use crate::{
    constants::{EXPECTED_PROGRAM_ID, LOADER_PROGRAM},
    error::HakkyErrorV1,
};

const PROGRAM_ACCOUNT_LEN: usize = 36;
const PROGRAMDATA_HEADER_LEN: usize = 45;
const PROGRAM_VARIANT: [u8; 4] = 2_u32.to_le_bytes();
const PROGRAMDATA_VARIANT: [u8; 4] = 3_u32.to_le_bytes();

pub fn assert_finalized_self(
    program: &AccountInfo<'_>,
    programdata: &AccountInfo<'_>,
) -> Result<(), ProgramError> {
    if program.key != &EXPECTED_PROGRAM_ID {
        return Err(HakkyErrorV1::InvalidFixedProgram.into());
    }
    if program.owner != &LOADER_PROGRAM || programdata.owner != &LOADER_PROGRAM {
        return Err(HakkyErrorV1::InvalidAccountOwner.into());
    }
    if !program.executable {
        return Err(HakkyErrorV1::ProgramNotImmutable.into());
    }
    if programdata.executable {
        return Err(HakkyErrorV1::InvalidLoaderState.into());
    }

    let program_bytes = program
        .try_borrow_data()
        .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidLoaderState))?;
    if program_bytes.len() != PROGRAM_ACCOUNT_LEN || program_bytes[..4] != PROGRAM_VARIANT {
        return Err(HakkyErrorV1::InvalidLoaderState.into());
    }
    let mut linked_bytes = [0_u8; 32];
    linked_bytes.copy_from_slice(&program_bytes[4..PROGRAM_ACCOUNT_LEN]);
    let linked_programdata = Pubkey::new_from_array(linked_bytes);
    drop(program_bytes);

    let Some((canonical_programdata, _)) =
        Pubkey::try_find_program_address(&[EXPECTED_PROGRAM_ID.as_ref()], &LOADER_PROGRAM)
    else {
        return Err(HakkyErrorV1::InvalidPda.into());
    };
    if programdata.key != &canonical_programdata {
        return Err(HakkyErrorV1::InvalidPda.into());
    }
    if linked_programdata != canonical_programdata {
        return Err(HakkyErrorV1::InvalidLoaderState.into());
    }

    let programdata_bytes = programdata
        .try_borrow_data()
        .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidLoaderState))?;
    if programdata_bytes.len() < PROGRAMDATA_HEADER_LEN
        || programdata_bytes[..4] != PROGRAMDATA_VARIANT
    {
        return Err(HakkyErrorV1::InvalidLoaderState.into());
    }
    match programdata_bytes[12] {
        0 => {}
        1 => return Err(HakkyErrorV1::ProgramNotImmutable.into()),
        _ => return Err(HakkyErrorV1::InvalidLoaderState.into()),
    }
    Ok(())
}
