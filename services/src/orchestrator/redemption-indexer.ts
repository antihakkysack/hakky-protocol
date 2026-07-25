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
