use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction},
    program::{invoke, invoke_signed},
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

use crate::{
    accounts::{InitializeAccountsV1, SwapAccountsV1},
    constants::{
        EXPECTED_PROGRAM_ID, INITIALIZER, INSTANCE_COMMITMENT, METADATA_PROGRAM, SYSTEM_PROGRAM,
        TOKEN_DECIMALS, TOKEN_PROGRAM, TOTAL_SUPPLY, WSOL_MINT,
    },
    error::HakkyErrorV1,
    math::{
        quote_curve_buy_exact_out, quote_curve_sell_exact_in, quote_pool_buy_exact_out,
        quote_pool_sell_exact_in,
    },
    metadata::{create_immutable_metadata, validate_immutable_metadata},
    pda::{
        MarketPdasV1, HAKKY_VAULT_SEED, MARKET_SEED, METADATA_SINK_SEED, MINT_SEED,
        VAULT_AUTHORITY_SEED, VERSION_SEED, WSOL_VAULT_SEED,
    },
    state::{MarketStateV1, MARKET_STATE_LEN},
    token::{
        decode_mint, decode_token_account, disable_mint_authority_instruction,
        initialize_account3_instruction, initialize_mint2_instruction,
        mint_total_supply_instruction, transfer_checked_instruction, MintView, TokenAccountView,
        MINT_LEN, TOKEN_ACCOUNT_LEN, TOKEN_STATE_INITIALIZED,
    },
};

pub(crate) fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instance_nonce: [u8; 32],
) -> ProgramResult {
    let accounts = InitializeAccountsV1::parse(accounts, &instance_nonce)?;
    validate_initial_prefunds(&accounts)?;
    let pdas = MarketPdasV1::derive_canonical(&instance_nonce)?;
    let bumps = pdas.bumps();
    let rent = Rent::get()?;

    let market_bump = [bumps[1]];
    let market_seeds: &[&[u8]] = &[MARKET_SEED, VERSION_SEED, &instance_nonce, &market_bump];
    adopt_pda(
        accounts.initializer,
        accounts.state,
        accounts.system_program,
        MARKET_STATE_LEN,
        program_id,
        market_seeds,
        &rent,
    )?;

    let mint_bump = [bumps[0]];
    let mint_seeds: &[&[u8]] = &[MINT_SEED, VERSION_SEED, &instance_nonce, &mint_bump];
    adopt_pda(
        accounts.initializer,
        accounts.mint,
        accounts.system_program,
        MINT_LEN,
        &TOKEN_PROGRAM,
        mint_seeds,
        &rent,
    )?;

    let base_vault_bump = [bumps[3]];
    let base_vault_seeds: &[&[u8]] = &[
        HAKKY_VAULT_SEED,
        VERSION_SEED,
        &instance_nonce,
        &base_vault_bump,
    ];
    adopt_pda(
        accounts.initializer,
        accounts.base_vault,
        accounts.system_program,
        TOKEN_ACCOUNT_LEN,
        &TOKEN_PROGRAM,
        base_vault_seeds,
        &rent,
    )?;

    let quote_vault_bump = [bumps[4]];
    let quote_vault_seeds: &[&[u8]] = &[
        WSOL_VAULT_SEED,
        VERSION_SEED,
        &instance_nonce,
        &quote_vault_bump,
    ];
    adopt_pda(
        accounts.initializer,
        accounts.quote_vault,
        accounts.system_program,
        TOKEN_ACCOUNT_LEN,
        &TOKEN_PROGRAM,
        quote_vault_seeds,
        &rent,
    )?;

    invoke(
        &initialize_mint2_instruction(accounts.mint.key, accounts.vault_authority.key)?,
        &[accounts.mint.clone(), accounts.token_program.clone()],
    )?;
    invoke(
        &initialize_account3_instruction(
            accounts.base_vault.key,
            accounts.mint.key,
            accounts.vault_authority.key,
        )?,
        &[
            accounts.base_vault.clone(),
            accounts.mint.clone(),
            accounts.token_program.clone(),
        ],
    )?;
    invoke(
        &initialize_account3_instruction(
            accounts.quote_vault.key,
            accounts.wsol_mint.key,
            accounts.vault_authority.key,
        )?,
        &[
            accounts.quote_vault.clone(),
            accounts.wsol_mint.clone(),
            accounts.token_program.clone(),
        ],
    )?;

    let vault_authority_bump = [bumps[2]];
    let vault_authority_seeds: &[&[u8]] = &[
        VAULT_AUTHORITY_SEED,
        VERSION_SEED,
        &instance_nonce,
        &vault_authority_bump,
    ];
    invoke_signed(
        &mint_total_supply_instruction(
            accounts.mint.key,
            accounts.base_vault.key,
            accounts.vault_authority.key,
        )?,
        &[
            accounts.mint.clone(),
            accounts.base_vault.clone(),
            accounts.vault_authority.clone(),
            accounts.token_program.clone(),
        ],
        &[vault_authority_seeds],
    )?;

    let metadata_sink_bump = [bumps[5]];
    let metadata_sink_seeds: &[&[u8]] = &[
        METADATA_SINK_SEED,
        VERSION_SEED,
        &instance_nonce,
        &metadata_sink_bump,
    ];
    invoke_signed(
        &create_immutable_metadata(
            accounts.metadata.key,
            accounts.mint.key,
            accounts.vault_authority.key,
            accounts.initializer.key,
            accounts.metadata_sink.key,
        ),
        &[
            accounts.metadata.clone(),
            accounts.mint.clone(),
            accounts.vault_authority.clone(),
            accounts.initializer.clone(),
            accounts.metadata_sink.clone(),
            accounts.system_program.clone(),
            accounts.rent_sysvar.clone(),
            accounts.metadata_program.clone(),
        ],
        &[vault_authority_seeds, metadata_sink_seeds],
    )?;

    invoke_signed(
        &disable_mint_authority_instruction(accounts.mint.key, accounts.vault_authority.key)?,
        &[
            accounts.mint.clone(),
            accounts.vault_authority.clone(),
            accounts.token_program.clone(),
        ],
        &[vault_authority_seeds],
    )?;

    let initial_state = MarketStateV1 {
        phase: 0,
        bumps,
        instance_nonce,
        instance_commitment: INSTANCE_COMMITMENT,
        initialization_slot: Clock::get()?.slot,
        curve_sold: 0,
        accounted_hakky: TOTAL_SUPPLY,
        accounted_wsol: 0,
        initializer: INITIALIZER,
        mint: pdas.mint,
        hakky_vault: pdas.hakky_vault,
        wsol_vault: pdas.wsol_vault,
        vault_authority: pdas.vault_authority,
    };
    initial_state.validate()?;
    accounts
        .state
        .try_borrow_mut_data()
        .map_err(|_| HakkyErrorV1::PostconditionFailed)?
        .copy_from_slice(&initial_state.encode());

    validate_initialization_postconditions(&accounts, &initial_state)
}

pub(crate) fn process_buy(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    base_amount: u64,
    max_quote_in: u64,
    deadline_slot: u64,
) -> ProgramResult {
    let accounts = SwapAccountsV1::parse(accounts)?;
    process_swap(
        &accounts,
        SwapDirection::Buy,
        base_amount,
        max_quote_in,
        deadline_slot,
    )
}

fn validate_initial_prefunds(accounts: &InitializeAccountsV1<'_, '_>) -> ProgramResult {
    if accounts.state.owner == &EXPECTED_PROGRAM_ID && accounts.state.data_len() == MARKET_STATE_LEN
    {
        return Err(HakkyErrorV1::AlreadyInitialized.into());
    }

    for account in [
        accounts.state,
        accounts.mint,
        accounts.base_vault,
        accounts.quote_vault,
        accounts.vault_authority,
        accounts.metadata,
        accounts.metadata_sink,
    ] {
        if account.owner != &SYSTEM_PROGRAM || account.data_len() != 0 {
            return Err(HakkyErrorV1::InvalidPrefund.into());
        }
    }
    Ok(())
}

fn adopt_pda<'info>(
    payer: &AccountInfo<'info>,
    account: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    space: usize,
    owner: &Pubkey,
    signer_seeds: &[&[u8]],
    rent: &Rent,
) -> ProgramResult {
    let rent_minimum = rent.minimum_balance(space);
    let shortfall = rent_minimum.saturating_sub(account.lamports());
    if shortfall > 0 {
        invoke(
            &system_transfer_instruction(payer.key, account.key, shortfall),
            &[payer.clone(), account.clone(), system_program.clone()],
        )?;
    }

    invoke_signed(
        &system_allocate_instruction(account.key, space as u64),
        &[account.clone(), system_program.clone()],
        &[signer_seeds],
    )?;
    invoke_signed(
        &system_assign_instruction(account.key, owner),
        &[account.clone(), system_program.clone()],
        &[signer_seeds],
    )?;

    if account.owner != owner || account.data_len() != space || account.lamports() < rent_minimum {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }
    Ok(())
}

fn system_transfer_instruction(from: &Pubkey, to: &Pubkey, lamports: u64) -> Instruction {
    let mut data = Vec::with_capacity(12);
    data.extend_from_slice(&2_u32.to_le_bytes());
    data.extend_from_slice(&lamports.to_le_bytes());
    Instruction {
        program_id: SYSTEM_PROGRAM,
        accounts: vec![AccountMeta::new(*from, true), AccountMeta::new(*to, false)],
        data,
    }
}

fn system_allocate_instruction(account: &Pubkey, space: u64) -> Instruction {
    let mut data = Vec::with_capacity(12);
    data.extend_from_slice(&8_u32.to_le_bytes());
    data.extend_from_slice(&space.to_le_bytes());
    Instruction {
        program_id: SYSTEM_PROGRAM,
        accounts: vec![AccountMeta::new(*account, true)],
        data,
    }
}

fn system_assign_instruction(account: &Pubkey, owner: &Pubkey) -> Instruction {
    let mut data = Vec::with_capacity(36);
    data.extend_from_slice(&1_u32.to_le_bytes());
    data.extend_from_slice(owner.as_ref());
    Instruction {
        program_id: SYSTEM_PROGRAM,
        accounts: vec![AccountMeta::new(*account, true)],
        data,
    }
}

fn validate_initialization_postconditions(
    accounts: &InitializeAccountsV1<'_, '_>,
    expected_state: &MarketStateV1,
) -> ProgramResult {
    if accounts.state.owner != &EXPECTED_PROGRAM_ID {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }
    let state_data = accounts
        .state
        .try_borrow_data()
        .map_err(|_| HakkyErrorV1::PostconditionFailed)?;
    let actual_state = MarketStateV1::decode(&state_data)?;
    if &actual_state != expected_state {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }
    drop(state_data);

    if accounts.mint.owner != &TOKEN_PROGRAM
        || accounts.base_vault.owner != &TOKEN_PROGRAM
        || accounts.quote_vault.owner != &TOKEN_PROGRAM
    {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }

    let mint = unpack_mint(accounts.mint)?;
    if mint.mint_authority.is_some()
        || mint.supply != TOTAL_SUPPLY
        || mint.decimals != TOKEN_DECIMALS
        || !mint.is_initialized
        || mint.freeze_authority.is_some()
    {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }

    let base_vault = unpack_token_account(accounts.base_vault)?;
    if base_vault.mint != expected_state.mint
        || base_vault.owner != expected_state.vault_authority
        || base_vault.amount != TOTAL_SUPPLY
        || base_vault.delegate.is_some()
        || base_vault.delegated_amount != 0
        || base_vault.state != TOKEN_STATE_INITIALIZED
        || base_vault.is_native.is_some()
        || base_vault.close_authority.is_some()
    {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }

    let quote_vault = unpack_token_account(accounts.quote_vault)?;
    if quote_vault.mint != WSOL_MINT
        || quote_vault.owner != expected_state.vault_authority
        || quote_vault.delegate.is_some()
        || quote_vault.delegated_amount != 0
        || quote_vault.state != TOKEN_STATE_INITIALIZED
        || quote_vault.close_authority.is_some()
    {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }
    let Some(native_reserve) = quote_vault.is_native else {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    };
    let expected_native_amount = accounts
        .quote_vault
        .lamports()
        .checked_sub(native_reserve)
        .ok_or(HakkyErrorV1::PostconditionFailed)?;
    if quote_vault.amount != expected_native_amount {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }

    if accounts.metadata.owner != &METADATA_PROGRAM {
        return Err(HakkyErrorV1::InvalidMetadata.into());
    }
    let metadata_data = accounts
        .metadata
        .try_borrow_data()
        .map_err(|_| HakkyErrorV1::InvalidMetadata)?;
    validate_immutable_metadata(
        &metadata_data,
        &expected_state.mint,
        accounts.metadata_sink.key,
    )
}

fn unpack_mint(
    account: &AccountInfo<'_>,
) -> Result<MintView, solana_program::program_error::ProgramError> {
    let data = account
        .try_borrow_data()
        .map_err(|_| HakkyErrorV1::PostconditionFailed)?;
    decode_mint(&data).map_err(|_| HakkyErrorV1::PostconditionFailed.into())
}

fn unpack_token_account(
    account: &AccountInfo<'_>,
) -> Result<TokenAccountView, solana_program::program_error::ProgramError> {
    let data = account
        .try_borrow_data()
        .map_err(|_| HakkyErrorV1::PostconditionFailed)?;
    decode_token_account(&data).map_err(|_| HakkyErrorV1::PostconditionFailed.into())
}

fn token_amount(
    account: &AccountInfo<'_>,
    error: HakkyErrorV1,
) -> Result<u64, solana_program::program_error::ProgramError> {
    let data = account.try_borrow_data().map_err(|_| error)?;
    let account = decode_token_account(&data).map_err(|_| error)?;
    Ok(account.amount)
}

pub(crate) fn process_sell(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    base_amount: u64,
    min_quote_out: u64,
    deadline_slot: u64,
) -> ProgramResult {
    let accounts = SwapAccountsV1::parse(accounts)?;
    process_swap(
        &accounts,
        SwapDirection::Sell,
        base_amount,
        min_quote_out,
        deadline_slot,
    )
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SwapDirection {
    Buy,
    Sell,
}

fn process_swap(
    accounts: &SwapAccountsV1<'_, '_>,
    direction: SwapDirection,
    base_amount: u64,
    quote_limit: u64,
    deadline_slot: u64,
) -> ProgramResult {
    let state_data = accounts
        .state
        .try_borrow_data()
        .map_err(|_| HakkyErrorV1::InvalidMarketState)?;
    let state = MarketStateV1::decode(&state_data)?;
    drop(state_data);

    if Clock::get()?.slot > deadline_slot {
        return Err(HakkyErrorV1::DeadlineExpired.into());
    }

    let quote_amount = match (direction, state.phase) {
        (SwapDirection::Buy, 0) => quote_curve_buy_exact_out(state.curve_sold, base_amount)?,
        (SwapDirection::Sell, 0) => quote_curve_sell_exact_in(state.curve_sold, base_amount)?,
        (SwapDirection::Buy, 1) => {
            quote_pool_buy_exact_out(state.accounted_hakky, state.accounted_wsol, base_amount)?
        }
        (SwapDirection::Sell, 1) => {
            quote_pool_sell_exact_in(state.accounted_hakky, state.accounted_wsol, base_amount)?
        }
        _ => return Err(HakkyErrorV1::InvalidPhase.into()),
    };
    match direction {
        SwapDirection::Buy if quote_amount > quote_limit => {
            return Err(HakkyErrorV1::SlippageExceeded.into());
        }
        SwapDirection::Sell if quote_amount < quote_limit => {
            return Err(HakkyErrorV1::SlippageExceeded.into());
        }
        _ => {}
    }

    let base_before = token_amount(accounts.base_vault, HakkyErrorV1::InvalidTokenAccount)?;
    let quote_before = token_amount(accounts.quote_vault, HakkyErrorV1::InvalidTokenAccount)?;
    if base_before < state.accounted_hakky || quote_before < state.accounted_wsol {
        return Err(HakkyErrorV1::ActualBelowAccounted.into());
    }

    let mut candidate = state.clone();
    match (direction, state.phase) {
        (SwapDirection::Buy, 0) => {
            candidate.curve_sold = candidate
                .curve_sold
                .checked_add(base_amount)
                .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
            candidate.accounted_hakky = candidate
                .accounted_hakky
                .checked_sub(base_amount)
                .ok_or(HakkyErrorV1::ReserveInvariant)?;
            candidate.accounted_wsol = candidate
                .accounted_wsol
                .checked_add(quote_amount)
                .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
            if candidate.curve_sold == crate::constants::CURVE_MAX {
                candidate.phase = 1;
            }
        }
        (SwapDirection::Sell, 0) => {
            candidate.curve_sold = candidate
                .curve_sold
                .checked_sub(base_amount)
                .ok_or(HakkyErrorV1::InsufficientCurveLiquidity)?;
            candidate.accounted_hakky = candidate
                .accounted_hakky
                .checked_add(base_amount)
                .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
            candidate.accounted_wsol = candidate
                .accounted_wsol
                .checked_sub(quote_amount)
                .ok_or(HakkyErrorV1::ReserveInvariant)?;
        }
        (SwapDirection::Buy, 1) => {
            candidate.accounted_hakky = candidate
                .accounted_hakky
                .checked_sub(base_amount)
                .ok_or(HakkyErrorV1::ReserveInvariant)?;
            candidate.accounted_wsol = candidate
                .accounted_wsol
                .checked_add(quote_amount)
                .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
        }
        (SwapDirection::Sell, 1) => {
            candidate.accounted_hakky = candidate
                .accounted_hakky
                .checked_add(base_amount)
                .ok_or(HakkyErrorV1::ArithmeticOverflow)?;
            candidate.accounted_wsol = candidate
                .accounted_wsol
                .checked_sub(quote_amount)
                .ok_or(HakkyErrorV1::ReserveInvariant)?;
        }
        _ => return Err(HakkyErrorV1::InvalidPhase.into()),
    }
    candidate.validate()?;

    match direction {
        SwapDirection::Buy => {
            invoke(
                &transfer_checked_instruction(
                    accounts.trader_quote.key,
                    accounts.wsol_mint.key,
                    accounts.quote_vault.key,
                    accounts.trader.key,
                    quote_amount,
                    9,
                )?,
                &[
                    accounts.trader_quote.clone(),
                    accounts.wsol_mint.clone(),
                    accounts.quote_vault.clone(),
                    accounts.trader.clone(),
                    accounts.token_program.clone(),
                ],
            )?;
            transfer_from_vault(
                accounts,
                accounts.base_vault,
                accounts.mint,
                accounts.trader_base,
                base_amount,
                TOKEN_DECIMALS,
                &state,
            )?;
        }
        SwapDirection::Sell => {
            invoke(
                &transfer_checked_instruction(
                    accounts.trader_base.key,
                    accounts.mint.key,
                    accounts.base_vault.key,
                    accounts.trader.key,
                    base_amount,
                    TOKEN_DECIMALS,
                )?,
                &[
                    accounts.trader_base.clone(),
                    accounts.mint.clone(),
                    accounts.base_vault.clone(),
                    accounts.trader.clone(),
                    accounts.token_program.clone(),
                ],
            )?;
            transfer_from_vault(
                accounts,
                accounts.quote_vault,
                accounts.wsol_mint,
                accounts.trader_quote,
                quote_amount,
                9,
                &state,
            )?;
        }
    }

    let base_after = token_amount(accounts.base_vault, HakkyErrorV1::VaultDeltaMismatch)?;
    let quote_after = token_amount(accounts.quote_vault, HakkyErrorV1::VaultDeltaMismatch)?;
    let exact_delta = match direction {
        SwapDirection::Buy => {
            base_before.checked_sub(base_amount) == Some(base_after)
                && quote_before.checked_add(quote_amount) == Some(quote_after)
        }
        SwapDirection::Sell => {
            base_before.checked_add(base_amount) == Some(base_after)
                && quote_before.checked_sub(quote_amount) == Some(quote_after)
        }
    };
    if !exact_delta {
        return Err(HakkyErrorV1::VaultDeltaMismatch.into());
    }
    if base_after < candidate.accounted_hakky || quote_after < candidate.accounted_wsol {
        return Err(HakkyErrorV1::ActualBelowAccounted.into());
    }

    accounts
        .state
        .try_borrow_mut_data()
        .map_err(|_| HakkyErrorV1::PostconditionFailed)?
        .copy_from_slice(&candidate.encode());
    let final_state_data = accounts
        .state
        .try_borrow_data()
        .map_err(|_| HakkyErrorV1::PostconditionFailed)?;
    let final_state = MarketStateV1::decode(&final_state_data)?;
    if final_state != candidate {
        return Err(HakkyErrorV1::PostconditionFailed.into());
    }
    Ok(())
}

fn transfer_from_vault<'info>(
    accounts: &SwapAccountsV1<'_, 'info>,
    source: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    destination: &AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    state: &MarketStateV1,
) -> ProgramResult {
    let vault_authority_bump = [state.bumps[2]];
    let signer_seeds: &[&[u8]] = &[
        VAULT_AUTHORITY_SEED,
        VERSION_SEED,
        &state.instance_nonce,
        &vault_authority_bump,
    ];
    invoke_signed(
        &transfer_checked_instruction(
            source.key,
            mint.key,
            destination.key,
            accounts.vault_authority.key,
            amount,
            decimals,
        )?,
        &[
            source.clone(),
            mint.clone(),
            destination.clone(),
            accounts.vault_authority.clone(),
            accounts.token_program.clone(),
        ],
        &[signer_seeds],
    )
}
