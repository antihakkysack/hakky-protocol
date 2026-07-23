import assert from "node:assert/strict";
import test from "node:test";
import { assertSchema, validateSchema } from "../src/schema-validation.mjs";
import {
  createCanonicalGraduationProofV1,
  createCanonicalLaunchlabProofV2,
  createCanonicalMintProofV2,
  createCurveLiveRecordV2,
  createGraduatedRecordV2,
  createPrelaunchRecordV2,
} from "../test-support/launch-fixtures.mjs";

const cases = [
  ["mint-v2", () => createCanonicalMintProofV2()],
  ["launchlab-v2 cpmm", () => createCanonicalLaunchlabProofV2()],
  ["launchlab-v2 amm-v4", () => createCanonicalLaunchlabProofV2({ migrationType: "amm-v4" })],
  ["graduation-v1 cpmm", () => createCanonicalGraduationProofV1()],
  ["graduation-v1 amm-v4", () => createCanonicalGraduationProofV1({ migrationType: "amm-v4" })],
  ["launch-v2 prelaunch", () => createPrelaunchRecordV2()],
  ["launch-v2 curve verified cpmm", () => createCurveLiveRecordV2()],
  ["launch-v2 curve verified amm-v4", () => createCurveLiveRecordV2({ migrationType: "amm-v4" })],
  ["launch-v2 curve unavailable", () => createCurveLiveRecordV2({ availability: "unavailable" })],
  ["launch-v2 graduated verified cpmm", () => createGraduatedRecordV2()],
  ["launch-v2 graduated verified amm-v4", () => createGraduatedRecordV2({ migrationType: "amm-v4" })],
  ["launch-v2 graduated unavailable", () => createGraduatedRecordV2({ availability: "unavailable" })],
];

const CANONICAL_RAW_IPFS_URI = "ipfs://bafkreie6m4wnyrkomjeyopg7gwnvdipy62t7riipav6xp6c6zttqlpfiua";
const CANONICAL_ARWEAVE_URI = "https://arweave.net/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const metadataCases = [
  ["mint-v2", createCanonicalMintProofV2, (value) => value.metadata],
  ["launchlab-v2", createCanonicalLaunchlabProofV2, (value) => value.metadata],
  ["graduation-v1", createCanonicalGraduationProofV1, (value) => value.metadata],
  ["launch-v2", createCurveLiveRecordV2, (value) => value.proof.metadata],
];

function kindFor(label) {
  return label.split(" ")[0];
}

function objectPaths(value, path = []) {
  if (value === null || typeof value !== "object") return [];
  const paths = Array.isArray(value) ? [] : [path];
  for (const [key, child] of Object.entries(value)) {
    paths.push(...objectPaths(child, [...path, key]));
  }
  return paths;
}

function atPath(value, path) {
  return path.reduce((current, key) => current[key], value);
}

test("all versioned artifact and lifecycle fixture branches satisfy their normative schema", () => {
  for (const [label, create] of cases) {
    const value = create();
    assert.deepEqual(validateSchema(kindFor(label), value), { ok: true, errors: [] }, label);
    assert.equal(assertSchema(kindFor(label), value), value);
  }
});

test("every root and nested object rejects an unknown property", () => {
  for (const [label, create] of cases) {
    const pristine = create();
    for (const path of objectPaths(pristine)) {
      const changed = structuredClone(pristine);
      atPath(changed, path).unexpected = true;
      const result = validateSchema(kindFor(label), changed);
      assert.equal(result.ok, false, `${label} accepted extra property at /${path.join("/")}`);
      assert.ok(result.errors.some((error) => error.includes("additionalProperties")), result.errors.join("\n"));
    }
  }
});

test("required fields cannot be omitted", () => {
  const samples = [
    ["mint-v2", createCanonicalMintProofV2(), ["identities", "mint"]],
    ["launchlab-v2", createCanonicalLaunchlabProofV2(), ["platformConfig", "mutableFields"]],
    ["graduation-v1", createCanonicalGraduationProofV1(), ["lpDisposition", "evidenceAccounts"]],
    ["launch-v2", createGraduatedRecordV2(), ["proof", "transactions"]],
  ];
  for (const [kind, value, path] of samples) {
    const changed = structuredClone(value);
    const field = path.at(-1);
    delete atPath(changed, path.slice(0, -1))[field];
    const result = validateSchema(kind, changed);
    assert.equal(result.ok, false, `${kind} accepted missing /${path.join("/")}`);
    assert.ok(result.errors.some((error) => error.includes("required")));
  }
});

test("canonical decimal strings reject leading zeroes, decimal points, and numbers", () => {
  const mutations = [
    ["01", "/supply/baseUnits"],
    ["1.0", "/creatorBalance/totalAmountBaseUnits"],
    [-1, "/supply/uiAmount"],
  ];
  for (const [value, pointer] of mutations) {
    const changed = createCanonicalMintProofV2();
    const path = pointer.slice(1).split("/");
    atPath(changed, path.slice(0, -1))[path.at(-1)] = value;
    assert.equal(validateSchema("mint-v2", changed).ok, false, `${pointer} accepted ${value}`);
  }
});

test("timestamps require UTC milliseconds and slots require nonnegative safe integers", () => {
  for (const finalizedAt of ["2026-07-23T00:00:00Z", "2026-07-23", "2026-07-23T00:00:00.000+00:00"]) {
    const changed = createCanonicalLaunchlabProofV2();
    changed.observation.finalizedAt = finalizedAt;
    assert.equal(validateSchema("launchlab-v2", changed).ok, false, `accepted ${finalizedAt}`);
  }
  for (const [kind, create] of [
    ["mint-v2", createCanonicalMintProofV2],
    ["launchlab-v2", createCanonicalLaunchlabProofV2],
    ["graduation-v1", createCanonicalGraduationProofV1],
    ["launch-v2", createCurveLiveRecordV2],
  ]) {
    const changed = create();
    const observation = kind === "launch-v2" ? changed.proof.observation : changed.observation;
    observation.checkedAt = "2026-07-23T00:00:00Z";
    assert.equal(validateSchema(kind, changed).ok, false, `${kind} accepted checkedAt without milliseconds`);
  }
  for (const finalizedSlot of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const changed = createCanonicalGraduationProofV1();
    changed.observation.finalizedSlot = finalizedSlot;
    assert.equal(validateSchema("graduation-v1", changed).ok, false, `accepted slot ${finalizedSlot}`);
  }
});

test("public URLs reject credentials, unrelated query strings, and fragments", () => {
  const variants = [
    "https://user@solscan.io/token/11111111111111111111111111111111",
    "https://solscan.io/token/11111111111111111111111111111111?cluster=devnet",
    "https://solscan.io/token/11111111111111111111111111111111#claim",
  ];
  for (const solscanMint of variants) {
    const changed = createCanonicalLaunchlabProofV2();
    changed.links.solscanMint = solscanMint;
    assert.equal(validateSchema("launchlab-v2", changed).ok, false, `accepted ${solscanMint}`);
  }
});

test("all lifecycle schemas accept exact canonical IPFS and Arweave metadata identities", () => {
  for (const [kind, create, selectMetadata] of metadataCases) {
    for (const uri of [CANONICAL_RAW_IPFS_URI, CANONICAL_ARWEAVE_URI]) {
      const changed = create();
      const metadata = selectMetadata(changed);
      metadata.uri = uri;
      metadata.imageUri = uri;
      assert.deepEqual(validateSchema(kind, changed), { ok: true, errors: [] }, `${kind} rejected ${uri}`);
    }
  }
});

test("schema-shape fixtures use canonical raw CIDv1 metadata identities", () => {
  for (const [kind, create, selectMetadata] of metadataCases) {
    const metadata = selectMetadata(create());
    assert.match(metadata.uri, /^ipfs:\/\/bafkrei/u, `${kind} metadata URI is not raw CIDv1`);
    assert.match(metadata.imageUri, /^ipfs:\/\/bafkrei/u, `${kind} image URI is not raw CIDv1`);
  }
});

test("all lifecycle schemas reject malformed or noncanonical metadata identities", () => {
  const malformed = [
    "ipfs://bafybeigdyrzt5sfp7udm7hu76n2xrv3zku7eao4n6x7j5rjmw2b5uvzq4",
    `${CANONICAL_RAW_IPFS_URI.slice(0, -1)}b`,
    `https://arweave.net/${"A".repeat(42)}B`,
    `${CANONICAL_ARWEAVE_URI}?download=1`,
  ];
  for (const [kind, create, selectMetadata] of metadataCases) {
    for (const uri of malformed) {
      for (const field of ["uri", "imageUri"]) {
        const changed = create();
        selectMetadata(changed)[field] = uri;
        assert.equal(validateSchema(kind, changed).ok, false, `${kind} accepted ${field}=${uri}`);
      }
    }
  }
});

test("LP disposition branches reject fields from the other migration union", () => {
  const amm = createCanonicalGraduationProofV1({ migrationType: "amm-v4" });
  amm.lpDisposition.lockedPosition = "SysvarRent111111111111111111111111111111111";
  assert.equal(validateSchema("graduation-v1", amm).ok, false);

  const cpmm = createCanonicalGraduationProofV1();
  cpmm.lpDisposition.burnedBaseUnits = "1";
  assert.equal(validateSchema("graduation-v1", cpmm).ok, false);
});

test("graduation migration programs and pool correlate with the LP disposition branch", () => {
  const cpmmWithAmmPrograms = createCanonicalGraduationProofV1();
  cpmmWithAmmPrograms.programs.migration = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
  cpmmWithAmmPrograms.programs.pool = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
  cpmmWithAmmPrograms.pool.programId = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
  assert.equal(validateSchema("graduation-v1", cpmmWithAmmPrograms).ok, false);

  const ammWithCpmmPrograms = createCanonicalGraduationProofV1({ migrationType: "amm-v4" });
  ammWithCpmmPrograms.programs.migration = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
  ammWithCpmmPrograms.programs.pool = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
  ammWithCpmmPrograms.pool.programId = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
  assert.equal(validateSchema("graduation-v1", ammWithCpmmPrograms).ok, false);
});

test("Solana identities require canonical base58 round-trips and decoded byte lengths", () => {
  for (const invalidMint of ["1".repeat(33), "2".repeat(32), "0".repeat(32)]) {
    const changed = createCanonicalMintProofV2();
    changed.identities.mint = invalidMint;
    assert.equal(validateSchema("mint-v2", changed).ok, false, `accepted public key ${invalidMint}`);
  }
  for (const invalidSignature of ["1".repeat(65), "2".repeat(64), `${"1".repeat(63)}0`]) {
    const changed = createCanonicalLaunchlabProofV2();
    changed.transaction.signature = invalidSignature;
    assert.equal(validateSchema("launchlab-v2", changed).ok, false, `accepted signature ${invalidSignature}`);
  }
});

test("calendar timestamps are real and observation checks cannot precede finalization", () => {
  for (const checkedAt of ["2026-07-00T00:00:00.000Z", "2026-02-30T00:00:00.000Z"]) {
    const changed = createCanonicalMintProofV2();
    changed.observation.checkedAt = checkedAt;
    assert.equal(validateSchema("mint-v2", changed).ok, false, `accepted impossible timestamp ${checkedAt}`);
  }
  const reversed = createCanonicalLaunchlabProofV2();
  reversed.observation.checkedAt = "2026-07-23T00:00:59.000Z";
  assert.equal(validateSchema("launchlab-v2", reversed).ok, false);
});

test("the 24 SOL graduation threshold is normative in creation and graduation artifacts", () => {
  const launchlab = createCanonicalLaunchlabProofV2();
  launchlab.quote.graduationThresholdLamports = "23999999999";
  assert.equal(validateSchema("launchlab-v2", launchlab).ok, false);

  const graduation = createCanonicalGraduationProofV1();
  graduation.graduationBalance.configuredThresholdLamports = "23999999999";
  assert.equal(validateSchema("graduation-v1", graduation).ok, false);
});

test("creator balance observations are transaction-qualified and duplicate-address-free", () => {
  const stale = createCanonicalMintProofV2();
  stale.creatorBalance.finalizedSlot = stale.observation.creationSlot - 1;
  stale.creatorBalance.finalizedAt = "2026-07-22T23:59:59.000Z";
  assert.equal(validateSchema("mint-v2", stale).ok, false);

  const afterCheck = createCanonicalGraduationProofV1();
  afterCheck.creatorBalance.finalizedAt = "2026-07-23T00:02:02.000Z";
  assert.equal(validateSchema("graduation-v1", afterCheck).ok, false);

  const duplicate = createCanonicalMintProofV2();
  const repeated = structuredClone(duplicate.creatorBalance.accounts[0]);
  repeated.accountSha256 = "f".repeat(64);
  duplicate.creatorBalance.accounts.push(repeated);
  duplicate.creatorBalance.accounts.sort((left, right) => left.address.localeCompare(right.address));
  assert.equal(validateSchema("mint-v2", duplicate).ok, false);
});

test("unavailable records contain no identity, destination, or observed proof residue", () => {
  for (const create of [
    () => createCurveLiveRecordV2({ availability: "unavailable" }),
    () => createGraduatedRecordV2({ availability: "unavailable" }),
  ]) {
    const record = create();
    assert.equal(record.token.mint, null);
    assert.equal(Object.keys(record.proof).length, 2);
    assert.deepEqual(Object.keys(record.proof).sort(), ["availability", "stage"]);
    const serializedProof = JSON.stringify(record.proof);
    assert.doesNotMatch(serializedProof, /mint|link|transaction|authority|balance|pool|lp/i);
  }
});

test("schema validation errors are deterministic and do not echo source values", () => {
  const changed = createCanonicalMintProofV2();
  changed.identities.mint = "secret-invalid-value";
  changed.extra = true;
  const first = validateSchema("mint-v2", changed);
  const second = validateSchema("mint-v2", changed);
  assert.deepEqual(first, second);
  assert.ok(first.errors.every((error) => !error.includes("secret-invalid-value")));
  assert.throws(() => assertSchema("mint-v2", changed), /Schema mint-v2 validation failed/);
  assert.throws(() => validateSchema("unknown", changed), /Unknown schema kind/);
});
