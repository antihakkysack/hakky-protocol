import { PublicKey } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";

export const MAINNET_BETA_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

export async function assertMainnetIdentity(connection) {
  const genesisHash = await connection.getGenesisHash();
  if (genesisHash !== MAINNET_BETA_GENESIS_HASH) {
    throw new Error(`RPC genesis hash ${genesisHash} is not mainnet-beta`);
  }
  return genesisHash;
}

async function defaultReadMint({ connection, mint, commitment, programId }) {
  return getMint(connection, mint, commitment, programId);
}

async function defaultReadCreatorTokenAccounts({ connection, creator, mint, commitment, programId }) {
  const response = await connection.getTokenAccountsByOwner(creator, { mint }, commitment);
  return response.value.map(({ account }) => {
    const accountOwner = typeof account.owner === "string" ? account.owner : account.owner?.toBase58?.();
    if (accountOwner !== programId.toBase58()) {
      throw new Error("Creator token account is not owned by the classic SPL Token program");
    }
    const decoded = AccountLayout.decode(account.data);
    const decodedMint = new PublicKey(decoded.mint);
    const decodedOwner = new PublicKey(decoded.owner);
    if (!decodedMint.equals(mint)) {
      throw new Error("Creator token account decoded mint does not match the requested mint");
    }
    if (!decodedOwner.equals(creator)) {
      throw new Error("Creator token account decoded owner does not match the requested creator");
    }
    if (decoded.state === 0) {
      throw new Error("Creator token account is uninitialized");
    }
    if (decoded.state !== 1 && decoded.state !== 2) {
      throw new Error(`Creator token account has invalid state ${decoded.state}`);
    }
    // Frozen accounts still hold creator inventory, so their balances count.
    return { amount: decoded.amount };
  });
}

export async function fetchMintEvidence({
  connection,
  network,
  mintAddress,
  creatorAddress,
  readMint = defaultReadMint,
  readCreatorTokenAccounts = defaultReadCreatorTokenAccounts,
}) {
  const mint = new PublicKey(mintAddress);
  const creator = new PublicKey(creatorAddress);
  const commitment = "confirmed";
  const mintAccount = await readMint({ connection, mint, commitment, programId: TOKEN_PROGRAM_ID });
  const creatorTokenAccounts = await readCreatorTokenAccounts({
    connection,
    creator,
    mint,
    commitment,
    programId: TOKEN_PROGRAM_ID,
  });
  const creatorBalance = creatorTokenAccounts.reduce((total, account) => total + account.amount, 0n);

  return {
    network,
    tokenProgram: "spl-token",
    mint: mint.toBase58(),
    creator: creator.toBase58(),
    supplyBaseUnits: mintAccount.supply.toString(),
    decimals: mintAccount.decimals,
    mintAuthority: mintAccount.mintAuthority?.toBase58() ?? null,
    freezeAuthority: mintAccount.freezeAuthority?.toBase58() ?? null,
    creatorBalanceBaseUnits: creatorBalance.toString(),
  };
}
