use solana_program::pubkey::Pubkey;

pub const TOTAL_SUPPLY: u64 = 10_000_000_000_000;
pub const CURVE_MAX: u64 = 8_000_000_000_000;
pub const POOL_SEED: u64 = 2_000_000_000_000;
pub const TERMINAL_QUOTE: u64 = 24_000_000_000;
pub const POOL_FEE_DENOMINATOR: u64 = 1_000_000;
pub const POOL_EFFECTIVE_NUMERATOR: u64 = 997_500;
pub const TOKEN_DECIMALS: u8 = 6;
pub const TOKEN_NAME: &str = "Hakky Protocol";
pub const TOKEN_SYMBOL: &str = "HAKKY";
pub const RELEASE_SCHEMA_VERSION: &str = "hakky-release-config-v1";
pub const RELEASE_NETWORK: &str = "devnet";
pub const METADATA_URI: &str = "https://hakky.xyz/metadata/hakky-v1.json";

#[cfg(not(feature = "test-release-config"))]
pub const EXPECTED_PROGRAM_ID_BYTES: [u8; 32] = [
    160, 164, 57, 27, 101, 87, 173, 191, 90, 152, 14, 94, 219, 187, 133, 56, 2, 245, 120, 17, 254,
    30, 141, 85, 35, 202, 147, 207, 47, 231, 207, 249,
];
#[cfg(not(feature = "test-release-config"))]
pub const INITIALIZER_BYTES: [u8; 32] = [
    75, 175, 192, 149, 4, 137, 228, 244, 71, 146, 130, 17, 252, 235, 222, 126, 38, 220, 149, 45,
    166, 181, 112, 213, 138, 174, 186, 154, 125, 124, 157, 207,
];
#[cfg(not(feature = "test-release-config"))]
pub const INSTANCE_COMMITMENT: [u8; 32] = [
    107, 174, 178, 123, 23, 141, 168, 26, 167, 211, 137, 133, 7, 230, 44, 251, 217, 92, 27, 237,
    175, 168, 69, 246, 36, 221, 128, 47, 223, 32, 20, 60,
];

#[cfg(feature = "test-release-config")]
pub use crate::test_release_config::{
    EXPECTED_PROGRAM_ID, EXPECTED_PROGRAM_ID_BYTES, INITIALIZER, INITIALIZER_BYTES,
    INSTANCE_COMMITMENT,
};

#[cfg(not(feature = "test-release-config"))]
pub const EXPECTED_PROGRAM_ID: Pubkey = Pubkey::new_from_array(EXPECTED_PROGRAM_ID_BYTES);
#[cfg(not(feature = "test-release-config"))]
pub const INITIALIZER: Pubkey = Pubkey::new_from_array(INITIALIZER_BYTES);

pub const SYSTEM_PROGRAM_BYTES: [u8; 32] = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
pub const LOADER_PROGRAM_BYTES: [u8; 32] = [
    2, 168, 246, 145, 78, 136, 161, 176, 226, 16, 21, 62, 247, 99, 174, 43, 0, 194, 185, 61, 22,
    193, 36, 210, 192, 83, 122, 16, 4, 128, 0, 0,
];
pub const TOKEN_PROGRAM_BYTES: [u8; 32] = [
    6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237,
    95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
];
pub const WSOL_MINT_BYTES: [u8; 32] = [
    6, 155, 136, 87, 254, 171, 129, 132, 251, 104, 127, 99, 70, 24, 192, 53, 218, 196, 57, 220, 26,
    235, 59, 85, 152, 160, 240, 0, 0, 0, 0, 1,
];
pub const METADATA_PROGRAM_BYTES: [u8; 32] = [
    11, 112, 101, 177, 227, 209, 124, 69, 56, 157, 82, 127, 107, 4, 195, 205, 88, 184, 108, 115,
    26, 160, 253, 181, 73, 182, 209, 188, 3, 248, 41, 70,
];
pub const RENT_SYSVAR_BYTES: [u8; 32] = [
    6, 167, 213, 23, 25, 44, 92, 81, 33, 140, 201, 76, 61, 74, 241, 127, 88, 218, 238, 8, 155, 161,
    253, 68, 227, 219, 217, 138, 0, 0, 0, 0,
];

pub const SYSTEM_PROGRAM: Pubkey = Pubkey::new_from_array(SYSTEM_PROGRAM_BYTES);
pub const LOADER_PROGRAM: Pubkey = Pubkey::new_from_array(LOADER_PROGRAM_BYTES);
pub const TOKEN_PROGRAM: Pubkey = Pubkey::new_from_array(TOKEN_PROGRAM_BYTES);
pub const WSOL_MINT: Pubkey = Pubkey::new_from_array(WSOL_MINT_BYTES);
pub const METADATA_PROGRAM: Pubkey = Pubkey::new_from_array(METADATA_PROGRAM_BYTES);
pub const RENT_SYSVAR: Pubkey = Pubkey::new_from_array(RENT_SYSVAR_BYTES);
