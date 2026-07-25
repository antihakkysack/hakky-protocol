export interface RedemptionScanRange {
  fromBlock: number;
  toBlock: number;
}

export function safeEventHead(head: number, confirmations: number): number {
  if (!Number.isSafeInteger(head) || head < 0) throw new Error(`Invalid EVM head: ${head}`);
  if (!Number.isSafeInteger(confirmations) || confirmations < 0) {
    throw new Error(`Invalid EVM confirmation depth: ${confirmations}`);
  }
  return Math.max(0, head - confirmations);
}

export function initialRedemptionCursor(
  persistedCursor: number | null,
  configuredStartBlock: number,
  safeHead: number,
): number {
  if (persistedCursor !== null) return persistedCursor;
  // A zero start block preserves demo behavior: begin after boot. Live mode
  // requires the actual ReserveVault deployment block in configuration.
  return configuredStartBlock > 0 ? configuredStartBlock - 1 : safeHead;
}

/**
 * Redemption ids present on-chain but absent from the index.
 *
 * The cursor advances to the end of whatever range `queryFilter` returned, and a
 * load-balanced RPC backend lagging the head returns an empty array rather than an
 * error for blocks it has not indexed. A redemption can therefore be skipped
 * permanently: the holder's cBTC is already burned, `pendingRedemptionSats` stays
 * elevated against the scarce one-BTC ceiling, the redemption never appears in
 * `/redemptions/pending`, and nothing surfaces it.
 *
 * `ReserveVault` assigns ids strictly sequentially (`id = ++redemptionCount`), so
 * `redemptionCount()` is an authoritative checksum against the indexed set.
 */
export function missingRedemptionIds(indexedIds: bigint[], onChainCount: bigint): bigint[] {
  const indexed = new Set(indexedIds.map((id) => id.toString()));
  const missing: bigint[] = [];
  for (let id = 1n; id <= onChainCount; id++) {
    if (!indexed.has(id.toString())) missing.push(id);
  }
  return missing;
}

/**
 * Durable cursor key, namespaced by chain and vault.
 *
 * A global key survives a vault redeploy and carries the previous deployment's block
 * height into the new one, silently skipping every redemption before it — while the
 * new vault restarts ids at 1 and collides with the old vault's rows. Launch blockers
 * 1 and 8 make a redeploy likely, and blocker 6 requires the database to survive it.
 */
export function redemptionCursorKey(chainId: number, vaultAddress: string): string {
  return `orchestrator:redeem-requested:${chainId}:${vaultAddress.toLowerCase()}`;
}

export function nextRedemptionScanRange(
  cursor: number,
  safeHead: number,
  batchSize: number,
): RedemptionScanRange | null {
  if (cursor >= safeHead) return null;
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new Error(`Invalid EVM log batch size: ${batchSize}`);
  }
  return {
    fromBlock: cursor + 1,
    toBlock: Math.min(safeHead, cursor + batchSize),
  };
}
