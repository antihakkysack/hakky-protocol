import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Keypair } from "@solana/web3.js";

export const INSTANCE_DOMAIN = "HAKKY_INSTANCE_V1";
export const METADATA_URI = "https://hakky.xyz/metadata/hakky-v1.json";
const execFileAsync = promisify(execFile);

async function replaceWindowsAcl(privatePath, isDirectory) {
  const encodedPath = Buffer.from(privatePath, "utf8").toString("base64");
  const script = `
$privatePath = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedPath}')
)
$isDirectory = $${isDirectory ? "true" : "false"}
$currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$allowedSids = @(
  $currentSid,
  [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),
  [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
)
if ($isDirectory) {
  $acl = [System.Security.AccessControl.DirectorySecurity]::new()
} else {
  $acl = [System.Security.AccessControl.FileSecurity]::new()
}
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in $allowedSids) {
  if ($isDirectory) {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
      [System.Security.AccessControl.PropagationFlags]::None,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
  } else {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      [System.Security.AccessControl.AccessControlType]::Allow
    )
  }
  [void]$acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $privatePath -AclObject $acl

$applied = Get-Acl -LiteralPath $privatePath
$expected = @($allowedSids | ForEach-Object { $_.Value } | Sort-Object)
$actual = @($applied.Access | ForEach-Object {
  $_.IdentityReference.Translate(
    [System.Security.Principal.SecurityIdentifier]
  ).Value
} | Sort-Object)
if (
  -not $applied.AreAccessRulesProtected -or
  $actual.Count -ne $expected.Count -or
  (Compare-Object -ReferenceObject $expected -DifferenceObject $actual)
) {
  throw 'private ACL SID allowlist validation failed'
}
foreach ($rule in $applied.Access) {
  if (
    $rule.AccessControlType -ne
      [System.Security.AccessControl.AccessControlType]::Allow -or
    $rule.IsInherited -or
    ($rule.FileSystemRights -band
      [System.Security.AccessControl.FileSystemRights]::FullControl) -ne
      [System.Security.AccessControl.FileSystemRights]::FullControl
  ) {
    throw 'private ACL rule validation failed'
  }
}
`;
  await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
}

export async function restrictPrivateDirectory(directory) {
  await chmod(directory, 0o700);
  if (process.platform === "win32") {
    await replaceWindowsAcl(directory, true);
  }
}

export async function restrictPrivateFile(filePath) {
  await chmod(filePath, 0o600);
  if (process.platform === "win32") {
    await replaceWindowsAcl(filePath, false);
  }
}

export function instanceCommitment(instanceNonce) {
  if (!(instanceNonce instanceof Uint8Array) || instanceNonce.length !== 32) {
    throw new TypeError("instance nonce must be exactly 32 bytes");
  }
  return createHash("sha256")
    .update(Buffer.from(INSTANCE_DOMAIN, "ascii"))
    .update(instanceNonce)
    .digest();
}

function rustArray(bytes) {
  return `[${[...bytes].join(", ")}]`;
}

export function renderRustReleaseConfig({
  programId,
  initializer,
  instanceCommitment: commitment,
}) {
  if (commitment.length !== 32) {
    throw new TypeError("instance commitment must be exactly 32 bytes");
  }
  return `use solana_program::pubkey::Pubkey;

pub const EXPECTED_PROGRAM_ID_BYTES: [u8; 32] = ${rustArray(programId.toBytes())};
pub const INITIALIZER_BYTES: [u8; 32] = ${rustArray(initializer.toBytes())};
pub const INSTANCE_COMMITMENT: [u8; 32] = ${rustArray(commitment)};
pub const METADATA_URI: &str = "${METADATA_URI}";

pub const EXPECTED_PROGRAM_ID: Pubkey =
    Pubkey::new_from_array(EXPECTED_PROGRAM_ID_BYTES);
pub const INITIALIZER: Pubkey = Pubkey::new_from_array(INITIALIZER_BYTES);
`;
}

function isContained(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
}

async function lstatIfExists(candidate) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function isWindowsReparsePoint(candidate) {
  if (process.platform !== "win32") {
    return false;
  }
  const encodedPath = Buffer.from(candidate, "utf8").toString("base64");
  const script = `
$candidate = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedPath}')
)
$item = Get-Item -Force -LiteralPath $candidate
if (
  ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
) {
  [Console]::Out.Write('1')
} else {
  [Console]::Out.Write('0')
}
`;
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  return stdout === "1";
}

async function assertNotRedirected(candidate, entry, label) {
  if (entry.isSymbolicLink() || (await isWindowsReparsePoint(candidate))) {
    throw new Error(`${label} is redirected by a symbolic link or reparse point`);
  }
}

async function assertSafeDirectory(candidate, rootReal, label) {
  const entry = await lstat(candidate);
  await assertNotRedirected(candidate, entry, label);
  if (!entry.isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
  const resolved = await realpath(candidate);
  if (!isContained(rootReal, resolved)) {
    throw new Error(`${label} escapes the repository root`);
  }
  return resolved;
}

async function ensureSafeDirectory(candidate, rootReal, label) {
  try {
    await mkdir(candidate, { mode: 0o755 });
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
  }
  return assertSafeDirectory(candidate, rootReal, label);
}

async function assertSafeOptionalFile(candidate, rootReal, label) {
  const entry = await lstatIfExists(candidate);
  if (!entry) {
    return;
  }
  await assertNotRedirected(candidate, entry, label);
  if (!entry.isFile()) {
    throw new Error(`${label} must be a regular file`);
  }
  const resolved = await realpath(candidate);
  if (!isContained(rootReal, resolved)) {
    throw new Error(`${label} escapes the repository root`);
  }
}

async function validatePrivateDirectory(candidate, parentReal) {
  const entry = await lstat(candidate);
  await assertNotRedirected(candidate, entry, "private staging directory");
  if (!entry.isDirectory()) {
    throw new Error("private staging path must be a directory");
  }
  const resolved = await realpath(candidate);
  if (!isContained(parentReal, resolved)) {
    throw new Error("private staging directory escapes the devnet directory");
  }
  if (process.platform !== "win32" && (entry.mode & 0o777) !== 0o700) {
    throw new Error("private staging directory must have mode 0700");
  }
  return resolved;
}

async function validatePrivateFile(candidate, stagingReal, openedEntry) {
  const entry = await lstat(candidate);
  await assertNotRedirected(candidate, entry, "private identity file");
  if (!entry.isFile()) {
    throw new Error("private identity path must be a regular file");
  }
  if (
    openedEntry &&
    (entry.dev !== openedEntry.dev || entry.ino !== openedEntry.ino)
  ) {
    throw new Error("private identity path changed after exclusive creation");
  }
  const resolved = await realpath(candidate);
  if (!isContained(stagingReal, resolved)) {
    throw new Error("private identity file escapes its staging directory");
  }
  if (process.platform !== "win32" && (entry.mode & 0o777) !== 0o600) {
    throw new Error("private identity file must have mode 0600");
  }
}

async function writeExclusivePrivateFile(candidate, contents, stagingReal) {
  const flags =
    fsConstants.O_WRONLY |
    fsConstants.O_CREAT |
    fsConstants.O_EXCL |
    (fsConstants.O_NOFOLLOW ?? 0);
  const handle = await open(candidate, flags, 0o600);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await restrictPrivateFile(candidate);
    await validatePrivateFile(candidate, stagingReal, await handle.stat());
  } finally {
    await handle.close();
  }
}

async function writeOwnedTemporaryFile(finalPath, contents) {
  const parent = path.dirname(finalPath);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const temporaryPath = path.join(
      parent,
      `.${path.basename(finalPath)}.${randomBytes(12).toString("hex")}.tmp`,
    );
    let owned = false;
    try {
      const handle = await open(
        temporaryPath,
        fsConstants.O_WRONLY |
          fsConstants.O_CREAT |
          fsConstants.O_EXCL |
          (fsConstants.O_NOFOLLOW ?? 0),
        0o600,
      );
      owned = true;
      try {
        await handle.writeFile(contents, "utf8");
        await handle.sync();
        const namedEntry = await lstat(temporaryPath);
        const openedEntry = await handle.stat();
        if (
          !namedEntry.isFile() ||
          namedEntry.isSymbolicLink() ||
          namedEntry.dev !== openedEntry.dev ||
          namedEntry.ino !== openedEntry.ino
        ) {
          throw new Error("public temporary path changed after exclusive creation");
        }
      } finally {
        await handle.close();
      }
      return temporaryPath;
    } catch (error) {
      if (owned) {
        try {
          await unlink(temporaryPath);
        } catch (cleanupError) {
          if (cleanupError?.code !== "ENOENT") {
            throw new AggregateError(
              [error, cleanupError],
              "public temporary write and cleanup failed",
            );
          }
        }
      }
      if (error?.code === "EEXIST" && !owned && attempt < 3) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("unable to allocate a public temporary path");
}

async function directoryRenameNoReplace(source, destination) {
  if (process.platform === "win32") {
    const encodedSource = Buffer.from(source, "utf8").toString("base64");
    const encodedDestination = Buffer.from(destination, "utf8").toString(
      "base64",
    );
    const script = `
$source = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedSource}')
)
$destination = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedDestination}')
)
[IO.Directory]::Move($source, $destination)
`;
    try {
      await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { windowsHide: true },
      );
    } catch (error) {
      if (
        (await lstatIfExists(source)) &&
        (await lstatIfExists(destination))
      ) {
        throw new Error("private identity path already exists", {
          cause: error,
        });
      }
      throw error;
    }
    return;
  }

  if (process.platform === "linux") {
    await execFileAsync("mv", [
      "--no-clobber",
      "--no-target-directory",
      "--",
      source,
      destination,
    ]);
    if (await lstatIfExists(source)) {
      throw new Error("private identity path already exists");
    }
    return;
  }

  throw new Error(
    `atomic no-overwrite directory rename is unsupported on ${process.platform}`,
  );
}

async function cleanupOwnedStage(stagingPath, devnetDirectory) {
  if (
    stagingPath &&
    path.dirname(stagingPath) === devnetDirectory &&
    path.basename(stagingPath).startsWith(".private-stage-")
  ) {
    await rm(stagingPath, { recursive: true, force: true });
  }
}

async function cleanupOwnedTemporaryFile(temporaryPath, finalPath) {
  if (
    temporaryPath &&
    path.dirname(temporaryPath) === path.dirname(finalPath) &&
    path
      .basename(temporaryPath)
      .startsWith(`.${path.basename(finalPath)}.`) &&
    path.basename(temporaryPath).endsWith(".tmp")
  ) {
    try {
      await unlink(temporaryPath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export function repositoryRootFromModule(moduleUrl) {
  return path.resolve(fileURLToPath(new URL("../", moduleUrl)));
}

export async function generateDevnetReleaseConfig({ repositoryRoot }) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) {
    throw new TypeError("repository root must be an absolute path");
  }
  const root = path.resolve(repositoryRoot);
  const rootEntry = await lstat(root);
  await assertNotRedirected(root, rootEntry, "repository root");
  if (!rootEntry.isDirectory()) {
    throw new Error("repository root must be a directory");
  }
  const rootReal = await realpath(root);

  const artifactsDirectory = path.join(root, "artifacts");
  await ensureSafeDirectory(
    artifactsDirectory,
    rootReal,
    "artifacts directory",
  );
  const devnetDirectory = path.join(artifactsDirectory, "devnet");
  const devnetReal = await ensureSafeDirectory(
    devnetDirectory,
    rootReal,
    "devnet directory",
  );

  const programsDirectory = path.join(root, "programs");
  await assertSafeDirectory(programsDirectory, rootReal, "programs directory");
  const programDirectory = path.join(programsDirectory, "hakky-market");
  await assertSafeDirectory(
    programDirectory,
    rootReal,
    "hakky-market directory",
  );
  const sourceDirectory = path.join(programDirectory, "src");
  await assertSafeDirectory(sourceDirectory, rootReal, "program source directory");

  const privateDirectory = path.join(devnetDirectory, "private");
  const existingPrivateEntry = await lstatIfExists(privateDirectory);
  if (existingPrivateEntry) {
    if (
      existingPrivateEntry.isSymbolicLink() ||
      (await isWindowsReparsePoint(privateDirectory))
    ) {
      throw new Error(
        "private identity path already exists and is redirected by a reparse point",
      );
    }
    throw new Error("private identity path already exists");
  }

  const publicConfigPath = path.join(
    devnetDirectory,
    "public-release-config.json",
  );
  const rustConfigPath = path.join(sourceDirectory, "release_config.rs");
  await assertSafeOptionalFile(
    publicConfigPath,
    rootReal,
    "public release config",
  );
  await assertSafeOptionalFile(
    rustConfigPath,
    rootReal,
    "Rust release config",
  );

  let stagingDirectory;
  let publicTemporaryPath;
  let rustTemporaryPath;
  try {
    stagingDirectory = await mkdtemp(
      path.join(devnetDirectory, ".private-stage-"),
    );
    await restrictPrivateDirectory(stagingDirectory);
    const stagingReal = await validatePrivateDirectory(
      stagingDirectory,
      devnetReal,
    );

    const program = Keypair.generate();
    const initializer = Keypair.generate();
    const nonce = randomBytes(32);
    const commitment = instanceCommitment(nonce);
    const privateFiles = [
      [
        "program-keypair.json",
        `${JSON.stringify([...program.secretKey])}\n`,
      ],
      [
        "initializer-keypair.json",
        `${JSON.stringify([...initializer.secretKey])}\n`,
      ],
      ["instance-nonce.hex", `${nonce.toString("hex")}\n`],
    ];
    for (const [fileName, contents] of privateFiles) {
      await writeExclusivePrivateFile(
        path.join(stagingDirectory, fileName),
        contents,
        stagingReal,
      );
    }
    const stagedNames = (await readdir(stagingDirectory)).sort();
    const expectedNames = privateFiles.map(([fileName]) => fileName).sort();
    if (
      stagedNames.length !== expectedNames.length ||
      stagedNames.some((fileName, index) => fileName !== expectedNames[index])
    ) {
      throw new Error("private staging directory is not the exact identity set");
    }

    const publicConfig = {
      programId: program.publicKey.toBase58(),
      initializer: initializer.publicKey.toBase58(),
      instanceCommitment: commitment.toString("hex"),
      paths: {
        publicReleaseConfig: path
          .relative(root, publicConfigPath)
          .replaceAll("\\", "/"),
        rustReleaseConfig: path
          .relative(root, rustConfigPath)
          .replaceAll("\\", "/"),
      },
    };
    const canonicalPublicJson = `${JSON.stringify(publicConfig, null, 2)}\n`;
    publicTemporaryPath = await writeOwnedTemporaryFile(
      publicConfigPath,
      canonicalPublicJson,
    );
    rustTemporaryPath = await writeOwnedTemporaryFile(
      rustConfigPath,
      renderRustReleaseConfig({
        programId: program.publicKey,
        initializer: initializer.publicKey,
        instanceCommitment: commitment,
      }),
    );

    await directoryRenameNoReplace(stagingDirectory, privateDirectory);
    stagingDirectory = null;
    await rename(publicTemporaryPath, publicConfigPath);
    publicTemporaryPath = null;
    await rename(rustTemporaryPath, rustConfigPath);
    rustTemporaryPath = null;

    return {
      canonicalPublicJson,
      publicConfig,
      repositoryRoot: root,
    };
  } catch (error) {
    const cleanupErrors = [];
    for (const cleanup of [
      () => cleanupOwnedStage(stagingDirectory, devnetDirectory),
      () => cleanupOwnedTemporaryFile(publicTemporaryPath, publicConfigPath),
      () => cleanupOwnedTemporaryFile(rustTemporaryPath, rustConfigPath),
    ]) {
      try {
        await cleanup();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "devnet release generation and cleanup failed",
      );
    }
    throw error;
  }
}

export async function runDevnetReleaseConfigCli({
  moduleUrl,
  stdout = process.stdout,
}) {
  const repositoryRoot = repositoryRootFromModule(moduleUrl);
  const result = await generateDevnetReleaseConfig({ repositoryRoot });
  stdout.write(result.canonicalPublicJson);
  return result;
}
