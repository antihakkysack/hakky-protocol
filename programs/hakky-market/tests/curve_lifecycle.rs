#![cfg(feature = "test-release-config")]

use hakky_market::{
    constants::{
        CURVE_MAX, EXPECTED_PROGRAM_ID, POOL_SEED, SYSTEM_PROGRAM, TERMINAL_QUOTE, TOKEN_DECIMALS,
        TOKEN_PROGRAM, TOTAL_SUPPLY, WSOL_MINT,
    },
    error::HakkyErrorV1,
    math::{
        curve_reserve, quote_curve_buy_exact_out, quote_curve_sell_exact_in,
        quote_pool_buy_exact_out, quote_pool_sell_exact_in,
    },
    pda::MarketPdasV1,
    process_instruction,
    state::MarketStateV1,
};
use solana_program::{program_option::COption, program_pack::Pack, pubkey::Pubkey, rent::Rent};
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    account::Account as SolanaAccount,
    instruction::{AccountMeta, Instruction},
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

struct MarketFixture {
    context: ProgramTestContext,
    trader: Keypair,
    pdas: MarketPdasV1,
    trader_base: Pubkey,
    trader_quote: Pubkey,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct MarketSnapshot {
    state: MarketStateV1,
    trader_base: u64,
    trader_quote: u64,
    vault_base: u64,
    vault_quote: u64,
}

fn packed_mint() -> Vec<u8> {
    let mint = Mint {
        mint_authority: COption::None,
        supply: TOTAL_SUPPLY,
        decimals: TOKEN_DECIMALS,
        is_initialized: true,
        freeze_authority: COption::None,
    };
    let mut data = vec![0_u8; Mint::LEN];
    Mint::pack(mint, &mut data).unwrap();
    data
}

fn packed_native_mint() -> Vec<u8> {
    let mint = Mint {
        mint_authority: COption::None,
        supply: 0,
        decimals: 9,
        is_initialized: true,
        freeze_authority: COption::None,
    };
    let mut data = vec![0_u8; Mint::LEN];
    Mint::pack(mint, &mut data).unwrap();
    data
}

fn packed_token(mint: Pubkey, owner: Pubkey, amount: u64, native_reserve: Option<u64>) -> Vec<u8> {
    let token = TokenAccount {
        mint,
        owner,
        amount,
        delegate: COption::None,
        state: AccountState::Initialized,
        is_native: native_reserve.map_or(COption::None, COption::Some),
        delegated_amount: 0,
        close_authority: COption::None,
    };
    let mut data = vec![0_u8; TokenAccount::LEN];
    TokenAccount::pack(token, &mut data).unwrap();
    data
}

fn state_at(sold: u64) -> MarketStateV1 {
    let mut state = MarketStateV1::initial_fixture();
    state.curve_sold = sold;
    state.accounted_hakky = TOTAL_SUPPLY - sold;
    state.accounted_wsol = curve_reserve(sold).unwrap();
    state.validate().unwrap();
    state
}

async fn start_curve_market(sold: u64) -> MarketFixture {
    start_curve_market_with(
        sold,
        CURVE_MAX,
        100_000_000_000,
        TOTAL_SUPPLY - sold,
        curve_reserve(sold).unwrap() + 7_000_000,
    )
    .await
}

async fn start_curve_market_with(
    sold: u64,
    trader_base_amount: u64,
    trader_quote_amount: u64,
    actual_base_vault: u64,
    actual_quote_vault: u64,
) -> MarketFixture {
    let state = state_at(sold);
    let pdas = MarketPdasV1::derive_canonical(&state.instance_nonce).unwrap();
    let trader = Keypair::new();
    let trader_base = Pubkey::new_unique();
    let trader_quote = Pubkey::new_unique();
    let rent = Rent::default();
    let token_rent = rent.minimum_balance(TokenAccount::LEN);
    let mint_rent = rent.minimum_balance(Mint::LEN);

    let mut test = ProgramTest::new(
        "hakky_market",
        EXPECTED_PROGRAM_ID,
        processor!(process_instruction),
    );
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
            data: packed_token(pdas.mint, pdas.vault_authority, actual_base_vault, None),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        pdas.wsol_vault,
        SolanaAccount {
            lamports: token_rent + actual_quote_vault,
            data: packed_token(
                WSOL_MINT,
                pdas.vault_authority,
                actual_quote_vault,
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
            data: packed_token(pdas.mint, trader.pubkey(), trader_base_amount, None),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    test.add_account(
        trader_quote,
        SolanaAccount {
            lamports: token_rent + trader_quote_amount,
            data: packed_token(
                WSOL_MINT,
                trader.pubkey(),
                trader_quote_amount,
                Some(token_rent),
            ),
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

    MarketFixture {
        context: test.start_with_context().await,
        trader,
        pdas,
        trader_base,
        trader_quote,
    }
}

fn swap_instruction(
    fixture: &MarketFixture,
    tag: u8,
    base_amount: u64,
    quote_limit: u64,
) -> Instruction {
    swap_instruction_with_deadline(fixture, tag, base_amount, quote_limit, u64::MAX)
}

fn swap_instruction_with_deadline(
    fixture: &MarketFixture,
    tag: u8,
    base_amount: u64,
    quote_limit: u64,
    deadline_slot: u64,
) -> Instruction {
    let mut data = [0_u8; 25];
    data[0] = tag;
    data[1..9].copy_from_slice(&base_amount.to_le_bytes());
    data[9..17].copy_from_slice(&quote_limit.to_le_bytes());
    data[17..25].copy_from_slice(&deadline_slot.to_le_bytes());
    Instruction {
        program_id: EXPECTED_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new_readonly(fixture.trader.pubkey(), true),
            AccountMeta::new(fixture.pdas.market, false),
            AccountMeta::new_readonly(fixture.pdas.mint, false),
            AccountMeta::new(fixture.pdas.hakky_vault, false),
            AccountMeta::new(fixture.pdas.wsol_vault, false),
            AccountMeta::new_readonly(fixture.pdas.vault_authority, false),
            AccountMeta::new(fixture.trader_base, false),
            AccountMeta::new(fixture.trader_quote, false),
            AccountMeta::new_readonly(WSOL_MINT, false),
            AccountMeta::new_readonly(TOKEN_PROGRAM, false),
        ],
        data: data.to_vec(),
    }
}

async fn send_swap_result(
    fixture: &MarketFixture,
    instruction: Instruction,
) -> Result<(), BanksClientError> {
    let blockhash = fixture
        .context
        .banks_client
        .get_latest_blockhash()
        .await
        .unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&fixture.context.payer.pubkey()),
        &[&fixture.context.payer, &fixture.trader],
        blockhash,
    );
    fixture
        .context
        .banks_client
        .process_transaction(transaction)
        .await
}

async fn send_swap(fixture: &MarketFixture, instruction: Instruction) {
    send_swap_result(fixture, instruction).await.unwrap();
}

async fn assert_swap_error(
    fixture: &MarketFixture,
    instruction: Instruction,
    expected: HakkyErrorV1,
) {
    let error = send_swap_result(fixture, instruction).await.unwrap_err();
    let rendered = format!("{error:?}");
    assert!(
        rendered.contains(&format!("Custom({})", expected as u32)),
        "expected {expected:?}, got {rendered}"
    );
}

async fn token_amount(context: &ProgramTestContext, address: Pubkey) -> u64 {
    let account = context
        .banks_client
        .get_account(address)
        .await
        .unwrap()
        .unwrap();
    TokenAccount::unpack(&account.data).unwrap().amount
}

async fn market_state(context: &ProgramTestContext, address: Pubkey) -> MarketStateV1 {
    let account = context
        .banks_client
        .get_account(address)
        .await
        .unwrap()
        .unwrap();
    MarketStateV1::decode(&account.data).unwrap()
}

async fn market_snapshot(fixture: &MarketFixture) -> MarketSnapshot {
    MarketSnapshot {
        state: market_state(&fixture.context, fixture.pdas.market).await,
        trader_base: token_amount(&fixture.context, fixture.trader_base).await,
        trader_quote: token_amount(&fixture.context, fixture.trader_quote).await,
        vault_base: token_amount(&fixture.context, fixture.pdas.hakky_vault).await,
        vault_quote: token_amount(&fixture.context, fixture.pdas.wsol_vault).await,
    }
}

async fn assert_atomic_rejection(
    fixture: &MarketFixture,
    instruction: Instruction,
    expected: HakkyErrorV1,
) {
    let before = market_snapshot(fixture).await;
    assert_swap_error(fixture, instruction, expected).await;
    assert_eq!(market_snapshot(fixture).await, before);
}

#[tokio::test]
async fn curve_buy_sell_round_trip_preserves_surplus_and_returns_exact_state() {
    let sold = 2_000_000_000_000;
    let fixture = start_curve_market(sold).await;
    let base_amount = 1_000_000_000;
    let state_before = market_state(&fixture.context, fixture.pdas.market).await;
    let base_before = token_amount(&fixture.context, fixture.trader_base).await;
    let quote_before = token_amount(&fixture.context, fixture.trader_quote).await;
    let vault_quote_before = token_amount(&fixture.context, fixture.pdas.wsol_vault).await;
    let surplus_before = vault_quote_before - state_before.accounted_wsol;

    send_swap(
        &fixture,
        swap_instruction(&fixture, 1, base_amount, u64::MAX),
    )
    .await;
    let bought = market_state(&fixture.context, fixture.pdas.market).await;
    assert_eq!(bought.curve_sold, sold + base_amount);
    assert_eq!(
        token_amount(&fixture.context, fixture.pdas.wsol_vault).await - bought.accounted_wsol,
        surplus_before,
    );

    send_swap(&fixture, swap_instruction(&fixture, 2, base_amount, 1)).await;
    let state_after = market_state(&fixture.context, fixture.pdas.market).await;
    assert_eq!(state_after, state_before);
    assert_eq!(
        token_amount(&fixture.context, fixture.trader_base).await,
        base_before,
    );
    assert_eq!(
        token_amount(&fixture.context, fixture.trader_quote).await,
        quote_before,
    );
    assert_eq!(
        token_amount(&fixture.context, fixture.pdas.wsol_vault).await - state_after.accounted_wsol,
        surplus_before,
    );
}

#[tokio::test]
async fn final_curve_buy_transitions_once_and_pool_swaps_remain_live() {
    let final_base = 1_000_000_000;
    let fixture = start_curve_market(CURVE_MAX - final_base).await;
    send_swap(
        &fixture,
        swap_instruction(&fixture, 1, final_base, u64::MAX),
    )
    .await;
    let terminal = market_state(&fixture.context, fixture.pdas.market).await;
    assert_eq!(terminal.phase, 1);
    assert_eq!(terminal.curve_sold, CURVE_MAX);
    assert_eq!(terminal.accounted_hakky, POOL_SEED);
    assert_eq!(terminal.accounted_wsol, TERMINAL_QUOTE);

    let pool_base = 100_000_000;
    send_swap(&fixture, swap_instruction(&fixture, 1, pool_base, u64::MAX)).await;
    let after_buy = market_state(&fixture.context, fixture.pdas.market).await;
    assert_eq!(after_buy.phase, 1);
    assert_eq!(after_buy.curve_sold, CURVE_MAX);
    assert_eq!(after_buy.accounted_hakky, POOL_SEED - pool_base);
    assert!(after_buy.accounted_wsol > TERMINAL_QUOTE);

    send_swap(&fixture, swap_instruction(&fixture, 2, pool_base, 1)).await;
    let after_sell = market_state(&fixture.context, fixture.pdas.market).await;
    assert_eq!(after_sell.phase, 1);
    assert_eq!(after_sell.curve_sold, CURVE_MAX);
    assert_eq!(after_sell.accounted_hakky, POOL_SEED);
    assert!(after_sell.accounted_wsol >= TERMINAL_QUOTE);
}

#[tokio::test]
async fn curve_boundary_slippage_and_deadline_rejections_are_exact_and_atomic() {
    let sold = 2_000_000_000_000;
    let base_amount = 1_000_000_000;

    let fixture = start_curve_market(sold).await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 1, 0, u64::MAX),
        HakkyErrorV1::ZeroAmount,
    )
    .await;

    let fixture = start_curve_market(sold).await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 1, CURVE_MAX - sold + 1, u64::MAX),
        HakkyErrorV1::InsufficientCurveLiquidity,
    )
    .await;

    let fixture = start_curve_market(sold).await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 2, sold + 1, 1),
        HakkyErrorV1::InsufficientCurveLiquidity,
    )
    .await;

    let buy_quote = quote_curve_buy_exact_out(sold, base_amount).unwrap();
    let fixture = start_curve_market(sold).await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 1, base_amount, buy_quote - 1),
        HakkyErrorV1::SlippageExceeded,
    )
    .await;

    let sell_quote = quote_curve_sell_exact_in(sold, base_amount).unwrap();
    let fixture = start_curve_market(sold).await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 2, base_amount, sell_quote + 1),
        HakkyErrorV1::SlippageExceeded,
    )
    .await;

    let mut fixture = start_curve_market(sold).await;
    fixture.context.warp_to_slot(10).unwrap();
    send_swap(
        &fixture,
        swap_instruction_with_deadline(&fixture, 1, base_amount, buy_quote, 10),
    )
    .await;

    let mut fixture = start_curve_market(sold).await;
    fixture.context.warp_to_slot(10).unwrap();
    assert_atomic_rejection(
        &fixture,
        swap_instruction_with_deadline(&fixture, 1, base_amount, buy_quote, 9),
        HakkyErrorV1::DeadlineExpired,
    )
    .await;
}

#[tokio::test]
async fn curve_rejects_unbacked_accounting_before_cpi_and_rolls_back_failed_transfers() {
    let sold = 2_000_000_000_000;
    let state = state_at(sold);
    let base_amount = 1_000_000_000;

    let fixture = start_curve_market_with(
        sold,
        CURVE_MAX,
        100_000_000_000,
        state.accounted_hakky - 1,
        state.accounted_wsol,
    )
    .await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 1, base_amount, u64::MAX),
        HakkyErrorV1::ActualBelowAccounted,
    )
    .await;

    let fixture = start_curve_market_with(
        sold,
        CURVE_MAX,
        0,
        state.accounted_hakky,
        state.accounted_wsol,
    )
    .await;
    let before = market_snapshot(&fixture).await;
    assert!(send_swap_result(
        &fixture,
        swap_instruction(&fixture, 1, base_amount, u64::MAX)
    )
    .await
    .is_err());
    assert_eq!(market_snapshot(&fixture).await, before);

    let fixture = start_curve_market_with(
        sold,
        u64::MAX,
        100_000_000_000,
        state.accounted_hakky,
        state.accounted_wsol,
    )
    .await;
    let before = market_snapshot(&fixture).await;
    assert!(send_swap_result(
        &fixture,
        swap_instruction(&fixture, 1, base_amount, u64::MAX)
    )
    .await
    .is_err());
    assert_eq!(market_snapshot(&fixture).await, before);
}

#[tokio::test]
async fn competing_final_buy_cannot_repeat_the_transition_or_mutate_on_failure() {
    let final_base = 1_000_000_000;
    let fixture = start_curve_market(CURVE_MAX - final_base).await;
    let pool_quote = quote_pool_buy_exact_out(POOL_SEED, TERMINAL_QUOTE, final_base).unwrap();
    let competing =
        swap_instruction_with_deadline(&fixture, 1, final_base, pool_quote - 1, u64::MAX - 1);

    send_swap(
        &fixture,
        swap_instruction(&fixture, 1, final_base, u64::MAX),
    )
    .await;
    let terminal = market_snapshot(&fixture).await;
    assert_eq!(terminal.state.phase, 1);
    assert_eq!(terminal.state.curve_sold, CURVE_MAX);

    assert_swap_error(&fixture, competing, HakkyErrorV1::SlippageExceeded).await;
    assert_eq!(market_snapshot(&fixture).await, terminal);
}

#[tokio::test]
async fn pool_boundaries_fee_rounding_replay_and_product_invariant_hold() {
    let final_base = 1_000_000_000;
    let fixture = start_curve_market(CURVE_MAX - final_base).await;
    send_swap(
        &fixture,
        swap_instruction(&fixture, 1, final_base, u64::MAX),
    )
    .await;

    let terminal = market_snapshot(&fixture).await;
    let buy_base = 100_000_000;
    let buy_quote = quote_pool_buy_exact_out(
        terminal.state.accounted_hakky,
        terminal.state.accounted_wsol,
        buy_base,
    )
    .unwrap();
    send_swap(&fixture, swap_instruction(&fixture, 1, buy_base, buy_quote)).await;
    let after_first = market_snapshot(&fixture).await;
    assert_eq!(
        after_first.state.accounted_hakky,
        terminal.state.accounted_hakky - buy_base
    );
    assert_eq!(
        after_first.state.accounted_wsol,
        terminal.state.accounted_wsol + buy_quote
    );
    assert!(
        u128::from(after_first.state.accounted_hakky)
            * u128::from(after_first.state.accounted_wsol)
            >= u128::from(terminal.state.accounted_hakky)
                * u128::from(terminal.state.accounted_wsol)
    );

    let second_quote = quote_pool_buy_exact_out(
        after_first.state.accounted_hakky,
        after_first.state.accounted_wsol,
        buy_base,
    )
    .unwrap();
    send_swap(
        &fixture,
        swap_instruction_with_deadline(&fixture, 1, buy_base, second_quote, u64::MAX - 1),
    )
    .await;
    let after_second = market_snapshot(&fixture).await;
    assert_eq!(
        after_second.state.accounted_hakky,
        after_first.state.accounted_hakky - buy_base
    );
    assert_eq!(
        after_second.state.accounted_wsol,
        after_first.state.accounted_wsol + second_quote
    );

    let sell_quote = quote_pool_sell_exact_in(
        after_second.state.accounted_hakky,
        after_second.state.accounted_wsol,
        buy_base,
    )
    .unwrap();
    send_swap(
        &fixture,
        swap_instruction(&fixture, 2, buy_base, sell_quote),
    )
    .await;
    let after_sell = market_snapshot(&fixture).await;
    assert!(
        u128::from(after_sell.state.accounted_hakky) * u128::from(after_sell.state.accounted_wsol)
            >= u128::from(after_second.state.accounted_hakky)
                * u128::from(after_second.state.accounted_wsol)
    );

    assert_atomic_rejection(
        &fixture,
        swap_instruction(&fixture, 1, after_sell.state.accounted_hakky, u64::MAX),
        HakkyErrorV1::InsufficientCurveLiquidity,
    )
    .await;
    assert_atomic_rejection(
        &fixture,
        swap_instruction(
            &fixture,
            2,
            TOTAL_SUPPLY - after_sell.state.accounted_hakky + 1,
            1,
        ),
        HakkyErrorV1::ReserveInvariant,
    )
    .await;
}
