import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { Keypair } from "@solana/web3.js";
import {
  generateDevnetReleaseConfig,
  INSTANCE_DOMAIN,
  instanceCommitment,
  renderRustReleaseConfig,
  restrictPrivateDirectory,
  restrictPrivateFile,
  runDevnetReleaseConfigCli,
} from "../src/devnet-release-config.mjs";

const execFileAsync = promisify(execFile);
const program = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, i) => i));
const initializer = Keypair.fromSeed(
  Uint8Array.from({ length: 32 }, (_, i) => 255 - i),
);
const nonce = Uint8Array.from({ length: 32 }, () => 7);

async function currentWindowsSid() {
  const { stdout } = await execFileAsync("whoami.exe", [
    "/user",
    "/fo",
    "csv",
    "/nh",
  ]);
  const sid = stdout.match(/S-\d(?:-\d+)+/)?.[0];
  assert.ok(sid, "current process-token SID must be available");
  return sid;
}

async function windowsAcl(targetPath) {
  const encodedPath = Buffer.from(targetPath, "utf8").toString("base64");
  const script = `
$privatePath = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedPath}')
)
$acl = Get-Acl -LiteralPath $privatePath
$entries = @($acl.Access | ForEach-Object {
  [PSCustomObject]@{
    sid = $_.IdentityReference.Translate(
      [System.Security.Principal.SecurityIdentifier]
    ).Value
    type = $_.AccessControlType.ToString()
    rights = $_.FileSystemRights.ToString()
    inherited = $_.IsInherited
  }
})
[Console]::Out.Write((ConvertTo-Json -Compress -Depth 4 -InputObject (
  [PSCustomObject]@{
    owner = $acl.GetOwner(
      [System.Security.Principal.SecurityIdentifier]
    ).Value
    protected = $acl.AreAccessRulesProtected
    entries = $entries
  }
)))
`;
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  return JSON.parse(stdout);
}

async function isolatedRepository(t) {
  const root = await mkdtemp(path.join(tmpdir(), "hakky-release-config-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "programs", "hakky-market", "src"), {
    recursive: true,
  });
  await writeFile(path.join(root, ".gitignore"), "artifacts/\n", "utf8");
  return root;
}

function isolatedModuleUrl(root) {
  return pathToFileURL(
    path.join(root, "scripts", "generate-devnet-release-config.mjs"),
  ).href;
}

async function lstatIfExistsForTest(candidate) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function assertExactPrivateDirectorySecurity(candidate) {
  if (process.platform === "win32") {
    const allowedSids = [
      await currentWindowsSid(),
      "S-1-5-18",
      "S-1-5-32-544",
    ].sort();
    const acl = await windowsAcl(candidate);
    assert.equal(acl.owner, await currentWindowsSid());
    assert.equal(acl.protected, true);
    assert.deepEqual(
      acl.entries.map(({ sid }) => sid).sort(),
      allowedSids,
    );
    assert.ok(
      acl.entries.every(
        ({ inherited, rights, type }) =>
          type === "Allow" &&
          inherited === false &&
          rights.includes("FullControl"),
      ),
    );
    return;
  }

  const entry = await stat(candidate);
  assert.equal(entry.mode & 0o777, 0o700);
  if (process.platform === "linux") {
    assert.equal(entry.uid, process.getuid());
  }
}

async function assertNoWindowsDirectoryPinHelper() {
  if (process.platform !== "win32") {
    return;
  }
  const script = `
$needle = 'Hakky' + 'DirectoryPin'
$matches = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like ('*' + $needle + '*')
})
[Console]::Out.Write($matches.Count)
`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true },
    );
    if (Number.parseInt(stdout, 10) === 0) {
      return;
    }
    await delay(25);
  }
  assert.fail("native directory pin helper must be reaped");
}

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

test("replaces hostile Windows ACLs with the exact SID allowlist", async (t) => {
  const directory = path.resolve(
    "artifacts",
    "devnet",
    "private",
    `.permissions-test-${process.pid}`,
  );
  await mkdir(directory, { recursive: true });
  t.after(() => rm(directory, { recursive: true, force: true }));

  const privateFile = path.join(directory, "permissions-test.txt");
  await writeFile(privateFile, "not a secret\n", "utf8");

  if (process.platform === "win32") {
    await execFileAsync("icacls.exe", [
      directory,
      "/grant",
      "*S-1-1-0:(OI)(CI)F",
    ]);
    await execFileAsync("icacls.exe", [
      privateFile,
      "/grant",
      "*S-1-1-0:F",
    ]);
    for (const privatePath of [directory, privateFile]) {
      assert.ok(
        (await windowsAcl(privatePath)).entries.some(
          ({ sid }) => sid === "S-1-1-0",
        ),
        "the hostile Everyone grant must exist before hardening",
      );
    }

    await restrictPrivateDirectory(directory);
    await restrictPrivateFile(privateFile);

    const allowedSids = [
      await currentWindowsSid(),
      "S-1-5-18",
      "S-1-5-32-544",
    ].sort();
    for (const privatePath of [directory, privateFile]) {
      const acl = await windowsAcl(privatePath);
      assert.equal(acl.protected, true);
      assert.deepEqual(
        acl.entries.map(({ sid }) => sid).sort(),
        allowedSids,
      );
      assert.ok(
        acl.entries.every(
          ({ inherited, rights, type }) =>
            type === "Allow" &&
            inherited === false &&
            rights.includes("FullControl"),
        ),
      );
    }
  } else {
    await restrictPrivateDirectory(directory);
    await restrictPrivateFile(privateFile);
    assert.equal((await stat(directory)).mode & 0o777, 0o700);
    assert.equal((await stat(privateFile)).mode & 0o777, 0o600);
  }
});

test("rejects an existing private identity directory without mutation", async (t) => {
  const root = await isolatedRepository(t);
  const privateDirectory = path.join(root, "artifacts", "devnet", "private");
  const sentinelPath = path.join(privateDirectory, "existing-sentinel.txt");
  const rustConfigPath = path.join(
    root,
    "programs",
    "hakky-market",
    "src",
    "release_config.rs",
  );
  await mkdir(privateDirectory, { recursive: true });
  await writeFile(sentinelPath, "existing private set\n", "utf8");
  await writeFile(rustConfigPath, "existing public binding\n", "utf8");

  await assert.rejects(
    generateDevnetReleaseConfig({ repositoryRoot: root }),
    /private identity path already exists/i,
  );

  assert.equal(await readFile(sentinelPath, "utf8"), "existing private set\n");
  assert.equal(
    await readFile(rustConfigPath, "utf8"),
    "existing public binding\n",
  );
  assert.deepEqual(await readdir(privateDirectory), ["existing-sentinel.txt"]);
});

test("rejects an existing private destination file without overwrite", async (t) => {
  const root = await isolatedRepository(t);
  const devnetDirectory = path.join(root, "artifacts", "devnet");
  const privatePath = path.join(devnetDirectory, "private");
  await mkdir(devnetDirectory, { recursive: true });
  await writeFile(privatePath, "existing destination\n", "utf8");

  await assert.rejects(
    generateDevnetReleaseConfig({ repositoryRoot: root }),
    /private identity path already exists/i,
  );

  assert.equal(await readFile(privatePath, "utf8"), "existing destination\n");
  assert.equal((await lstat(privatePath)).isFile(), true);
});

test("no-overwrite publication preserves a destination created after staging", async (t) => {
  const root = await isolatedRepository(t);
  const devnetDirectory = path.join(root, "artifacts", "devnet");
  const privateDirectory = path.join(devnetDirectory, "private");
  const rustConfigPath = path.join(
    root,
    "programs",
    "hakky-market",
    "src",
    "release_config.rs",
  );
  await writeFile(rustConfigPath, "existing public binding\n", "utf8");

  const generation = generateDevnetReleaseConfig({ repositoryRoot: root });
  let stagingObserved = false;
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const entries = await readdir(devnetDirectory).catch((error) => {
      if (error?.code === "ENOENT") {
        return [];
      }
      throw error;
    });
    if (entries.some((entry) => entry.startsWith(".private-stage-"))) {
      stagingObserved = true;
      break;
    }
    await delay(10);
  }
  assert.equal(stagingObserved, true, "private staging must be observable");

  await mkdir(privateDirectory);
  const sentinelPath = path.join(privateDirectory, "existing-sentinel.txt");
  await writeFile(sentinelPath, "race winner\n", "utf8");

  await assert.rejects(generation, /private identity path already exists/i);
  assert.equal(await readFile(sentinelPath, "utf8"), "race winner\n");
  assert.equal(
    await readFile(rustConfigPath, "utf8"),
    "existing public binding\n",
  );
  assert.deepEqual(await readdir(privateDirectory), ["existing-sentinel.txt"]);
  assert.deepEqual(
    (await readdir(devnetDirectory)).filter(
      (entry) => entry.startsWith(".private-stage-") || entry.endsWith(".tmp"),
    ),
    [],
  );
});

test("post-validation staging replacement cannot receive secret bytes", async (t) => {
  const root = await isolatedRepository(t);
  const devnetDirectory = path.join(root, "artifacts", "devnet");
  const publicConfigPath = path.join(
    devnetDirectory,
    "public-release-config.json",
  );
  const rustConfigPath = path.join(
    root,
    "programs",
    "hakky-market",
    "src",
    "release_config.rs",
  );
  const outside = await mkdtemp(path.join(tmpdir(), "hakky-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(devnetDirectory, { recursive: true });
  await writeFile(publicConfigPath, "existing public config\n", "utf8");
  await writeFile(rustConfigPath, "existing Rust binding\n", "utf8");
  await writeFile(path.join(outside, "sentinel.txt"), "outside unchanged\n");

  let hookCalled = false;
  let stagingDirectory;
  let movedStagingDirectory;
  let replacementCreated = false;
  await assert.rejects(
    generateDevnetReleaseConfig({
      repositoryRoot: root,
      async postValidationHook(context) {
        hookCalled = true;
        stagingDirectory = context.stagingDirectory;
        movedStagingDirectory = `${stagingDirectory}.moved`;
        try {
          await rename(stagingDirectory, movedStagingDirectory);
          await symlink(
            outside,
            stagingDirectory,
            process.platform === "win32" ? "junction" : "dir",
          );
          replacementCreated = true;
        } catch (error) {
          throw new Error("staging replacement attempt blocked", {
            cause: error,
          });
        }
      },
    }),
    /staging identity changed|staging replacement attempt blocked/i,
  );

  assert.equal(hookCalled, true);
  assert.deepEqual(await readdir(outside), ["sentinel.txt"]);
  assert.equal(await readFile(publicConfigPath, "utf8"), "existing public config\n");
  assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
  assert.equal(await lstatIfExistsForTest(path.join(outside, "private")), null);
  if (replacementCreated) {
    assert.equal((await lstat(stagingDirectory)).isSymbolicLink(), true);
    assert.deepEqual(await readdir(movedStagingDirectory), []);
    await unlink(stagingDirectory);
    await rm(movedStagingDirectory, { recursive: true, force: true });
  } else {
    assert.deepEqual(
      (await readdir(devnetDirectory)).filter((entry) =>
        entry.startsWith(".private-stage-"),
      ),
      [],
    );
  }
});

test("post-validation ancestor replacement cannot redirect staging", async (t) => {
  const root = await isolatedRepository(t);
  const devnetDirectory = path.join(root, "artifacts", "devnet");
  const publicConfigPath = path.join(
    devnetDirectory,
    "public-release-config.json",
  );
  const rustConfigPath = path.join(
    root,
    "programs",
    "hakky-market",
    "src",
    "release_config.rs",
  );
  const outside = await mkdtemp(path.join(tmpdir(), "hakky-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(devnetDirectory, { recursive: true });
  await writeFile(publicConfigPath, "existing public config\n", "utf8");
  await writeFile(rustConfigPath, "existing Rust binding\n", "utf8");
  await writeFile(path.join(outside, "sentinel.txt"), "outside unchanged\n");

  let hookCalled = false;
  let movedDevnetDirectory;
  let replacementCreated = false;
  await assert.rejects(
    generateDevnetReleaseConfig({
      repositoryRoot: root,
      async postValidationHook(context) {
        hookCalled = true;
        movedDevnetDirectory = `${context.devnetDirectory}.moved`;
        try {
          await rename(context.devnetDirectory, movedDevnetDirectory);
          await symlink(
            outside,
            context.devnetDirectory,
            process.platform === "win32" ? "junction" : "dir",
          );
          replacementCreated = true;
        } catch (error) {
          throw new Error("ancestor replacement attempt blocked", {
            cause: error,
          });
        }
      },
    }),
    /staging identity changed|ancestor replacement attempt blocked/i,
  );

  assert.equal(hookCalled, true);
  assert.deepEqual(await readdir(outside), ["sentinel.txt"]);
  assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
  assert.equal(await lstatIfExistsForTest(path.join(outside, "private")), null);
  if (replacementCreated) {
    assert.equal((await lstat(devnetDirectory)).isSymbolicLink(), true);
    assert.equal(
      await readFile(
        path.join(movedDevnetDirectory, "public-release-config.json"),
        "utf8",
      ),
      "existing public config\n",
    );
    const stagingNames = (await readdir(movedDevnetDirectory)).filter((entry) =>
      entry.startsWith(".private-stage-"),
    );
    assert.equal(stagingNames.length, 1);
    assert.deepEqual(
      await readdir(path.join(movedDevnetDirectory, stagingNames[0])),
      [],
    );
    await unlink(devnetDirectory);
    await rm(movedDevnetDirectory, { recursive: true, force: true });
  } else {
    assert.equal(
      await readFile(publicConfigPath, "utf8"),
      "existing public config\n",
    );
    assert.deepEqual(
      (await readdir(devnetDirectory)).filter((entry) =>
        entry.startsWith(".private-stage-"),
      ),
      [],
    );
  }
});

test("pre-parent-pin substitutions never become an unverified secret boundary", async (t) => {
  await t.test("ordinary directory replacement is hardened and rejected", async (t) => {
    const root = await isolatedRepository(t);
    const artifactsDirectory = path.join(root, "artifacts");
    const devnetDirectory = path.join(artifactsDirectory, "devnet");
    const movedDevnetDirectory = `${devnetDirectory}.validated`;
    const publicConfigPath = path.join(
      devnetDirectory,
      "public-release-config.json",
    );
    const rustConfigPath = path.join(
      root,
      "programs",
      "hakky-market",
      "src",
      "release_config.rs",
    );
    await mkdir(devnetDirectory, { recursive: true });
    await writeFile(publicConfigPath, "existing public config\n", "utf8");
    await writeFile(rustConfigPath, "existing Rust binding\n", "utf8");

    let hookCalled = false;
    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async preParentPinHook(context) {
          hookCalled = true;
          assert.equal(context.artifactsDirectory, artifactsDirectory);
          assert.equal(context.devnetDirectory, devnetDirectory);
          await rename(devnetDirectory, movedDevnetDirectory);
          await mkdir(devnetDirectory);
          if (process.platform === "win32") {
            await execFileAsync("icacls.exe", [
              devnetDirectory,
              "/grant",
              "*S-1-1-0:(OI)(CI)F",
            ]);
          } else {
            await chmod(devnetDirectory, 0o777);
          }
        },
      }),
      /parent identity changed/i,
    );

    assert.equal(hookCalled, true);
    assert.deepEqual(await readdir(devnetDirectory), []);
    assert.equal(
      await readFile(
        path.join(movedDevnetDirectory, "public-release-config.json"),
        "utf8",
      ),
      "existing public config\n",
    );
    assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
    assert.equal(await lstatIfExistsForTest(path.join(devnetDirectory, "private")), null);
    await assertExactPrivateDirectorySecurity(artifactsDirectory);
    await assertExactPrivateDirectorySecurity(devnetDirectory);
    await assertNoWindowsDirectoryPinHelper();

    await rm(devnetDirectory, { recursive: true, force: true });
    await rename(movedDevnetDirectory, devnetDirectory);
  });

  await t.test("junction or symlink replacement is rejected by native acquisition", async (t) => {
    const root = await isolatedRepository(t);
    const artifactsDirectory = path.join(root, "artifacts");
    const devnetDirectory = path.join(artifactsDirectory, "devnet");
    const movedDevnetDirectory = `${devnetDirectory}.validated`;
    const publicConfigPath = path.join(
      devnetDirectory,
      "public-release-config.json",
    );
    const rustConfigPath = path.join(
      root,
      "programs",
      "hakky-market",
      "src",
      "release_config.rs",
    );
    const outside = await mkdtemp(path.join(tmpdir(), "hakky-outside-"));
    t.after(() => rm(outside, { recursive: true, force: true }));
    await mkdir(devnetDirectory, { recursive: true });
    await writeFile(publicConfigPath, "existing public config\n", "utf8");
    await writeFile(rustConfigPath, "existing Rust binding\n", "utf8");
    await writeFile(path.join(outside, "sentinel.txt"), "outside unchanged\n");

    let hookCalled = false;
    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async preParentPinHook() {
          hookCalled = true;
          await rename(devnetDirectory, movedDevnetDirectory);
          await symlink(
            outside,
            devnetDirectory,
            process.platform === "win32" ? "junction" : "dir",
          );
        },
      }),
      /reparse|symbolic|parent identity changed/i,
    );

    assert.equal(hookCalled, true);
    assert.deepEqual(await readdir(outside), ["sentinel.txt"]);
    assert.equal(
      await readFile(
        path.join(movedDevnetDirectory, "public-release-config.json"),
        "utf8",
      ),
      "existing public config\n",
    );
    assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
    assert.equal(await lstatIfExistsForTest(path.join(outside, "private")), null);
    await assertNoWindowsDirectoryPinHelper();

    await unlink(devnetDirectory);
    await rename(movedDevnetDirectory, devnetDirectory);
  });
});

test("staging substitution after pin release cannot be published", async (t) => {
  const root = await isolatedRepository(t);
  const devnetDirectory = path.join(root, "artifacts", "devnet");
  const privateDirectory = path.join(devnetDirectory, "private");
  const publicConfigPath = path.join(
    devnetDirectory,
    "public-release-config.json",
  );
  const rustConfigPath = path.join(
    root,
    "programs",
    "hakky-market",
    "src",
    "release_config.rs",
  );
  const outside = await mkdtemp(path.join(tmpdir(), "hakky-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(devnetDirectory, { recursive: true });
  await writeFile(publicConfigPath, "existing public config\n", "utf8");
  await writeFile(rustConfigPath, "existing Rust binding\n", "utf8");
  await writeFile(path.join(outside, "sentinel.txt"), "outside unchanged\n");

  let hookCalled = false;
  let stagingDirectory;
  let movedStagingDirectory;
  await assert.rejects(
    generateDevnetReleaseConfig({
      repositoryRoot: root,
      async postStagingPinReleaseHook(context) {
        assert.equal(context.phase, "publication");
        hookCalled = true;
        stagingDirectory = context.stagingDirectory;
        movedStagingDirectory = `${stagingDirectory}.released`;
        await rename(stagingDirectory, movedStagingDirectory);
        await symlink(
          outside,
          stagingDirectory,
          process.platform === "win32" ? "junction" : "dir",
        );
      },
    }),
    /staging identity changed/i,
  );

  assert.equal(hookCalled, true);
  assert.deepEqual(await readdir(outside), ["sentinel.txt"]);
  assert.equal(await lstatIfExistsForTest(privateDirectory), null);
  assert.equal(await readFile(publicConfigPath, "utf8"), "existing public config\n");
  assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
  assert.equal((await lstat(stagingDirectory)).isSymbolicLink(), true);
  assert.deepEqual(
    (await readdir(movedStagingDirectory)).sort(),
    [
      "initializer-keypair.json",
      "instance-nonce.hex",
      "program-keypair.json",
    ],
  );
  await assertNoWindowsDirectoryPinHelper();

  await unlink(stagingDirectory);
  await rm(movedStagingDirectory, { recursive: true, force: true });
});

test("staging substitution after pin release cannot be removed by cleanup", async (t) => {
  const root = await isolatedRepository(t);
  const devnetDirectory = path.join(root, "artifacts", "devnet");
  const publicConfigPath = path.join(
    devnetDirectory,
    "public-release-config.json",
  );
  const rustConfigPath = path.join(
    root,
    "programs",
    "hakky-market",
    "src",
    "release_config.rs",
  );
  await mkdir(devnetDirectory, { recursive: true });
  await writeFile(publicConfigPath, "existing public config\n", "utf8");
  await writeFile(rustConfigPath, "existing Rust binding\n", "utf8");

  let hookCalled = false;
  let stagingDirectory;
  let movedStagingDirectory;
  await assert.rejects(
    generateDevnetReleaseConfig({
      repositoryRoot: root,
      async postValidationHook(context) {
        await writeFile(
          path.join(context.stagingDirectory, "force-cleanup.txt"),
          "force cleanup\n",
          "utf8",
        );
      },
      async postStagingPinReleaseHook(context) {
        assert.equal(context.phase, "cleanup");
        hookCalled = true;
        stagingDirectory = context.stagingDirectory;
        movedStagingDirectory = `${stagingDirectory}.released`;
        await rename(stagingDirectory, movedStagingDirectory);
        await mkdir(stagingDirectory);
        await writeFile(
          path.join(stagingDirectory, "replacement-sentinel.txt"),
          "replacement retained\n",
          "utf8",
        );
      },
    }),
    /staging identity changed/i,
  );

  assert.equal(hookCalled, true);
  assert.deepEqual(await readdir(stagingDirectory), [
    "replacement-sentinel.txt",
  ]);
  assert.equal(
    await readFile(
      path.join(stagingDirectory, "replacement-sentinel.txt"),
      "utf8",
    ),
    "replacement retained\n",
  );
  assert.deepEqual(
    (await readdir(movedStagingDirectory)).sort(),
    [
      "force-cleanup.txt",
      "initializer-keypair.json",
      "instance-nonce.hex",
      "program-keypair.json",
    ],
  );
  assert.equal(await readFile(publicConfigPath, "utf8"), "existing public config\n");
  assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
  await assertNoWindowsDirectoryPinHelper();

  await rm(stagingDirectory, { recursive: true, force: true });
  await rm(movedStagingDirectory, { recursive: true, force: true });
});

test("rejects redirected secret ancestors and destinations", async (t) => {
  await t.test("redirected devnet ancestor", async (t) => {
    const root = await isolatedRepository(t);
    const artifactsDirectory = path.join(root, "artifacts");
    const outside = await mkdtemp(path.join(tmpdir(), "hakky-outside-"));
    t.after(() => rm(outside, { recursive: true, force: true }));
    const sentinelPath = path.join(outside, "sentinel.txt");
    await mkdir(artifactsDirectory);
    await writeFile(sentinelPath, "outside unchanged\n", "utf8");
    await symlink(
      outside,
      path.join(artifactsDirectory, "devnet"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await assert.rejects(
      generateDevnetReleaseConfig({ repositoryRoot: root }),
      /redirected|reparse|symbolic/i,
    );

    assert.equal(await readFile(sentinelPath, "utf8"), "outside unchanged\n");
    assert.deepEqual((await readdir(outside)).sort(), ["sentinel.txt"]);
  });

  await t.test("redirected private destination", async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    const outside = await mkdtemp(path.join(tmpdir(), "hakky-outside-"));
    t.after(() => rm(outside, { recursive: true, force: true }));
    const sentinelPath = path.join(outside, "sentinel.txt");
    await mkdir(devnetDirectory, { recursive: true });
    await writeFile(sentinelPath, "outside unchanged\n", "utf8");
    await symlink(
      outside,
      path.join(devnetDirectory, "private"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await assert.rejects(
      generateDevnetReleaseConfig({ repositoryRoot: root }),
      /private identity path already exists|redirected|reparse|symbolic/i,
    );

    assert.equal(await readFile(sentinelPath, "utf8"), "outside unchanged\n");
    assert.deepEqual((await readdir(outside)).sort(), ["sentinel.txt"]);
  });
});

test("CLI roots from its module and writes only canonical public JSON", async (t) => {
  const root = await isolatedRepository(t);
  let stdout = "";

  const result = await runDevnetReleaseConfigCli({
    moduleUrl: isolatedModuleUrl(root),
    stdout: {
      write(chunk) {
        stdout += chunk;
      },
    },
  });

  const parsed = JSON.parse(stdout);
  assert.deepEqual(Object.keys(parsed), [
    "programId",
    "initializer",
    "instanceCommitment",
    "paths",
  ]);
  assert.equal(stdout, result.canonicalPublicJson);
  assert.equal(
    stdout,
    await readFile(
      path.join(root, "artifacts", "devnet", "public-release-config.json"),
      "utf8",
    ),
  );
  assert.equal(
    result.repositoryRoot,
    path.resolve(root),
    "module location, not process.cwd(), selects the repository",
  );
  assert.deepEqual(
    (await readdir(path.join(root, "artifacts", "devnet", "private"))).sort(),
    [
      "initializer-keypair.json",
      "instance-nonce.hex",
      "program-keypair.json",
    ],
  );
  assert.deepEqual(
    (await readdir(path.join(root, "artifacts", "devnet")))
      .filter((name) => name.includes(".tmp") || name.includes(".stage-")),
    [],
  );
});

test("blanket artifacts rule is the explicit private ignore policy", async () => {
  const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
  const ignoreFile = await readFile(path.join(root, ".gitignore"), "utf8");
  assert.doesNotMatch(ignoreFile, /^artifacts\/devnet\/private\/$/mu);

  const privatePaths = [
    "artifacts/devnet/private/program-keypair.json",
    "artifacts/devnet/private/initializer-keypair.json",
    "artifacts/devnet/private/instance-nonce.hex",
  ];
  const { stdout } = await execFileAsync(
    process.platform === "win32" ? "git.exe" : "git",
    ["check-ignore", "-v", ...privatePaths],
    { cwd: root, windowsHide: true },
  );
  const matches = stdout.trim().split(/\r?\n/u);
  assert.equal(matches.length, privatePaths.length);
  for (const [index, match] of matches.entries()) {
    assert.match(
      match,
      /^\.gitignore:\d+:artifacts\/\t/u,
      "blanket artifacts rule must be the matching ignore rule",
    );
    assert.ok(match.endsWith(privatePaths[index]));
  }
});
