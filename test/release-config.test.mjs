import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { Keypair } from "@solana/web3.js";
import {
  INSTANCE_DOMAIN,
  instanceCommitment,
  renderRustReleaseConfig,
  restrictPrivateDirectory,
  restrictPrivateFile,
} from "../src/devnet-release-config.mjs";

const execFileAsync = promisify(execFile);
const program = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, i) => i));
const initializer = Keypair.fromSeed(
  Uint8Array.from({ length: 32 }, (_, i) => 255 - i),
);
const nonce = Uint8Array.from({ length: 32 }, () => 7);

test("renders only public compile-time release values", () => {
  const commitment = instanceCommitment(nonce);
  const rendered = renderRustReleaseConfig({
    programId: program.publicKey,
    initializer: initializer.publicKey,
    instanceCommitment: commitment,
  });

  assert.equal(INSTANCE_DOMAIN, "HAKKY_INSTANCE_V1");
  assert.match(rendered, /EXPECTED_PROGRAM_ID_BYTES/);
  assert.match(rendered, /INITIALIZER_BYTES/);
  assert.match(rendered, /INSTANCE_COMMITMENT/);
  assert.match(rendered, /https:\/\/hakky\.xyz\/metadata\/hakky-v1\.json/);
  assert.doesNotMatch(rendered, /\[101,88,|secretKey|instance_nonce/i);
});

test("domain-separated commitment is deterministic and nonce-sensitive", () => {
  assert.deepEqual(instanceCommitment(nonce), instanceCommitment(nonce));
  const changed = Uint8Array.from(nonce);
  changed[31] = 8;
  assert.notDeepEqual(instanceCommitment(nonce), instanceCommitment(changed));
});

test("restricts private devnet directories to the current user", async (t) => {
  const directory = path.resolve(
    "artifacts",
    "devnet",
    "private",
    `.permissions-test-${process.pid}`,
  );
  await mkdir(directory, { recursive: true });
  t.after(() => rm(directory, { recursive: true, force: true }));

  await restrictPrivateDirectory(directory);
  const privateFile = path.join(directory, "permissions-test.txt");
  await writeFile(privateFile, "not a secret\n", "utf8");
  await restrictPrivateFile(privateFile);

  if (process.platform === "win32") {
    for (const privatePath of [directory, privateFile]) {
      const { stdout } = await execFileAsync("icacls", [privatePath]);
      assert.doesNotMatch(stdout, /Authenticated Users|BUILTIN\\Users/i);
    }
  } else {
    assert.equal((await stat(directory)).mode & 0o777, 0o700);
    assert.equal((await stat(privateFile)).mode & 0o777, 0o600);
  }
});
