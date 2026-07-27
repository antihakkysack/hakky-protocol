import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  SBF_IMAGE,
  SBF_IMAGE_DIGEST,
  isCleanRtkGitStatus,
  parseBuildOptions,
  planSbfBuild,
} from "../scripts/build-hakky-sbf.mjs";

test("pins the exact SBF image and hermetic cargo-build-sbf invocation", () => {
  assert.equal(
    SBF_IMAGE,
    "solanafoundation/solana-verifiable-build:4.0.0@sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68",
  );
  assert.equal(
    SBF_IMAGE_DIGEST,
    "sha256:0b4e3716fad9ca4b4aac3e3f977f43aad93a18c22296c0c0f44fc22e644bdd68",
  );

  const plan = planSbfBuild({
    lane: "test-sbf",
    repositoryRoot: path.resolve("C:/repo"),
  });
  assert.equal(plan.outputDirectory, path.resolve("C:/repo/artifacts/build/test-sbf"));
  assert.equal(
    plan.testSourceDirectory,
    path.resolve("C:/repo/artifacts/build/test-sbf/source"),
  );
  assert.equal(
    plan.sourceBinary,
    path.resolve("C:/repo/artifacts/build/test-sbf/source/target/deploy/hakky_market.so"),
  );
  assert.deepEqual(plan.command.slice(0, 6), [
    "rtk",
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
  ]);
  assert(plan.command.includes("cargo-build-sbf"));
  assert(plan.command.includes("--offline"));
  assert(plan.command.includes("--skip-tools-install"));
  assert(plan.command.includes("--tools-version"));
  assert(plan.command.includes("v1.53"));
  assert(plan.command.includes("--arch"));
  assert(plan.command.includes("v0"));
  assert(plan.command.includes("--locked"));
  assert(plan.command.some((argument) => argument.endsWith(":/vendor:ro")));
  assert.deepEqual(
    plan.command.slice(plan.command.indexOf("-w"), plan.command.indexOf("-w") + 2),
    ["-w", "/workspace/artifacts/build/test-sbf/source"],
  );
  assert.equal(plan.command.some((argument) => /wallet|keypair|\.config\/solana/i.test(argument)), false);
});

test("candidate lane is clean-tree gated and no unknown lane is accepted", () => {
  const root = path.resolve("C:/repo");
  const plan = planSbfBuild({
    lane: "candidate-sbf",
    repositoryRoot: root,
    outputRelativePath: "artifacts/build/candidate/local-a",
  });
  assert.equal(plan.requiresCleanTree, true);
  assert.equal(plan.testSourceDirectory, null);
  assert.equal(
    plan.outputDirectory,
    path.resolve("C:/repo/artifacts/build/candidate/local-a"),
  );
  assert.equal(
    plan.sourceDirectory,
    path.resolve("C:/repo/artifacts/build/candidate/local-a/source"),
  );
  assert.equal(
    plan.sourceBinary,
    path.resolve(
      "C:/repo/artifacts/build/candidate/local-a/source/target/deploy/hakky_market.so",
    ),
  );
  assert.deepEqual(
    plan.command.slice(plan.command.indexOf("-w"), plan.command.indexOf("-w") + 2),
    ["-w", "/workspace"],
  );
  assert(plan.command.some((argument) => argument.endsWith(":/workspace:rw")));
  assert.equal(
    plan.command.some((argument) =>
      argument.startsWith(`${path.resolve("C:/repo")}:`),
    ),
    false,
  );
  assert.deepEqual(
    parseBuildOptions([
      "--lane",
      "candidate-sbf",
      "--output",
      "artifacts/build/candidate/local-a",
    ]),
    {
      lane: "candidate-sbf",
      outputRelativePath: "artifacts/build/candidate/local-a",
    },
  );
  for (const argv of [
    ["--lane", "candidate-sbf"],
    ["--lane", "test-sbf", "--output", "artifacts/build/candidate/local-a"],
    ["--lane", "candidate-sbf", "--output", "artifacts/build/candidate"],
    ["--lane", "candidate-sbf", "--output", "../../outside"],
    [
      "--lane",
      "candidate-sbf",
      "--output",
      "artifacts/build/candidate/local-a",
      "--wallet",
      "x",
    ],
  ]) {
    assert.throws(() => parseBuildOptions(argv), /Usage|candidate|output/u);
  }
  assert.throws(
    () => planSbfBuild({ lane: "other", repositoryRoot: root }),
    /lane/i,
  );
});

test("candidate clean-tree gate accepts RTK's empty-status sentinel only", () => {
  assert.equal(isCleanRtkGitStatus(""), true);
  assert.equal(isCleanRtkGitStatus("ok\r\n"), true);
  assert.equal(isCleanRtkGitStatus(" M package.json\r\n"), false);
  assert.equal(isCleanRtkGitStatus("?? new-file\r\n"), false);
});
