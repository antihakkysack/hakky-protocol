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
});

export const config = schema.parse(process.env);
export type Config = typeof config;
