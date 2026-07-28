#![cfg(feature = "test-release-config")]

use hakky_market::token::{
    disable_mint_authority_instruction, initialize_account3_instruction,
    initialize_mint2_instruction, mint_total_supply_instruction, transfer_checked_instruction,
};
use hakky_market::{
    accounts::{InitializeAccountsV1, SwapAccountsV1},
    constants::{
        EXPECTED_PROGRAM_ID, INITIALIZER, LOADER_PROGRAM, METADATA_PROGRAM, RENT_SYSVAR,
        SYSTEM_PROGRAM, TOKEN_DECIMALS, TOKEN_PROGRAM, TOTAL_SUPPLY, WSOL_MINT,
    },
    error::HakkyErrorV1,
    loader::assert_finalized_self,
    metadata::create_immutable_metadata,
    pda::MarketPdasV1,
    state::MarketStateV1,
};
use solana_program::{
    account_info::AccountInfo,
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    program_option::COption,
    program_pack::Pack,
    pubkey::Pubkey,
};
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

const PROGRAM_INDEX: usize = 1;
const PROGRAMDATA_INDEX: usize = 2;
const STATE_INDEX: usize = 1;
const MINT_INDEX: usize = 2;
const BASE_VAULT_INDEX: usize = 3;
const QUOTE_VAULT_INDEX: usize = 4;
const TRADER_BASE_INDEX: usize = 6;
const TRADER_QUOTE_INDEX: usize = 7;

fn custom(error: HakkyErrorV1) -> ProgramError {
    ProgramError::Custom(error as u32)
}

fn hex_bytes(hex: &str) -> Vec<u8> {
    hex.as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let text = core::str::from_utf8(pair).unwrap();
            u8::from_str_radix(text, 16).unwrap()
        })
        .collect()
}

fn account(
    key: Pubkey,
    owner: Pubkey,
    data: Vec<u8>,
    is_signer: bool,
    is_writable: bool,
    executable: bool,
) -> AccountInfo<'static> {
    AccountInfo::new(
        Box::leak(Box::new(key)),
        is_signer,
        is_writable,
        Box::leak(Box::new(1_u64)),
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

fn finalized_programdata_data(payload: &[u8]) -> Vec<u8> {
    let mut data = Vec::with_capacity(45 + payload.len());
    data.extend_from_slice(&3_u32.to_le_bytes());
    data.extend_from_slice(&77_u64.to_le_bytes());
    data.push(0);
    data.extend_from_slice(&[0_u8; 32]);
    data.extend_from_slice(payload);
    data
}

fn metadata_address(mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[b"metadata", METADATA_PROGRAM.as_ref(), mint.as_ref()],
        &METADATA_PROGRAM,
    )
    .0
}

fn canonical_initialize_accounts() -> Vec<AccountInfo<'static>> {
    let pdas = MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap();
    let programdata = programdata_address();
    vec![
        account(INITIALIZER, SYSTEM_PROGRAM, Vec::new(), true, true, false),
        account(
            EXPECTED_PROGRAM_ID,
            LOADER_PROGRAM,
            loader_program_data(programdata),
            false,
            false,
            true,
        ),
        account(
            programdata,
            LOADER_PROGRAM,
            finalized_programdata_data(&[0xde, 0xad, 0xbe, 0xef]),
            false,
            false,
            false,
        ),
        readonly(LOADER_PROGRAM),
        account(pdas.market, SYSTEM_PROGRAM, Vec::new(), false, true, false),
        account(pdas.mint, SYSTEM_PROGRAM, Vec::new(), false, true, false),
        account(
            pdas.hakky_vault,
            SYSTEM_PROGRAM,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(
            pdas.wsol_vault,
            SYSTEM_PROGRAM,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(
            pdas.vault_authority,
            SYSTEM_PROGRAM,
            Vec::new(),
            false,
            false,
            false,
        ),
        account(
            metadata_address(&pdas.mint),
            SYSTEM_PROGRAM,
            Vec::new(),
            false,
            true,
            false,
        ),
        account(
            pdas.metadata_sink,
            SYSTEM_PROGRAM,
            Vec::new(),
            false,
            false,
            false,
        ),
        account(WSOL_MINT, TOKEN_PROGRAM, Vec::new(), false, false, false),
        readonly(SYSTEM_PROGRAM),
        readonly(TOKEN_PROGRAM),
        readonly(METADATA_PROGRAM),
        readonly(RENT_SYSVAR),
    ]
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

fn packed_token_account(mint: Pubkey, owner: Pubkey, amount: u64, is_native: bool) -> Vec<u8> {
    let token_account = TokenAccount {
        mint,
        owner,
        amount,
        delegate: COption::None,
        state: AccountState::Initialized,
        is_native: if is_native {
            COption::Some(2_039_280)
        } else {
            COption::None
        },
        delegated_amount: 0,
        close_authority: COption::None,
    };
    let mut data = vec![0_u8; TokenAccount::LEN];
    TokenAccount::pack(token_account, &mut data).unwrap();
    data
}

fn canonical_swap_accounts() -> Vec<AccountInfo<'static>> {
    let state = MarketStateV1::initial_fixture();
    let trader = Pubkey::new_from_array([42_u8; 32]);
    vec![
        account(trader, SYSTEM_PROGRAM, Vec::new(), true, false, false),
        account(
            MarketPdasV1::derive_canonical(&[7_u8; 32]).unwrap().market,
            EXPECTED_PROGRAM_ID,
            state.encode().to_vec(),
            false,
            true,
            false,
        ),
        account(
            state.mint,
            TOKEN_PROGRAM,
            packed_mint(),
            false,
            false,
            false,
        ),
        account(
            state.hakky_vault,
            TOKEN_PROGRAM,
            packed_token_account(state.mint, state.vault_authority, TOTAL_SUPPLY, false),
            false,
            true,
            false,
        ),
        account(
            state.wsol_vault,
            TOKEN_PROGRAM,
            packed_token_account(WSOL_MINT, state.vault_authority, 0, true),
            false,
            true,
            false,
        ),
        account(
            state.vault_authority,
            SYSTEM_PROGRAM,
            Vec::new(),
            false,
            false,
            false,
        ),
        account(
            Pubkey::new_from_array([43_u8; 32]),
            TOKEN_PROGRAM,
            packed_token_account(state.mint, trader, 1_000_000, false),
            false,
            true,
            false,
        ),
        account(
            Pubkey::new_from_array([44_u8; 32]),
            TOKEN_PROGRAM,
            packed_token_account(WSOL_MINT, trader, 1_000_000, true),
            false,
            true,
            false,
        ),
        account(WSOL_MINT, TOKEN_PROGRAM, Vec::new(), false, false, false),
        readonly(TOKEN_PROGRAM),
    ]
}

fn overwrite_token_account(info: &AccountInfo<'static>, mutate: impl FnOnce(&mut TokenAccount)) {
    let mut value = TokenAccount::unpack(&info.try_borrow_data().unwrap()).unwrap();
    mutate(&mut value);
    TokenAccount::pack(value, &mut info.try_borrow_mut_data().unwrap()).unwrap();
}

#[test]
fn canonical_account_fixtures_are_accepted() {
    let initialize = canonical_initialize_accounts();
    InitializeAccountsV1::parse(&initialize, &[7_u8; 32]).unwrap();
    assert_finalized_self(&initialize[PROGRAM_INDEX], &initialize[PROGRAMDATA_INDEX]).unwrap();

    let swap = canonical_swap_accounts();
    SwapAccountsV1::parse(&swap).unwrap();
}

#[test]
fn exact_account_counts_are_closed() {
    let mut initialize_omitted = canonical_initialize_accounts();
    initialize_omitted.pop();
    assert_eq!(
        InitializeAccountsV1::parse(&initialize_omitted, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountCount)
    );

    let mut initialize_appended = canonical_initialize_accounts();
    initialize_appended.push(readonly(Pubkey::new_from_array([99_u8; 32])));
    assert_eq!(
        InitializeAccountsV1::parse(&initialize_appended, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountCount)
    );

    let mut swap_omitted = canonical_swap_accounts();
    swap_omitted.pop();
    assert_eq!(
        SwapAccountsV1::parse(&swap_omitted).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountCount)
    );

    let mut swap_appended = canonical_swap_accounts();
    swap_appended.push(readonly(Pubkey::new_from_array([98_u8; 32])));
    assert_eq!(
        SwapAccountsV1::parse(&swap_appended).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountCount)
    );
}

#[test]
fn privileges_reordering_and_aliases_have_stable_precedence() {
    let mut promoted_signer = canonical_swap_accounts();
    promoted_signer[MINT_INDEX].is_signer = true;
    assert_eq!(
        SwapAccountsV1::parse(&promoted_signer).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountPrivileges)
    );

    let mut promoted_writable = canonical_swap_accounts();
    promoted_writable[MINT_INDEX].is_writable = true;
    assert_eq!(
        SwapAccountsV1::parse(&promoted_writable).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountPrivileges)
    );

    let mut reordered = canonical_swap_accounts();
    reordered.swap(BASE_VAULT_INDEX, QUOTE_VAULT_INDEX);
    assert_eq!(
        SwapAccountsV1::parse(&reordered).unwrap_err(),
        custom(HakkyErrorV1::InvalidPda)
    );

    let mut aliased = canonical_swap_accounts();
    aliased[TRADER_QUOTE_INDEX].key = aliased[TRADER_BASE_INDEX].key;
    assert_eq!(
        SwapAccountsV1::parse(&aliased).unwrap_err(),
        custom(HakkyErrorV1::AccountAlias)
    );

    let mut initialize_alias = canonical_initialize_accounts();
    initialize_alias[15].key = initialize_alias[14].key;
    assert_eq!(
        InitializeAccountsV1::parse(&initialize_alias, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::AccountAlias)
    );
}

#[test]
fn every_fixed_identity_is_rejected_before_state_and_token_semantics() {
    for index in [3_usize, 11, 12, 13, 14, 15] {
        let mut accounts = canonical_initialize_accounts();
        accounts[index].key = Box::leak(Box::new(Pubkey::new_from_array([index as u8; 32])));
        assert_eq!(
            InitializeAccountsV1::parse(&accounts, &[7_u8; 32]).unwrap_err(),
            custom(HakkyErrorV1::InvalidFixedProgram),
            "initialize fixed account index {index}"
        );
    }

    let mut wrong_token_program = canonical_swap_accounts();
    wrong_token_program[9].key = Box::leak(Box::new(Pubkey::new_from_array([91_u8; 32])));
    assert_eq!(
        SwapAccountsV1::parse(&wrong_token_program).unwrap_err(),
        custom(HakkyErrorV1::InvalidFixedProgram)
    );

    let mut wrong_wsol = canonical_swap_accounts();
    wrong_wsol[8].key = Box::leak(Box::new(Pubkey::new_from_array([92_u8; 32])));
    assert_eq!(
        SwapAccountsV1::parse(&wrong_wsol).unwrap_err(),
        custom(HakkyErrorV1::InvalidFixedProgram)
    );
}

#[test]
fn initialization_rejects_wrong_initializer_pdas_and_loader_owners() {
    let mut wrong_initializer = canonical_initialize_accounts();
    wrong_initializer[0].key = Box::leak(Box::new(Pubkey::new_from_array([60_u8; 32])));
    assert_eq!(
        InitializeAccountsV1::parse(&wrong_initializer, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::InvalidInitializer)
    );

    let mut wrong_market = canonical_initialize_accounts();
    wrong_market[4].key = Box::leak(Box::new(Pubkey::new_from_array([61_u8; 32])));
    assert_eq!(
        InitializeAccountsV1::parse(&wrong_market, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::InvalidPda)
    );

    let mut wrong_programdata = canonical_initialize_accounts();
    wrong_programdata[PROGRAMDATA_INDEX].key =
        Box::leak(Box::new(Pubkey::new_from_array([62_u8; 32])));
    assert_eq!(
        InitializeAccountsV1::parse(&wrong_programdata, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::InvalidPda)
    );

    let mut wrong_owner = canonical_initialize_accounts();
    wrong_owner[PROGRAM_INDEX].owner = Box::leak(Box::new(Pubkey::new_from_array([63_u8; 32])));
    assert_eq!(
        InitializeAccountsV1::parse(&wrong_owner, &[7_u8; 32]).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountOwner)
    );
}

#[test]
fn swap_rederives_state_pdas_and_validates_all_account_owners() {
    let mut wrong_state = canonical_swap_accounts();
    wrong_state[STATE_INDEX].key = Box::leak(Box::new(Pubkey::new_from_array([70_u8; 32])));
    assert_eq!(
        SwapAccountsV1::parse(&wrong_state).unwrap_err(),
        custom(HakkyErrorV1::InvalidPda)
    );

    for index in [
        STATE_INDEX,
        MINT_INDEX,
        BASE_VAULT_INDEX,
        QUOTE_VAULT_INDEX,
        TRADER_BASE_INDEX,
        TRADER_QUOTE_INDEX,
    ] {
        let mut accounts = canonical_swap_accounts();
        accounts[index].owner = Box::leak(Box::new(Pubkey::new_from_array([80 + index as u8; 32])));
        assert_eq!(
            SwapAccountsV1::parse(&accounts).unwrap_err(),
            custom(HakkyErrorV1::InvalidAccountOwner),
            "swap owner account index {index}"
        );
    }

    let corrupt_state = canonical_swap_accounts();
    corrupt_state[STATE_INDEX].try_borrow_mut_data().unwrap()[0] ^= 1;
    assert_eq!(
        SwapAccountsV1::parse(&corrupt_state).unwrap_err(),
        custom(HakkyErrorV1::InvalidMarketState)
    );

    let mut invalid_phase_and_pda = canonical_swap_accounts();
    invalid_phase_and_pda[STATE_INDEX]
        .try_borrow_mut_data()
        .unwrap()[9] = 2;
    invalid_phase_and_pda[STATE_INDEX].key =
        Box::leak(Box::new(Pubkey::new_from_array([71_u8; 32])));
    assert_eq!(
        SwapAccountsV1::parse(&invalid_phase_and_pda).unwrap_err(),
        custom(HakkyErrorV1::InvalidPda),
    );

    let mut invalid_phase_and_owner = canonical_swap_accounts();
    invalid_phase_and_owner[STATE_INDEX]
        .try_borrow_mut_data()
        .unwrap()[9] = 2;
    invalid_phase_and_owner[STATE_INDEX].owner =
        Box::leak(Box::new(Pubkey::new_from_array([72_u8; 32])));
    assert_eq!(
        SwapAccountsV1::parse(&invalid_phase_and_owner).unwrap_err(),
        custom(HakkyErrorV1::InvalidAccountOwner),
    );

    let invalid_phase = canonical_swap_accounts();
    invalid_phase[STATE_INDEX].try_borrow_mut_data().unwrap()[9] = 2;
    assert_eq!(
        SwapAccountsV1::parse(&invalid_phase).unwrap_err(),
        custom(HakkyErrorV1::InvalidPhase),
    );
}

#[test]
fn token_semantics_reject_wrong_mints_delegates_frozen_and_close_authorities() {
    let mut cases: Vec<(&str, Vec<AccountInfo<'static>>)> = Vec::new();

    let wrong_mint = canonical_swap_accounts();
    overwrite_token_account(&wrong_mint[TRADER_BASE_INDEX], |account| {
        account.mint = WSOL_MINT;
    });
    cases.push(("wrong mint", wrong_mint));

    let delegated = canonical_swap_accounts();
    overwrite_token_account(&delegated[TRADER_BASE_INDEX], |account| {
        account.delegate = COption::Some(Pubkey::new_from_array([101_u8; 32]));
        account.delegated_amount = 1;
    });
    cases.push(("delegated", delegated));

    let frozen = canonical_swap_accounts();
    overwrite_token_account(&frozen[TRADER_BASE_INDEX], |account| {
        account.state = AccountState::Frozen;
    });
    cases.push(("frozen", frozen));

    let close_authority = canonical_swap_accounts();
    overwrite_token_account(&close_authority[TRADER_BASE_INDEX], |account| {
        account.close_authority = COption::Some(Pubkey::new_from_array([102_u8; 32]));
    });
    cases.push(("close authority", close_authority));

    let wrong_vault_owner = canonical_swap_accounts();
    overwrite_token_account(&wrong_vault_owner[BASE_VAULT_INDEX], |account| {
        account.owner = Pubkey::new_from_array([103_u8; 32]);
    });
    cases.push(("vault authority", wrong_vault_owner));

    for (label, accounts) in cases {
        assert_eq!(
            SwapAccountsV1::parse(&accounts).unwrap_err(),
            custom(HakkyErrorV1::InvalidTokenAccount),
            "{label}"
        );
    }
}

#[test]
fn loader_v3_parsing_is_exact_and_treats_payload_as_opaque() {
    let canonical = canonical_initialize_accounts();
    assert_finalized_self(&canonical[PROGRAM_INDEX], &canonical[PROGRAMDATA_INDEX]).unwrap();

    let replacement = account(
        EXPECTED_PROGRAM_ID,
        LOADER_PROGRAM,
        {
            let mut data = loader_program_data(programdata_address());
            data.push(0);
            data
        },
        false,
        false,
        true,
    );
    assert_eq!(
        assert_finalized_self(&replacement, &canonical[PROGRAMDATA_INDEX]).unwrap_err(),
        custom(HakkyErrorV1::InvalidLoaderState)
    );

    let malformed_variant = account(
        EXPECTED_PROGRAM_ID,
        LOADER_PROGRAM,
        {
            let mut data = loader_program_data(programdata_address());
            data[0] = 1;
            data
        },
        false,
        false,
        true,
    );
    assert_eq!(
        assert_finalized_self(&malformed_variant, &canonical[PROGRAMDATA_INDEX]).unwrap_err(),
        custom(HakkyErrorV1::InvalidLoaderState)
    );

    let invalid_option = account(
        programdata_address(),
        LOADER_PROGRAM,
        {
            let mut data = finalized_programdata_data(&[0xaa]);
            data[12] = 2;
            data
        },
        false,
        false,
        false,
    );
    assert_eq!(
        assert_finalized_self(&canonical[PROGRAM_INDEX], &invalid_option).unwrap_err(),
        custom(HakkyErrorV1::InvalidLoaderState)
    );

    let finalized_with_authority_residue = account(
        programdata_address(),
        LOADER_PROGRAM,
        {
            let mut data = finalized_programdata_data(&[]);
            let prior_authority = Pubkey::new_from_array([104_u8; 32]);
            data[12] = 1;
            data[13..45].copy_from_slice(prior_authority.as_ref());

            let mut serialized_none = Vec::with_capacity(13);
            serialized_none.extend_from_slice(&3_u32.to_le_bytes());
            serialized_none.extend_from_slice(&77_u64.to_le_bytes());
            serialized_none.push(0);
            assert_eq!(serialized_none.len(), 13);
            data[..serialized_none.len()].copy_from_slice(&serialized_none);
            data
        },
        false,
        false,
        false,
    );
    assert_finalized_self(&canonical[PROGRAM_INDEX], &finalized_with_authority_residue).unwrap();

    let authority_present = account(
        programdata_address(),
        LOADER_PROGRAM,
        {
            let mut data = finalized_programdata_data(&[]);
            data[12] = 1;
            data[13..45].copy_from_slice(Pubkey::new_from_array([105_u8; 32]).as_ref());
            data
        },
        false,
        false,
        false,
    );
    assert_eq!(
        assert_finalized_self(&canonical[PROGRAM_INDEX], &authority_present).unwrap_err(),
        custom(HakkyErrorV1::ProgramNotImmutable)
    );

    let short_programdata = account(
        programdata_address(),
        LOADER_PROGRAM,
        vec![0_u8; 44],
        false,
        false,
        false,
    );
    assert_eq!(
        assert_finalized_self(&canonical[PROGRAM_INDEX], &short_programdata).unwrap_err(),
        custom(HakkyErrorV1::InvalidLoaderState)
    );

    let opaque_payload = account(
        programdata_address(),
        LOADER_PROGRAM,
        finalized_programdata_data(&[3, 1, 255, 0, 99, 42]),
        false,
        false,
        false,
    );
    assert_finalized_self(&canonical[PROGRAM_INDEX], &opaque_payload).unwrap();
}

fn assert_instruction(
    actual: Instruction,
    program_id: Pubkey,
    accounts: Vec<AccountMeta>,
    data: Vec<u8>,
) {
    assert_eq!(actual.program_id, program_id);
    assert_eq!(actual.accounts, accounts);
    assert_eq!(actual.data, data);
}

#[test]
fn fixed_token_instruction_builders_emit_exact_bytes_and_metas() {
    let mint = Pubkey::new_from_array([111_u8; 32]);
    let vault = Pubkey::new_from_array([112_u8; 32]);
    let destination = Pubkey::new_from_array([113_u8; 32]);
    let trader = Pubkey::new_from_array([114_u8; 32]);

    let mut initialize_mint_data = vec![20, 6];
    initialize_mint_data.extend_from_slice(vault.as_ref());
    initialize_mint_data.push(0);
    assert_instruction(
        initialize_mint2_instruction(&mint, &vault).unwrap(),
        TOKEN_PROGRAM,
        vec![AccountMeta::new(mint, false)],
        initialize_mint_data,
    );

    let mut initialize_account_data = vec![18];
    initialize_account_data.extend_from_slice(vault.as_ref());
    assert_instruction(
        initialize_account3_instruction(&destination, &mint, &vault).unwrap(),
        TOKEN_PROGRAM,
        vec![
            AccountMeta::new(destination, false),
            AccountMeta::new_readonly(mint, false),
        ],
        initialize_account_data,
    );

    let mut mint_to_data = vec![7];
    mint_to_data.extend_from_slice(&10_000_000_000_000_u64.to_le_bytes());
    assert_instruction(
        mint_total_supply_instruction(&mint, &destination, &vault).unwrap(),
        TOKEN_PROGRAM,
        vec![
            AccountMeta::new(mint, false),
            AccountMeta::new(destination, false),
            AccountMeta::new_readonly(vault, true),
        ],
        mint_to_data,
    );

    assert_instruction(
        disable_mint_authority_instruction(&mint, &vault).unwrap(),
        TOKEN_PROGRAM,
        vec![
            AccountMeta::new(mint, false),
            AccountMeta::new_readonly(vault, true),
        ],
        vec![6, 0, 0],
    );

    let amount = 0x0102_0304_0506_0708_u64;
    let mut transfer_data = vec![12];
    transfer_data.extend_from_slice(&amount.to_le_bytes());
    transfer_data.push(6);
    assert_instruction(
        transfer_checked_instruction(&destination, &mint, &mint, &trader, amount, TOKEN_DECIMALS)
            .unwrap(),
        TOKEN_PROGRAM,
        vec![
            AccountMeta::new(destination, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new(mint, false),
            AccountMeta::new_readonly(trader, true),
        ],
        transfer_data,
    );

    let mut wsol_transfer_data = vec![12];
    wsol_transfer_data.extend_from_slice(&amount.to_le_bytes());
    wsol_transfer_data.push(9);
    assert_instruction(
        transfer_checked_instruction(&destination, &WSOL_MINT, &mint, &trader, amount, 9).unwrap(),
        TOKEN_PROGRAM,
        vec![
            AccountMeta::new(destination, false),
            AccountMeta::new_readonly(WSOL_MINT, false),
            AccountMeta::new(mint, false),
            AccountMeta::new_readonly(trader, true),
        ],
        wsol_transfer_data,
    );
}

#[test]
fn immutable_metadata_instruction_is_exact_and_has_two_pda_signers() {
    let metadata = Pubkey::new_from_array([121_u8; 32]);
    let mint = Pubkey::new_from_array([122_u8; 32]);
    let vault_authority = Pubkey::new_from_array([123_u8; 32]);
    let payer = Pubkey::new_from_array([124_u8; 32]);
    let metadata_sink = Pubkey::new_from_array([125_u8; 32]);

    let instruction =
        create_immutable_metadata(&metadata, &mint, &vault_authority, &payer, &metadata_sink);
    assert_eq!(instruction.program_id, METADATA_PROGRAM);
    assert_eq!(
        instruction.accounts,
        vec![
            AccountMeta::new(metadata, false),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new_readonly(vault_authority, true),
            AccountMeta::new(payer, true),
            AccountMeta::new_readonly(metadata_sink, true),
            AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
            AccountMeta::new_readonly(RENT_SYSVAR, false),
        ]
    );

    assert_eq!(
        instruction.data,
        hex_bytes(
            "210e00000048616b6b792050726f746f636f6c0500000048414b4b5928000000\
             68747470733a2f2f68616b6b792e78797a2f6d657461646174612f68616b6b79\
             2d76312e6a736f6e00000000000000"
        )
    );
}
