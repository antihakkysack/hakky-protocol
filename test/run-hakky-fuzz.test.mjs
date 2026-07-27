import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  FUZZ_IMAGE_TAG,
  FUZZ_RUNS,
  FUZZ_TARGETS,
  planFuzzRun,
} from "../scripts/run-hakky-fuzz.mjs";

test("fuzz lane pins four targets and fixed bounded run counts", () => {
  assert.equal(FUZZ_IMAGE_TAG, "hakky-market-fuzz:nightly-2026-07-20");
  assert.deepEqual(FUZZ_TARGETS, ["instruction", "state", "accounts", "math"]);
  assert.deepEqual(FUZZ_RUNS, {
    instruction: 10_000,
    state: 10_000,
    accounts: 10_000,
    math: 100_000,
  });
  const plan = planFuzzRun(path.resolve("C:/repo"));
  assert.deepEqual(plan.buildCommand.slice(0, 4), ["rtk", "docker", "build", "--file"]);
  assert.deepEqual(plan.dependencyCommand.slice(0, 6), [
    "rtk",
    "docker",
    "run",
    "--rm",
    "--network",
    "bridge",
  ]);
  assert(plan.dependencyCommand.includes("fetch"));
  assert(plan.dependencyCommand.includes("--locked"));
  assert(
    plan.dependencyCommand.some((argument) =>
      argument.endsWith(":/usr/local/cargo/registry:rw"),
    ),
  );
  for (const target of FUZZ_TARGETS) {
    assert(plan.runCommands[target].includes(target));
    assert(plan.runCommands[target].includes(`-runs=${FUZZ_RUNS[target]}`));
    assert.deepEqual(
      plan.runCommands[target].slice(0, 6),
      ["rtk", "docker", "run", "--rm", "--network", "none"],
    );
    assert(plan.runCommands[target].includes("CARGO_NET_OFFLINE=true"));
    assert(
      plan.runCommands[target].some((argument) =>
        argument.endsWith(":/usr/local/cargo/registry:rw"),
      ),
    );
  }
});
