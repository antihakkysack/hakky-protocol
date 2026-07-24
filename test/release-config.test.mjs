import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
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
import { createInterface } from "node:readline";
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

async function windowsDirectoryIdentity(targetPath) {
  assert.equal(process.platform, "win32");
  const encodedPath = Buffer.from(targetPath, "utf8").toString("base64");
  const script = `
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class HakkyTestDirectoryIdentity
{
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint OPEN_EXISTING = 3;
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

    public static string Read(string directoryPath)
    {
        using (SafeFileHandle handle = CreateFileW(
            directoryPath,
            FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
            IntPtr.Zero
        ))
        {
            if (handle.IsInvalid)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            ByHandleFileInformation information;
            if (!GetFileInformationByHandle(handle, out information))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            return string.Format(
                CultureInfo.InvariantCulture,
                "{0:X8}:{1:X8}:{2:X8}",
                information.VolumeSerialNumber,
                information.FileIndexHigh,
                information.FileIndexLow
            );
        }
    }
}
'@
$targetPath = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedPath}')
)
[Console]::Out.Write([HakkyTestDirectoryIdentity]::Read($targetPath))
`;
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  return stdout;
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

async function assertExactPrivateFileSecurity(candidate) {
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
  assert.equal(entry.mode & 0o777, 0o600);
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

async function createWindowsStaleParentHandle(directory) {
  assert.equal(process.platform, "win32");
  const encodedDirectory = Buffer.from(directory, "utf8").toString("base64");
  const script = `
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public sealed class HakkyStaleParentHandle : IDisposable
{
    private const uint FILE_LIST_DIRECTORY = 0x00000001;
    private const uint FILE_ADD_SUBDIRECTORY = 0x00000004;
    private const uint FILE_DELETE_CHILD = 0x00000040;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint DELETE = 0x00010000;
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint FILE_SHARE_DELETE = 0x00000004;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
    private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    private const uint OBJ_CASE_INSENSITIVE = 0x00000040;
    private const uint FILE_OPEN = 1;
    private const uint FILE_CREATE = 2;
    private const uint FILE_DIRECTORY_FILE = 0x00000001;
    private const uint FILE_OPEN_REPARSE_POINT = 0x00200000;
    private const int FILE_RENAME_INFORMATION_CLASS = 10;

    [StructLayout(LayoutKind.Sequential)]
    private struct UnicodeString
    {
        public ushort Length;
        public ushort MaximumLength;
        public IntPtr Buffer;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ObjectAttributes
    {
        public int Length;
        public IntPtr RootDirectory;
        public IntPtr ObjectName;
        public uint Attributes;
        public IntPtr SecurityDescriptor;
        public IntPtr SecurityQualityOfService;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IoStatusBlock
    {
        public IntPtr Status;
        public IntPtr Information;
    }

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

    [DllImport("ntdll.dll")]
    private static extern int NtCreateFile(
        out SafeFileHandle fileHandle,
        uint desiredAccess,
        ref ObjectAttributes objectAttributes,
        out IoStatusBlock ioStatusBlock,
        IntPtr allocationSize,
        uint fileAttributes,
        uint shareAccess,
        uint createDisposition,
        uint createOptions,
        IntPtr eaBuffer,
        uint eaLength
    );

    [DllImport("ntdll.dll")]
    private static extern int NtSetInformationFile(
        SafeFileHandle handle,
        out IoStatusBlock ioStatusBlock,
        IntPtr fileInformation,
        uint bufferSize,
        int fileInformationClass
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandle(
        SafeFileHandle handle,
        out ByHandleFileInformation information
    );

    private SafeFileHandle root;
    private SafeFileHandle retainedChild;

    public HakkyStaleParentHandle(string directoryPath)
    {
        root = CreateFileW(
            directoryPath,
            FILE_LIST_DIRECTORY |
                FILE_ADD_SUBDIRECTORY |
                FILE_DELETE_CHILD |
                FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            IntPtr.Zero,
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
            IntPtr.Zero
        );
        if (root.IsInvalid)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
    }

    private static string ReadIdentity(SafeFileHandle candidate)
    {
        ByHandleFileInformation information;
        if (!GetFileInformationByHandle(candidate, out information))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        return string.Format(
            CultureInfo.InvariantCulture,
            "{0:X8}:{1:X8}:{2:X8}",
            information.VolumeSerialNumber,
            information.FileIndexHigh,
            information.FileIndexLow
        );
    }

    public string CreateRetainedChild(string stagingName)
    {
        if (retainedChild != null)
        {
            throw new InvalidOperationException(
                "stale parent child is already retained"
            );
        }
        int status = OpenRelative(
            stagingName,
            FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES,
            FILE_CREATE,
            out retainedChild
        );
        if (status != 0)
        {
            throw new InvalidOperationException(
                string.Format(
                    CultureInfo.InvariantCulture,
                    "relative child create failed with NTSTATUS 0x{0:X8}",
                    status
                )
            );
        }
        return ReadIdentity(retainedChild);
    }

    private int OpenRelative(
        string childName,
        uint desiredAccess,
        uint disposition,
        out SafeFileHandle child
    )
    {
        IntPtr nameBuffer = Marshal.StringToHGlobalUni(childName);
        IntPtr namePointer = IntPtr.Zero;
        try
        {
            UnicodeString name = new UnicodeString {
                Length = checked((ushort)(childName.Length * 2)),
                MaximumLength = checked((ushort)((childName.Length + 1) * 2)),
                Buffer = nameBuffer
            };
            namePointer = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(UnicodeString)));
            Marshal.StructureToPtr(name, namePointer, false);
            ObjectAttributes attributes = new ObjectAttributes {
                Length = Marshal.SizeOf(typeof(ObjectAttributes)),
                RootDirectory = root.DangerousGetHandle(),
                ObjectName = namePointer,
                Attributes = OBJ_CASE_INSENSITIVE,
                SecurityDescriptor = IntPtr.Zero,
                SecurityQualityOfService = IntPtr.Zero
            };
            IoStatusBlock ioStatusBlock;
            return NtCreateFile(
                out child,
                desiredAccess,
                ref attributes,
                out ioStatusBlock,
                IntPtr.Zero,
                FILE_ATTRIBUTE_DIRECTORY,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                disposition,
                FILE_DIRECTORY_FILE | FILE_OPEN_REPARSE_POINT,
                IntPtr.Zero,
                0
            );
        }
        finally
        {
            if (namePointer != IntPtr.Zero)
            {
                Marshal.FreeHGlobal(namePointer);
            }
            Marshal.FreeHGlobal(nameBuffer);
        }
    }

    private void RenameRelative(SafeFileHandle child, string destinationName)
    {
        byte[] fileName = System.Text.Encoding.Unicode.GetBytes(destinationName);
        int rootOffset = IntPtr.Size == 8 ? 8 : 4;
        int lengthOffset = rootOffset + IntPtr.Size;
        int nameOffset = lengthOffset + sizeof(uint);
        int headerSize = IntPtr.Size == 8 ? 24 : 16;
        int bufferSize = checked(headerSize + fileName.Length);
        IntPtr buffer = Marshal.AllocHGlobal(bufferSize);
        try
        {
            for (int offset = 0; offset < bufferSize; offset++)
            {
                Marshal.WriteByte(buffer, offset, 0);
            }
            Marshal.WriteIntPtr(buffer, rootOffset, root.DangerousGetHandle());
            Marshal.WriteInt32(buffer, lengthOffset, fileName.Length);
            Marshal.Copy(fileName, 0, IntPtr.Add(buffer, nameOffset), fileName.Length);
            IoStatusBlock ioStatusBlock;
            int status = NtSetInformationFile(
                child,
                out ioStatusBlock,
                buffer,
                (uint)bufferSize,
                FILE_RENAME_INFORMATION_CLASS
            );
            if (status != 0)
            {
                throw new InvalidOperationException(
                    string.Format(
                        CultureInfo.InvariantCulture,
                        "relative child rename failed with NTSTATUS 0x{0:X8}",
                        status
                    )
                );
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    public string TrySwap(string stagingName)
    {
        SafeFileHandle staging;
        int status = OpenRelative(
            stagingName,
            DELETE | FILE_READ_ATTRIBUTES,
            FILE_OPEN,
            out staging
        );
        if (status != 0)
        {
            return string.Format(
                CultureInfo.InvariantCulture,
                "BLOCKED:0x{0:X8}",
                status
            );
        }
        using (staging)
        {
            RenameRelative(staging, stagingName + ".original-moved");
        }
        SafeFileHandle replacement;
        status = OpenRelative(
            stagingName,
            FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES,
            FILE_CREATE,
            out replacement
        );
        if (status != 0)
        {
            throw new InvalidOperationException(
                string.Format(
                    CultureInfo.InvariantCulture,
                    "relative replacement create failed with NTSTATUS 0x{0:X8}",
                    status
                )
            );
        }
        replacement.Dispose();
        return "SWAPPED";
    }

    public void Dispose()
    {
        if (retainedChild != null)
        {
            retainedChild.Dispose();
            retainedChild = null;
        }
        if (root != null)
        {
            root.Dispose();
            root = null;
        }
    }
}
'@
$directory = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedDirectory}')
)
$holder = $null
try {
  $holder = [HakkyStaleParentHandle]::new($directory)
  [Console]::Out.WriteLine('READY')
  [Console]::Out.Flush()
  while (($request = [Console]::In.ReadLine()) -ne $null) {
    if ($request -eq 'RELEASE') {
      break
    }
    if ($request.StartsWith('CREATE ')) {
      $encodedName = $request.Substring('CREATE '.Length)
      $stagingName = [Text.Encoding]::UTF8.GetString(
        [Convert]::FromBase64String($encodedName)
      )
      [Console]::Out.WriteLine(
        'CREATED:' + $holder.CreateRetainedChild($stagingName)
      )
      [Console]::Out.Flush()
      continue
    }
    $stagingName = [Text.Encoding]::UTF8.GetString(
      [Convert]::FromBase64String($request)
    )
    [Console]::Out.WriteLine($holder.TrySwap($stagingName))
    [Console]::Out.Flush()
    break
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.ToString())
  exit 1
} finally {
  if ($holder -ne $null) {
    $holder.Dispose()
  }
}
`;
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      stdio: ["pipe", "pipe", "pipe"],
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
            `stale parent helper exited with ${code ?? signal}: ${stderr}`,
          ),
        );
      }
    });
  });
  completion.catch(() => {});
  const lines = createInterface({ input: child.stdout });
  const iterator = lines[Symbol.asyncIterator]();
  const ready = await iterator.next();
  assert.equal(ready.done, false);
  assert.equal(ready.value, "READY");

  let finished = false;
  return {
    async createRetainedChild(stagingDirectory) {
      assert.equal(finished, false);
      child.stdin.write(
        `CREATE ${Buffer.from(
          path.basename(stagingDirectory),
          "utf8",
        ).toString("base64")}\n`,
      );
      const response = await iterator.next();
      assert.equal(response.done, false);
      assert.match(
        response.value,
        /^CREATED:[0-9A-F]{8}:[0-9A-F]{8}:[0-9A-F]{8}$/,
      );
      return response.value.slice("CREATED:".length);
    },
    async trySwap(stagingDirectory) {
      assert.equal(finished, false);
      finished = true;
      child.stdin.end(
        `${Buffer.from(path.basename(stagingDirectory), "utf8").toString(
          "base64",
        )}\n`,
      );
      const response = await iterator.next();
      assert.equal(response.done, false);
      await completion;
      lines.close();
      return response.value;
    },
    async release() {
      if (!finished) {
        finished = true;
        child.stdin.end("RELEASE\n");
      }
      if (child.exitCode === null) {
        await completion;
      }
      lines.close();
    },
    terminate() {
      if (child.exitCode === null) {
        child.kill();
      }
    },
  };
}

async function controlWindowsDirectoryPinHelpers(action) {
  assert.equal(process.platform, "win32");
  assert.ok(["suspend", "terminate"].includes(action));
  const script = `
$needle = 'Hakky' + 'DirectoryPin'
$matches = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like ('*' + $needle + '*')
})
if ($matches.Count -eq 0) {
  throw 'no directory pin helper found'
}
if ('${action}' -eq 'terminate') {
  foreach ($match in $matches) {
    Stop-Process -Id $match.ProcessId -Force
  }
} else {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class HakkyTestProcessControl
{
    private const uint PROCESS_SUSPEND_RESUME = 0x00000800;
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(
        uint desiredAccess,
        bool inheritHandle,
        uint processId
    );
    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);
    [DllImport("ntdll.dll")]
    private static extern int NtSuspendProcess(IntPtr processHandle);
    public static void Suspend(uint processId)
    {
        IntPtr handle = OpenProcess(PROCESS_SUSPEND_RESUME, false, processId);
        if (handle == IntPtr.Zero)
        {
            throw new System.ComponentModel.Win32Exception(
                Marshal.GetLastWin32Error()
            );
        }
        try
        {
            int status = NtSuspendProcess(handle);
            if (status != 0)
            {
                throw new InvalidOperationException(
                    "NtSuspendProcess failed with NTSTATUS 0x" +
                    status.ToString("X8")
                );
            }
        }
        finally
        {
            CloseHandle(handle);
        }
    }
}
'@
  foreach ($match in $matches) {
    [HakkyTestProcessControl]::Suspend([uint32]$match.ProcessId)
  }
}
[Console]::Out.Write($matches.Count)
`;
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { windowsHide: true },
  );
  const count = Number.parseInt(stdout, 10);
  assert.ok(count > 0);
  return count;
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
  let stagingDirectory;
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const entries = await readdir(devnetDirectory).catch((error) => {
      if (error?.code === "ENOENT") {
        return [];
      }
      throw error;
    });
    const stagingName = entries.find((entry) =>
      entry.startsWith(".private-stage-"),
    );
    if (stagingName) {
      stagingDirectory = path.join(devnetDirectory, stagingName);
      break;
    }
    await delay(10);
  }
  assert.ok(stagingDirectory, "private staging must be observable");

  await mkdir(privateDirectory);
  const sentinelPath = path.join(privateDirectory, "existing-sentinel.txt");
  await writeFile(sentinelPath, "race winner\n", "utf8");

  await assert.rejects(
    generation,
    /protected incomplete staging retained|explicit recovery required/i,
  );
  assert.equal(await readFile(sentinelPath, "utf8"), "race winner\n");
  assert.equal(
    await readFile(rustConfigPath, "utf8"),
    "existing public binding\n",
  );
  assert.deepEqual(await readdir(privateDirectory), ["existing-sentinel.txt"]);
  assert.deepEqual(
    (await readdir(stagingDirectory)).sort(),
    [
      "initializer-keypair.json",
      "instance-nonce.hex",
      "program-keypair.json",
    ],
  );
  await assertExactPrivateDirectorySecurity(stagingDirectory);
  for (const fileName of await readdir(stagingDirectory)) {
    await assertExactPrivateFileSecurity(path.join(stagingDirectory, fileName));
  }
  assert.deepEqual(
    (await readdir(devnetDirectory)).filter(
      (entry) => entry.startsWith(".private-stage-") || entry.endsWith(".tmp"),
    ),
    [path.basename(stagingDirectory)],
  );
  await assertNoWindowsDirectoryPinHelper();
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

test(
  "Windows parent helper creates and returns the retained staging identity while a stale parent handle is open",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    await mkdir(devnetDirectory, { recursive: true });

    let staleParent;
    let observedStagingDirectory;
    let returnedRetainedIdentity;
    t.after(async () => {
      if (staleParent) {
        staleParent.terminate();
        await staleParent.release().catch(() => {});
      }
    });

    await generateDevnetReleaseConfig({
      repositoryRoot: root,
      async preParentPinHook() {
        staleParent = await createWindowsStaleParentHandle(devnetDirectory);
      },
      async postValidationHook(context) {
        observedStagingDirectory = context.stagingDirectory;
        returnedRetainedIdentity = context.retainedStagingIdentity;
        assert.match(
          returnedRetainedIdentity,
          /^[0-9A-F]{8}:[0-9A-F]{8}:[0-9A-F]{8}$/,
        );
        assert.equal(
          returnedRetainedIdentity,
          await windowsDirectoryIdentity(observedStagingDirectory),
        );
      },
    });

    assert.match(
      path.basename(observedStagingDirectory),
      /^\.private-stage-[0-9a-f]{24}$/,
    );
    assert.ok(returnedRetainedIdentity);
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows CREATE_STAGING rejects malformed names before creating a directory",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    const privateDirectory = path.join(devnetDirectory, "private");
    let hookCalled = false;

    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async preStagingCreateHook(context) {
          hookCalled = true;
          assert.match(
            context.stagingName,
            /^\.private-stage-[0-9a-f]{24}$/,
          );
          return ".private-stage-malformed";
        },
      }),
      /invalid private staging name/i,
    );

    assert.equal(hookCalled, true);
    assert.deepEqual(
      (await readdir(devnetDirectory)).filter((entry) =>
        entry.startsWith(".private-stage-"),
      ),
      [],
    );
    assert.equal(await lstatIfExistsForTest(privateDirectory), null);
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows CREATE_STAGING rejects a candidate pre-opened through a stale parent handle",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    const privateDirectory = path.join(devnetDirectory, "private");
    await mkdir(devnetDirectory, { recursive: true });
    let staleParent;
    let existingStagingDirectory;
    let preopenedIdentity;
    t.after(async () => {
      if (staleParent) {
        staleParent.terminate();
        await staleParent.release().catch(() => {});
      }
    });

    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async preParentPinHook() {
          staleParent =
            await createWindowsStaleParentHandle(devnetDirectory);
        },
        async preStagingCreateHook(context) {
          existingStagingDirectory = context.stagingDirectory;
          preopenedIdentity =
            await staleParent.createRetainedChild(existingStagingDirectory);
          await writeFile(
            path.join(existingStagingDirectory, "sentinel.txt"),
            "pre-existing candidate\n",
            "utf8",
          );
        },
      }),
      /staging creation failed|already exists/i,
    );

    assert.equal(
      await readFile(
        path.join(existingStagingDirectory, "sentinel.txt"),
        "utf8",
      ),
      "pre-existing candidate\n",
    );
    assert.equal(
      await windowsDirectoryIdentity(existingStagingDirectory),
      preopenedIdentity,
    );
    assert.equal(await lstatIfExistsForTest(privateDirectory), null);
    await assert.rejects(
      generateDevnetReleaseConfig({ repositoryRoot: root }),
      /protected incomplete staging.*explicit recovery required/i,
    );
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows CREATE_STAGING protocol faults are bounded and reap the parent helper",
  { skip: process.platform !== "win32" },
  async (t) => {
    for (const action of ["terminate", "suspend"]) {
      await t.test(action, async (t) => {
        const root = await isolatedRepository(t);
        const devnetDirectory = path.join(root, "artifacts", "devnet");
        const privateDirectory = path.join(devnetDirectory, "private");

        await assert.rejects(
          generateDevnetReleaseConfig({
            repositoryRoot: root,
            async preStagingCreateHook() {
              await controlWindowsDirectoryPinHelpers(action);
            },
          }),
          /directory pin|pin helper|timed out|EPIPE/i,
        );

        assert.equal(await lstatIfExistsForTest(privateDirectory), null);
        assert.deepEqual(
          (await readdir(devnetDirectory)).filter((entry) =>
            entry.startsWith(".private-stage-"),
          ),
          [],
        );
        await assertNoWindowsDirectoryPinHelper();
      });
    }
  },
);

test(
  "Windows retained staging ACL is verified before key generation",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    let hookCalled = false;

    await generateDevnetReleaseConfig({
      repositoryRoot: root,
      async beforeKeyGenerationHook(context) {
        hookCalled = true;
        assert.deepEqual(await readdir(context.stagingDirectory), []);
        assert.equal(
          await windowsDirectoryIdentity(context.stagingDirectory),
          context.retainedStagingIdentity,
        );
        await assertExactPrivateDirectorySecurity(
          context.stagingDirectory,
        );
      },
    });

    assert.equal(hookCalled, true);
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows removes an empty failed stage by retained handle before release",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    const privateDirectory = path.join(devnetDirectory, "private");
    await mkdir(devnetDirectory, { recursive: true });

    let attacker;
    let stagingDirectory;
    let retainedIdentity;
    let cleanupPhase;
    let attackResult;
    t.after(async () => {
      if (attacker) {
        attacker.terminate();
        await attacker.release().catch(() => {});
      }
    });

    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async preParentPinHook() {
          attacker = await createWindowsStaleParentHandle(devnetDirectory);
        },
        async beforeKeyGenerationHook(context) {
          stagingDirectory = context.stagingDirectory;
          retainedIdentity = context.retainedStagingIdentity;
          assert.deepEqual(await readdir(stagingDirectory), []);
          assert.equal(
            await windowsDirectoryIdentity(stagingDirectory),
            retainedIdentity,
          );
          throw new Error("injected pre-key-generation failure");
        },
        async postStagingPinReleaseHook(context) {
          cleanupPhase = context.phase;
          attackResult = await attacker.trySwap(context.stagingDirectory);
        },
      }),
      /injected pre-key-generation failure/i,
    );

    assert.equal(cleanupPhase, "empty-cleanup");
    assert.match(attackResult, /^BLOCKED:/);
    assert.equal(await lstatIfExistsForTest(stagingDirectory), null);
    assert.equal(
      await lstatIfExistsForTest(`${stagingDirectory}.original-moved`),
      null,
    );
    assert.equal(await lstatIfExistsForTest(privateDirectory), null);
    assert.deepEqual(
      (await readdir(devnetDirectory)).filter((entry) =>
        entry.startsWith(".private-stage-"),
      ),
      [],
    );
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows empty-stage native removal errors retain the exact identity and reap the helper",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    let stagingDirectory;
    let retainedIdentity;
    let cleanupHooks = 0;

    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async beforeKeyGenerationHook(context) {
          stagingDirectory = context.stagingDirectory;
          retainedIdentity = context.retainedStagingIdentity;
          await writeFile(
            path.join(stagingDirectory, "non-secret-sentinel.txt"),
            "retain on native removal error\n",
            "utf8",
          );
          throw new Error("injected non-empty pre-key-generation failure");
        },
        async postStagingPinReleaseHook(context) {
          cleanupHooks += 1;
          assert.equal(context.phase, "empty-cleanup");
        },
      }),
      /REMOVE_STAGING failed: .*native empty staging removal failed/i,
    );

    assert.equal(cleanupHooks, 1);
    assert.equal(
      await windowsDirectoryIdentity(stagingDirectory),
      retainedIdentity,
    );
    assert.deepEqual(await readdir(stagingDirectory), [
      "non-secret-sentinel.txt",
    ]);
    assert.equal(
      await readFile(
        path.join(stagingDirectory, "non-secret-sentinel.txt"),
        "utf8",
      ),
      "retain on native removal error\n",
    );
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows empty-stage removal transport faults are bounded and retain the exact identity",
  { skip: process.platform !== "win32" },
  async (t) => {
    for (const action of ["terminate", "suspend"]) {
      await t.test(action, async (t) => {
        const root = await isolatedRepository(t);
        let stagingDirectory;
        let retainedIdentity;
        const cleanupPhases = [];

        await assert.rejects(
          generateDevnetReleaseConfig({
            repositoryRoot: root,
            async beforeKeyGenerationHook(context) {
              stagingDirectory = context.stagingDirectory;
              retainedIdentity = context.retainedStagingIdentity;
              throw new Error(
                `injected pre-key-generation ${action} failure`,
              );
            },
            async postStagingPinReleaseHook(context) {
              cleanupPhases.push(context.phase);
              await controlWindowsDirectoryPinHelpers(action);
            },
          }),
          /directory pin|pin helper|timed out|EPIPE/i,
        );

        assert.deepEqual(cleanupPhases, ["empty-cleanup"]);
        assert.equal(
          await windowsDirectoryIdentity(stagingDirectory),
          retainedIdentity,
        );
        assert.deepEqual(await readdir(stagingDirectory), []);
        await assertNoWindowsDirectoryPinHelper();
      });
    }
  },
);

test(
  "Windows staging ACL failure closes before key generation and cleans the empty stage",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    let keyGenerationReached = false;

    await assert.rejects(
      generateDevnetReleaseConfig({
        repositoryRoot: root,
        async postValidationHook({ stagingDirectory }) {
          await execFileAsync("icacls.exe", [
            stagingDirectory,
            "/grant",
            "*S-1-1-0:(OI)(CI)F",
          ]);
        },
        async beforeKeyGenerationHook() {
          keyGenerationReached = true;
        },
      }),
      /ACL.*validation failed/i,
    );

    assert.equal(keyGenerationReached, false);
    assert.deepEqual(
      (await readdir(devnetDirectory)).filter((entry) =>
        entry.startsWith(".private-stage-"),
      ),
      [],
    );
    assert.equal(
      await lstatIfExistsForTest(path.join(devnetDirectory, "private")),
      null,
    );
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "pre-generation retains an existing Windows staging identity without mutation",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    const stagingDirectory = path.join(
      devnetDirectory,
      ".private-stage-0123456789abcdef01234567",
    );
    const sentinelPath = path.join(stagingDirectory, "sentinel.txt");
    await mkdir(stagingDirectory, { recursive: true });
    await writeFile(sentinelPath, "retained before generation\n", "utf8");

    await assert.rejects(
      generateDevnetReleaseConfig({ repositoryRoot: root }),
      /protected incomplete staging.*explicit recovery required/i,
    );

    assert.equal(
      await readFile(sentinelPath, "utf8"),
      "retained before generation\n",
    );
    assert.equal(
      await lstatIfExistsForTest(path.join(devnetDirectory, "private")),
      null,
    );
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows publishes the retained staging identity when substitution is attempted immediately before publication",
  { skip: process.platform !== "win32" },
  async (t) => {
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

  let stagingDirectory;
  let stagingIdentity;
  let substitutionBlocked = false;
  let movedStagingDirectory;
  const result = await generateDevnetReleaseConfig({
    repositoryRoot: root,
    async postValidationHook(context) {
      stagingIdentity = await lstat(context.stagingDirectory, { bigint: true });
    },
    async postStagingPinReleaseHook(context) {
      assert.equal(context.phase, "publication");
      stagingDirectory = context.stagingDirectory;
      movedStagingDirectory = `${stagingDirectory}.original-moved`;
      try {
        await rename(stagingDirectory, movedStagingDirectory);
        await mkdir(stagingDirectory);
        await writeFile(
          path.join(stagingDirectory, "substitute-sentinel.txt"),
          "substitute retained\n",
          "utf8",
        );
      } catch (error) {
        substitutionBlocked = true;
        assert.match(
          `${error?.code ?? ""} ${error?.message ?? ""}`,
          /EPERM|EACCES|EBUSY|access|being used|busy|locked|permission/i,
        );
      }
    },
  });

  const publishedIdentity = await lstat(privateDirectory, { bigint: true });
  assert.equal(publishedIdentity.dev, stagingIdentity.dev);
  assert.equal(publishedIdentity.ino, stagingIdentity.ino);
  assert.equal(result.publicConfig.programId.length > 0, true);
  assert.equal(substitutionBlocked, true);
  assert.deepEqual(await readdir(outside), ["sentinel.txt"]);
  assert.equal(await lstatIfExistsForTest(movedStagingDirectory), null);
  assert.deepEqual(
    (await readdir(privateDirectory)).sort(),
    [
      "initializer-keypair.json",
      "instance-nonce.hex",
      "program-keypair.json",
    ],
  );
  await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows stale parent handle cannot substitute the retained staging identity",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = await isolatedRepository(t);
    const devnetDirectory = path.join(root, "artifacts", "devnet");
    const privateDirectory = path.join(devnetDirectory, "private");
    await mkdir(devnetDirectory, { recursive: true });

    let attacker;
    let stagingIdentity;
    let stagingDirectory;
    let attackResult;
    t.after(async () => {
      if (attacker) {
        attacker.terminate();
        await attacker.release().catch(() => {});
      }
    });

    await generateDevnetReleaseConfig({
      repositoryRoot: root,
      async preParentPinHook() {
        attacker = await createWindowsStaleParentHandle(devnetDirectory);
      },
      async postValidationHook(context) {
        stagingDirectory = context.stagingDirectory;
        stagingIdentity = await lstat(stagingDirectory, { bigint: true });
      },
      async postStagingPinReleaseHook(context) {
        assert.equal(context.phase, "publication");
        attackResult = await attacker.trySwap(context.stagingDirectory);
        assert.match(attackResult, /^BLOCKED:/);
      },
    });

    const publishedIdentity = await lstat(privateDirectory, { bigint: true });
    assert.equal(publishedIdentity.dev, stagingIdentity.dev);
    assert.equal(publishedIdentity.ino, stagingIdentity.ino);
    assert.equal(
      await lstatIfExistsForTest(`${stagingDirectory}.original-moved`),
      null,
    );
    assert.match(attackResult, /^BLOCKED:/);
    await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "Windows helper protocol faults are bounded and reap every helper",
  { skip: process.platform !== "win32" },
  async (t) => {
    for (const action of ["terminate", "suspend"]) {
      await t.test(action, async (t) => {
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

        await assert.rejects(
          generateDevnetReleaseConfig({
            repositoryRoot: root,
            async postValidationHook() {
              await controlWindowsDirectoryPinHelpers(action);
            },
          }),
          /directory pin|pin helper|timed out/i,
        );

        assert.equal(
          await readFile(publicConfigPath, "utf8"),
          "existing public config\n",
        );
        assert.equal(
          await readFile(rustConfigPath, "utf8"),
          "existing Rust binding\n",
        );
        await assertNoWindowsDirectoryPinHelper();
      });
    }
  },
);

test(
  "Windows post-secret failure retains the protected staging identity and blocks cleanup substitution",
  { skip: process.platform !== "win32" },
  async (t) => {
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
  let stagingIdentity;
  let movedStagingDirectory;
  let substitutionBlocked = false;
  await assert.rejects(
    generateDevnetReleaseConfig({
      repositoryRoot: root,
      async postValidationHook(context) {
        stagingDirectory = context.stagingDirectory;
        stagingIdentity = await lstat(stagingDirectory, { bigint: true });
      },
      async postSecretFileWriteHook({ fileName }) {
        assert.equal(fileName, "program-keypair.json");
        throw new Error("injected post-secret failure");
      },
      async postStagingPinReleaseHook(context) {
        if (context.phase === "publication") {
          return;
        }
        assert.equal(context.phase, "cleanup");
        hookCalled = true;
        movedStagingDirectory = `${stagingDirectory}.original-moved`;
        try {
          await rename(stagingDirectory, movedStagingDirectory);
          await mkdir(stagingDirectory);
          await writeFile(
            path.join(stagingDirectory, "replacement-sentinel.txt"),
            "replacement retained\n",
            "utf8",
          );
        } catch (error) {
          substitutionBlocked = true;
          assert.match(
            `${error?.code ?? ""} ${error?.message ?? ""}`,
            /EPERM|EACCES|EBUSY|access|being used|busy|locked|permission/i,
          );
        }
      },
    }),
    /protected incomplete staging retained|explicit recovery required/i,
  );

  assert.equal(hookCalled, true);
  assert.equal(substitutionBlocked, true);
  const retainedIdentity = await lstat(stagingDirectory, { bigint: true });
  assert.equal(retainedIdentity.dev, stagingIdentity.dev);
  assert.equal(retainedIdentity.ino, stagingIdentity.ino);
  assert.deepEqual(await readdir(stagingDirectory), ["program-keypair.json"]);
  await assertExactPrivateDirectorySecurity(stagingDirectory);
  await assertExactPrivateFileSecurity(
    path.join(stagingDirectory, "program-keypair.json"),
  );
  assert.ok(
    (await stat(path.join(stagingDirectory, "program-keypair.json"))).size > 0,
  );
  assert.equal(await lstatIfExistsForTest(movedStagingDirectory), null);
  assert.equal(await readFile(publicConfigPath, "utf8"), "existing public config\n");
  assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
  const retainedNames = await readdir(stagingDirectory);
  await assert.rejects(
    generateDevnetReleaseConfig({ repositoryRoot: root }),
    /protected incomplete staging.*explicit recovery required/i,
  );
  const afterRetryIdentity = await lstat(stagingDirectory, { bigint: true });
  assert.equal(afterRetryIdentity.dev, stagingIdentity.dev);
  assert.equal(afterRetryIdentity.ino, stagingIdentity.ino);
  assert.deepEqual(await readdir(stagingDirectory), retainedNames);
  assert.equal(await readFile(publicConfigPath, "utf8"), "existing public config\n");
  assert.equal(await readFile(rustConfigPath, "utf8"), "existing Rust binding\n");
  assert.equal(await lstatIfExistsForTest(path.join(devnetDirectory, "private")), null);
  await assertNoWindowsDirectoryPinHelper();
  },
);

test(
  "secret files have retained identity and exact security before the first byte",
  { skip: !["linux", "win32"].includes(process.platform) },
  async (t) => {
    const root = await isolatedRepository(t);
    const observed = [];

    await generateDevnetReleaseConfig({
      repositoryRoot: root,
      async beforeSecretFirstByteHook({
        fileName,
        filePath,
        openedIdentity,
      }) {
        const namedEntry = await lstat(filePath, { bigint: true });
        assert.equal(namedEntry.size, 0n);
        assert.equal(namedEntry.dev, openedIdentity.dev);
        assert.equal(namedEntry.ino, openedIdentity.ino);
        await assertExactPrivateDirectorySecurity(path.dirname(filePath));
        await assertExactPrivateFileSecurity(filePath);
        observed.push(fileName);
      },
    });

    assert.deepEqual(observed, [
      "program-keypair.json",
      "initializer-keypair.json",
      "instance-nonce.hex",
    ]);
    await assertNoWindowsDirectoryPinHelper();
  },
);

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
