import { execFile, spawn } from "node:child_process";
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
  rmdir,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Keypair } from "@solana/web3.js";

export const INSTANCE_DOMAIN = "HAKKY_INSTANCE_V1";
export const METADATA_URI = "https://hakky.xyz/metadata/hakky-v1.json";
const execFileAsync = promisify(execFile);
const WINDOWS_PIN_TYPE = String.raw`
using System;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public sealed class HakkyDirectoryPin : IDisposable
{
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
    private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
    private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;

    [StructLayout(LayoutKind.Sequential)]
    private struct ByHandleFileInformation
    {
        public uint FileAttributes;
        public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
        public uint VolumeSerialNumber;
        public uint FileSizeHigh;
        public uint FileSizeLow;
        public uint NumberOfLinks;
        public uint FileIndexHigh;
        public uint FileIndexLow;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandle(
        SafeFileHandle handle,
        out ByHandleFileInformation information
    );

    private SafeFileHandle handle;

    public string Identity { get; private set; }

    public HakkyDirectoryPin(string directoryPath)
    {
        handle = CreateFileW(
            directoryPath,
            FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
            IntPtr.Zero
        );
        if (handle.IsInvalid)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        ByHandleFileInformation information;
        if (!GetFileInformationByHandle(handle, out information))
        {
            int error = Marshal.GetLastWin32Error();
            handle.Dispose();
            throw new Win32Exception(error);
        }
        if ((information.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0)
        {
            handle.Dispose();
            throw new InvalidOperationException(
                "directory pin rejected a reparse point"
            );
        }
        if ((information.FileAttributes & FILE_ATTRIBUTE_DIRECTORY) == 0)
        {
            handle.Dispose();
            throw new InvalidOperationException(
                "directory pin requires a directory"
            );
        }

        Identity = string.Format(
            CultureInfo.InvariantCulture,
            "{0:X8}:{1:X8}:{2:X8}",
            information.VolumeSerialNumber,
            information.FileIndexHigh,
            information.FileIndexLow
        );
    }

    public void Dispose()
    {
        if (handle != null)
        {
            handle.Dispose();
            handle = null;
        }
    }
}
`;

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
$acl.SetOwner($currentSid)
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
$appliedOwner = $applied.GetOwner(
  [System.Security.Principal.SecurityIdentifier]
)
$expected = @($allowedSids | ForEach-Object { $_.Value } | Sort-Object)
$actual = @($applied.Access | ForEach-Object {
  $_.IdentityReference.Translate(
    [System.Security.Principal.SecurityIdentifier]
  ).Value
} | Sort-Object)
if (
  $appliedOwner.Value -ne $currentSid.Value -or
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

function windowsPinScript(paths, holdOpen) {
  const encodedPaths = paths
    .map(
      (candidate) =>
        `'${Buffer.from(candidate, "utf8").toString("base64")}'`,
    )
    .join(", ");
  return `
Add-Type -TypeDefinition @'
${WINDOWS_PIN_TYPE}
'@
$encodedPaths = @(${encodedPaths})
$pins = [System.Collections.ArrayList]::new()
try {
  $identities = @()
  foreach ($encodedPath in $encodedPaths) {
    $candidate = [Text.Encoding]::UTF8.GetString(
      [Convert]::FromBase64String($encodedPath)
    )
    $pin = [HakkyDirectoryPin]::new($candidate)
    [void]$pins.Add($pin)
    $identities += $pin.Identity
  }
  [Console]::Out.WriteLine(
    (ConvertTo-Json -Compress -InputObject ([string[]]$identities))
  )
  [Console]::Out.Flush()
  ${
    holdOpen
      ? "[Threading.Thread]::Sleep([Threading.Timeout]::Infinite)"
      : ""
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.ToString())
  exit 1
} finally {
  foreach ($pin in $pins) {
    $pin.Dispose()
  }
}
`;
}

function sameIdentities(expected, actual) {
  return (
    expected.length === actual.length &&
    expected.every((identity, index) => identity === actual[index])
  );
}

async function readWindowsDirectoryIdentities(paths) {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      windowsPinScript(paths, false),
    ],
    { windowsHide: true },
  );
  return JSON.parse(stdout.trim());
}

function withDeadline(promise, message) {
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), 10_000);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timeout));
}

async function createWindowsDirectoryIdentityPin(paths, label) {
  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      windowsPinScript(paths, true),
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  const completion = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Windows directory pin exited with ${code ?? signal}: ${stderr}`,
          ),
        );
      }
    });
  });
  completion.catch(() => {});
  const lines = createInterface({ input: child.stdout });
  const iterator = lines[Symbol.asyncIterator]();
  let identities;
  try {
    const firstLine = await withDeadline(
      iterator.next(),
      "Windows directory pin startup timed out",
    );
    if (firstLine.done) {
      await completion;
      throw new Error("Windows directory pin exited before reporting identity");
    }
    identities = JSON.parse(firstLine.value);
    if (identities.length !== paths.length) {
      throw new Error("Windows directory pin returned incomplete identity data");
    }
  } catch (error) {
    if (child.exitCode === null) {
      child.kill();
    }
    await completion.catch(() => {});
    lines.close();
    throw error;
  }

  let released = false;
  async function verifyPaths() {
    let current;
    try {
      current = await readWindowsDirectoryIdentities(paths);
    } catch (error) {
      throw new Error(`${label} identity changed`, { cause: error });
    }
    if (!sameIdentities(identities, current)) {
      throw new Error(`${label} identity changed`);
    }
  }
  return {
    assertMatches(expected) {
      if (!sameIdentities(expected, identities)) {
        throw new Error(`${label} identity changed`);
      }
    },
    async verify() {
      if (released) {
        throw new Error(`${label} identity pin is already released`);
      }
      if (child.exitCode !== null) {
        throw new Error(`${label} identity changed: pin helper exited`);
      }
      await verifyPaths();
    },
    verifyPath: verifyPaths,
    async release() {
      if (released) {
        return;
      }
      released = true;
      if (child.exitCode === null) {
        child.kill();
      }
      try {
        await withDeadline(
          completion.catch(() => {}),
          "Windows directory pin shutdown timed out",
        );
      } catch (error) {
        if (child.exitCode === null) {
          child.kill();
          await completion.catch(() => {});
        }
        throw error;
      } finally {
        lines.close();
      }
    },
  };
}

function linuxIdentity(entry) {
  return `${entry.dev.toString()}:${entry.ino.toString()}`;
}

async function createLinuxDirectoryIdentityPin(paths, label) {
  const handles = [];
  const identities = [];
  try {
    for (const candidate of paths) {
      const handle = await open(
        candidate,
        fsConstants.O_RDONLY |
          fsConstants.O_DIRECTORY |
          fsConstants.O_NOFOLLOW,
      );
      const entry = await handle.stat({ bigint: true });
      if (!entry.isDirectory()) {
        await handle.close();
        throw new Error("directory identity pin requires a directory");
      }
      handles.push(handle);
      identities.push(linuxIdentity(entry));
    }
  } catch (error) {
    await Promise.allSettled(handles.map((handle) => handle.close()));
    throw error;
  }

  let released = false;
  async function verifyPaths() {
    for (const [index, candidate] of paths.entries()) {
      const entry = await lstat(candidate, { bigint: true });
      if (
        entry.isSymbolicLink() ||
        !entry.isDirectory() ||
        linuxIdentity(entry) !== identities[index]
      ) {
        throw new Error(`${label} identity changed`);
      }
    }
  }
  return {
    assertMatches(expected) {
      if (!sameIdentities(expected, identities)) {
        throw new Error(`${label} identity changed`);
      }
    },
    async verify() {
      if (released) {
        throw new Error(`${label} identity pin is already released`);
      }
      for (const [index, handle] of handles.entries()) {
        if (linuxIdentity(await handle.stat({ bigint: true })) !== identities[index]) {
          throw new Error(`opened ${label} identity changed`);
        }
      }
      await verifyPaths();
    },
    verifyPath: verifyPaths,
    async release() {
      if (released) {
        return;
      }
      released = true;
      const results = await Promise.allSettled(
        handles.map((handle) => handle.close()),
      );
      const errors = results
        .filter(({ status }) => status === "rejected")
        .map(({ reason }) => reason);
      if (errors.length > 0) {
        throw new AggregateError(errors, "directory identity pin close failed");
      }
    },
  };
}

async function readDirectoryIdentitySnapshot(paths) {
  if (process.platform === "win32") {
    return readWindowsDirectoryIdentities(paths);
  }
  if (process.platform === "linux") {
    const identities = [];
    for (const candidate of paths) {
      const entry = await lstat(candidate, { bigint: true });
      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        throw new Error("directory identity snapshot requires a directory");
      }
      identities.push(linuxIdentity(entry));
    }
    return identities;
  }
  throw new Error(
    `directory identity pinning is unsupported on ${process.platform}`,
  );
}

async function createDirectoryIdentityPin(paths, label) {
  if (process.platform === "win32") {
    return createWindowsDirectoryIdentityPin(paths, label);
  }
  if (process.platform === "linux") {
    return createLinuxDirectoryIdentityPin(paths, label);
  }
  throw new Error(
    `directory identity pinning is unsupported on ${process.platform}`,
  );
}

export async function restrictPrivateDirectory(directory) {
  if (process.platform === "linux") {
    const entry = await lstat(directory);
    if (entry.uid !== process.getuid()) {
      throw new Error("private directory must be owned by the invoking uid");
    }
  }
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

async function validatePrivateDirectory(
  candidate,
  parentReal,
  label = "private staging directory",
) {
  const entry = await lstat(candidate);
  await assertNotRedirected(candidate, entry, label);
  if (!entry.isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
  const resolved = await realpath(candidate);
  if (!isContained(parentReal, resolved)) {
    throw new Error(`${label} escapes its validated parent`);
  }
  if (process.platform === "linux" && entry.uid !== process.getuid()) {
    throw new Error(`${label} must be owned by the invoking uid`);
  }
  if (process.platform !== "win32" && (entry.mode & 0o777) !== 0o700) {
    throw new Error(`${label} must have mode 0700`);
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

async function writeExclusivePrivateFile(
  candidate,
  contents,
  stagingReal,
  beforeMutation,
) {
  const flags =
    fsConstants.O_WRONLY |
    fsConstants.O_CREAT |
    fsConstants.O_EXCL |
    (fsConstants.O_NOFOLLOW ?? 0);
  await beforeMutation();
  const handle = await open(candidate, flags, 0o600);
  try {
    await beforeMutation();
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await beforeMutation();
    await restrictPrivateFile(candidate);
    await validatePrivateFile(candidate, stagingReal, await handle.stat());
  } finally {
    await handle.close();
  }
}

async function writeOwnedTemporaryFile(
  finalPath,
  contents,
  beforeMutation,
) {
  const parent = path.dirname(finalPath);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const temporaryPath = path.join(
      parent,
      `.${path.basename(finalPath)}.${randomBytes(12).toString("hex")}.tmp`,
    );
    let owned = false;
    try {
      await beforeMutation();
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
        await beforeMutation();
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
          await beforeMutation();
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

async function cleanupOwnedStage(
  stagingPath,
  devnetDirectory,
  stagingIdentityPin,
  parentIdentityPin,
) {
  if (
    !stagingPath ||
    !stagingIdentityPin ||
    !parentIdentityPin ||
    path.dirname(stagingPath) !== devnetDirectory ||
    !path.basename(stagingPath).startsWith(".private-stage-")
  ) {
    return;
  }
  await parentIdentityPin.verify();
  await stagingIdentityPin.verifyPath();
  const allowedNames = new Set([
    "program-keypair.json",
    "initializer-keypair.json",
    "instance-nonce.hex",
  ]);
  const entries = await readdir(stagingPath);
  if (entries.some((entry) => !allowedNames.has(entry))) {
    throw new Error("staging identity changed; cleanup skipped");
  }
  for (const entry of entries) {
    await parentIdentityPin.verify();
    await stagingIdentityPin.verifyPath();
    const candidate = path.join(stagingPath, entry);
    const candidateEntry = await lstat(candidate);
    if (candidateEntry.isSymbolicLink() || !candidateEntry.isFile()) {
      throw new Error("staging identity changed; cleanup skipped");
    }
    const handle = await open(
      candidate,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    );
    try {
      const openedEntry = await handle.stat();
      if (
        openedEntry.dev !== candidateEntry.dev ||
        openedEntry.ino !== candidateEntry.ino
      ) {
        throw new Error("staging identity changed; cleanup skipped");
      }
    } finally {
      await handle.close();
    }
    await parentIdentityPin.verify();
    await stagingIdentityPin.verifyPath();
    await unlink(candidate);
  }
  await parentIdentityPin.verify();
  await stagingIdentityPin.verifyPath();
  await rmdir(stagingPath);
}

async function cleanupOwnedTemporaryFile(
  temporaryPath,
  finalPath,
  beforeMutation,
) {
  if (
    temporaryPath &&
    path.dirname(temporaryPath) === path.dirname(finalPath) &&
    path
      .basename(temporaryPath)
      .startsWith(`.${path.basename(finalPath)}.`) &&
    path.basename(temporaryPath).endsWith(".tmp")
  ) {
    try {
      await beforeMutation();
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

export async function generateDevnetReleaseConfig({
  repositoryRoot,
  preParentPinHook,
  postValidationHook,
  postStagingPinReleaseHook,
}) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) {
    throw new TypeError("repository root must be an absolute path");
  }
  if (
    preParentPinHook !== undefined &&
    typeof preParentPinHook !== "function"
  ) {
    throw new TypeError("pre-parent-pin hook must be a function");
  }
  if (
    postValidationHook !== undefined &&
    typeof postValidationHook !== "function"
  ) {
    throw new TypeError("post-validation hook must be a function");
  }
  if (
    postStagingPinReleaseHook !== undefined &&
    typeof postStagingPinReleaseHook !== "function"
  ) {
    throw new TypeError("post-staging-pin-release hook must be a function");
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
  await ensureSafeDirectory(
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

  const parentPaths = [root, artifactsDirectory, devnetDirectory];
  const validatedParentIdentities =
    await readDirectoryIdentitySnapshot(parentPaths);
  if (preParentPinHook) {
    await preParentPinHook(
      Object.freeze({
        artifactsDirectory,
        devnetDirectory,
      }),
    );
  }

  let parentIdentityPin;
  let stagingDirectory;
  let stagingIdentityPin;
  let stagingPinReleased = false;
  let stagingReleaseHookInvoked = false;
  let publicTemporaryPath;
  let rustTemporaryPath;

  async function verifyParentPin() {
    if (!parentIdentityPin) {
      throw new Error("parent identity pin is unavailable");
    }
    await parentIdentityPin.verify();
  }

  async function verifyRetainedPins() {
    await verifyParentPin();
    if (!stagingIdentityPin) {
      throw new Error("staging identity pin is unavailable");
    }
    await stagingIdentityPin.verify();
  }

  async function releaseStagingPin(phase) {
    if (!stagingIdentityPin) {
      return;
    }
    if (!stagingPinReleased) {
      await stagingIdentityPin.release();
      stagingPinReleased = true;
    }
    if (postStagingPinReleaseHook && !stagingReleaseHookInvoked) {
      stagingReleaseHookInvoked = true;
      await postStagingPinReleaseHook(
        Object.freeze({
          devnetDirectory,
          phase,
          stagingDirectory,
        }),
      );
    }
  }

  try {
    parentIdentityPin = await createDirectoryIdentityPin(
      parentPaths,
      "parent",
    );
    await restrictPrivateDirectory(artifactsDirectory);
    await verifyParentPin();
    const pinnedArtifactsReal = await validatePrivateDirectory(
      artifactsDirectory,
      rootReal,
      "artifacts staging parent",
    );
    await restrictPrivateDirectory(devnetDirectory);
    await verifyParentPin();
    const pinnedDevnetReal = await validatePrivateDirectory(
      devnetDirectory,
      pinnedArtifactsReal,
      "devnet staging parent",
    );
    await verifyParentPin();
    parentIdentityPin.assertMatches(validatedParentIdentities);

    const currentPrivateEntry = await lstatIfExists(privateDirectory);
    if (currentPrivateEntry) {
      if (
        currentPrivateEntry.isSymbolicLink() ||
        (await isWindowsReparsePoint(privateDirectory))
      ) {
        throw new Error(
          "private identity path already exists and is redirected by a reparse point",
        );
      }
      throw new Error("private identity path already exists");
    }

    await verifyParentPin();
    stagingDirectory = await mkdtemp(
      path.join(devnetDirectory, ".private-stage-"),
    );
    await verifyParentPin();
    await restrictPrivateDirectory(stagingDirectory);
    const stagingReal = await validatePrivateDirectory(
      stagingDirectory,
      pinnedDevnetReal,
    );
    await verifyParentPin();
    stagingIdentityPin = await createDirectoryIdentityPin(
      [stagingDirectory],
      "staging",
    );
    if (postValidationHook) {
      await postValidationHook(
        Object.freeze({
          artifactsDirectory,
          devnetDirectory,
          stagingDirectory,
        }),
      );
    }
    await verifyRetainedPins();

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
      await verifyRetainedPins();
      await writeExclusivePrivateFile(
        path.join(stagingDirectory, fileName),
        contents,
        stagingReal,
        verifyRetainedPins,
      );
    }
    await verifyRetainedPins();
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
      verifyRetainedPins,
    );
    rustTemporaryPath = await writeOwnedTemporaryFile(
      rustConfigPath,
      renderRustReleaseConfig({
        programId: program.publicKey,
        initializer: initializer.publicKey,
        instanceCommitment: commitment,
      }),
      verifyRetainedPins,
    );

    await verifyRetainedPins();
    await releaseStagingPin("publication");
    await verifyParentPin();
    await stagingIdentityPin.verifyPath();
    await verifyParentPin();
    await directoryRenameNoReplace(stagingDirectory, privateDirectory);
    stagingDirectory = null;
    await verifyParentPin();
    await rename(publicTemporaryPath, publicConfigPath);
    publicTemporaryPath = null;
    await verifyParentPin();
    await rename(rustTemporaryPath, rustConfigPath);
    rustTemporaryPath = null;

    const result = {
      canonicalPublicJson,
      publicConfig,
      repositoryRoot: root,
    };
    await parentIdentityPin.release();
    parentIdentityPin = null;
    return result;
  } catch (error) {
    const cleanupErrors = [];
    if (stagingIdentityPin) {
      try {
        await releaseStagingPin("cleanup");
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    for (const cleanup of [
      () =>
        cleanupOwnedStage(
          stagingDirectory,
          devnetDirectory,
          stagingIdentityPin,
          parentIdentityPin,
        ),
      () =>
        cleanupOwnedTemporaryFile(
          publicTemporaryPath,
          publicConfigPath,
          verifyParentPin,
        ),
      () =>
        cleanupOwnedTemporaryFile(
          rustTemporaryPath,
          rustConfigPath,
          verifyParentPin,
        ),
    ]) {
      try {
        await cleanup();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (parentIdentityPin) {
      try {
        await parentIdentityPin.release();
        parentIdentityPin = null;
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        `devnet release generation failed: ${error.message}; cleanup failed: ${cleanupErrors
          .map((cleanupError) => cleanupError.message)
          .join("; ")}`,
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
