const SATS_PER_BTC = 100_000_000n;
const TXID_PATTERN = /^[0-9a-fA-F]{64}$/;

type FetchLike = typeof fetch;

interface BitcoinRpcErrorBody {
  code: number;
  message: string;
}

interface BitcoinRpcEnvelope<T> {
  result: T;
  error: BitcoinRpcErrorBody | null;
  id: number | string | null;
}

interface ScriptPubKey {
  address?: string;
  addresses?: string[];
}

interface TxOut {
  confirmations: number;
  value: number | string;
  scriptPubKey: ScriptPubKey;
  coinbase: boolean;
}

interface AddressInfo {
  address: string;
  ismine: boolean;
  solvable: boolean;
}

interface UnspentOutput {
  txid: string;
  vout: number;
  address?: string;
  amount: number | string;
  safe: boolean;
}

interface WalletTransaction {
  confirmations: number;
  details: Array<{
    address?: string;
    category: string;
    amount: number | string;
    abandoned?: boolean;
  }>;
  decoded?: {
    vout: Array<{
      value: number | string;
      scriptPubKey: ScriptPubKey;
    }>;
  };
}

export interface BitcoinCoreClientOptions {
  rpcUrl: string;
  username: string;
  password: string;
  wallet?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export interface VerifiedBitcoinDeposit {
  txid: string;
  vout: number;
  amountSats: bigint;
  confirmations: number;
  custodyAddress: string;
}

export interface VerifiedBitcoinPayout {
  txid: string;
  amountSats: bigint;
  confirmations: number;
  payoutAddress: string;
}

export class BitcoinRpcError extends Error {
  constructor(
    public readonly method: string,
    public readonly code: number,
    message: string,
  ) {
    super(`Bitcoin Core RPC ${method} failed (${code}): ${message}`);
    this.name = "BitcoinRpcError";
  }
}

export function normalizeBitcoinTxid(value: string): string {
  const txid = value.startsWith("0x") ? value.slice(2) : value;
  if (!TXID_PATTERN.test(txid)) {
    throw new Error("Bitcoin txid must contain exactly 64 hexadecimal characters");
  }
  return txid.toLowerCase();
}

export function bitcoinTxidToBytes32(value: string): string {
  return `0x${normalizeBitcoinTxid(value)}`;
}

export function btcToSats(value: number | string): bigint {
  const text =
    typeof value === "number"
      ? (() => {
          if (!Number.isFinite(value)) throw new Error("Bitcoin amount must be finite");
          return value.toFixed(8);
        })()
      : value.trim();

  const match = /^(-?)(\d+)(?:\.(\d{1,8}))?$/.exec(text);
  if (!match) {
    throw new Error(`Invalid Bitcoin amount: ${text}`);
  }

  const [, sign, whole, fraction = ""] = match;
  const sats = BigInt(whole) * SATS_PER_BTC + BigInt(fraction.padEnd(8, "0"));
  return sign === "-" ? -sats : sats;
}

export class BitcoinCoreClient {
  private readonly endpoint: string;
  private readonly authorization: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private requestId = 0;

  constructor(options: BitcoinCoreClientOptions) {
    const endpoint = new URL(options.rpcUrl);
    if (options.wallet) {
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/wallet/${encodeURIComponent(options.wallet)}`;
    }
    this.endpoint = endpoint.toString();
    this.authorization = `Basic ${Buffer.from(`${options.username}:${options.password}`).toString("base64")}`;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          authorization: this.authorization,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++this.requestId,
          method,
          params,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Bitcoin Core RPC ${method} returned HTTP ${response.status}`);
      }

      const body = (await response.json()) as BitcoinRpcEnvelope<T>;
      if (body.error) {
        throw new BitcoinRpcError(method, body.error.code, body.error.message);
      }
      return body.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async assertNetwork(expected: string): Promise<void> {
    const info = await this.call<{ chain: string }>("getblockchaininfo");
    if (info.chain !== expected) {
      throw new Error(`Bitcoin Core network mismatch: expected ${expected}, received ${info.chain}`);
    }
  }

  async assertCustodyAddress(address: string): Promise<void> {
    const info = await this.call<AddressInfo>("getaddressinfo", [address]);
    if (info.address !== address) {
      throw new Error(`Bitcoin Core normalized custody address unexpectedly: ${info.address}`);
    }
    if (!info.ismine && !info.solvable) {
      throw new Error("Configured custody address is not controlled or solvable by the Bitcoin Core wallet");
    }
  }

  async verifyDeposit(
    txidValue: string,
    vout: number,
    custodyAddress: string,
    minimumConfirmations: number,
  ): Promise<VerifiedBitcoinDeposit> {
    const txid = normalizeBitcoinTxid(txidValue);
    if (!Number.isInteger(vout) || vout < 0 || vout > 0xffffffff) {
      throw new Error("Bitcoin vout must be an unsigned 32-bit integer");
    }

    const output = await this.call<TxOut | null>("gettxout", [txid, vout, true]);
    if (!output) {
      throw new Error(`Bitcoin outpoint ${txid}:${vout} is missing or already spent`);
    }
    if (output.coinbase) {
      throw new Error("Coinbase outputs are not accepted as pilot deposits");
    }
    if (output.confirmations < minimumConfirmations) {
      throw new Error(
        `Bitcoin deposit has ${output.confirmations} confirmations; ${minimumConfirmations} required`,
      );
    }

    const addresses = [
      ...(output.scriptPubKey.address ? [output.scriptPubKey.address] : []),
      ...(output.scriptPubKey.addresses ?? []),
    ];
    if (!addresses.includes(custodyAddress)) {
      throw new Error(`Bitcoin outpoint ${txid}:${vout} does not pay the configured custody address`);
    }

    const amountSats = btcToSats(output.value);
    if (amountSats <= 0n) {
      throw new Error("Bitcoin deposit amount must be positive");
    }

    return {
      txid,
      vout,
      amountSats,
      confirmations: output.confirmations,
      custodyAddress,
    };
  }

  async getConfirmedCustodyBalanceSats(
    custodyAddress: string,
    minimumConfirmations: number,
  ): Promise<bigint> {
    const outputs = await this.call<UnspentOutput[]>("listunspent", [
      minimumConfirmations,
      9_999_999,
      [custodyAddress],
      false,
    ]);

    return outputs.reduce((total, output) => {
      if (output.address && output.address !== custodyAddress) return total;
      if (!output.safe) return total;
      return total + btcToSats(output.amount);
    }, 0n);
  }

  async verifyPayout(
    txidValue: string,
    payoutAddress: string,
    amountSats: bigint,
    minimumConfirmations: number,
  ): Promise<VerifiedBitcoinPayout> {
    const txid = normalizeBitcoinTxid(txidValue);
    const transaction = await this.call<WalletTransaction>("gettransaction", [txid, true, true]);
    if (transaction.confirmations < minimumConfirmations) {
      throw new Error(
        `Bitcoin payout has ${transaction.confirmations} confirmations; ${minimumConfirmations} required`,
      );
    }
    if (!transaction.decoded) {
      throw new Error("Bitcoin Core did not return decoded payout transaction data");
    }

    const sentByCustodyWallet = transaction.details.some(
      (detail) =>
        detail.category === "send" &&
        detail.address === payoutAddress &&
        detail.abandoned !== true &&
        btcToSats(detail.amount) === -amountSats,
    );
    if (!sentByCustodyWallet) {
      throw new Error(
        "Bitcoin payout is not recorded as an exact outbound payment from the custody wallet",
      );
    }

    const matchingOutput = transaction.decoded.vout.find((output) => {
      const addresses = [
        ...(output.scriptPubKey.address ? [output.scriptPubKey.address] : []),
        ...(output.scriptPubKey.addresses ?? []),
      ];
      return addresses.includes(payoutAddress) && btcToSats(output.value) === amountSats;
    });
    if (!matchingOutput) {
      throw new Error("Bitcoin payout transaction does not contain the exact requested output");
    }

    return {
      txid,
      amountSats,
      confirmations: transaction.confirmations,
      payoutAddress,
    };
  }
}
