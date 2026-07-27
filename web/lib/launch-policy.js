export const EXPECTED_PRELAUNCH_RECORD = Object.freeze({
  schemaVersion: 3,
  status: "prelaunch",
  network: "mainnet-beta",
  project: Object.freeze({
    name: "Hakky Protocol",
    symbol: "HAKKY",
    agent: "HakkyAgent",
    website: "https://hakky.xyz",
    x: "https://x.com/antihakkysack",
  }),
  policy: Object.freeze({
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    supplyBaseUnits: "10000000000000",
    uiSupply: "10000000",
    decimals: 6,
    curveAllocationBaseUnits: "8000000000000",
    poolSeedBaseUnits: "2000000000000",
    teamAllocationBaseUnits: "0",
    curveFeeBps: 0,
    poolRetainedFeeBps: 25,
    creatorDebitCapLamports: "1000000000",
  }),
  addresses: null,
  proof: null,
});

function describe(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function compareExact(actual, expected, path, issues) {
  if (expected === null || typeof expected !== "object") {
    if (!Object.is(actual, expected)) {
      issues.push(`${path} must equal ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}`);
    }
    return;
  }

  if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
    issues.push(`${path} must be a plain object; received ${describe(actual)}`);
    return;
  }

  const prototype = Object.getPrototypeOf(actual);
  if (prototype !== Object.prototype && prototype !== null) {
    issues.push(`${path} must not inherit custom properties`);
  }

  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  for (const key of expectedKeys) {
    if (!Object.hasOwn(actual, key)) {
      issues.push(`${path}/${key} is required`);
    }
  }
  for (const key of actualKeys) {
    if (!Object.hasOwn(expected, key)) {
      issues.push(`${path}/${key} is not allowed`);
    }
  }
  for (const key of expectedKeys) {
    if (Object.hasOwn(actual, key)) {
      compareExact(actual[key], expected[key], `${path}/${key}`, issues);
    }
  }
}

export function validateLaunchRecord(record) {
  const issues = [];
  compareExact(record, EXPECTED_PRELAUNCH_RECORD, "", issues);
  return issues.sort((left, right) => left.localeCompare(right));
}
