#![cfg(feature = "test-release-config")]

use borsh::{BorshDeserialize, BorshSerialize};
use hakky_market::{
    constants::{
        EXPECTED_PROGRAM_ID, INITIALIZER, LOADER_PROGRAM, METADATA_PROGRAM, METADATA_URI,
        RENT_SYSVAR, SYSTEM_PROGRAM, TOKEN_DECIMALS, TOKEN_NAME, TOKEN_PROGRAM, TOKEN_SYMBOL,
        TOTAL_SUPPLY, WSOL_MINT,
    },
    error::HakkyErrorV1,
    pda::MarketPdasV1,
    process_instruction,
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
use solana_program_test::{processor, ProgramTest};
use solana_sdk::{
    account::Account as SolanaAccount,
    instruction::{AccountMeta, Instruction},
    signature::{Keypair, SeedDerivable, Signer},
    transaction::Transaction,
};
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

const STATE_INDEX: usize = 4;
const MINT_INDEX: usize = 5;

#[derive(Clone, Copy, Debug, Default)]
struct Prefunds {
    market: u64,
    mint: u64,
    base_vault: u64,
    quote_vault: u64,
    metadata: u64,
}

impl Prefunds {
    fn uniform(value: u64) -> Self {
        Self {
            market: value,
            mint: value,
            base_vault: value,
            quote_vault: value,
            metadata: value,
        }
    }

    fn entries(self, pdas: &MarketPdasV1) -> [(Pubkey, u64); 5] {
        [
            (pdas.market, self.market),
            (pdas.mint, self.mint),
            (pdas.hakky_vault, self.base_vault),
            (pdas.wsol_vault, self.quote_vault),
            (metadata_address(&pdas.mint), self.metadata),
        ]
    }
}

fn custom(error: HakkyErrorV1) -> ProgramError {
    ProgramError::Custom(error as u32)
}

fn account(
    key: Pubkey,
    owner: Pubkey,
    lamports: u64,
    data: Vec<u8>,
    is_signer: bool,
    is_writable: bool,
    executable: bool,
) -> AccountInfo<'static> {
    AccountInfo::new(
        Box::leak(Box::new(key)),
        is_signer,
        is_writable,
        Box::leak(Box::new(lamports)),
        Box::leak(data.into_boxed_slice()),
        Box::leak(Box::new(owner)),
        executable,
        0,
    )
}

fn readonly(key: Pubkey) -> AccountInfo<'static> {
    account(
        key,
        Pubkey::new_from_array([250_u8; 32]),
        1,
        Vec::new(),
        false,
        false,
        true,
    )
}

fn programdata_address() -> Pubkey {
    Pubkey::find_program_address(&[EXPECTED_PROGRAM_ID.as_ref()], &LOADER_PROGRAM).0
}

fn loader_program_data(programdata: Pubkey) -> Vec<u8> {
    let mut data = Vec::with_capacity(36);
    data.extend_from_slice(&2_u32.to_le_bytes());
    data.extend_from_slice(programdata.as_ref());
    data
}

fn finalized_programdata_data() -> Vec<u8> {
    let mut data = Vec::with_capacity(49);
    data.extend_from_slice(&3_u32.to_le_bytes());
    data.extend_from_slice(&77_u64.to_le_bytes());
    data.push(0);
    data.extend_from_slice(&[0_u8; 32]);
    data.extend_from_slice(&[0xde, 0xad, 0xbe, 0xef]);
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

fn canonical_accounts() -> Vec<AccountInfo<'static>> {
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    let programdata = programdata_address();
    vec![
        account(
            INITIALIZER,
            SYSTEM_PROGRAM,
            100_000_000,
            Vec::new(),
            true,
            true,
            false,
        ),
        account(
            EXPECTED_PROGRAM_ID,
            LOADER_PROGRAM,
            1,
            loader_program_data(programdata),
            false,
            false,
            true,
        ),
        account(
            programdata,
            LOADER_PROGRAM,
            1,
            finalized_programdata_data(),
            false,
            false,
            false,
        ),
        readonly(LOADER_PROGRAM),
        account(
            pdas.market,
            SYSTEM_PROGRAM,
            0,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(pdas.mint, SYSTEM_PROGRAM, 0, Vec::new(), false, true, false),
        account(
            pdas.hakky_vault,
            SYSTEM_PROGRAM,
            0,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(
            pdas.wsol_vault,
            SYSTEM_PROGRAM,
            0,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(
            pdas.vault_authority,
            SYSTEM_PROGRAM,
            0,
            Vec::new(),
            false,
            false,
            false,
        ),
        account(
            metadata_address(&pdas.mint),
            SYSTEM_PROGRAM,
            0,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(
            pdas.metadata_sink,
            SYSTEM_PROGRAM,
            0,
            Vec::new(),
            false,
            false,
            false,
        ),
        account(WSOL_MINT, TOKEN_PROGRAM, 1, Vec::new(), false, false, false),
        readonly(SYSTEM_PROGRAM),
        readonly(TOKEN_PROGRAM),
        readonly(METADATA_PROGRAM),
        readonly(RENT_SYSVAR),
    ]
}

fn initialize_data() -> [u8; 33] {
    let mut data = [0_u8; 33];
    data[1..].copy_from_slice(&[7_u8; 32]);
    data
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

fn failing_metadata_processor(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo<'_>],
    _data: &[u8],
) -> ProgramResult {
    Err(ProgramError::InvalidInstructionData)
}

fn test_initializer() -> Keypair {
    let seed: [u8; 32] = core::array::from_fn(|index| 255_u8.wrapping_sub(index as u8));
    let keypair = Keypair::from_seed(&seed).unwrap();
    assert_eq!(keypair.pubkey(), INITIALIZER);
    keypair
}

fn native_mint_data() -> Vec<u8> {
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

fn expected_metadata_size(_pdas: &MarketPdasV1) -> usize {
    hakky_market::metadata::METADATA_ACCOUNT_LEN
}

fn add_system_prefund(test: &mut ProgramTest, key: Pubkey, lamports: u64) {
    if lamports == 0 {
        return;
    }
    test.add_account(
        key,
        SolanaAccount {
            lamports,
            data: Vec::new(),
            owner: SYSTEM_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
}

fn initialization_instruction(pdas: &MarketPdasV1) -> Instruction {
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
        data: initialize_data().to_vec(),
    }
}

async fn run_native_initialization(prefunds: Prefunds, fail_metadata: bool) {
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    let initializer = test_initializer();
    let programdata = programdata_address();
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
    if fail_metadata {
        test.add_program(
            "metadata_failure",
            METADATA_PROGRAM,
            processor!(failing_metadata_processor),
        );
    } else {
        test.add_program(
            "metadata_test",
            METADATA_PROGRAM,
            processor!(metadata_test_processor),
        );
    }
    test.add_account(
        programdata,
        SolanaAccount {
            lamports: 10_000_000,
            data: finalized_programdata_data(),
            owner: LOADER_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
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
            lamports: Rent::default().minimum_balance(Mint::LEN),
            data: native_mint_data(),
            owner: TOKEN_PROGRAM,
            executable: false,
            rent_epoch: 0,
        },
    );
    for (address, prefund) in prefunds.entries(&pdas) {
        add_system_prefund(&mut test, address, prefund);
    }
    add_system_prefund(&mut test, pdas.vault_authority, 1);
    add_system_prefund(&mut test, pdas.metadata_sink, 1);

    let context = test.start_with_context().await;
    let transaction = Transaction::new_signed_with_payer(
        &[initialization_instruction(&pdas)],
        Some(&context.payer.pubkey()),
        &[&context.payer, &initializer],
        context.last_blockhash,
    );
    let result = context.banks_client.process_transaction(transaction).await;
    if fail_metadata {
        assert!(result.is_err());
        for (address, prefund) in prefunds.entries(&pdas) {
            let account = context
                .banks_client
                .get_account(address)
                .await
                .unwrap()
                .unwrap();
            assert_eq!(account.owner, SYSTEM_PROGRAM);
            assert!(account.data.is_empty());
            assert_eq!(account.lamports, prefund);
        }
        return;
    }
    result.unwrap();

    let state_account = context
        .banks_client
        .get_account(pdas.market)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(state_account.owner, EXPECTED_PROGRAM_ID);
    let state = MarketStateV1::decode(&state_account.data).unwrap();
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

    let base_account = context
        .banks_client
        .get_account(pdas.hakky_vault)
        .await
        .unwrap()
        .unwrap();
    let base = TokenAccount::unpack(&base_account.data).unwrap();
    assert_eq!(base.amount, TOTAL_SUPPLY);
    assert_eq!(base.mint, pdas.mint);
    assert_eq!(base.owner, pdas.vault_authority);
    assert_eq!(base.state, AccountState::Initialized);
    assert_eq!(base.delegate, COption::None);
    assert_eq!(base.close_authority, COption::None);

    let quote_account = context
        .banks_client
        .get_account(pdas.wsol_vault)
        .await
        .unwrap()
        .unwrap();
    let quote = TokenAccount::unpack(&quote_account.data).unwrap();
    assert_eq!(quote.mint, WSOL_MINT);
    assert_eq!(quote.owner, pdas.vault_authority);
    assert!(matches!(quote.is_native, COption::Some(_)));
    assert_eq!(quote.delegate, COption::None);
    assert_eq!(quote.close_authority, COption::None);

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
    assert!(!metadata.is_mutable);

    for (address, prefund) in prefunds.entries(&pdas) {
        let account = context
            .banks_client
            .get_account(address)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(
            account.lamports,
            prefund.max(Rent::default().minimum_balance(account.data.len())),
            "exact rent delta for {address}",
        );
    }
}

#[test]
fn exact_existing_market_state_is_rejected_as_duplicate_initialization() {
    let mut accounts = canonical_accounts();
    let state = MarketStateV1::initial_fixture();
    accounts[STATE_INDEX] = account(
        *accounts[STATE_INDEX].key,
        EXPECTED_PROGRAM_ID,
        10_000_000,
        state.encode().to_vec(),
        false,
        true,
        false,
    );

    assert_eq!(
        process_instruction(&EXPECTED_PROGRAM_ID, &accounts, &initialize_data()),
        Err(custom(HakkyErrorV1::AlreadyInitialized)),
    );
}

#[test]
fn non_system_owner_and_nonzero_data_are_invalid_prefunds() {
    let mut wrong_owner = canonical_accounts();
    wrong_owner[MINT_INDEX] = account(
        *wrong_owner[MINT_INDEX].key,
        TOKEN_PROGRAM,
        1,
        Vec::new(),
        false,
        true,
        false,
    );
    assert_eq!(
        process_instruction(&EXPECTED_PROGRAM_ID, &wrong_owner, &initialize_data()),
        Err(custom(HakkyErrorV1::InvalidPrefund)),
    );

    let mut nonzero_data = canonical_accounts();
    nonzero_data[MINT_INDEX] = account(
        *nonzero_data[MINT_INDEX].key,
        SYSTEM_PROGRAM,
        1,
        vec![1],
        false,
        true,
        false,
    );
    assert_eq!(
        process_instruction(&EXPECTED_PROGRAM_ID, &nonzero_data, &initialize_data()),
        Err(custom(HakkyErrorV1::InvalidPrefund)),
    );
}

#[tokio::test]
async fn native_program_test_initializes_and_retains_prefund_boundaries() {
    let rent = Rent::default();
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    for (role, exact_rent) in [
        (
            0,
            rent.minimum_balance(MarketStateV1::initial_fixture().encode().len()),
        ),
        (1, rent.minimum_balance(Mint::LEN)),
        (2, rent.minimum_balance(TokenAccount::LEN)),
        (3, rent.minimum_balance(TokenAccount::LEN)),
        (4, rent.minimum_balance(expected_metadata_size(&pdas))),
    ] {
        for prefund in [
            0,
            1,
            exact_rent - 1,
            exact_rent,
            exact_rent + 1,
            exact_rent * 2,
        ] {
            let mut prefunds = Prefunds::default();
            match role {
                0 => prefunds.market = prefund,
                1 => prefunds.mint = prefund,
                2 => prefunds.base_vault = prefund,
                3 => prefunds.quote_vault = prefund,
                4 => prefunds.metadata = prefund,
                _ => unreachable!(),
            }
            run_native_initialization(prefunds, false).await;
        }
    }
}

#[tokio::test]
async fn metadata_failure_rolls_back_every_adoption_and_token_change() {
    run_native_initialization(Prefunds::uniform(1), true).await;
}
