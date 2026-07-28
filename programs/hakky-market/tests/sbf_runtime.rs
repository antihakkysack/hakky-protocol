use std::{env, fs, path::PathBuf};

use borsh::{BorshDeserialize, BorshSerialize};
use hakky_market::{
    constants::{
        EXPECTED_PROGRAM_ID, INITIALIZER, INSTANCE_COMMITMENT, LOADER_PROGRAM, METADATA_PROGRAM,
        METADATA_URI, RENT_SYSVAR, SYSTEM_PROGRAM, TOKEN_DECIMALS, TOKEN_NAME, TOKEN_PROGRAM,
        TOKEN_SYMBOL, TOTAL_SUPPLY, WSOL_MINT,
    },
    error::HakkyErrorV1,
    math::{curve_reserve, quote_curve_buy_exact_out, quote_curve_sell_exact_in},
    pda::MarketPdasV1,
    state::MarketStateV1,
};
use mpl_token_metadata::{
    accounts::Metadata,
    instructions::CreateMetadataAccountV3InstructionArgs,
    types::{Key, TokenStandard},
};
#[allow(deprecated)]
use solana_program::system_instruction;
use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_option::COption,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use solana_program_test::{processor, ProgramTest, ProgramTestContext};
use solana_sdk::{
    account::Account as SolanaAccount,
    compute_budget::ComputeBudgetInstruction,
    instruction::{AccountMeta, Instruction},
    signature::{Keypair, SeedDerivable, Signer},
    transaction::Transaction,
};
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

fn swap_data(tag: u8) -> Vec<u8> {
    let mut data = vec![0_u8; 25];
    data[0] = tag;
    data[1..9].copy_from_slice(&1_u64.to_le_bytes());
    data[9..17].copy_from_slice(&1_u64.to_le_bytes());
    data[17..25].copy_from_slice(&u64::MAX.to_le_bytes());
    data
}

async fn assert_custom_error(
    context: &solana_program_test::ProgramTestContext,
    data: Vec<u8>,
    expected: HakkyErrorV1,
) {
    let blockhash = context.banks_client.get_latest_blockhash().await.unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction {
            program_id: EXPECTED_PROGRAM_ID,
            accounts: Vec::new(),
            data,
        }],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        blockhash,
    );
    let error = context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap_err();
    let rendered = format!("{error:?}");
    assert!(
        rendered.contains(&format!("Custom({})", expected as u32)),
        "expected {expected:?}, got {rendered}",
    );
}

fn packed_mint() -> Vec<u8> {
    let mut data = vec![0_u8; Mint::LEN];
    Mint::pack(
        Mint {
            mint_authority: COption::None,
            supply: TOTAL_SUPPLY,
            decimals: TOKEN_DECIMALS,
            is_initialized: true,
            freeze_authority: COption::None,
        },
        &mut data,
    )
    .unwrap();
    data
}

fn packed_native_mint() -> Vec<u8> {
    let mut data = vec![0_u8; Mint::LEN];
    Mint::pack(
        Mint {
            mint_authority: COption::None,
            supply: 0,
            decimals: 9,
            is_initialized: true,
            freeze_authority: COption::None,
        },
        &mut data,
    )
    .unwrap();
    data
}

fn programdata_address() -> Pubkey {
    Pubkey::find_program_address(&[EXPECTED_PROGRAM_ID.as_ref()], &LOADER_PROGRAM).0
}

fn upgradeable_program_data(programdata: Pubkey) -> Vec<u8> {
    let mut data = Vec::with_capacity(36);
    data.extend_from_slice(&2_u32.to_le_bytes());
    data.extend_from_slice(programdata.as_ref());
    data
}

fn finalized_programdata_with_sbf(binary: &[u8]) -> Vec<u8> {
    let mut data = Vec::with_capacity(45 + binary.len());
    data.extend_from_slice(&3_u32.to_le_bytes());
    data.extend_from_slice(&0_u64.to_le_bytes());
    data.push(0);
    data.extend_from_slice(&[0_u8; 32]);
    data.extend_from_slice(binary);
    data
}

fn metadata_address(mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"metadata", METADATA_PROGRAM.as_ref(), mint.as_ref()],
        &METADATA_PROGRAM,
    )
    .0
}

fn edition_bump(mint: &Pubkey) -> u8 {
    Pubkey::find_program_address(
        &[
            b"metadata",
            METADATA_PROGRAM.as_ref(),
            mint.as_ref(),
            b"edition",
        ],
        &METADATA_PROGRAM,
    )
    .1
}

fn puffed_string(value: &str, length: usize) -> String {
    let mut bytes = value.as_bytes().to_vec();
    bytes.resize(length, 0);
    String::from_utf8(bytes).unwrap()
}

fn metadata_test_processor(
    program_id: &Pubkey,
    accounts: &[AccountInfo<'_>],
    data: &[u8],
) -> ProgramResult {
    if program_id != &METADATA_PROGRAM || accounts.len() != 7 || data.first() != Some(&33) {
        return Err(ProgramError::InvalidInstructionData);
    }
    let args = CreateMetadataAccountV3InstructionArgs::try_from_slice(&data[1..])
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    if args.data.name != TOKEN_NAME
        || args.data.symbol != TOKEN_SYMBOL
        || args.data.uri != METADATA_URI
        || args.data.seller_fee_basis_points != 0
        || args.data.creators.is_some()
        || args.data.collection.is_some()
        || args.data.uses.is_some()
        || args.is_mutable
        || args.collection_details.is_some()
        || !accounts[2].is_signer
        || !accounts[3].is_signer
        || !accounts[4].is_signer
        || accounts[5].key != &SYSTEM_PROGRAM
        || accounts[6].key != &RENT_SYSVAR
    {
        return Err(ProgramError::InvalidInstructionData);
    }

    let (expected_metadata, bump) = Pubkey::find_program_address(
        &[b"metadata", program_id.as_ref(), accounts[1].key.as_ref()],
        program_id,
    );
    if accounts[0].key != &expected_metadata
        || accounts[0].owner != &SYSTEM_PROGRAM
        || accounts[0].data_len() != 0
    {
        return Err(ProgramError::InvalidAccountData);
    }

    let metadata = Metadata {
        key: Key::MetadataV1,
        update_authority: *accounts[4].key,
        mint: *accounts[1].key,
        name: puffed_string(&args.data.name, 32),
        symbol: puffed_string(&args.data.symbol, 10),
        uri: puffed_string(&args.data.uri, 200),
        seller_fee_basis_points: args.data.seller_fee_basis_points,
        creators: args.data.creators,
        primary_sale_happened: false,
        is_mutable: args.is_mutable,
        edition_nonce: Some(edition_bump(accounts[1].key)),
        token_standard: Some(TokenStandard::Fungible),
        collection: args.data.collection,
        uses: args.data.uses,
        collection_details: args.collection_details,
        programmable_config: None,
    };
    let mut encoded = metadata
        .try_to_vec()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    encoded.resize(hakky_market::metadata::METADATA_ACCOUNT_LEN, 0);
    let rent = Rent::from_account_info(&accounts[6])?;
    let shortfall = rent
        .minimum_balance(encoded.len())
        .saturating_sub(accounts[0].lamports());
    if shortfall > 0 {
        invoke(
            &system_instruction::transfer(accounts[3].key, accounts[0].key, shortfall),
            &[
                accounts[3].clone(),
                accounts[0].clone(),
                accounts[5].clone(),
            ],
        )?;
    }

    let bump_seed = [bump];
    let metadata_seeds: &[&[u8]] = &[
        b"metadata",
        program_id.as_ref(),
        accounts[1].key.as_ref(),
        &bump_seed,
    ];
    invoke_signed(
        &system_instruction::allocate(accounts[0].key, encoded.len() as u64),
        &[accounts[0].clone(), accounts[5].clone()],
        &[metadata_seeds],
    )?;
    invoke_signed(
        &system_instruction::assign(accounts[0].key, program_id),
        &[accounts[0].clone(), accounts[5].clone()],
        &[metadata_seeds],
    )?;
    accounts[0].try_borrow_mut_data()?.copy_from_slice(&encoded);
    Ok(())
}

fn test_initializer() -> Keypair {
    let seed: [u8; 32] = core::array::from_fn(|index| 255_u8.wrapping_sub(index as u8));
    let keypair = Keypair::from_seed(&seed).unwrap();
    assert_eq!(keypair.pubkey(), INITIALIZER);
    keypair
}

fn initialization_instruction(pdas: &MarketPdasV1) -> Instruction {
    let mut data = vec![0_u8; 33];
    data[1..].copy_from_slice(&[7_u8; 32]);
    Instruction {
        program_id: EXPECTED_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(INITIALIZER, true),
            AccountMeta::new_readonly(EXPECTED_PROGRAM_ID, false),
            AccountMeta::new_readonly(programdata_address(), false),
            AccountMeta::new_readonly(LOADER_PROGRAM, false),
            AccountMeta::new(pdas.market, false),
            AccountMeta::new(pdas.mint, false),
            AccountMeta::new(pdas.hakky_vault, false),
            AccountMeta::new(pdas.wsol_vault, false),
            AccountMeta::new_readonly(pdas.vault_authority, false),
            AccountMeta::new(metadata_address(&pdas.mint), false),
            AccountMeta::new_readonly(pdas.metadata_sink, false),
            AccountMeta::new_readonly(WSOL_MINT, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
            AccountMeta::new_readonly(TOKEN_PROGRAM, false),
            AccountMeta::new_readonly(METADATA_PROGRAM, false),
            AccountMeta::new_readonly(RENT_SYSVAR, false),
        ],
        data,
    }
}

fn packed_token(mint: Pubkey, owner: Pubkey, amount: u64, native_reserve: Option<u64>) -> Vec<u8> {
    let mut data = vec![0_u8; TokenAccount::LEN];
    TokenAccount::pack(
        TokenAccount {
            mint,
            owner,
            amount,
            delegate: COption::None,
            state: AccountState::Initialized,
            is_native: native_reserve.map_or(COption::None, COption::Some),
            delegated_amount: 0,
            close_authority: COption::None,
        },
        &mut data,
    )
    .unwrap();
    data
}

fn release_state(sold: u64) -> (MarketStateV1, MarketPdasV1) {
    let instance_nonce = [7_u8; 32];
    let pdas = MarketPdasV1::derive_canonical(&instance_nonce).unwrap();
    let state = MarketStateV1 {
        phase: 0,
        bumps: pdas.bumps(),
        instance_nonce,
        instance_commitment: INSTANCE_COMMITMENT,
        initialization_slot: 1,
        curve_sold: sold,
        accounted_hakky: TOTAL_SUPPLY - sold,
        accounted_wsol: curve_reserve(sold).unwrap(),
        initializer: INITIALIZER,
        mint: pdas.mint,
        hakky_vault: pdas.hakky_vault,
        wsol_vault: pdas.wsol_vault,
        vault_authority: pdas.vault_authority,
    };
    state.validate().unwrap();
    (state, pdas)
}

struct SbfMarket {
    context: ProgramTestContext,
    trader: Keypair,
    trader_base: Pubkey,
    trader_quote: Pubkey,
    state: MarketStateV1,
    pdas: MarketPdasV1,
}

async fn start_sbf_market() -> SbfMarket {
    let sold = 2_000_000_000_000;
    let (state, pdas) = release_state(sold);
    let trader = Keypair::new();
    let trader_base = Pubkey::new_unique();
    let trader_quote = Pubkey::new_unique();
    let rent = Rent::default();
    let token_rent = rent.minimum_balance(TokenAccount::LEN);
    let mint_rent = rent.minimum_balance(Mint::LEN);
    let quote_amount = 100_000_000_000;

    let mut test = ProgramTest::default();
    test.prefer_bpf(true);
    test.add_program("hakky_market", EXPECTED_PROGRAM_ID, None);
    test.prefer_bpf(false);
    test.add_program(
        "spl_token",
        TOKEN_PROGRAM,
        processor!(spl_token::processor::Processor::process),
    );
    test.add_account(
        pdas.market,
        SolanaAccount {
            lamports: rent.minimum_balance(state.encode().len()),
            data: state.encode().to_vec(),
            owner: EXPECTED_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        pdas.mint,
        SolanaAccount {
            lamports: mint_rent,
            data: packed_mint(),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        pdas.hakky_vault,
        SolanaAccount {
            lamports: token_rent,
            data: packed_token(pdas.mint, pdas.vault_authority, state.accounted_hakky, None),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        pdas.wsol_vault,
        SolanaAccount {
            lamports: token_rent + state.accounted_wsol,
            data: packed_token(
                WSOL_MINT,
                pdas.vault_authority,
                state.accounted_wsol,
                Some(token_rent),
            ),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        pdas.vault_authority,
        SolanaAccount {
            lamports: 1,
            data: Vec::new(),
            owner: SYSTEM_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        trader.pubkey(),
        SolanaAccount {
            lamports: 1_000_000_000,
            data: Vec::new(),
            owner: SYSTEM_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        trader_base,
        SolanaAccount {
            lamports: token_rent,
            data: packed_token(pdas.mint, trader.pubkey(), 1_000_000_000, None),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        trader_quote,
        SolanaAccount {
            lamports: token_rent + quote_amount,
            data: packed_token(WSOL_MINT, trader.pubkey(), quote_amount, Some(token_rent)),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        WSOL_MINT,
        SolanaAccount {
            lamports: mint_rent,
            data: packed_native_mint(),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );

    SbfMarket {
        context: test.start_with_context().await,
        trader,
        trader_base,
        trader_quote,
        state,
        pdas,
    }
}

fn market_swap_instruction(
    market: &SbfMarket,
    tag: u8,
    base_amount: u64,
    quote_limit: u64,
) -> Instruction {
    let mut data = swap_data(tag);
    data[1..9].copy_from_slice(&base_amount.to_le_bytes());
    data[9..17].copy_from_slice(&quote_limit.to_le_bytes());
    Instruction {
        program_id: EXPECTED_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new_readonly(market.trader.pubkey(), true),
            AccountMeta::new(market.pdas.market, false),
            AccountMeta::new_readonly(market.pdas.mint, false),
            AccountMeta::new(market.pdas.hakky_vault, false),
            AccountMeta::new(market.pdas.wsol_vault, false),
            AccountMeta::new_readonly(market.pdas.vault_authority, false),
            AccountMeta::new(market.trader_base, false),
            AccountMeta::new(market.trader_quote, false),
            AccountMeta::new_readonly(WSOL_MINT, false),
            AccountMeta::new_readonly(TOKEN_PROGRAM, false),
        ],
        data,
    }
}

async fn send_market_swap(market: &SbfMarket, instruction: Instruction) {
    let blockhash = market
        .context
        .banks_client
        .get_latest_blockhash()
        .await
        .unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&market.context.payer.pubkey()),
        &[&market.context.payer, &market.trader],
        blockhash,
    );
    market
        .context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();
}

async fn read_market_state(market: &SbfMarket) -> MarketStateV1 {
    let account = market
        .context
        .banks_client
        .get_account(market.pdas.market)
        .await
        .unwrap()
        .unwrap();
    MarketStateV1::decode(&account.data).unwrap()
}

async fn assert_exact_sbf_curve_round_trip() {
    let market = start_sbf_market().await;
    let base_amount = 1_000_000_000;
    let buy_quote = quote_curve_buy_exact_out(market.state.curve_sold, base_amount).unwrap();
    send_market_swap(
        &market,
        market_swap_instruction(&market, 1, base_amount, buy_quote),
    )
    .await;
    let bought = read_market_state(&market).await;
    assert_eq!(bought.curve_sold, market.state.curve_sold + base_amount);

    let sell_quote = quote_curve_sell_exact_in(bought.curve_sold, base_amount).unwrap();
    send_market_swap(
        &market,
        market_swap_instruction(&market, 2, base_amount, sell_quote),
    )
    .await;
    assert_eq!(read_market_state(&market).await, market.state);
}

fn configure_exact_sbf_binary() -> PathBuf {
    let binary = PathBuf::from(
        env::var_os("HAKKY_SBF_PATH").expect("HAKKY_SBF_PATH must identify the exact SBF binary"),
    )
    .canonicalize()
    .expect("exact SBF binary must exist");
    assert_eq!(
        binary.file_name().and_then(|name| name.to_str()),
        Some("hakky_market.so"),
    );
    env::set_var(
        "BPF_OUT_DIR",
        binary.parent().expect("SBF binary must have a parent"),
    );
    binary
}

async fn assert_exact_sbf_initialization(binary_path: &PathBuf) {
    let binary = fs::read(binary_path).expect("exact SBF binary must be readable");
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    let programdata = programdata_address();
    let programdata_bytes = finalized_programdata_with_sbf(&binary);
    let initializer = test_initializer();
    let rent = Rent::default();

    let mut test = ProgramTest::default();
    test.add_account(
        EXPECTED_PROGRAM_ID,
        SolanaAccount {
            lamports: rent.minimum_balance(36),
            data: upgradeable_program_data(programdata),
            owner: LOADER_PROGRAM,
            executable: true,
            rent_epoch: 0,
        },
    );
    test.add_account(
        programdata,
        SolanaAccount {
            lamports: rent.minimum_balance(programdata_bytes.len()),
            data: programdata_bytes,
            owner: LOADER_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.prefer_bpf(false);
    test.add_program(
        "spl_token",
        TOKEN_PROGRAM,
        processor!(spl_token::processor::Processor::process),
    );
    test.add_program(
        "metadata_test",
        METADATA_PROGRAM,
        processor!(metadata_test_processor),
    );
    test.add_account(
        INITIALIZER,
        SolanaAccount {
            lamports: 1_000_000_000,
            data: Vec::new(),
            owner: SYSTEM_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        WSOL_MINT,
        SolanaAccount {
            lamports: rent.minimum_balance(Mint::LEN),
            data: packed_native_mint(),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    for address in [pdas.vault_authority, pdas.metadata_sink] {
        test.add_account(
            address,
            SolanaAccount {
                lamports: 1,
                data: Vec::new(),
                owner: SYSTEM_PROGRAM,
                executable: false,
                rent_epoch: 0,
            },
        );
    }

    let context = test.start_with_context().await;
    let transaction = Transaction::new_signed_with_payer(
        &[
            ComputeBudgetInstruction::set_compute_unit_limit(1_400_000),
            initialization_instruction(&pdas),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, &initializer],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    let state_account = context
        .banks_client
        .get_account(pdas.market)
        .await
        .unwrap()
        .unwrap();
    let state = MarketStateV1::decode(&state_account.data).unwrap();
    assert_eq!(state.instance_nonce, [7_u8; 32]);
    assert_eq!(state.curve_sold, 0);
    assert_eq!(state.accounted_hakky, TOTAL_SUPPLY);
    assert_eq!(state.accounted_wsol, 0);

    let mint_account = context
        .banks_client
        .get_account(pdas.mint)
        .await
        .unwrap()
        .unwrap();
    let mint = Mint::unpack(&mint_account.data).unwrap();
    assert_eq!(mint.supply, TOTAL_SUPPLY);
    assert_eq!(mint.decimals, TOKEN_DECIMALS);
    assert_eq!(mint.mint_authority, COption::None);
    assert_eq!(mint.freeze_authority, COption::None);

    let metadata_account = context
        .banks_client
        .get_account(metadata_address(&pdas.mint))
        .await
        .unwrap()
        .unwrap();
    let metadata = Metadata::from_bytes(&metadata_account.data).unwrap();
    assert_eq!(metadata.mint, pdas.mint);
    assert_eq!(metadata.update_authority, pdas.metadata_sink);
    assert_eq!(metadata.name.trim_end_matches('\0'), TOKEN_NAME);
    assert_eq!(metadata.symbol.trim_end_matches('\0'), TOKEN_SYMBOL);
    assert_eq!(metadata.uri.trim_end_matches('\0'), METADATA_URI);
    assert_eq!(metadata.edition_nonce, Some(edition_bump(&pdas.mint)));
    assert_eq!(metadata.token_standard, Some(TokenStandard::Fungible));
    assert!(!metadata.primary_sale_happened);
    assert!(!metadata.is_mutable);
}

async fn assert_exact_sbf_decoder_surface() {
    let mut test = ProgramTest::new("hakky_market", EXPECTED_PROGRAM_ID, None);
    test.prefer_bpf(true);
    let context = test.start_with_context().await;

    assert_custom_error(&context, Vec::new(), HakkyErrorV1::InvalidInstructionLength).await;
    for tag in 3_u8..=u8::MAX {
        assert_custom_error(&context, vec![tag], HakkyErrorV1::InvalidInstructionTag).await;
    }

    let mut initialize = vec![0_u8; 33];
    initialize[0] = 0;
    assert_custom_error(&context, initialize, HakkyErrorV1::InvalidAccountCount).await;
    assert_custom_error(&context, swap_data(1), HakkyErrorV1::InvalidAccountCount).await;
    assert_custom_error(&context, swap_data(2), HakkyErrorV1::InvalidAccountCount).await;

    for (tag, exact_length) in [(0_u8, 33_usize), (1, 25), (2, 25)] {
        for length in [exact_length - 1, exact_length + 1] {
            let mut data = vec![1_u8; length];
            data[0] = tag;
            assert_custom_error(&context, data, HakkyErrorV1::InvalidInstructionLength).await;
        }
    }
}

#[tokio::test]
#[ignore = "requires HAKKY_SBF_PATH pointing to the exact built test hakky_market.so"]
async fn exact_sbf_binary_executes_reviewed_decoder_and_curve_lifecycle() {
    let binary = configure_exact_sbf_binary();
    assert_exact_sbf_decoder_surface().await;
    assert_exact_sbf_initialization(&binary).await;
    assert_exact_sbf_curve_round_trip().await;
}

#[tokio::test]
#[ignore = "requires HAKKY_SBF_PATH pointing to the exact built candidate hakky_market.so"]
async fn exact_candidate_sbf_executes_reviewed_decoder_surface() {
    configure_exact_sbf_binary();
    assert_exact_sbf_decoder_surface().await;
}
