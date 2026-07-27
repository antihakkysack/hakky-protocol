import { isDeepStrictEqual } from "node:util";

export const COST_SNAPSHOT_SCHEMA_VERSION = "hakky-cost-snapshot-v1";
export const COST_LEDGER_SCHEMA_VERSION = "hakky-cost-ledger-v1";
export const OPERATION_GRAPH_SCHEMA_VERSION =
  "hakky-cost-operation-graph-v1";
export const DEVNET_GENESIS_HASH =
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const CREATOR_FUNDED_CAP_LAMPORTS = 1_000_000_000n;
export const COST_FRESHNESS_MS = 15 * 60 * 1000;
export const DEPLOYMENT_WRITE_CHUNK_BYTES = 900;
export const PRIORITY_MICRO_LAMPORTS_PER_COMPUTE_UNIT = 100_000n;

const BUILD_RECORD_PATTERN =
  /^artifacts\/build\/candidate\/([a-z0-9][a-z0-9-]*)\/build-record\.json$/u;
const EXECUTABLE_PATTERN =
  /^artifacts\/build\/candidate\/([a-z0-9][a-z0-9-]*)\/hakky_market\.so$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_MILLISECOND_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const LAMPORT_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;
const DEBIT_CLASSES = new Set(["zero", "fee", "rent-and-fee"]);
const COMPUTE_UNIT_LIMITS = Object.freeze({
  deployCreateBuffer: 200_000,
  deployCreateProgram: 200_000,
  deployWrite: 200_000,
  deployFinalize: 200_000,
  initializeMarket: 1_400_000,
});

const LEDGER_KEYS = Object.freeze([
  "schemaVersion",
  "snapshot",
  "evaluatedAt",
  "freshUntil",
  "permanentRentLamports",
  "deploymentWriteTransactionCount",
  "operationGraph",
  "paths",
  "maximumPrefixLamports",
  "capLamports",
  "withinCap",
  "ok",
  "mainnetActionsAuthorized",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function canonicalTimestamp(value) {
  if (typeof value !== "string" || !UTC_MILLISECOND_PATTERN.test(value)) {
    return false;
  }
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

export function parseCanonicalLamports(value) {
  if (typeof value !== "string" || !LAMPORT_PATTERN.test(value)) {
    throw new Error("cost-lamports-invalid");
  }
  return BigInt(value);
}

function timestamp(value) {
  const instant = value instanceof Date ? value : new Date(value);
  const result = instant.toISOString();
  if (!canonicalTimestamp(result)) throw new Error("cost-time-invalid");
  return result;
}

function assertSnapshot(snapshot) {
  if (
    !exactKeys(snapshot, [
      "schemaVersion",
      "network",
      "genesisHash",
      "commitment",
      "rpcHost",
      "collectedAt",
      "feeProbe",
      "build",
      "rent",
      "fees",
      "deployment",
      "policy",
    ]) ||
    snapshot.schemaVersion !== COST_SNAPSHOT_SCHEMA_VERSION ||
    snapshot.network !== "devnet" ||
    snapshot.genesisHash !== DEVNET_GENESIS_HASH ||
    snapshot.commitment !== "finalized" ||
    snapshot.rpcHost !== "api.devnet.solana.com" ||
    !canonicalTimestamp(snapshot.collectedAt)
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  if (
    !exactKeys(snapshot.feeProbe, [
      "latestBlockhash",
      "latestBlockhashSlot",
      "lastValidBlockHeight",
      "feeSlot",
    ]) ||
    typeof snapshot.feeProbe.latestBlockhash !== "string" ||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(
      snapshot.feeProbe.latestBlockhash,
    ) ||
    !Number.isSafeInteger(snapshot.feeProbe.latestBlockhashSlot) ||
    snapshot.feeProbe.latestBlockhashSlot < 0 ||
    !Number.isSafeInteger(snapshot.feeProbe.lastValidBlockHeight) ||
    snapshot.feeProbe.lastValidBlockHeight < 0 ||
    !Number.isSafeInteger(snapshot.feeProbe.feeSlot) ||
    snapshot.feeProbe.feeSlot < snapshot.feeProbe.latestBlockhashSlot
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  if (
    !exactKeys(snapshot.build, [
      "recordPath",
      "recordSha256",
      "executablePath",
      "executableByteLength",
      "executableSha256",
    ]) ||
    !BUILD_RECORD_PATTERN.test(snapshot.build.recordPath) ||
    !EXECUTABLE_PATTERN.test(snapshot.build.executablePath) ||
    BUILD_RECORD_PATTERN.exec(snapshot.build.recordPath)?.[1] !==
      EXECUTABLE_PATTERN.exec(snapshot.build.executablePath)?.[1] ||
    !SHA256_PATTERN.test(snapshot.build.recordSha256) ||
    !SHA256_PATTERN.test(snapshot.build.executableSha256) ||
    !Number.isSafeInteger(snapshot.build.executableByteLength) ||
    snapshot.build.executableByteLength < 1 ||
    snapshot.build.executableByteLength > 120_000
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  if (
    !exactKeys(snapshot.rent, [
      "program36",
      "programData",
      "mint82",
      "state384",
      "token165",
      "metadata679",
    ]) ||
    !exactKeys(snapshot.rent.programData, ["byteLength", "lamports"]) ||
    snapshot.rent.programData.byteLength !==
      snapshot.build.executableByteLength + 45
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  for (const value of [
    snapshot.rent.program36,
    snapshot.rent.programData.lamports,
    snapshot.rent.mint82,
    snapshot.rent.state384,
    snapshot.rent.token165,
    snapshot.rent.metadata679,
  ]) {
    if (parseCanonicalLamports(value) < 1n) {
      throw new Error("cost-snapshot-invalid");
    }
  }
  if (
    !exactKeys(snapshot.fees, [
      "lamportsPerSignature",
      "priorityMicroLamportsPerComputeUnit",
      "computeUnitLimits",
    ]) ||
    parseCanonicalLamports(snapshot.fees.lamportsPerSignature) < 1n ||
    parseCanonicalLamports(
      snapshot.fees.priorityMicroLamportsPerComputeUnit,
    ) !== PRIORITY_MICRO_LAMPORTS_PER_COMPUTE_UNIT ||
    !exactKeys(snapshot.fees.computeUnitLimits, Object.keys(COMPUTE_UNIT_LIMITS)) ||
    !isDeepStrictEqual(snapshot.fees.computeUnitLimits, COMPUTE_UNIT_LIMITS)
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  const expectedWriteCount = Math.ceil(
    snapshot.build.executableByteLength / DEPLOYMENT_WRITE_CHUNK_BYTES,
  );
  if (
    !exactKeys(snapshot.deployment, [
      "writeChunkBytes",
      "writeTransactionCount",
    ]) ||
    snapshot.deployment.writeChunkBytes !== DEPLOYMENT_WRITE_CHUNK_BYTES ||
    snapshot.deployment.writeTransactionCount !== expectedWriteCount
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  if (
    !exactKeys(snapshot.policy, [
      "automaticRetries",
      "refundsNettedBeforeFinality",
      "externalBuyerWsolIncluded",
    ]) ||
    snapshot.policy.automaticRetries !== 0 ||
    snapshot.policy.refundsNettedBeforeFinality !== false ||
    snapshot.policy.externalBuyerWsolIncluded !== false
  ) {
    throw new Error("cost-snapshot-invalid");
  }
  return snapshot;
}

function transactionFee(snapshot, signatureCount, computeUnitLimit) {
  const signatureFee =
    parseCanonicalLamports(snapshot.fees.lamportsPerSignature) *
    BigInt(signatureCount);
  const priorityNumerator =
    parseCanonicalLamports(
      snapshot.fees.priorityMicroLamportsPerComputeUnit,
    ) * BigInt(computeUnitLimit);
  const priorityFee = (priorityNumerator + 999_999n) / 1_000_000n;
  return signatureFee + priorityFee;
}

function operationGraph(snapshot) {
  const nodes = [];
  const push = ({
    id,
    parentId,
    operation,
    outcome,
    terminal,
    debitClass,
    debitLamports,
  }) => {
    nodes.push({
      id,
      parentId,
      operation,
      outcome,
      terminal,
      debitClass,
      debitLamports: debitLamports.toString(),
    });
  };
  push({
    id: "ceremony-start",
    parentId: null,
    operation: "ceremony",
    outcome: "start",
    terminal: false,
    debitClass: "zero",
    debitLamports: 0n,
  });
  const bufferFee = transactionFee(
    snapshot,
    2,
    COMPUTE_UNIT_LIMITS.deployCreateBuffer,
  );
  push({
    id: "deploy-create-buffer-failure",
    parentId: "ceremony-start",
    operation: "deploy-create-buffer",
    outcome: "failure",
    terminal: true,
    debitClass: "fee",
    debitLamports: bufferFee,
  });
  push({
    id: "deploy-create-buffer-success",
    parentId: "ceremony-start",
    operation: "deploy-create-buffer",
    outcome: "success",
    terminal: false,
    debitClass: "rent-and-fee",
    debitLamports:
      parseCanonicalLamports(snapshot.rent.programData.lamports) + bufferFee,
  });
  push({
    id: "abandon-buffer",
    parentId: "deploy-create-buffer-success",
    operation: "operator-stop",
    outcome: "abandon",
    terminal: true,
    debitClass: "zero",
    debitLamports: 0n,
  });
  const programFee = transactionFee(
    snapshot,
    2,
    COMPUTE_UNIT_LIMITS.deployCreateProgram,
  );
  push({
    id: "deploy-create-program-failure",
    parentId: "deploy-create-buffer-success",
    operation: "deploy-create-program",
    outcome: "failure",
    terminal: true,
    debitClass: "fee",
    debitLamports: programFee,
  });
  push({
    id: "deploy-create-program-success",
    parentId: "deploy-create-buffer-success",
    operation: "deploy-create-program",
    outcome: "success",
    terminal: false,
    debitClass: "rent-and-fee",
    debitLamports:
      parseCanonicalLamports(snapshot.rent.program36) + programFee,
  });

  let parentId = "deploy-create-program-success";
  const width = String(snapshot.deployment.writeTransactionCount).length;
  const writeFee = transactionFee(
    snapshot,
    1,
    COMPUTE_UNIT_LIMITS.deployWrite,
  );
  for (
    let index = 1;
    index <= snapshot.deployment.writeTransactionCount;
    index += 1
  ) {
    const suffix = String(index).padStart(width, "0");
    const operation = `deploy-write-${suffix}`;
    push({
      id: `${operation}-failure`,
      parentId,
      operation,
      outcome: "failure",
      terminal: true,
      debitClass: "fee",
      debitLamports: writeFee,
    });
    const successId = `${operation}-success`;
    push({
      id: successId,
      parentId,
      operation,
      outcome: "success",
      terminal: false,
      debitClass: "fee",
      debitLamports: writeFee,
    });
    parentId = successId;
  }
  const finalizeFee = transactionFee(
    snapshot,
    2,
    COMPUTE_UNIT_LIMITS.deployFinalize,
  );
  push({
    id: "deploy-finalize-failure",
    parentId,
    operation: "deploy-finalize",
    outcome: "failure",
    terminal: true,
    debitClass: "fee",
    debitLamports: finalizeFee,
  });
  push({
    id: "deploy-finalize-success",
    parentId,
    operation: "deploy-finalize",
    outcome: "success",
    terminal: false,
    debitClass: "fee",
    debitLamports: finalizeFee,
  });
  push({
    id: "abandon-program",
    parentId: "deploy-finalize-success",
    operation: "operator-stop",
    outcome: "abandon",
    terminal: true,
    debitClass: "zero",
    debitLamports: 0n,
  });
  const initializeFee = transactionFee(
    snapshot,
    1,
    COMPUTE_UNIT_LIMITS.initializeMarket,
  );
  push({
    id: "initialize-failure",
    parentId: "deploy-finalize-success",
    operation: "initialize-immutable-market",
    outcome: "failure",
    terminal: true,
    debitClass: "fee",
    debitLamports: initializeFee,
  });
  const initializationRent =
    parseCanonicalLamports(snapshot.rent.mint82) +
    parseCanonicalLamports(snapshot.rent.state384) +
    2n * parseCanonicalLamports(snapshot.rent.token165) +
    parseCanonicalLamports(snapshot.rent.metadata679);
  push({
    id: "initialize-success",
    parentId: "deploy-finalize-success",
    operation: "initialize-immutable-market",
    outcome: "success",
    terminal: true,
    debitClass: "rent-and-fee",
    debitLamports: initializationRent + initializeFee,
  });
  return {
    schemaVersion: OPERATION_GRAPH_SCHEMA_VERSION,
    rootId: "ceremony-start",
    nodes,
  };
}

export function evaluateOperationGraph(graph) {
  const failures = [];
  if (
    !exactKeys(graph, ["schemaVersion", "rootId", "nodes"]) ||
    graph.schemaVersion !== OPERATION_GRAPH_SCHEMA_VERSION ||
    typeof graph.rootId !== "string" ||
    !Array.isArray(graph.nodes) ||
    graph.nodes.length < 2
  ) {
    return { ok: false, failures: ["graph-shape"], paths: [] };
  }
  const byId = new Map();
  for (const node of graph.nodes) {
    if (
      !exactKeys(node, [
        "id",
        "parentId",
        "operation",
        "outcome",
        "terminal",
        "debitClass",
        "debitLamports",
      ]) ||
      !NODE_ID_PATTERN.test(node.id) ||
      byId.has(node.id) ||
      (node.parentId !== null && !NODE_ID_PATTERN.test(node.parentId)) ||
      !NODE_ID_PATTERN.test(node.operation) ||
      !["start", "success", "failure", "abandon"].includes(node.outcome) ||
      typeof node.terminal !== "boolean" ||
      !DEBIT_CLASSES.has(node.debitClass)
    ) {
      failures.push("node-shape");
      continue;
    }
    let debit;
    try {
      debit = parseCanonicalLamports(node.debitLamports);
    } catch {
      failures.push("node-debit");
      continue;
    }
    if (
      (node.debitClass === "zero" && debit !== 0n) ||
      (node.debitClass !== "zero" && debit < 1n)
    ) {
      failures.push("node-debit-class");
    }
    byId.set(node.id, node);
  }
  const root = byId.get(graph.rootId);
  if (
    !root ||
    root.parentId !== null ||
    root.outcome !== "start" ||
    root.terminal !== false ||
    root.debitClass !== "zero"
  ) {
    failures.push("root");
  }
  const children = new Map([...byId.keys()].map((id) => [id, []]));
  for (const node of byId.values()) {
    if (node.id === graph.rootId) continue;
    if (!byId.has(node.parentId)) {
      failures.push("parent");
      continue;
    }
    children.get(node.parentId).push(node.id);
  }
  for (const node of byId.values()) {
    const childCount = children.get(node.id)?.length ?? 0;
    if ((node.terminal && childCount !== 0) || (!node.terminal && childCount === 0)) {
      failures.push("terminal-shape");
    }
  }
  const states = new Map();
  const visitParent = (id) => {
    const state = states.get(id);
    if (state === "visiting") {
      failures.push("cycle");
      return;
    }
    if (state === "done") return;
    states.set(id, "visiting");
    const node = byId.get(id);
    if (node?.parentId !== null && byId.has(node?.parentId)) {
      visitParent(node.parentId);
    }
    states.set(id, "done");
  };
  for (const id of byId.keys()) visitParent(id);

  const paths = [];
  const reached = new Set();
  const walk = (id, operationIds, cumulative, maximum) => {
    const node = byId.get(id);
    if (!node) return;
    reached.add(id);
    let debit;
    try {
      debit = parseCanonicalLamports(node.debitLamports);
    } catch {
      return;
    }
    const nextCumulative = cumulative + debit;
    const nextMaximum =
      nextCumulative > maximum ? nextCumulative : maximum;
    const nextIds = [...operationIds, id];
    if (node.terminal) {
      paths.push({
        terminalId: id,
        operationIds: nextIds,
        cumulativeDebitLamports: nextCumulative.toString(),
        maximumPrefixLamports: nextMaximum.toString(),
        withinCap: nextMaximum <= CREATOR_FUNDED_CAP_LAMPORTS,
      });
      return;
    }
    for (const child of children.get(id) ?? []) {
      walk(child, nextIds, nextCumulative, nextMaximum);
    }
  };
  if (root) walk(graph.rootId, [], 0n, 0n);
  if (reached.size !== byId.size) failures.push("unreachable");
  return { ok: failures.length === 0, failures, paths };
}

function deriveLedger(snapshot, evaluatedAt) {
  assertSnapshot(snapshot);
  const evaluated = timestamp(evaluatedAt);
  const freshUntil = new Date(
    Date.parse(snapshot.collectedAt) + COST_FRESHNESS_MS,
  ).toISOString();
  const graph = operationGraph(snapshot);
  const graphEvaluation = evaluateOperationGraph(graph);
  if (!graphEvaluation.ok) throw new Error("cost-operation-graph-invalid");
  const permanentRent =
    parseCanonicalLamports(snapshot.rent.program36) +
    parseCanonicalLamports(snapshot.rent.programData.lamports) +
    parseCanonicalLamports(snapshot.rent.mint82) +
    parseCanonicalLamports(snapshot.rent.state384) +
    2n * parseCanonicalLamports(snapshot.rent.token165) +
    parseCanonicalLamports(snapshot.rent.metadata679);
  let maximumPrefix = 0n;
  for (const entry of graphEvaluation.paths) {
    const candidate = parseCanonicalLamports(entry.maximumPrefixLamports);
    if (candidate > maximumPrefix) maximumPrefix = candidate;
  }
  const withinCap = maximumPrefix <= CREATOR_FUNDED_CAP_LAMPORTS;
  const fresh =
    Date.parse(evaluated) >= Date.parse(snapshot.collectedAt) &&
    Date.parse(evaluated) <= Date.parse(freshUntil);
  return {
    schemaVersion: COST_LEDGER_SCHEMA_VERSION,
    snapshot: structuredClone(snapshot),
    evaluatedAt: evaluated,
    freshUntil,
    permanentRentLamports: permanentRent.toString(),
    deploymentWriteTransactionCount:
      snapshot.deployment.writeTransactionCount,
    operationGraph: graph,
    paths: graphEvaluation.paths,
    maximumPrefixLamports: maximumPrefix.toString(),
    capLamports: CREATOR_FUNDED_CAP_LAMPORTS.toString(),
    withinCap,
    ok: withinCap && fresh,
    mainnetActionsAuthorized: false,
  };
}

export function buildCostLedger(
  snapshot,
  { evaluatedAt = new Date().toISOString() } = {},
) {
  return deriveLedger(snapshot, evaluatedAt);
}

export function evaluateCostLedger(
  ledger,
  { now = new Date().toISOString() } = {},
) {
  const failures = [];
  if (!exactKeys(ledger, LEDGER_KEYS)) {
    return { ok: false, failures: ["ledger-shape"] };
  }
  let expected;
  try {
    expected = deriveLedger(ledger.snapshot, ledger.evaluatedAt);
  } catch {
    return { ok: false, failures: ["ledger-input"] };
  }
  if (!isDeepStrictEqual(ledger, expected)) failures.push("ledger-drift");
  let checkedAt;
  try {
    checkedAt = timestamp(typeof now === "function" ? now() : now);
  } catch {
    failures.push("checked-at");
  }
  if (
    checkedAt &&
    (Date.parse(checkedAt) < Date.parse(ledger.snapshot.collectedAt) ||
      Date.parse(checkedAt) > Date.parse(ledger.freshUntil))
  ) {
    failures.push("freshness");
  }
  if (ledger.withinCap !== true) failures.push("cap");
  if (ledger.ok !== true) failures.push("ledger-ok");
  if (ledger.mainnetActionsAuthorized !== false) {
    failures.push("mainnet-actions-authorized");
  }
  return { ok: failures.length === 0, failures };
}

export function serializeCostLedger(ledger) {
  const evaluation = evaluateCostLedger(ledger, {
    now: ledger.evaluatedAt,
  });
  if (!evaluation.ok && !evaluation.failures.every((entry) => entry === "cap" || entry === "ledger-ok")) {
    throw new Error("cost-ledger-invalid");
  }
  return Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}
