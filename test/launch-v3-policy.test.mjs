import assert from "node:assert/strict";
import test from "node:test";
import { validateSchema } from "../src/schema-validation.mjs";

const policyModule = await import("../web/lib/prelaunch-policy.js").catch(() => ({
  EXPECTED_PRELAUNCH_RECORD: null,
  validateLaunchRecord: () => ["prelaunch policy module is missing"],
}));
const viewModule = await import("../web/lib/prelaunch-view.js").catch(() => ({
  buildLaunchView: () => {
    throw new Error("prelaunch view module is missing");
  },
}));

const {
  EXPECTED_PRELAUNCH_RECORD,
  validateLaunchRecord,
} = policyModule;
const { buildLaunchView } = viewModule;

const RECORD = Object.freeze({
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

function validateV3Schema(value) {
  try {
    return validateSchema("launch-v3", value);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

test("exports the exact frozen schema-v3 prelaunch record", () => {
  assert.deepEqual(EXPECTED_PRELAUNCH_RECORD, RECORD);
  assert.equal(Object.isFrozen(EXPECTED_PRELAUNCH_RECORD), true);
  assert.equal(Object.isFrozen(EXPECTED_PRELAUNCH_RECORD.project), true);
  assert.equal(Object.isFrozen(EXPECTED_PRELAUNCH_RECORD.policy), true);
});

test("the browser policy and JSON Schema accept the exact record", () => {
  assert.deepEqual(validateLaunchRecord(RECORD), []);
  assert.deepEqual(validateV3Schema(RECORD), { ok: true, errors: [] });
});

for (const [name, mutate] of [
  ["an extra root key", value => { value.destination = "https://example.invalid"; }],
  ["schema version 2", value => { value.schemaVersion = 2; }],
  ["a live status", value => { value.status = "curve-live"; }],
  ["non-null addresses", value => { value.addresses = {}; }],
  ["non-null proof", value => { value.proof = {}; }],
  ["an incorrect supply", value => { value.policy.supplyBaseUnits = "999"; }],
  ["an incorrect pool fee", value => { value.policy.poolRetainedFeeBps = 24; }],
  ["a missing project field", value => { delete value.project.agent; }],
  ["an extra policy field", value => { value.policy.venue = "example"; }],
]) {
  test(`both validators reject ${name}`, () => {
    const changed = structuredClone(RECORD);
    mutate(changed);
    assert.notDeepEqual(validateLaunchRecord(changed), []);
    assert.equal(validateV3Schema(changed).ok, false);
  });
}

test("the browser policy rejects arrays and inherited keys", () => {
  assert.notDeepEqual(validateLaunchRecord([]), []);

  const inherited = Object.create({ destination: "https://example.invalid" });
  Object.assign(inherited, structuredClone(RECORD));
  assert.notDeepEqual(validateLaunchRecord(inherited), []);
});

test("the public view is frozen and contains no address or destination", () => {
  const view = buildLaunchView(RECORD);
  assert.deepEqual(view, {
    state: "prelaunch",
    heading: "PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.",
    program: "Not published",
    mint: "Not published",
    market: "Not initialized",
    curve: "Not live",
    pool: "Not live",
    proof: "Unavailable before verified launch state",
  });
  assert.equal(Object.isFrozen(view), true);
  assert.doesNotMatch(JSON.stringify(view), /https?:|[1-9A-HJ-NP-Za-km-z]{32,44}/);
});
