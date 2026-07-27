use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, program_option::COption,
    program_pack::Pack, pubkey::Pubkey,
};
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

use crate::{
    constants::{
        EXPECTED_PROGRAM_ID, INITIALIZER, LOADER_PROGRAM, METADATA_PROGRAM, RENT_SYSVAR,
        SYSTEM_PROGRAM, TOKEN_DECIMALS, TOKEN_PROGRAM, TOTAL_SUPPLY, WSOL_MINT,
    },
    error::HakkyErrorV1,
    loader::assert_finalized_self,
    pda::MarketPdasV1,
    state::MarketStateV1,
};

const INITIALIZE_ACCOUNT_COUNT: usize = 16;
const SWAP_ACCOUNT_COUNT: usize = 10;

#[derive(Debug)]
pub struct InitializeAccountsV1<'a, 'info> {
    pub initializer: &'a AccountInfo<'info>,
    pub program: &'a AccountInfo<'info>,
    pub programdata: &'a AccountInfo<'info>,
    pub loader_program: &'a AccountInfo<'info>,
    pub state: &'a AccountInfo<'info>,
    pub mint: &'a AccountInfo<'info>,
    pub base_vault: &'a AccountInfo<'info>,
    pub quote_vault: &'a AccountInfo<'info>,
    pub vault_authority: &'a AccountInfo<'info>,
    pub metadata: &'a AccountInfo<'info>,
    pub metadata_sink: &'a AccountInfo<'info>,
    pub wsol_mint: &'a AccountInfo<'info>,
    pub system_program: &'a AccountInfo<'info>,
    pub token_program: &'a AccountInfo<'info>,
    pub metadata_program: &'a AccountInfo<'info>,
    pub rent_sysvar: &'a AccountInfo<'info>,
}

impl<'a, 'info> InitializeAccountsV1<'a, 'info> {
    pub fn parse(
        accounts: &'a [AccountInfo<'info>],
        instance_nonce: &[u8; 32],
    ) -> Result<Self, ProgramError> {
        if accounts.len() != INITIALIZE_ACCOUNT_COUNT {
            return Err(HakkyErrorV1::InvalidAccountCount.into());
        }
        require_privileges(
            accounts,
            &[
                (true, true),
                (false, false),
                (false, false),
                (false, false),
                (false, true),
                (false, true),
                (false, true),
                (false, true),
                (false, false),
                (false, true),
                (false, false),
                (false, false),
                (false, false),
                (false, false),
                (false, false),
                (false, false),
            ],
        )?;
        reject_aliases(accounts)?;
        require_key(&accounts[1], &EXPECTED_PROGRAM_ID)?;
        require_key(&accounts[3], &LOADER_PROGRAM)?;
        require_key(&accounts[11], &WSOL_MINT)?;
        require_key(&accounts[12], &SYSTEM_PROGRAM)?;
        require_key(&accounts[13], &TOKEN_PROGRAM)?;
        require_key(&accounts[14], &METADATA_PROGRAM)?;
        require_key(&accounts[15], &RENT_SYSVAR)?;

        let pdas = MarketPdasV1::derive_canonical(instance_nonce)?;
        require_pda(&accounts[4], &pdas.market)?;
        require_pda(&accounts[5], &pdas.mint)?;
        require_pda(&accounts[6], &pdas.hakky_vault)?;
        require_pda(&accounts[7], &pdas.wsol_vault)?;
        require_pda(&accounts[8], &pdas.vault_authority)?;
        require_pda(&accounts[10], &pdas.metadata_sink)?;
        let Some((metadata, _)) = Pubkey::try_find_program_address(
            &[b"metadata", METADATA_PROGRAM.as_ref(), pdas.mint.as_ref()],
            &METADATA_PROGRAM,
        ) else {
            return Err(HakkyErrorV1::InvalidPda.into());
        };
        require_pda(&accounts[9], &metadata)?;
        let Some((programdata, _)) =
            Pubkey::try_find_program_address(&[EXPECTED_PROGRAM_ID.as_ref()], &LOADER_PROGRAM)
        else {
            return Err(HakkyErrorV1::InvalidPda.into());
        };
        require_pda(&accounts[2], &programdata)?;

        if accounts[0].key != &INITIALIZER {
            return Err(HakkyErrorV1::InvalidInitializer.into());
        }
        assert_finalized_self(&accounts[1], &accounts[2])?;

        Ok(Self {
            initializer: &accounts[0],
            program: &accounts[1],
            programdata: &accounts[2],
            loader_program: &accounts[3],
            state: &accounts[4],
            mint: &accounts[5],
            base_vault: &accounts[6],
            quote_vault: &accounts[7],
            vault_authority: &accounts[8],
            metadata: &accounts[9],
            metadata_sink: &accounts[10],
            wsol_mint: &accounts[11],
            system_program: &accounts[12],
            token_program: &accounts[13],
            metadata_program: &accounts[14],
            rent_sysvar: &accounts[15],
        })
    }
}

#[derive(Debug)]
pub struct SwapAccountsV1<'a, 'info> {
    pub trader: &'a AccountInfo<'info>,
    pub state: &'a AccountInfo<'info>,
    pub mint: &'a AccountInfo<'info>,
    pub base_vault: &'a AccountInfo<'info>,
    pub quote_vault: &'a AccountInfo<'info>,
    pub vault_authority: &'a AccountInfo<'info>,
    pub trader_base: &'a AccountInfo<'info>,
    pub trader_quote: &'a AccountInfo<'info>,
    pub wsol_mint: &'a AccountInfo<'info>,
    pub token_program: &'a AccountInfo<'info>,
}

impl<'a, 'info> SwapAccountsV1<'a, 'info> {
    pub fn parse(accounts: &'a [AccountInfo<'info>]) -> Result<Self, ProgramError> {
        if accounts.len() != SWAP_ACCOUNT_COUNT {
            return Err(HakkyErrorV1::InvalidAccountCount.into());
        }
        require_privileges(
            accounts,
            &[
                (true, false),
                (false, true),
                (false, false),
                (false, true),
                (false, true),
                (false, false),
                (false, true),
                (false, true),
                (false, false),
                (false, false),
            ],
        )?;
        reject_aliases(accounts)?;
        require_key(&accounts[8], &WSOL_MINT)?;
        require_key(&accounts[9], &TOKEN_PROGRAM)?;

        let state_data = accounts[1]
            .try_borrow_data()
            .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidMarketState))?;
        let state = MarketStateV1::decode(&state_data)?;
        drop(state_data);
        let pdas = MarketPdasV1::derive_canonical(&state.instance_nonce)
            .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidMarketState))?;
        require_pda(&accounts[1], &pdas.market)?;
        require_pda(&accounts[2], &pdas.mint)?;
        require_pda(&accounts[3], &pdas.hakky_vault)?;
        require_pda(&accounts[4], &pdas.wsol_vault)?;
        require_pda(&accounts[5], &pdas.vault_authority)?;

        require_owner(&accounts[1], &EXPECTED_PROGRAM_ID)?;
        for account in [
            &accounts[2],
            &accounts[3],
            &accounts[4],
            &accounts[6],
            &accounts[7],
        ] {
            require_owner(account, &TOKEN_PROGRAM)?;
        }

        validate_mint(&accounts[2])?;
        validate_token_account(&accounts[3], &state.mint, &state.vault_authority, false)?;
        validate_token_account(&accounts[4], &WSOL_MINT, &state.vault_authority, true)?;
        validate_token_account(&accounts[6], &state.mint, accounts[0].key, false)?;
        validate_token_account(&accounts[7], &WSOL_MINT, accounts[0].key, true)?;

        Ok(Self {
            trader: &accounts[0],
            state: &accounts[1],
            mint: &accounts[2],
            base_vault: &accounts[3],
            quote_vault: &accounts[4],
            vault_authority: &accounts[5],
            trader_base: &accounts[6],
            trader_quote: &accounts[7],
            wsol_mint: &accounts[8],
            token_program: &accounts[9],
        })
    }
}

fn require_privileges(
    accounts: &[AccountInfo<'_>],
    expected: &[(bool, bool)],
) -> Result<(), ProgramError> {
    for (account, (is_signer, is_writable)) in accounts.iter().zip(expected) {
        if account.is_signer != *is_signer || account.is_writable != *is_writable {
            return Err(HakkyErrorV1::InvalidAccountPrivileges.into());
        }
    }
    Ok(())
}

fn reject_aliases(accounts: &[AccountInfo<'_>]) -> Result<(), ProgramError> {
    for left in 0..accounts.len() {
        for right in (left + 1)..accounts.len() {
            if accounts[left].key == accounts[right].key {
                return Err(HakkyErrorV1::AccountAlias.into());
            }
        }
    }
    Ok(())
}

fn require_key(account: &AccountInfo<'_>, expected: &Pubkey) -> Result<(), ProgramError> {
    if account.key != expected {
        return Err(HakkyErrorV1::InvalidFixedProgram.into());
    }
    Ok(())
}

fn require_pda(account: &AccountInfo<'_>, expected: &Pubkey) -> Result<(), ProgramError> {
    if account.key != expected {
        return Err(HakkyErrorV1::InvalidPda.into());
    }
    Ok(())
}

fn require_owner(account: &AccountInfo<'_>, expected: &Pubkey) -> Result<(), ProgramError> {
    if account.owner != expected {
        return Err(HakkyErrorV1::InvalidAccountOwner.into());
    }
    Ok(())
}

fn validate_mint(account: &AccountInfo<'_>) -> Result<(), ProgramError> {
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidTokenAccount))?;
    let mint =
        Mint::unpack(&data).map_err(|_| ProgramError::from(HakkyErrorV1::InvalidTokenAccount))?;
    if mint.mint_authority != COption::None
        || mint.supply != TOTAL_SUPPLY
        || mint.decimals != TOKEN_DECIMALS
        || !mint.is_initialized
        || mint.freeze_authority != COption::None
    {
        return Err(HakkyErrorV1::InvalidTokenAccount.into());
    }
    Ok(())
}

fn validate_token_account(
    account: &AccountInfo<'_>,
    expected_mint: &Pubkey,
    expected_owner: &Pubkey,
    expect_native: bool,
) -> Result<(), ProgramError> {
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidTokenAccount))?;
    let token_account = TokenAccount::unpack(&data)
        .map_err(|_| ProgramError::from(HakkyErrorV1::InvalidTokenAccount))?;
    let native_matches = matches!(
        (expect_native, token_account.is_native),
        (true, COption::Some(_)) | (false, COption::None)
    );
    if token_account.mint != *expected_mint
        || token_account.owner != *expected_owner
        || token_account.delegate != COption::None
        || token_account.delegated_amount != 0
        || token_account.state != AccountState::Initialized
        || token_account.close_authority != COption::None
        || !native_matches
    {
        return Err(HakkyErrorV1::InvalidTokenAccount.into());
    }
    Ok(())
}
