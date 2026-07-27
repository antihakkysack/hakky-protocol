import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUILD_LOG_NORMALIZATION,
  BUILD_RECORD_SCHEMA_VERSION,
  LOCAL_BUILD_OPERATOR_SHA256,
  serializeBuildRecord,
} from "../src/release-manifest.mjs";
import {
  COST_LEDGER_PATH,
  parseCostLedgerOptions,
  runCostLedger,
} from "../scripts/build-cost-ledger.mjs";
import {
  DEVNET_GENESIS_HASH,
  evaluateCostLedger,
} from "../src/cost-ledger.mjs";

const EXECUTABLE = Buffer.from("hakky-cost-ledger-fixture", "utf8");
const EXECUTABLE_SHA256 = createHash("sha256")
  .update(EXECUTABLE)
  .digest("hex");
const BUILD_DIRECTORY = "artifacts/build/candidate/final-a";
const BUILD_RECORD_PATH = `${BUILD_DIRECTORY}/build-record.json`;

function buildRecord() {
  return {
    schemaVersion: BUILD_RECORD_SCHEMA_VERSION,
    lane: "candidate-sbf",
    buildDirectory: BUILD_DIRECTORY,
    startedAt: "2026-07-27T11:00:00.000Z",
    completedAt: "2026-07-27T11:10:00.000Z",
    source: {
      commit: "1".repeat(40),
      tree: "2".repeat(40),
      clean: true,
      sha256: "3".repeat(64),
    },
    operator: {
      schemaVersion: "hakky-local-build-operator-v1",
      organizationId: "hakky-local",
      operatorId: "local-controller",
      configPath: "config/local-build-operator-v1.json",
      configSha256: LOCAL_BUILD_OPERATOR_SHA256,
    },
    dependencies: {
      cargoLockSha256: "4".repeat(64),
      vendorManifestSha256: "5".repeat(64),
      vendorTreeSha256: "6".repeat(64),
      vendorSourceConfigSha256: "7".repeat(64),
    },
    release: {
      configSha256: "8".repeat(64),
      rustViewSha256: "9".repeat(64),
      javascriptViewSha256: "a".repeat(64),
    },
    container: {
      image:
        "solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68",
      network: "none",
    },
    toolchain: {
      rustc: "rustc 1.89.0-dev",
      cargo: "cargo 1.89.0",
      solana: "solana-cli 4.0.0",
      cargoBuildSbf: "cargo-build-sbf 4.0.0",
    },
    invocation: {
      command: [
        "cargo-build-sbf",
        "--offline",
        "--skip-tools-install",
        "--tools-version",
        "v1.53",
        "--arch",
        "v0",
        "--",
        "--locked",
      ],
      environment: {
        CARGO_HOME: "/cargo-home",
        RUSTUP_TOOLCHAIN: "1.93.1",
      },
    },
    logs: {
      normalization: BUILD_LOG_NORMALIZATION,
      stdoutSha256: "b".repeat(64),
      stderrSha256: "c".repeat(64),
    },
    surface: {
      method: "raw-executable-byte-scan-v1",
      releaseProgramId:
        "Bp5ULfE8tLo7X24kHxWhUmRmWWzD9HdpNa7wxipngfxc",
      releaseProgramIdByteOccurrences: 1,
      testProgramId:
        "FAe4sisG95oZ42w7buUn5qEE4TAnfTTFPiguZUHmhiF",
      testProgramIdByteOccurrences: 0,
      testProgramIdTextOccurrences: 0,
      testArtifactPathOccurrences: 0,
      testArtifactSha256Occurrences: 0,
    },
    executable: {
      name: "hakky_market.so",
      path: "hakky_market.so",
      byteLength: EXECUTABLE.byteLength,
      sha256: EXECUTABLE_SHA256,
    },
    mainnetActionsAuthorized: false,
  };
}

test("cost CLI accepts one canonical candidate build and devnet", () => {
  assert.deepEqual(
    parseCostLedgerOptions([
      "--build-record",
      BUILD_RECORD_PATH,
      "--network",
      "devnet",
    ]),
    {
      buildRecordPath: BUILD_RECORD_PATH,
      network: "devnet",
    },
  );
  for (const argv of [
    [],
    ["--build-record", BUILD_RECORD_PATH, "--network", "mainnet-beta"],
    [
      "--build-record",
      "artifacts/build/candidate/Final-A/build-record.json",
      "--network",
      "devnet",
    ],
    [
      "--build-record",
      "artifacts/build/candidate/final-a/hakky_market.so",
      "--network",
      "devnet",
    ],
    [
      "--build-record",
      "artifacts/build/candidate/final-a/../final-b/build-record.json",
      "--network",
      "devnet",
    ],
    [
      "--build-record",
      BUILD_RECORD_PATH,
      "--network",
      "devnet",
      "--send",
      "yes",
    ],
  ]) {
    assert.throws(() => parseCostLedgerOptions(argv), /Usage|devnet|candidate/u);
  }
});

test("cost CLI performs only the exact finalized read-only RPC sequence", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "hakky-cost-ledger-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const directory = path.join(
    repositoryRoot,
    ...BUILD_DIRECTORY.split("/"),
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "build-record.json"),
    serializeBuildRecord(buildRecord()),
  );
  await writeFile(path.join(directory, "hakky_market.so"), EXECUTABLE);

  const calls = [];
  const rentBySize = new Map([
    [36, 1_141_440],
    [EXECUTABLE.byteLength + 45, 2_000_000],
    [82, 1_461_600],
    [384, 3_563_520],
    [165, 2_039_280],
    [679, 5_616_720],
  ]);
  const rpcClient = {
    hostname: "api.devnet.solana.com",
    async call(method, params) {
      calls.push({ method, params });
      if (method === "getGenesisHash") return DEVNET_GENESIS_HASH;
      if (method === "getMinimumBalanceForRentExemption") {
        return rentBySize.get(params[0]);
      }
      if (method === "getLatestBlockhash") {
        return {
          context: { slot: 123 },
          value: {
            blockhash: "11111111111111111111111111111111",
            lastValidBlockHeight: 456,
          },
        };
      }
      if (method === "getFeeForMessage") {
        return { context: { slot: 124 }, value: 5_000 };
      }
      throw new Error(`unexpected RPC method ${method}`);
    },
  };

  const ledger = await runCostLedger({
    argv: [
      "--build-record",
      BUILD_RECORD_PATH,
      "--network",
      "devnet",
    ],
    repositoryRoot,
    rpcClient,
    now: () => {
      assert.equal(calls.length, 9);
      return new Date("2026-07-27T12:00:00.000Z");
    },
  });
  assert.equal(
    evaluateCostLedger(ledger, {
      now: "2026-07-27T12:00:00.000Z",
    }).ok,
    true,
  );
  assert.deepEqual(ledger.snapshot.feeProbe, {
    latestBlockhash: "11111111111111111111111111111111",
    latestBlockhashSlot: 123,
    lastValidBlockHeight: 456,
    feeSlot: 124,
  });
  assert.deepEqual(
    calls.map(({ method }) => method),
    [
      "getGenesisHash",
      "getMinimumBalanceForRentExemption",
      "getMinimumBalanceForRentExemption",
      "getMinimumBalanceForRentExemption",
      "getMinimumBalanceForRentExemption",
      "getMinimumBalanceForRentExemption",
      "getMinimumBalanceForRentExemption",
      "getLatestBlockhash",
      "getFeeForMessage",
    ],
  );
  assert.ok(
    calls
      .filter(({ method }) => method === "getMinimumBalanceForRentExemption")
      .every(({ params }) => params[1]?.commitment === "finalized"),
  );
  assert.deepEqual(calls.at(-1).params[1], { commitment: "finalized" });
  assert.equal(
    calls.some(({ method }) =>
      /send|simulate|airdrop|signature|transaction/i.test(method),
    ),
    false,
  );
  const persisted = JSON.parse(
    await readFile(
      path.join(repositoryRoot, ...COST_LEDGER_PATH.split("/")),
      "utf8",
    ),
  );
  assert.deepEqual(persisted, ledger);
});

test("wrong genesis and executable drift stop before cost publication", async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "hakky-cost-ledger-invalid-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const directory = path.join(
    repositoryRoot,
    ...BUILD_DIRECTORY.split("/"),
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "build-record.json"),
    serializeBuildRecord(buildRecord()),
  );
  await writeFile(path.join(directory, "hakky_market.so"), Buffer.from("drift"));
  let rpcCalls = 0;
  await assert.rejects(
    runCostLedger({
      argv: [
        "--build-record",
        BUILD_RECORD_PATH,
        "--network",
        "devnet",
      ],
      repositoryRoot,
      rpcClient: {
        hostname: "api.devnet.solana.com",
        async call() {
          rpcCalls += 1;
          return "wrong";
        },
      },
    }),
    /cost-build-binding-invalid/u,
  );
  assert.equal(rpcCalls, 0);
  await assert.rejects(
    readFile(path.join(repositoryRoot, ...COST_LEDGER_PATH.split("/"))),
    { code: "ENOENT" },
  );
});
