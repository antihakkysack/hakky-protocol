use solana_program::program_error::ProgramError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum HakkyErrorV1 {
    WrongProgramId = 0x484b0001,
    InvalidInstructionTag = 0x484b0002,
    InvalidInstructionLength = 0x484b0003,
    ZeroAmount = 0x484b0004,
    InvalidInstanceNonce = 0x484b0005,
    InvalidAccountCount = 0x484b0006,
    InvalidAccountPrivileges = 0x484b0007,
    AccountAlias = 0x484b0008,
    InvalidFixedProgram = 0x484b0009,
    InvalidPda = 0x484b000a,
    InvalidAccountOwner = 0x484b000b,
    InvalidAccountData = 0x484b000c,
    InvalidTokenAccount = 0x484b000d,
    InvalidMarketState = 0x484b000e,
    InvalidPhase = 0x484b000f,
    InvalidInitializer = 0x484b0010,
    ProgramNotImmutable = 0x484b0011,
    AlreadyInitialized = 0x484b0012,
    InvalidPrefund = 0x484b0013,
    CurveDomain = 0x484b0014,
    InsufficientCurveLiquidity = 0x484b0015,
    ArithmeticOverflow = 0x484b0016,
    ZeroQuote = 0x484b0017,
    SlippageExceeded = 0x484b0018,
    DeadlineExpired = 0x484b0019,
    ReserveInvariant = 0x484b001a,
    ActualBelowAccounted = 0x484b001b,
    VaultDeltaMismatch = 0x484b001c,
    PostconditionFailed = 0x484b001d,
    InvalidMetadata = 0x484b001e,
    InvalidLoaderState = 0x484b001f,
}

impl HakkyErrorV1 {
    pub const ALL: [Self; 31] = [
        Self::WrongProgramId,
        Self::InvalidInstructionTag,
        Self::InvalidInstructionLength,
        Self::ZeroAmount,
        Self::InvalidInstanceNonce,
        Self::InvalidAccountCount,
        Self::InvalidAccountPrivileges,
        Self::AccountAlias,
        Self::InvalidFixedProgram,
        Self::InvalidPda,
        Self::InvalidAccountOwner,
        Self::InvalidAccountData,
        Self::InvalidTokenAccount,
        Self::InvalidMarketState,
        Self::InvalidPhase,
        Self::InvalidInitializer,
        Self::ProgramNotImmutable,
        Self::AlreadyInitialized,
        Self::InvalidPrefund,
        Self::CurveDomain,
        Self::InsufficientCurveLiquidity,
        Self::ArithmeticOverflow,
        Self::ZeroQuote,
        Self::SlippageExceeded,
        Self::DeadlineExpired,
        Self::ReserveInvariant,
        Self::ActualBelowAccounted,
        Self::VaultDeltaMismatch,
        Self::PostconditionFailed,
        Self::InvalidMetadata,
        Self::InvalidLoaderState,
    ];
}

impl From<HakkyErrorV1> for ProgramError {
    fn from(error: HakkyErrorV1) -> Self {
        Self::Custom(error as u32)
    }
}
