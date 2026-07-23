use solana_program::pubkey::Pubkey;

pub const EXPECTED_PROGRAM_ID_BYTES: [u8; 32] = [160, 164, 57, 27, 101, 87, 173, 191, 90, 152, 14, 94, 219, 187, 133, 56, 2, 245, 120, 17, 254, 30, 141, 85, 35, 202, 147, 207, 47, 231, 207, 249];
pub const INITIALIZER_BYTES: [u8; 32] = [75, 175, 192, 149, 4, 137, 228, 244, 71, 146, 130, 17, 252, 235, 222, 126, 38, 220, 149, 45, 166, 181, 112, 213, 138, 174, 186, 154, 125, 124, 157, 207];
pub const INSTANCE_COMMITMENT: [u8; 32] = [107, 174, 178, 123, 23, 141, 168, 26, 167, 211, 137, 133, 7, 230, 44, 251, 217, 92, 27, 237, 175, 168, 69, 246, 36, 221, 128, 47, 223, 32, 20, 60];
pub const METADATA_URI: &str = "https://hakky.xyz/metadata/hakky-v1.json";

pub const EXPECTED_PROGRAM_ID: Pubkey =
    Pubkey::new_from_array(EXPECTED_PROGRAM_ID_BYTES);
pub const INITIALIZER: Pubkey = Pubkey::new_from_array(INITIALIZER_BYTES);
