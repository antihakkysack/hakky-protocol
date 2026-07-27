import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  RUST_VENDOR_IMAGE,
  planVendorMaterialization,
} from "../scripts/materialize-hakky-cargo-vendor.mjs";

test("vendor materialization is lock-bound, pinned, and contained", () => {
  assert.equal(
    RUST_VENDOR_IMAGE,
    "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3",
  );
  const plan = planVendorMaterialization(path.resolve("C:/repo"));
  assert.equal(
    plan.vendorDirectory,
    path.resolve("C:/repo/artifacts/build/dependencies/vendor"),
  );
  assert.deepEqual(plan.command.slice(0, 4), [
    "rtk",
    "docker",
    "run",
    "--rm",
  ]);
  assert(plan.command.includes("cargo"));
  assert(plan.command.includes("vendor"));
  assert(plan.command.includes("--locked"));
  assert(plan.command.includes("--versioned-dirs"));
  assert.equal(plan.command.some((argument) => /wallet|keypair|\.config\/solana/i.test(argument)), false);
});
