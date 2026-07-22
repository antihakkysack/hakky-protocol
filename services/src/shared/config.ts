import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),

  CHAIN_ID: z.coerce.number().default(11155111), // Sepolia
  RPC_URL: z.string().url().default("https://ethereum-sepolia-rpc.publicnode.com"),
  SIGNER_PRIVATE_KEY: z.string().optional(),

  ADDR_CLEAN_BTC: z.string().default(""),
  ADDR_RESERVE_ORACLE: z.string().default(""),
  ADDR_ATTESTATION_REGISTRY: z.string().default(""),
  ADDR_COMPLIANCE_POLICY: z.string().default(""),
  ADDR_RESERVE_VAULT: z.string().default(""),

  DATABASE_URL: z.string().default("postgres://hakky:hakky@localhost:5432/hakky"),
  SCREENING_PROVIDER: z.string().default("stub"),

  // reserve-oracle keeper: publishes the (stubbed) custody balance on a schedule.
  RESERVE_ORACLE_CRON: z.string().default("*/5 * * * *"), // every 5 minutes
  CUSTODY_BALANCE_SATS: z.string().default("0"), // stub custody figure; "0" disables publishing
  RESERVE_REPORT_URI: z.string().default("https://api.hakky.xyz/reports/reserve-latest.json"),

  // attestation-service: HTTP screen+attest endpoint.
  ATTESTATION_PORT: z.coerce.number().default(8081),
  ATTESTATION_TTL_SECONDS: z.coerce.number().default(0), // 0 => contract defaultTtl (90d)
  SANCTIONED_ADDRESSES: z.string().default(""), // comma-separated demo sanctions list

  // orchestrator: deposit/redeem loop.
  ORCHESTRATOR_PORT: z.coerce.number().default(8082),

  // write-endpoint auth: bearer token required for POST /screen and /deposit.
  WRITE_API_KEY: z.string().default(""), // empty => writes are refused (fail-closed)
});

export const config = schema.parse(process.env);
export type Config = typeof config;
