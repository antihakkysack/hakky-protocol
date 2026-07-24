use solana_program::pubkey::Pubkey;

pub const EXPECTED_PROGRAM_ID_BYTES: [u8; 32] = [
    3, 161, 7, 191, 243, 206, 16, 190, 29, 112, 221, 24, 231, 75, 192, 153, 103, 228, 214,
    48, 155, 165, 13, 95, 29, 220, 134, 100, 18, 85, 49, 184,
];
pub const INITIALIZER_BYTES: [u8; 32] = [
    186, 252, 113, 190, 173, 58, 197, 228, 182, 62, 156, 130, 22, 238, 113, 163, 74, 174,
    198, 87, 34, 238, 219, 202, 114, 139, 78, 155, 60, 204, 227, 150,
];
pub const INSTANCE_COMMITMENT: [u8; 32] = [
    131, 181, 64, 254, 206, 136, 178, 68, 150, 167, 244, 168, 118, 173, 20, 106, 60, 214,
    76, 219, 116, 86, 109, 162, 170, 251, 221, 75, 214, 235, 240, 244,
];
pub const EXPECTED_PROGRAM_ID: Pubkey = Pubkey::new_from_array(EXPECTED_PROGRAM_ID_BYTES);
pub const INITIALIZER: Pubkey = Pubkey::new_from_array(INITIALIZER_BYTES);
