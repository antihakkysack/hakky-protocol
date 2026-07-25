import { config } from "./config.js";
import { BitcoinCoreClient } from "./bitcoin.js";

export const bitcoinCore =
  config.BITCOIN_RPC_URL &&
  config.BITCOIN_RPC_USER &&
  config.BITCOIN_RPC_PASSWORD &&
  config.BITCOIN_CUSTODY_ADDRESS
    ? new BitcoinCoreClient({
        rpcUrl: config.BITCOIN_RPC_URL,
        username: config.BITCOIN_RPC_USER,
        password: config.BITCOIN_RPC_PASSWORD,
        wallet: config.BITCOIN_RPC_WALLET,
      })
    : undefined;

export function requireBitcoinCore(): BitcoinCoreClient {
  if (!bitcoinCore) {
    throw new Error(
      "Bitcoin Core is not configured; set BITCOIN_RPC_URL, credentials, and BITCOIN_CUSTODY_ADDRESS",
    );
  }
  return bitcoinCore;
}

export async function assertBitcoinCustodyReady(): Promise<void> {
  const client = requireBitcoinCore();
  await client.assertNetwork(config.BITCOIN_NETWORK);
  await client.assertCustodyAddress(config.BITCOIN_CUSTODY_ADDRESS);
}
