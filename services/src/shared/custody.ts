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
  await client.assertChainSynced(config.BITCOIN_NETWORK);
  await client.assertCustodyAddress(config.BITCOIN_CUSTODY_ADDRESS);
}

/**
 * Re-assert that Bitcoin Core is synced to the real tip, immediately before an
 * operation whose result depends on the chainstate being current.
 *
 * A startup check is not sufficient. Bitcoin Core answers `listunspent` and
 * `gettxout` from whatever chainstate it holds, with no indication that the state
 * is stale, so a node that stalls mid-process keeps returning UTXOs spent at a
 * height it has not seen. Call this before publishing reserves and before
 * verifying a deposit.
 */
export async function assertCustodyChainSynced(): Promise<void> {
  await requireBitcoinCore().assertChainSynced(config.BITCOIN_NETWORK);
}
