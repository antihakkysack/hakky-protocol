import "dotenv/config";
import { z } from "zod";

export const PILOT_MAX_SATS = 100_000_000n;
export const CONTRACT_MAX_RESERVE_AGE_SECONDS = 43_200;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_EVM_ADDRESS = `0x${"0".repeat(40)}`;
const SATOSHI_PATTERN = /^\d+$/;

/** True for a plain decimal satoshi string greater than zero. */
function isPositiveSatoshiString(value: string): boolean {
  return SATOSHI_PATTERN.test(value.trim()) && BigInt(value.trim()) > 0n;
}

const schema = z
  .object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  OPERATING_MODE: z.enum(["demo", "live"]).default("demo"),
  SERVICE_ROLE: z
    .enum(["api", "attestation", "reserve-oracle", "orchestrator"])
    .default("api"),

  CHAIN_ID: z.coerce.number().default(11155111), // Sepolia
  RPC_URL: z.string().url().default("https://ethereum-sepolia-rpc.publicnode.com"),
  SIGNER_PRIVATE_KEY: z.string().optional(),
  ATTESTATION_SIGNER_PRIVATE_KEY: z.string().optional(),
  RESERVE_ORACLE_SIGNER_PRIVATE_KEY: z.string().optional(),
  ORCHESTRATOR_SIGNER_PRIVATE_KEY: z.string().optional(),

  ADDR_CLEAN_BTC: z.string().default(""),
  ADDR_RESERVE_ORACLE: z.string().default(""),
  ADDR_ATTESTATION_REGISTRY: z.string().default(""),
  ADDR_COMPLIANCE_POLICY: z.string().default(""),
  ADDR_RESERVE_VAULT: z.string().default(""),

  DATABASE_URL: z.string().default("postgres://hakky:hakky@localhost:5432/hakky"),
  SCREENING_PROVIDER: z.enum(["stub", "manual-evidence"]).default("stub"),

  // Bitcoin custody. Live mode must use a mainnet Bitcoin Core node and wallet.
  DEPOSIT_VERIFICATION_MODE: z.enum(["stub", "bitcoin-core"]).default("stub"),
  BITCOIN_NETWORK: z
    .enum(["main", "test", "testnet4", "signet", "regtest"])
    .default("regtest"),
  BITCOIN_RPC_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  BITCOIN_RPC_USER: z.string().default(""),
  BITCOIN_RPC_PASSWORD: z.string().default(""),
  BITCOIN_RPC_WALLET: z.string().default(""),
  BITCOIN_CUSTODY_ADDRESS: z.string().default(""),
  BITCOIN_MIN_CONFIRMATIONS: z.coerce.number().int().min(1).max(144).default(6),
  // Operator-funded satoshis held in custody above user liabilities, to pay
  // redemption miner fees. Payouts must pay the recipient exactly, so without
  // this headroom the first payout drops reserves below liabilities for good.
  // Kept as a decimal string and parsed as a bigint; sats never touch a float.
  BITCOIN_FEE_BUFFER_SATS: z.string().default("0"),

  // reserve-oracle keeper: demo mode may publish a configured stub balance.
  RESERVE_ORACLE_CRON: z.string().default("*/5 * * * *"), // every 5 minutes
  RESERVE_HEARTBEAT_SECONDS: z.coerce.number().int().min(300).default(21_600), // six hours
  RESERVE_MAX_STALENESS_SECONDS: z.coerce.number().int().min(600).default(43_200),
  CUSTODY_BALANCE_SATS: z.string().default("0"), // stub custody figure; "0" disables publishing
  RESERVE_REPORT_URI: z.string().default("https://api.hakky.xyz/reports/reserve-latest.json"),

  // attestation-service: HTTP screen+attest endpoint.
  ATTESTATION_PORT: z.coerce.number().default(8081),
  ATTESTATION_TTL_SECONDS: z.coerce.number().default(0), // 0 => contract defaultTtl (90d)
  SANCTIONED_ADDRESSES: z.string().default(""), // comma-separated demo sanctions list

  // orchestrator: deposit/redeem loop.
  ORCHESTRATOR_PORT: z.coerce.number().default(8082),
  REDEMPTION_MODE: z.enum(["disabled", "demo-auto", "manual-verified"]).default("demo-auto"),
  REDEMPTION_START_BLOCK: z.coerce.number().int().nonnegative().default(0),
  REDEMPTION_POLL_MS: z.coerce.number().int().min(1_000).default(15_000),
  EVM_EVENT_CONFIRMATIONS: z.coerce.number().int().min(0).max(256).default(2),
  EVM_LOG_BATCH_SIZE: z.coerce.number().int().min(1).max(10_000).default(2_000),
  BITCOIN_PAYOUT_MIN_CONFIRMATIONS: z.coerce.number().int().min(1).max(144).default(1),

  // write-endpoint auth: bearer token required for POST /screen and /deposit.
  WRITE_API_KEY: z.string().default(""), // empty => writes are refused (fail-closed)
  })
  .superRefine((value, ctx) => {
    if (value.RESERVE_MAX_STALENESS_SECONDS < value.RESERVE_HEARTBEAT_SECONDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESERVE_MAX_STALENESS_SECONDS"],
        message: "reserve max staleness must be at least the heartbeat interval",
      });
    }

    if (value.DEPOSIT_VERIFICATION_MODE === "bitcoin-core") {
      for (const [field, configured] of [
        ["BITCOIN_RPC_URL", value.BITCOIN_RPC_URL],
        ["BITCOIN_RPC_USER", value.BITCOIN_RPC_USER],
        ["BITCOIN_RPC_PASSWORD", value.BITCOIN_RPC_PASSWORD],
        ["BITCOIN_CUSTODY_ADDRESS", value.BITCOIN_CUSTODY_ADDRESS],
      ] as const) {
        if (!configured) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required for bitcoin-core deposit verification`,
          });
        }
      }
    }

    // Every fail-closed check below is gated on OPERATING_MODE, which defaults to
    // "demo". A single dropped environment line would therefore skip bytecode,
    // chain-id, role, and settlement verification while the rest of the config still
    // pointed at mainnet -- and REDEMPTION_MODE would fall back to demo-auto, settling
    // real redemptions against a synthetic txid with no BTC ever sent. Derive the
    // requirement from the mainnet settings themselves rather than trusting one flag.
    const mainnetIndicators = [
      value.CHAIN_ID === 1 ? "CHAIN_ID=1" : undefined,
      value.BITCOIN_NETWORK === "main" ? "BITCOIN_NETWORK=main" : undefined,
    ].filter((indicator): indicator is string => indicator !== undefined);

    if (mainnetIndicators.length > 0 && value.OPERATING_MODE !== "live") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OPERATING_MODE"],
        message:
          `mainnet configuration detected (${mainnetIndicators.join(", ")}) but ` +
          `OPERATING_MODE is "${value.OPERATING_MODE}"; set OPERATING_MODE=live or ` +
          "the live-mode safety checks would be silently skipped",
      });
    }

    // Fall through to the live requirements whenever mainnet is in play, so a
    // misconfigured deployment reports every problem at once rather than one per restart.
    if (value.OPERATING_MODE !== "live" && mainnetIndicators.length === 0) return;

    for (const field of [
      "ADDR_CLEAN_BTC",
      "ADDR_RESERVE_ORACLE",
      "ADDR_ATTESTATION_REGISTRY",
      "ADDR_COMPLIANCE_POLICY",
      "ADDR_RESERVE_VAULT",
    ] as const) {
      const address = value[field];
      if (!EVM_ADDRESS_PATTERN.test(address) || address.toLowerCase() === ZERO_EVM_ADDRESS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `live mode requires a non-zero ${field} contract address`,
        });
      }
    }

    const roleKey = {
      api: undefined,
      attestation: value.ATTESTATION_SIGNER_PRIVATE_KEY,
      "reserve-oracle": value.RESERVE_ORACLE_SIGNER_PRIVATE_KEY,
      orchestrator: value.ORCHESTRATOR_SIGNER_PRIVATE_KEY,
    }[value.SERVICE_ROLE];

    // A process must hold at most its own role's signing key. Declining to *use* a key
    // that is present in the environment is not the same guarantee: every container in
    // the reference deployment shares one env_file, so an environment dump in the
    // internet-facing API -- the only published port and the public HTTPS origin --
    // would surrender VERIFIER, SETTLER, RESERVE_UPDATER, and ATTESTOR at once.
    const signerFields = [
      ["SIGNER_PRIVATE_KEY", value.SIGNER_PRIVATE_KEY, undefined],
      ["ATTESTATION_SIGNER_PRIVATE_KEY", value.ATTESTATION_SIGNER_PRIVATE_KEY, "attestation"],
      [
        "RESERVE_ORACLE_SIGNER_PRIVATE_KEY",
        value.RESERVE_ORACLE_SIGNER_PRIVATE_KEY,
        "reserve-oracle",
      ],
      ["ORCHESTRATOR_SIGNER_PRIVATE_KEY", value.ORCHESTRATOR_SIGNER_PRIVATE_KEY, "orchestrator"],
    ] as const;

    for (const [field, present, ownedBy] of signerFields) {
      if (!present || ownedBy === value.SERVICE_ROLE) continue;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message:
          value.SERVICE_ROLE === "api"
            ? `the api process must not receive a signing key, but ${field} is set; ` +
              "give each service its own environment file"
            : `a live ${value.SERVICE_ROLE} process may hold only its own signing key, ` +
              `but ${field} is set; give each service its own environment file`,
      });
    }

    const liveRequirements: Array<[boolean, keyof typeof value, string]> = [
      [
        isPositiveSatoshiString(value.BITCOIN_FEE_BUFFER_SATS),
        "BITCOIN_FEE_BUFFER_SATS",
        "live mode requires a positive operator-funded fee buffer (in satoshis), " +
          "because redemption payouts pay the recipient exactly and the miner fee " +
          "is therefore taken from custody",
      ],
      [value.CHAIN_ID === 1, "CHAIN_ID", "live mode requires Ethereum mainnet CHAIN_ID=1"],
      [
        value.DEPOSIT_VERIFICATION_MODE === "bitcoin-core",
        "DEPOSIT_VERIFICATION_MODE",
        "live mode requires bitcoin-core deposit verification",
      ],
      [value.BITCOIN_NETWORK === "main", "BITCOIN_NETWORK", "live mode requires Bitcoin mainnet"],
      [
        value.BITCOIN_MIN_CONFIRMATIONS >= 6,
        "BITCOIN_MIN_CONFIRMATIONS",
        "live mode requires at least 6 Bitcoin confirmations",
      ],
      [
        value.BITCOIN_PAYOUT_MIN_CONFIRMATIONS >= 6,
        "BITCOIN_PAYOUT_MIN_CONFIRMATIONS",
        "live mode requires at least 6 Bitcoin payout confirmations",
      ],
      [
        value.SCREENING_PROVIDER !== "stub",
        "SCREENING_PROVIDER",
        "live mode cannot use stub provenance screening",
      ],
      [
        value.REDEMPTION_MODE === "manual-verified",
        "REDEMPTION_MODE",
        "live mode requires verified manual redemption settlement",
      ],
      [
        value.REDEMPTION_START_BLOCK > 0,
        "REDEMPTION_START_BLOCK",
        "live mode requires the ReserveVault deployment block",
      ],
      [
        value.EVM_EVENT_CONFIRMATIONS >= 12,
        "EVM_EVENT_CONFIRMATIONS",
        "live mode requires at least 12 EVM event confirmations",
      ],
      [
        value.RESERVE_MAX_STALENESS_SECONDS <= CONTRACT_MAX_RESERVE_AGE_SECONDS,
        "RESERVE_MAX_STALENESS_SECONDS",
        "live reserve staleness cannot exceed the contract's 12-hour minting limit",
      ],
      [
        value.WRITE_API_KEY.length >= 32,
        "WRITE_API_KEY",
        "live mode requires a WRITE_API_KEY of at least 32 characters",
      ],
    ];

    if (value.SERVICE_ROLE !== "api") {
      const signerField =
        value.SERVICE_ROLE === "attestation"
          ? "ATTESTATION_SIGNER_PRIVATE_KEY"
          : value.SERVICE_ROLE === "reserve-oracle"
            ? "RESERVE_ORACLE_SIGNER_PRIVATE_KEY"
            : "ORCHESTRATOR_SIGNER_PRIVATE_KEY";
      liveRequirements.push([
        /^0x[0-9a-fA-F]{64}$/.test(roleKey ?? ""),
        signerField,
        `live ${value.SERVICE_ROLE} service requires its dedicated signer private key`,
      ]);
    }

    for (const [ok, field, message] of liveRequirements) {
      if (!ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    }
  });

export function parseConfig(env: NodeJS.ProcessEnv) {
  return schema.parse(env);
}

export const config = parseConfig(process.env);
export type Config = typeof config;
