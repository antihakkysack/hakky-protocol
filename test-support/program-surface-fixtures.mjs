export function exactTagProbeReceipt(acceptedInstructionTags = [0, 1, 2]) {
  return {
    schemaVersion: "hakky-sbf-decoder-probe-v1",
    acceptedInstructionTags,
    probedFirstBytes: 256,
    malformedLengthsRejected: true,
    nativeProcessorFallback: false,
    preferBpf: true,
  };
}

export function fixedInvokeCallsiteReceipt(overrides = {}) {
  return {
    system: ["allocate", "assign", "transfer"],
    token: [
      "initialize_account3",
      "initialize_mint2",
      "mint_to",
      "set_authority",
      "transfer_checked",
    ],
    metadata: ["create_metadata_account_v3"],
    forbidden: [],
    exactAccountMetas: true,
    exactSignerSeeds: true,
    exactAuthorities: true,
    exactDirections: true,
    exactDecimals: true,
    exactAmountBindings: true,
    ...overrides,
  };
}
