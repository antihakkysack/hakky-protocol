import assert from "node:assert/strict";
import test from "node:test";
import {
  BitcoinCoreClient,
  bitcoinTxidToBytes32,
  btcToSats,
  normalizeBitcoinTxid,
} from "./bitcoin.js";

const TXID = "ab".repeat(32);
const CUSTODY_ADDRESS = "bcrt1qhakkycustody";
const PAYOUT_ADDRESS = "bcrt1qhakkypayout";

interface RpcRequest {
  method: string;
  params: unknown[];
}

function mockRpc(
  handlers: Record<string, (params: unknown[]) => unknown>,
): { fetchImpl: typeof fetch; requests: RpcRequest[] } {
  const requests: RpcRequest[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as {
      id: number;
      method: string;
      params: unknown[];
    };
    requests.push({ method: request.method, params: request.params });
    const handler = handlers[request.method];
    if (!handler) throw new Error(`Unexpected RPC method: ${request.method}`);

    return new Response(
      JSON.stringify({
        result: handler(request.params),
        error: null,
        id: request.id,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return { fetchImpl, requests };
}

function makeClient(fetchImpl: typeof fetch): BitcoinCoreClient {
  return new BitcoinCoreClient({
    rpcUrl: "http://127.0.0.1:18443",
    username: "rpc-user",
    password: "rpc-password",
    wallet: "hakky-pilot",
    fetchImpl,
  });
}

const SYNCED_CHAIN_INFO = {
  chain: "regtest",
  blocks: 800_000,
  headers: 800_000,
  initialblockdownload: false,
  verificationprogress: 0.9999999,
};

test("a synced node passes the chainstate check", async () => {
  const { fetchImpl } = mockRpc({ getblockchaininfo: () => SYNCED_CHAIN_INFO });
  await makeClient(fetchImpl).assertChainSynced("regtest");
});

test("a node still in initial block download is rejected", async () => {
  const { fetchImpl } = mockRpc({
    getblockchaininfo: () => ({ ...SYNCED_CHAIN_INFO, initialblockdownload: true }),
  });

  await assert.rejects(
    () => makeClient(fetchImpl).assertChainSynced("regtest"),
    /initial block download/i,
  );
});

test("a node lagging the header tip is rejected", async () => {
  // A stalled node keeps serving its frozen chainstate: listunspent still returns
  // UTXOs that were spent at a height it has not seen, and gettxout still reports
  // a spent deposit as confirmed. Reserves would be published against BTC that is
  // already gone.
  const { fetchImpl } = mockRpc({
    getblockchaininfo: () => ({ ...SYNCED_CHAIN_INFO, blocks: 799_990, headers: 800_000 }),
  });

  await assert.rejects(
    () => makeClient(fetchImpl).assertChainSynced("regtest"),
    /10 blocks behind/,
  );
});

test("a single block of lag is tolerated as normal propagation", async () => {
  const { fetchImpl } = mockRpc({
    getblockchaininfo: () => ({ ...SYNCED_CHAIN_INFO, blocks: 799_999, headers: 800_000 }),
  });

  await makeClient(fetchImpl).assertChainSynced("regtest");
});

test("the chainstate check still enforces the expected network", async () => {
  const { fetchImpl } = mockRpc({
    getblockchaininfo: () => ({ ...SYNCED_CHAIN_INFO, chain: "main" }),
  });

  await assert.rejects(
    () => makeClient(fetchImpl).assertChainSynced("regtest"),
    /network mismatch/,
  );
});

test("incomplete block verification is rejected", async () => {
  const { fetchImpl } = mockRpc({
    getblockchaininfo: () => ({ ...SYNCED_CHAIN_INFO, verificationprogress: 0.87 }),
  });

  await assert.rejects(
    () => makeClient(fetchImpl).assertChainSynced("regtest"),
    /verification progress/i,
  );
});

test("BTC amounts convert to satoshis without floating-point drift", () => {
  assert.equal(btcToSats("1.00000000"), 100_000_000n);
  assert.equal(btcToSats("0.00000001"), 1n);
  assert.equal(btcToSats(0.1), 10_000_000n);
  assert.throws(() => btcToSats("0.000000001"), /Invalid Bitcoin amount/);
});

test("Bitcoin transaction ids are normalized for the EVM bytes32 ABI", () => {
  assert.equal(normalizeBitcoinTxid(TXID.toUpperCase()), TXID);
  assert.equal(bitcoinTxidToBytes32(TXID), `0x${TXID}`);
  assert.throws(() => normalizeBitcoinTxid("abc"), /64 hexadecimal/);
});

test("deposit verification derives amount from a confirmed custody outpoint", async () => {
  const { fetchImpl, requests } = mockRpc({
    gettxout: () => ({
      confirmations: 6,
      value: 0.25,
      scriptPubKey: { address: CUSTODY_ADDRESS },
      coinbase: false,
    }),
  });
  const client = makeClient(fetchImpl);

  const deposit = await client.verifyDeposit(TXID, 2, CUSTODY_ADDRESS, 6);
  assert.deepEqual(deposit, {
    txid: TXID,
    vout: 2,
    amountSats: 25_000_000n,
    confirmations: 6,
    custodyAddress: CUSTODY_ADDRESS,
  });
  assert.deepEqual(requests, [{ method: "gettxout", params: [TXID, 2, true] }]);
});

test("deposit verification fails closed on confirmation and address mismatches", async () => {
  const lowConfirmations = makeClient(
    mockRpc({
      gettxout: () => ({
        confirmations: 5,
        value: 1,
        scriptPubKey: { address: CUSTODY_ADDRESS },
        coinbase: false,
      }),
    }).fetchImpl,
  );
  await assert.rejects(
    lowConfirmations.verifyDeposit(TXID, 0, CUSTODY_ADDRESS, 6),
    /5 confirmations; 6 required/,
  );

  const wrongAddress = makeClient(
    mockRpc({
      gettxout: () => ({
        confirmations: 6,
        value: 1,
        scriptPubKey: { address: "bcrt1qnotcustody" },
        coinbase: false,
      }),
    }).fetchImpl,
  );
  await assert.rejects(
    wrongAddress.verifyDeposit(TXID, 0, CUSTODY_ADDRESS, 6),
    /does not pay the configured custody address/,
  );
});

test("confirmed reserve balance sums only safe custody UTXOs", async () => {
  const client = makeClient(
    mockRpc({
      listunspent: () => [
        { txid: TXID, vout: 0, address: CUSTODY_ADDRESS, amount: 0.4, safe: true },
        { txid: "cd".repeat(32), vout: 1, address: CUSTODY_ADDRESS, amount: 0.1, safe: true },
        { txid: "ef".repeat(32), vout: 2, address: CUSTODY_ADDRESS, amount: 1, safe: false },
      ],
    }).fetchImpl,
  );

  assert.equal(await client.getConfirmedCustodyBalanceSats(CUSTODY_ADDRESS, 6), 50_000_000n);
});

test("payout verification requires the exact address, amount, and confirmation depth", async () => {
  const client = makeClient(
    mockRpc({
      gettransaction: () => ({
        confirmations: 2,
        details: [
          {
            address: PAYOUT_ADDRESS,
            category: "send",
            amount: -0.25,
          },
        ],
        decoded: {
          vout: [
            {
              value: 0.25,
              scriptPubKey: { address: PAYOUT_ADDRESS },
            },
          ],
        },
      }),
    }).fetchImpl,
  );

  const payout = await client.verifyPayout(TXID, PAYOUT_ADDRESS, 25_000_000n, 1);
  assert.equal(payout.amountSats, 25_000_000n);
  await assert.rejects(
    client.verifyPayout(TXID, PAYOUT_ADDRESS, 25_000_001n, 1),
    /exact outbound payment/,
  );
});

test("payout verification rejects a matching transaction not sent by custody", async () => {
  const client = makeClient(
    mockRpc({
      gettransaction: () => ({
        confirmations: 2,
        details: [
          {
            address: PAYOUT_ADDRESS,
            category: "receive",
            amount: 0.25,
          },
        ],
        decoded: {
          vout: [
            {
              value: 0.25,
              scriptPubKey: { address: PAYOUT_ADDRESS },
            },
          ],
        },
      }),
    }).fetchImpl,
  );

  await assert.rejects(
    client.verifyPayout(TXID, PAYOUT_ADDRESS, 25_000_000n, 1),
    /not recorded as an exact outbound payment/,
  );
});

test("startup checks bind the client to the intended chain and custody wallet", async () => {
  const client = makeClient(
    mockRpc({
      getblockchaininfo: () => ({ chain: "regtest" }),
      getaddressinfo: () => ({
        address: CUSTODY_ADDRESS,
        ismine: false,
        solvable: true,
      }),
    }).fetchImpl,
  );

  await client.assertNetwork("regtest");
  await client.assertCustodyAddress(CUSTODY_ADDRESS);
  await assert.rejects(client.assertNetwork("main"), /network mismatch/);
});
