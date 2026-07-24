import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
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
import { Keypair, PublicKey } from "@solana/web3.js";

export const INSTANCE_DOMAIN = "HAKKY_INSTANCE_V1";
export const METADATA_URI = "https://hakky.xyz/metadata/hakky-v1.json";
export const RELEASE_SCHEMA_VERSION = "hakky-release-config-v1";
export const RELEASE_NETWORK = "devnet";
const PUBLICATION_SCHEMA_VERSION = "hakky-release-publication-v1";
const PUBLICATION_JOURNAL_NAME = ".hakky-release-publication-v1.json";
const PUBLICATION_FAULT_PHASES = new Set([
  "journal-linked",
  "journal-pending-cleaned",
  "backup-linked",
  "promote-linked",
  "destination-renamed",
  "promote-cleaned",
  "restore-linked",
  "destination-restored",
  "restore-cleaned",
  "private-published",
  "candidate-cleaned",
  "backup-cleaned",
  "journal-cleaned",
]);
export const FIXED_RELEASE_IDENTITIES = Object.freeze({
  systemProgram: "11111111111111111111111111111111",
  loaderProgram: "BPFLoaderUpgradeab1e11111111111111111111111",
  tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  wsolMint: "So11111111111111111111111111111111111111112",
  metadataProgram: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  rentSysvar: "SysvarRent111111111111111111111111111111111",
});
const execFileAsync = promisify(execFile);
const WINDOWS_PIN_TYPE = String.raw`
using System;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32.SafeHandles;

public sealed class HakkyDirectoryPin : IDisposable
{
    private const uint FILE_SHARE_READ = 0x00000001;
    private const uint FILE_SHARE_WRITE = 0x00000002;
    private const uint FILE_LIST_DIRECTORY = 0x00000001;
    private const uint FILE_ADD_SUBDIRECTORY = 0x00000004;
    private const uint FILE_READ_ATTRIBUTES = 0x00000080;
    private const uint READ_CONTROL = 0x00020000;
    private const uint WRITE_DAC = 0x00040000;
    private const uint WRITE_OWNER = 0x00080000;
    private const uint DELETE = 0x00010000;
    private const uint OPEN_EXISTING = 3;
    private const uint FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
    private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
    private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
    private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
    private const uint OBJ_CASE_INSENSITIVE = 0x00000040;
    private const uint FILE_CREATE = 2;
    private const uint FILE_DIRECTORY_FILE = 0x00000001;
    private const uint FILE_OPEN_REPARSE_POINT = 0x00200000;
    private const uint OWNER_SECURITY_INFORMATION = 0x00000001;
    private const uint DACL_SECURITY_INFORMATION = 0x00000004;
    private const uint SDDL_REVISION_1 = 1;
    private const int FILE_RENAME_INFORMATION_CLASS = 10;
    private const int FILE_DISPOSITION_INFORMATION_CLASS = 13;

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

    [StructLayout(LayoutKind.Sequential)]
    private struct IoStatusBlock
    {
        public IntPtr Status;
        public IntPtr Information;
    }

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

    [DllImport("ntdll.dll")]
    private static extern uint RtlNtStatusToDosError(
        int status
    );

    [DllImport(
        "advapi32.dll",
        CharSet = CharSet.Unicode,
        SetLastError = true
    )]
    private static extern bool ConvertStringSecurityDescriptorToSecurityDescriptorW(
        string stringSecurityDescriptor,
        uint stringSDRevision,
        out IntPtr securityDescriptor,
        out uint securityDescriptorSize
    );

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern uint GetSecurityInfo(
        IntPtr handle,
        int objectType,
        uint securityInfo,
        out IntPtr owner,
        out IntPtr group,
        out IntPtr dacl,
        out IntPtr sacl,
        out IntPtr securityDescriptor
    );

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern uint GetSecurityDescriptorLength(
        IntPtr securityDescriptor
    );

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    private SafeFileHandle handle;
    private readonly string originalPath;
    private readonly bool renameSource;
    private readonly bool renameRoot;
    private readonly bool verifyPrivateDirectorySecurity;
    private string publishedPath;

    public string Identity { get; private set; }

    public HakkyDirectoryPin(
        string directoryPath,
        bool allowRenameSource,
        bool allowRenameRoot
    )
    {
        originalPath = Path.GetFullPath(directoryPath);
        renameSource = allowRenameSource;
        renameRoot = allowRenameRoot;
        verifyPrivateDirectorySecurity = false;
        uint desiredAccess = FILE_READ_ATTRIBUTES;
        if (renameSource)
        {
            desiredAccess |= DELETE;
        }
        if (renameRoot)
        {
            desiredAccess |=
                FILE_LIST_DIRECTORY | FILE_ADD_SUBDIRECTORY;
        }
        handle = CreateFileW(
            originalPath,
            desiredAccess,
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

        Identity = ReadIdentity(handle);
        VerifyPathIdentity(originalPath);
    }

    private HakkyDirectoryPin(
        string directoryPath,
        SafeFileHandle retainedHandle
    )
    {
        originalPath = Path.GetFullPath(directoryPath);
        renameSource = true;
        renameRoot = false;
        verifyPrivateDirectorySecurity = true;
        handle = retainedHandle;
        Identity = ReadIdentity(handle);
        VerifyPrivateDirectorySecurity(handle);
        VerifyPathIdentity(originalPath);
    }

    private static string ReadIdentity(SafeFileHandle candidate)
    {
        ByHandleFileInformation information;
        if (!GetFileInformationByHandle(candidate, out information))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        if ((information.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0)
        {
            throw new InvalidOperationException(
                "directory pin rejected a reparse point"
            );
        }
        if ((information.FileAttributes & FILE_ATTRIBUTE_DIRECTORY) == 0)
        {
            throw new InvalidOperationException(
                "directory pin requires a directory"
            );
        }
        return string.Format(
            CultureInfo.InvariantCulture,
            "{0:X8}:{1:X8}:{2:X8}",
            information.VolumeSerialNumber,
            information.FileIndexHigh,
            information.FileIndexLow
        );
    }

    private static bool IsValidStagingName(string childName)
    {
        const string prefix = ".private-stage-";
        if (
            childName == null ||
            childName.Length != prefix.Length + 24 ||
            !childName.StartsWith(prefix, StringComparison.Ordinal)
        )
        {
            return false;
        }
        for (int index = prefix.Length; index < childName.Length; index++)
        {
            char value = childName[index];
            if (
                (value < '0' || value > '9') &&
                (value < 'a' || value > 'f')
            )
            {
                return false;
            }
        }
        return true;
    }

    private static IntPtr CreatePrivateDirectorySecurityDescriptor()
    {
        SecurityIdentifier currentSid =
            WindowsIdentity.GetCurrent().User;
        string sddl =
            "O:" + currentSid.Value +
            "D:P" +
            "(A;OICI;FA;;;" + currentSid.Value + ")" +
            "(A;OICI;FA;;;SY)" +
            "(A;OICI;FA;;;BA)";
        IntPtr securityDescriptor;
        uint securityDescriptorSize;
        if (
            !ConvertStringSecurityDescriptorToSecurityDescriptorW(
                sddl,
                SDDL_REVISION_1,
                out securityDescriptor,
                out securityDescriptorSize
            )
        )
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        return securityDescriptor;
    }

    private static void VerifyPrivateDirectorySecurity(
        SafeFileHandle candidate
    )
    {
        IntPtr owner;
        IntPtr group;
        IntPtr dacl;
        IntPtr sacl;
        IntPtr securityDescriptor;
        uint result = GetSecurityInfo(
            candidate.DangerousGetHandle(),
            1,
            OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
            out owner,
            out group,
            out dacl,
            out sacl,
            out securityDescriptor
        );
        if (result != 0)
        {
            throw new Win32Exception(
                (int)result,
                "private directory handle security read failed"
            );
        }
        try
        {
            uint descriptorLength =
                GetSecurityDescriptorLength(securityDescriptor);
            if (descriptorLength == 0 || descriptorLength > int.MaxValue)
            {
                throw new InvalidOperationException(
                    "private directory security descriptor is invalid"
                );
            }
            byte[] descriptorBytes = new byte[(int)descriptorLength];
            Marshal.Copy(
                securityDescriptor,
                descriptorBytes,
                0,
                descriptorBytes.Length
            );
            RawSecurityDescriptor descriptor =
                new RawSecurityDescriptor(descriptorBytes, 0);
            SecurityIdentifier currentSid =
                WindowsIdentity.GetCurrent().User;
            if (
                descriptor.Owner == null ||
                !descriptor.Owner.Equals(currentSid) ||
                (descriptor.ControlFlags &
                    ControlFlags.DiscretionaryAclProtected) == 0 ||
                descriptor.DiscretionaryAcl == null ||
                descriptor.DiscretionaryAcl.Count != 3
            )
            {
                throw new InvalidOperationException(
                    "private directory handle ACL validation failed"
                );
            }

            string[] expectedSids = new string[] {
                currentSid.Value,
                "S-1-5-18",
                "S-1-5-32-544"
            };
            bool[] observedSids = new bool[expectedSids.Length];
            for (
                int index = 0;
                index < descriptor.DiscretionaryAcl.Count;
                index++
            )
            {
                CommonAce ace =
                    descriptor.DiscretionaryAcl[index] as CommonAce;
                if (
                    ace == null ||
                    ace.AceQualifier != AceQualifier.AccessAllowed ||
                    ace.AccessMask !=
                        (int)FileSystemRights.FullControl ||
                    ace.AceFlags !=
                        (AceFlags.ContainerInherit |
                            AceFlags.ObjectInherit)
                )
                {
                    throw new InvalidOperationException(
                        "private directory handle ACL rule validation failed"
                    );
                }
                int sidIndex = Array.IndexOf(
                    expectedSids,
                    ace.SecurityIdentifier.Value
                );
                if (sidIndex < 0 || observedSids[sidIndex])
                {
                    throw new InvalidOperationException(
                        "private directory handle ACL SID validation failed"
                    );
                }
                observedSids[sidIndex] = true;
            }
        }
        finally
        {
            LocalFree(securityDescriptor);
        }
    }

    public HakkyDirectoryPin CreateStaging(string childName)
    {
        if (!renameRoot)
        {
            throw new InvalidOperationException(
                "directory pin is not configured for staging creation"
            );
        }
        if (!IsValidStagingName(childName))
        {
            throw new InvalidOperationException(
                "invalid private staging name"
            );
        }

        Verify();
        IntPtr nameBuffer = Marshal.StringToHGlobalUni(childName);
        IntPtr namePointer = IntPtr.Zero;
        IntPtr securityDescriptor = IntPtr.Zero;
        SafeFileHandle stagingHandle = null;
        try
        {
            UnicodeString name = new UnicodeString {
                Length = checked((ushort)(childName.Length * 2)),
                MaximumLength = checked(
                    (ushort)((childName.Length + 1) * 2)
                ),
                Buffer = nameBuffer
            };
            namePointer = Marshal.AllocHGlobal(
                Marshal.SizeOf(typeof(UnicodeString))
            );
            Marshal.StructureToPtr(name, namePointer, false);
            securityDescriptor =
                CreatePrivateDirectorySecurityDescriptor();
            ObjectAttributes attributes = new ObjectAttributes {
                Length = Marshal.SizeOf(typeof(ObjectAttributes)),
                RootDirectory = handle.DangerousGetHandle(),
                ObjectName = namePointer,
                Attributes = OBJ_CASE_INSENSITIVE,
                SecurityDescriptor = securityDescriptor,
                SecurityQualityOfService = IntPtr.Zero
            };
            IoStatusBlock ioStatusBlock;
            int status = NtCreateFile(
                out stagingHandle,
                DELETE |
                    FILE_READ_ATTRIBUTES |
                    READ_CONTROL |
                    WRITE_DAC |
                    WRITE_OWNER,
                ref attributes,
                out ioStatusBlock,
                IntPtr.Zero,
                FILE_ATTRIBUTE_DIRECTORY,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                FILE_CREATE,
                FILE_DIRECTORY_FILE | FILE_OPEN_REPARSE_POINT,
                IntPtr.Zero,
                0
            );
            if (status != 0)
            {
                uint error = RtlNtStatusToDosError(status);
                if (stagingHandle != null)
                {
                    stagingHandle.Dispose();
                    stagingHandle = null;
                }
                throw new Win32Exception(
                    (int)error,
                    string.Format(
                        CultureInfo.InvariantCulture,
                        "native private staging creation failed ({0})",
                        error
                    )
                );
            }
            HakkyDirectoryPin staging = new HakkyDirectoryPin(
                Path.Combine(originalPath, childName),
                stagingHandle
            );
            stagingHandle = null;
            Verify();
            return staging;
        }
        finally
        {
            if (stagingHandle != null)
            {
                stagingHandle.Dispose();
            }
            if (securityDescriptor != IntPtr.Zero)
            {
                LocalFree(securityDescriptor);
            }
            if (namePointer != IntPtr.Zero)
            {
                Marshal.FreeHGlobal(namePointer);
            }
            Marshal.FreeHGlobal(nameBuffer);
        }
    }

    private void VerifyPathIdentity(string candidatePath)
    {
        using (SafeFileHandle candidate = CreateFileW(
            candidatePath,
            FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            IntPtr.Zero,
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
            IntPtr.Zero
        ))
        {
            if (candidate.IsInvalid)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            if (ReadIdentity(candidate) != Identity)
            {
                throw new InvalidOperationException(
                    "directory pin path identity changed"
                );
            }
        }
    }

    private void VerifyIdentity()
    {
        if (handle == null || handle.IsInvalid || handle.IsClosed)
        {
            throw new InvalidOperationException("directory pin is closed");
        }
        if (ReadIdentity(handle) != Identity)
        {
            throw new InvalidOperationException(
                "opened directory pin identity changed"
            );
        }
        VerifyPathIdentity(publishedPath ?? originalPath);
    }

    public void Verify()
    {
        VerifyIdentity();
        if (verifyPrivateDirectorySecurity)
        {
            VerifyPrivateDirectorySecurity(handle);
        }
    }

    public string PublishPrivate(
        HakkyDirectoryPin retainedRoot,
        string destinationPath
    )
    {
        if (!renameSource || retainedRoot == null || !retainedRoot.renameRoot)
        {
            throw new InvalidOperationException(
                "directory pin is not configured for publication"
            );
        }
        if (publishedPath != null)
        {
            throw new InvalidOperationException(
                "directory pin is already published"
            );
        }
        string expectedDestination = Path.GetFullPath(
            Path.Combine(retainedRoot.originalPath, "private")
        );
        if (
            !string.Equals(
                Path.GetFullPath(destinationPath),
                expectedDestination,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException(
                "directory pin publication destination is not literal private"
            );
        }

        Verify();
        retainedRoot.Verify();
        byte[] fileName = Encoding.Unicode.GetBytes("private");
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
            Marshal.WriteInt32(buffer, 0, 0);
            Marshal.WriteIntPtr(
                buffer,
                rootOffset,
                retainedRoot.handle.DangerousGetHandle()
            );
            Marshal.WriteInt32(buffer, lengthOffset, fileName.Length);
            Marshal.Copy(fileName, 0, IntPtr.Add(buffer, nameOffset), fileName.Length);
            IoStatusBlock ioStatusBlock;
            int status = NtSetInformationFile(
                handle,
                out ioStatusBlock,
                buffer,
                (uint)bufferSize,
                FILE_RENAME_INFORMATION_CLASS
            );
            if (status != 0)
            {
                uint error = RtlNtStatusToDosError(status);
                throw new Win32Exception(
                    (int)error,
                    string.Format(
                        CultureInfo.InvariantCulture,
                        "native private publication failed ({0})",
                        error
                    )
                );
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }

        publishedPath = expectedDestination;
        Verify();
        retainedRoot.Verify();
        return Identity;
    }

    public string RemoveEmpty(HakkyDirectoryPin retainedRoot)
    {
        if (
            !renameSource ||
            renameRoot ||
            retainedRoot == null ||
            !retainedRoot.renameRoot ||
            publishedPath != null
        )
        {
            throw new InvalidOperationException(
                "directory pin is not configured for empty staging removal"
            );
        }

        VerifyIdentity();
        retainedRoot.Verify();
        string removedIdentity = Identity;
        IntPtr buffer = Marshal.AllocHGlobal(sizeof(byte));
        try
        {
            Marshal.WriteByte(buffer, 0, 1);
            IoStatusBlock ioStatusBlock;
            int status = NtSetInformationFile(
                handle,
                out ioStatusBlock,
                buffer,
                sizeof(byte),
                FILE_DISPOSITION_INFORMATION_CLASS
            );
            if (status != 0)
            {
                uint error = RtlNtStatusToDosError(status);
                throw new Win32Exception(
                    (int)error,
                    string.Format(
                        CultureInfo.InvariantCulture,
                        "native empty staging removal failed ({0})",
                        error
                    )
                );
            }
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }

        if (ReadIdentity(handle) != removedIdentity)
        {
            throw new InvalidOperationException(
                "opened staging identity changed during removal"
            );
        }
        retainedRoot.Verify();
        return removedIdentity;
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

function windowsPinScript(
  paths,
  { holdOpen = false, createStaging = null, attachStaging = null } = {},
) {
  const encodedPaths = paths
    .map(
      (candidate) =>
        `'${Buffer.from(candidate, "utf8").toString("base64")}'`,
    )
    .join(", ");
  const stagingOptions = createStaging ?? attachStaging;
  const createRootIndex = stagingOptions?.rootIndex ?? -1;
  const attachStagingIndex = attachStaging?.stagingIndex ?? -1;
  const encodedPrivatePath = stagingOptions
    ? Buffer.from(stagingOptions.destination, "utf8").toString("base64")
    : "";
  return `
Add-Type -TypeDefinition @'
${WINDOWS_PIN_TYPE}
'@
$encodedPaths = @(${encodedPaths})
$createRootIndex = ${createRootIndex}
$attachStagingIndex = ${attachStagingIndex}
$privatePath = ${
    stagingOptions
      ? `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPrivatePath}'))`
      : "$null"
  }
$pins = [System.Collections.ArrayList]::new()
$stagingPin = $null
try {
  $identities = @()
  for ($index = 0; $index -lt $encodedPaths.Count; $index++) {
    $encodedPath = $encodedPaths[$index]
    $candidate = [Text.Encoding]::UTF8.GetString(
      [Convert]::FromBase64String($encodedPath)
    )
    $pin = [HakkyDirectoryPin]::new(
      $candidate,
      $index -eq $attachStagingIndex,
      $index -eq $createRootIndex
    )
    [void]$pins.Add($pin)
    $identities += $pin.Identity
  }
  if ($attachStagingIndex -ge 0) {
    $stagingPin = $pins[$attachStagingIndex]
  }
  [Console]::Out.WriteLine(
    (ConvertTo-Json -Compress -InputObject ([string[]]$identities))
  )
  [Console]::Out.Flush()
  ${
    holdOpen
      ? `
  while (($command = [Console]::In.ReadLine()) -ne $null) {
    $commandName = @($command.Split(' ', 2))[0]
    try {
    if ($command.StartsWith('CREATE_STAGING ')) {
      if ($createRootIndex -lt 0 -or $createRootIndex -ge $pins.Count) {
        throw 'directory pin is not configured for staging creation'
      }
      if ($stagingPin -ne $null) {
        throw 'private staging identity is already retained'
      }
      $encodedName = $command.Substring('CREATE_STAGING '.Length)
      try {
        $stagingName = [Text.Encoding]::UTF8.GetString(
          [Convert]::FromBase64String($encodedName)
        )
      } catch {
        throw 'invalid private staging name encoding'
      }
      $stagingPin = $pins[$createRootIndex].CreateStaging($stagingName)
      [void]$pins.Add($stagingPin)
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{
            command = 'CREATE_STAGING'
            name = $stagingName
            identity = $stagingPin.Identity
            identities = [string[]]@(
              $pins | ForEach-Object { $_.Identity }
            )
          }
        ))
      )
      [Console]::Out.Flush()
      continue
    }
    if ($command -eq 'VERIFY') {
      foreach ($pin in $pins) {
        $pin.Verify()
      }
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{
            command = 'VERIFY'
            identities = [string[]]@($pins | ForEach-Object { $_.Identity })
          }
        ))
      )
      [Console]::Out.Flush()
      continue
    }
    if (
      $command -eq 'PUBLISH_PRIVATE' -and
      $createRootIndex -ge 0 -and
      $stagingPin -ne $null
    ) {
      $publishedIdentity = $stagingPin.PublishPrivate(
        $pins[$createRootIndex],
        $privatePath
      )
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{
            command = 'PUBLISH_PRIVATE'
            identity = $publishedIdentity
          }
        ))
      )
      [Console]::Out.Flush()
      continue
    }
    if ($commandName -eq 'REMOVE_STAGING') {
      if ($command -ne 'REMOVE_STAGING') {
        throw 'invalid REMOVE_STAGING command'
      }
      if (
        $createRootIndex -lt 0 -or
        $createRootIndex -ge $pins.Count -or
        $stagingPin -eq $null
      ) {
        throw 'private staging identity is unavailable for removal'
      }
      $removedIdentity = $stagingPin.RemoveEmpty(
        $pins[$createRootIndex]
      )
      $stagingPin.Dispose()
      $pins.RemoveAt($pins.Count - 1)
      $stagingPin = $null
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{
            command = 'REMOVE_STAGING'
            identity = $removedIdentity
            identities = [string[]]@(
              $pins | ForEach-Object { $_.Identity }
            )
          }
        ))
      )
      [Console]::Out.Flush()
      continue
    }
    if ($command -eq 'RELEASE_STAGING' -and $stagingPin -ne $null) {
      $stagingPin.Dispose()
      $pins.RemoveAt($pins.Count - 1)
      $stagingPin = $null
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{
            command = 'RELEASE_STAGING'
            identities = [string[]]@(
              $pins | ForEach-Object { $_.Identity }
            )
          }
        ))
      )
      [Console]::Out.Flush()
      continue
    }
    if ($command -eq 'RELEASE') {
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{ command = 'RELEASE' }
        ))
      )
      [Console]::Out.Flush()
      break
    }
    throw "unsupported directory pin command"
    } catch {
      [Console]::Out.WriteLine(
        (ConvertTo-Json -Compress -InputObject (
          [PSCustomObject]@{
            command = 'ERROR'
            requestedCommand = $commandName
            message = $_.Exception.Message
          }
        ))
      )
      [Console]::Out.Flush()
    }
  }
`
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

async function createWindowsDirectoryIdentityPin(
  paths,
  label,
  { createStaging, attachStaging } = {},
) {
  const retainedPaths = [...paths];
  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      windowsPinScript(paths, {
        holdOpen: true,
        createStaging,
        attachStaging,
      }),
    ],
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
  let commandPending = false;
  async function terminateHelper() {
    child.stdin.destroy();
    if (child.exitCode === null) {
      child.kill();
    }
    await completion.catch(() => {});
    lines.close();
  }
  async function sendCommand(command, payload) {
    if (released) {
      throw new Error(`${label} identity pin is already released`);
    }
    if (commandPending) {
      throw new Error(`${label} identity pin command is already pending`);
    }
    if (child.exitCode !== null) {
      throw new Error(`${label} identity changed: pin helper exited`);
    }
    commandPending = true;
    try {
      await withDeadline(
        new Promise((resolve, reject) => {
          child.stdin.write(
            `${command}${payload === undefined ? "" : ` ${payload}`}\n`,
            "utf8",
            (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            },
          );
        }),
        `Windows directory pin ${command} write timed out`,
      );
      const nextLine = await withDeadline(
        iterator.next(),
        `Windows directory pin ${command} response timed out`,
      );
      if (nextLine.done) {
        await completion;
        throw new Error(
          `Windows directory pin exited before acknowledging ${command}`,
        );
      }
      const response = JSON.parse(nextLine.value);
      if (
        response.command === "ERROR" &&
        response.requestedCommand === command &&
        typeof response.message === "string"
      ) {
        const commandError = new Error(
          `Windows directory pin ${command} failed: ${response.message}`,
        );
        commandError.recoverableWindowsPinCommand = true;
        throw commandError;
      }
      if (response.command !== command) {
        throw new Error(
          `Windows directory pin returned an invalid ${command} acknowledgement`,
        );
      }
      return response;
    } catch (error) {
      if (!error?.recoverableWindowsPinCommand) {
        await terminateHelper();
      }
      throw error;
    } finally {
      commandPending = false;
    }
  }
  async function verifyPaths() {
    let current;
    try {
      current = await readWindowsDirectoryIdentities(retainedPaths);
    } catch (error) {
      throw new Error(`${label} identity changed`, { cause: error });
    }
    if (!sameIdentities(identities, current)) {
      throw new Error(`${label} identity changed`);
    }
  }
  let stagingFacade;
  const pin = {
    assertMatches(expected) {
      if (!sameIdentities(expected, identities)) {
        throw new Error(`${label} identity changed`);
      }
    },
    async verify() {
      if (released) {
        throw new Error(`${label} identity pin is already released`);
      }
      const response = await sendCommand("VERIFY");
      if (!sameIdentities(identities, response.identities)) {
        throw new Error(`${label} identity changed`);
      }
    },
    verifyPath: verifyPaths,
    async verifyPublished(candidate, index) {
      const current = await readWindowsDirectoryIdentities([candidate]);
      if (current[0] !== identities[index]) {
        throw new Error(`${label} published identity changed`);
      }
      await this.verify();
    },
    async createStagingPin(stagingName) {
      if (!createStaging && !attachStaging) {
        throw new Error(`${label} identity pin cannot create staging`);
      }
      if (stagingFacade) {
        throw new Error(`${label} staging identity is already retained`);
      }
      let response;
      let expectedPath;
      let stagingIndex;
      if (attachStaging) {
        stagingIndex = attachStaging.stagingIndex;
        expectedPath = retainedPaths[stagingIndex];
        if (
          stagingIndex !== retainedPaths.length - 1 ||
          path.basename(expectedPath) !== stagingName
        ) {
          throw new Error(`${label} attached staging identity is invalid`);
        }
        response = {
          identity: identities[stagingIndex],
          name: stagingName,
        };
      } else {
        response = await sendCommand(
          "CREATE_STAGING",
          Buffer.from(stagingName, "utf8").toString("base64"),
        );
        expectedPath = path.join(
          retainedPaths[createStaging.rootIndex],
          stagingName,
        );
        stagingIndex = identities.length;
        const expectedIdentities = [...identities, response.identity];
        if (
          response.name !== stagingName ||
          typeof response.identity !== "string" ||
          !sameIdentities(expectedIdentities, response.identities)
        ) {
          throw new Error(
            `${label} identity pin returned invalid staging identity data`,
          );
        }
        retainedPaths.push(expectedPath);
        identities.push(response.identity);
      }
      let stagingReleased = false;
      stagingFacade = {
        retainedIdentity: response.identity,
        async verify() {
          if (stagingReleased) {
            throw new Error(`${label} staging identity pin is already released`);
          }
          await pin.verify();
        },
        async verifyPath() {
          const current = await readWindowsDirectoryIdentities([expectedPath]);
          if (current[0] !== response.identity) {
            throw new Error(`${label} staging identity changed`);
          }
        },
        async verifyPublished(candidate) {
          const current = await readWindowsDirectoryIdentities([candidate]);
          if (current[0] !== response.identity) {
            throw new Error(`${label} published identity changed`);
          }
          await this.verify();
        },
        async publishPrivate() {
          if (stagingReleased) {
            throw new Error(`${label} staging identity pin is already released`);
          }
          const publishResponse = await sendCommand("PUBLISH_PRIVATE");
          if (publishResponse.identity !== response.identity) {
            throw new Error(`${label} published identity changed`);
          }
          return publishResponse.identity;
        },
        async removeEmpty() {
          if (stagingReleased) {
            throw new Error(`${label} staging identity pin is already released`);
          }
          const removeResponse = await sendCommand("REMOVE_STAGING");
          const parentIdentities = identities.slice(0, stagingIndex);
          if (
            removeResponse.identity !== response.identity ||
            !sameIdentities(parentIdentities, removeResponse.identities)
          ) {
            await terminateHelper();
            throw new Error(
              `${label} identity pin returned invalid empty staging removal data`,
            );
          }
          retainedPaths.pop();
          identities.pop();
          stagingReleased = true;
          stagingFacade = null;
          return removeResponse.identity;
        },
        async release() {
          if (stagingReleased) {
            return;
          }
          if (released) {
            stagingReleased = true;
            stagingFacade = null;
            return;
          }
          const releaseResponse = await sendCommand("RELEASE_STAGING");
          const parentIdentities = identities.slice(0, stagingIndex);
          if (!sameIdentities(parentIdentities, releaseResponse.identities)) {
            throw new Error(
              `${label} identity pin returned invalid staging release data`,
            );
          }
          retainedPaths.pop();
          identities.pop();
          stagingReleased = true;
          stagingFacade = null;
        },
      };
      return stagingFacade;
    },
    async release() {
      if (released) {
        return;
      }
      try {
        if (child.exitCode === null) {
          await sendCommand("RELEASE");
          child.stdin.end();
        }
        await withDeadline(
          completion,
          "Windows directory pin shutdown timed out",
        );
      } catch (error) {
        await terminateHelper();
        throw error;
      } finally {
        released = true;
        child.stdin.destroy();
        lines.close();
      }
    },
  };
  return pin;
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
    async verifyPublished(candidate, index) {
      const entry = await lstat(candidate, { bigint: true });
      if (
        entry.isSymbolicLink() ||
        !entry.isDirectory() ||
        linuxIdentity(entry) !== identities[index] ||
        linuxIdentity(await handles[index].stat({ bigint: true })) !==
          identities[index]
      ) {
        throw new Error(`${label} published identity changed`);
      }
    },
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

async function createDirectoryIdentityPin(paths, label, options = {}) {
  if (process.platform === "win32") {
    return createWindowsDirectoryIdentityPin(paths, label, options);
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

async function validateWindowsPrivateAcl(candidate) {
  if (process.platform !== "win32") {
    return;
  }
  const encodedPath = Buffer.from(candidate, "utf8").toString("base64");
  const script = `
$privatePath = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${encodedPath}')
)
$currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$expected = @(
  $currentSid.Value,
  'S-1-5-18',
  'S-1-5-32-544'
) | Sort-Object
$acl = Get-Acl -LiteralPath $privatePath
$owner = $acl.GetOwner(
  [System.Security.Principal.SecurityIdentifier]
).Value
$actual = @($acl.Access | ForEach-Object {
  $_.IdentityReference.Translate(
    [System.Security.Principal.SecurityIdentifier]
  ).Value
} | Sort-Object)
if (
  $owner -ne $currentSid.Value -or
  -not $acl.AreAccessRulesProtected -or
  $actual.Count -ne $expected.Count -or
  (Compare-Object -ReferenceObject $expected -DifferenceObject $actual)
) {
  throw 'private ACL identity validation failed'
}
foreach ($rule in $acl.Access) {
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

function releaseIdentityBytes(releaseConfig) {
  const result = {};
  for (const field of [
    "programId",
    "initializer",
    "systemProgram",
    "loaderProgram",
    "tokenProgram",
    "wsolMint",
    "metadataProgram",
    "rentSysvar",
  ]) {
    result[field] = new PublicKey(releaseConfig[field]).toBytes();
  }
  result.instanceCommitment = Buffer.from(
    releaseConfig.instanceCommitment,
    "hex",
  );
  if (result.instanceCommitment.length !== 32) {
    throw new TypeError("instance commitment must be exactly 32 bytes");
  }
  return result;
}

function assertReleaseConfig(releaseConfig) {
  const expectedKeys = [
    "schemaVersion",
    "network",
    "programId",
    "initializer",
    "instanceCommitment",
    "systemProgram",
    "loaderProgram",
    "tokenProgram",
    "wsolMint",
    "metadataProgram",
    "rentSysvar",
    "metadataUri",
  ];
  if (
    releaseConfig === null ||
    typeof releaseConfig !== "object" ||
    Array.isArray(releaseConfig) ||
    !assertExactKeys(releaseConfig, expectedKeys)
  ) {
    throw new TypeError("release config has an invalid closed shape");
  }
  if (
    releaseConfig.schemaVersion !== RELEASE_SCHEMA_VERSION ||
    releaseConfig.network !== RELEASE_NETWORK ||
    releaseConfig.metadataUri !== METADATA_URI
  ) {
    throw new TypeError("release config contains an invalid fixed value");
  }
  for (const [field, expected] of Object.entries(FIXED_RELEASE_IDENTITIES)) {
    if (releaseConfig[field] !== expected) {
      throw new TypeError(`release config ${field} is not fixed`);
    }
  }
  if (!/^[0-9a-f]{64}$/u.test(releaseConfig.instanceCommitment)) {
    throw new TypeError("instance commitment must be 32 lowercase hex bytes");
  }
  releaseIdentityBytes(releaseConfig);
  return releaseConfig;
}

function assertExactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

export function renderRustReleaseConfig(releaseConfig) {
  assertReleaseConfig(releaseConfig);
  const bytes = releaseIdentityBytes(releaseConfig);
  return `use solana_program::pubkey::Pubkey;

pub const TOTAL_SUPPLY: u64 = 10_000_000_000_000;
pub const CURVE_MAX: u64 = 8_000_000_000_000;
pub const POOL_SEED: u64 = 2_000_000_000_000;
pub const TERMINAL_QUOTE: u64 = 24_000_000_000;
pub const POOL_FEE_DENOMINATOR: u64 = 1_000_000;
pub const POOL_EFFECTIVE_NUMERATOR: u64 = 997_500;
pub const TOKEN_DECIMALS: u8 = 6;
pub const TOKEN_NAME: &str = "Hakky Protocol";
pub const TOKEN_SYMBOL: &str = "HAKKY";
pub const RELEASE_SCHEMA_VERSION: &str = "${releaseConfig.schemaVersion}";
pub const RELEASE_NETWORK: &str = "${releaseConfig.network}";
pub const METADATA_URI: &str = "${releaseConfig.metadataUri}";

#[cfg(not(feature = "test-release-config"))]
pub const EXPECTED_PROGRAM_ID_BYTES: [u8; 32] = ${rustArray(bytes.programId)};
#[cfg(not(feature = "test-release-config"))]
pub const INITIALIZER_BYTES: [u8; 32] = ${rustArray(bytes.initializer)};
#[cfg(not(feature = "test-release-config"))]
pub const INSTANCE_COMMITMENT: [u8; 32] = ${rustArray(bytes.instanceCommitment)};

#[cfg(feature = "test-release-config")]
pub use crate::test_release_config::{
    EXPECTED_PROGRAM_ID, EXPECTED_PROGRAM_ID_BYTES, INITIALIZER, INITIALIZER_BYTES,
    INSTANCE_COMMITMENT,
};

#[cfg(not(feature = "test-release-config"))]
pub const EXPECTED_PROGRAM_ID: Pubkey = Pubkey::new_from_array(EXPECTED_PROGRAM_ID_BYTES);
#[cfg(not(feature = "test-release-config"))]
pub const INITIALIZER: Pubkey = Pubkey::new_from_array(INITIALIZER_BYTES);

pub const SYSTEM_PROGRAM_BYTES: [u8; 32] = ${rustArray(bytes.systemProgram)};
pub const LOADER_PROGRAM_BYTES: [u8; 32] = ${rustArray(bytes.loaderProgram)};
pub const TOKEN_PROGRAM_BYTES: [u8; 32] = ${rustArray(bytes.tokenProgram)};
pub const WSOL_MINT_BYTES: [u8; 32] = ${rustArray(bytes.wsolMint)};
pub const METADATA_PROGRAM_BYTES: [u8; 32] = ${rustArray(bytes.metadataProgram)};
pub const RENT_SYSVAR_BYTES: [u8; 32] = ${rustArray(bytes.rentSysvar)};

pub const SYSTEM_PROGRAM: Pubkey = Pubkey::new_from_array(SYSTEM_PROGRAM_BYTES);
pub const LOADER_PROGRAM: Pubkey = Pubkey::new_from_array(LOADER_PROGRAM_BYTES);
pub const TOKEN_PROGRAM: Pubkey = Pubkey::new_from_array(TOKEN_PROGRAM_BYTES);
pub const WSOL_MINT: Pubkey = Pubkey::new_from_array(WSOL_MINT_BYTES);
pub const METADATA_PROGRAM: Pubkey = Pubkey::new_from_array(METADATA_PROGRAM_BYTES);
pub const RENT_SYSVAR: Pubkey = Pubkey::new_from_array(RENT_SYSVAR_BYTES);
`;
}

export function renderJavaScriptReleaseConfig(releaseConfig) {
  assertReleaseConfig(releaseConfig);
  const bytes = releaseIdentityBytes(releaseConfig);
  const byteEntries = Object.entries(bytes)
    .map(
      ([field, value]) =>
        `  ${field}: Object.freeze(${JSON.stringify([...value])}),`,
    )
    .join("\n");
  return `export const HAKKY_RELEASE_CONFIG_V1 = Object.freeze(${JSON.stringify(
    releaseConfig,
    null,
    2,
  )});

export const HAKKY_RELEASE_IDENTITY_BYTES_V1 = Object.freeze({
${byteEntries}
});
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
  const entry = await lstat(candidate, { bigint: true });
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
  if (process.platform !== "win32" && (entry.mode & 0o777n) !== 0o600n) {
    throw new Error("private identity file must have mode 0600");
  }
}

async function validatePrivateIdentitySet(
  directory,
  directoryReal,
  publicConfig,
  beforeRead,
) {
  await beforeRead();
  await validateWindowsPrivateAcl(directory);
  const expectedNames = [
    "initializer-keypair.json",
    "instance-nonce.hex",
    "program-keypair.json",
  ];
  const names = (await readdir(directory)).sort();
  await beforeRead();
  if (
    names.length !== expectedNames.length ||
    names.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error("private commit is not the exact identity set");
  }
  const contents = {};
  for (const fileName of expectedNames) {
    const candidate = path.join(directory, fileName);
    const opened = await readBoundRegularFile(candidate, beforeRead);
    await validatePrivateFile(candidate, directoryReal, opened.entry);
    await validateWindowsPrivateAcl(candidate);
    const rechecked = await readBoundRegularFile(candidate, beforeRead);
    if (
      rechecked.digest !== opened.digest ||
      !sameFileIdentity(rechecked.entry, opened.identity)
    ) {
      throw new Error("private identity file changed during validation");
    }
    contents[fileName] = opened.contents;
  }
  try {
    const parseKeypair = (serialized) => {
      const parsed = JSON.parse(serialized);
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 64 ||
        parsed.some(
          (value) =>
            !Number.isInteger(value) || value < 0 || value > 255,
        )
      ) {
        throw new Error("invalid secret serialization");
      }
      return Keypair.fromSecretKey(Uint8Array.from(parsed));
    };
    const program = parseKeypair(contents["program-keypair.json"]);
    const initializer = parseKeypair(contents["initializer-keypair.json"]);
    const nonceText = contents["instance-nonce.hex"];
    if (!/^[0-9a-f]{64}\n$/u.test(nonceText)) {
      throw new Error("invalid nonce serialization");
    }
    const nonce = Buffer.from(nonceText.slice(0, -1), "hex");
    if (
      program.publicKey.toBase58() !== publicConfig.programId ||
      initializer.publicKey.toBase58() !== publicConfig.initializer ||
      instanceCommitment(nonce).toString("hex") !==
        publicConfig.instanceCommitment
    ) {
      throw new Error("identity mismatch");
    }
  } catch {
    throw new Error("private commit cryptographic correspondence failed");
  }
}

async function writeExclusivePrivateFile(
  candidate,
  contents,
  stagingReal,
  beforeMutation,
  onOpened,
  beforeFirstByte,
) {
  const flags =
    fsConstants.O_WRONLY |
    fsConstants.O_CREAT |
    fsConstants.O_EXCL |
    (fsConstants.O_NOFOLLOW ?? 0);
  await beforeMutation();
  const handle = await open(candidate, flags, 0o600);
  try {
    onOpened(candidate);
    await beforeMutation();
    await restrictPrivateFile(candidate);
    const openedEntry = await handle.stat({ bigint: true });
    await validatePrivateFile(candidate, stagingReal, openedEntry);
    await beforeMutation();
    if (beforeFirstByte) {
      await beforeFirstByte(
        Object.freeze({
          fileName: path.basename(candidate),
          filePath: candidate,
          openedIdentity: Object.freeze({
            dev: openedEntry.dev,
            ino: openedEntry.ino,
          }),
        }),
      );
    }
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await beforeMutation();
    await restrictPrivateFile(candidate);
    await validatePrivateFile(candidate, stagingReal, openedEntry);
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

async function writeExclusiveOwnedFile(candidate, contents, beforeMutation) {
  await beforeMutation();
  const handle = await open(
    candidate,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      (fsConstants.O_NOFOLLOW ?? 0),
    0o600,
  );
  const created = await handle.stat({ bigint: true });
  let failure;
  try {
    await beforeMutation();
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    const named = await lstat(candidate, { bigint: true });
    const opened = await handle.stat({ bigint: true });
    if (
      !named.isFile() ||
      named.isSymbolicLink() ||
      opened.dev !== created.dev ||
      opened.ino !== created.ino ||
      named.dev !== opened.dev ||
      named.ino !== opened.ino
    ) {
      throw new Error("exclusive owned file identity changed");
    }
  } catch (error) {
    failure = error;
  } finally {
    try {
      await handle.close();
    } catch (closeError) {
      failure = failure
        ? new AggregateError(
            [failure, closeError],
            "exclusive owned file write and close failed",
          )
        : closeError;
    }
  }
  if (failure) {
    try {
      await beforeMutation();
      const named = await lstat(candidate, { bigint: true });
      if (
        named.dev !== created.dev ||
        named.ino !== created.ino ||
        !named.isFile() ||
        named.isSymbolicLink()
      ) {
        throw new Error("exclusive owned file cleanup ownership changed");
      }
      await beforeMutation();
      await unlink(candidate);
    } catch (cleanupError) {
      if (cleanupError?.code !== "ENOENT") {
        throw new AggregateError(
          [failure, cleanupError],
          "exclusive owned file write and cleanup failed",
        );
      }
    }
    throw failure;
  }
  return Object.freeze({
    digest: fileDigest(contents),
    identity: fileIdentity(created),
  });
}

function isOwnedTemporaryPath(temporaryPath, finalPath) {
  return (
    typeof temporaryPath === "string" &&
    path.dirname(temporaryPath) === path.dirname(finalPath) &&
    new RegExp(
      `^\\.${path
        .basename(finalPath)
        .replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\.[0-9a-f]{24}\\.tmp$`,
      "u",
    ).test(path.basename(temporaryPath))
  );
}

async function allocateOwnedTemporaryPath(finalPath, beforeRead) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const temporaryPath = path.join(
      path.dirname(finalPath),
      `.${path.basename(finalPath)}.${randomBytes(12).toString("hex")}.tmp`,
    );
    await beforeRead();
    if (!(await lstatIfExists(temporaryPath))) {
      return temporaryPath;
    }
  }
  throw new Error("unable to allocate a public temporary path");
}

async function validateOwnedTemporaryFile(
  temporaryPath,
  finalPath,
  expectedContents,
  beforeRead,
) {
  if (!isOwnedTemporaryPath(temporaryPath, finalPath)) {
    throw new Error("publication journal names an invalid temporary path");
  }
  await beforeRead();
  const namedEntry = await lstat(temporaryPath, { bigint: true });
  if (!namedEntry.isFile() || namedEntry.isSymbolicLink()) {
    throw new Error("publication temporary path is not a regular file");
  }
  const handle = await open(
    temporaryPath,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const openedEntry = await handle.stat({ bigint: true });
    if (
      openedEntry.dev !== namedEntry.dev ||
      openedEntry.ino !== namedEntry.ino
    ) {
      throw new Error("publication temporary path changed while opening");
    }
    const contents = await handle.readFile("utf8");
    if (contents !== expectedContents) {
      throw new Error("publication temporary contents do not match the journal");
    }
  } finally {
    await handle.close();
  }
  return namedEntry;
}

async function readRegularFile(candidate, beforeRead) {
  await beforeRead();
  const namedEntry = await lstat(candidate, { bigint: true });
  if (!namedEntry.isFile() || namedEntry.isSymbolicLink()) {
    throw new Error(`${candidate} is not a regular file`);
  }
  const handle = await open(
    candidate,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const openedEntry = await handle.stat({ bigint: true });
    if (
      openedEntry.dev !== namedEntry.dev ||
      openedEntry.ino !== namedEntry.ino
    ) {
      throw new Error(`${candidate} changed while opening`);
    }
    return {
      contents: await handle.readFile("utf8"),
      entry: namedEntry,
    };
  } finally {
    await handle.close();
  }
}

function fileDigest(contents) {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

function fileIdentity(entry) {
  return Object.freeze({
    dev: entry.dev.toString(),
    ino: entry.ino.toString(),
  });
}

function sameFileIdentity(entry, identity) {
  return (
    identity &&
    entry.dev.toString() === identity.dev &&
    entry.ino.toString() === identity.ino
  );
}

async function readBoundRegularFile(candidate, beforeRead) {
  const result = await readRegularFile(candidate, beforeRead);
  return {
    ...result,
    digest: fileDigest(result.contents),
    identity: fileIdentity(result.entry),
  };
}

async function lstatBoundIfExists(candidate, beforeRead) {
  try {
    return await readBoundRegularFile(candidate, beforeRead);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function assertBoundFile(candidate, record, beforeRead, label) {
  const current = await readBoundRegularFile(candidate, beforeRead);
  if (
    !sameFileIdentity(current.entry, record.identity) ||
    current.digest !== record.digest
  ) {
    throw new Error(`${label} identity or digest changed`);
  }
  return current;
}

async function cleanupBoundSidecar(
  sidecarPath,
  sourceRecord,
  beforeMutation,
) {
  if (!sidecarPath) {
    return;
  }
  if (!sourceRecord) {
    throw new Error("publication sidecar ownership is unavailable");
  }
  const sidecar = await lstatBoundIfExists(sidecarPath, beforeMutation);
  if (!sidecar) {
    return;
  }
  if (
    !sameFileIdentity(sidecar.entry, sourceRecord.identity) ||
    sidecar.digest !== sourceRecord.digest
  ) {
    throw new Error("publication sidecar ownership changed");
  }
  await beforeMutation();
  await unlink(sidecarPath);
}

async function ensurePublicBackup(
  view,
  beforeMutation,
  afterBoundary,
) {
  if (view.record.original === null) {
    if (view.backupPath && (await lstatIfExists(view.backupPath))) {
      throw new Error("unexpected backup for an originally absent destination");
    }
    return;
  }
  const backup = await lstatBoundIfExists(view.backupPath, beforeMutation);
  if (backup) {
    await assertBoundFile(
      view.backupPath,
      view.record.backup,
      beforeMutation,
      "publication backup",
    );
    return;
  }
  await assertBoundFile(
    view.finalPath,
    view.record.original,
    beforeMutation,
    "original public destination",
  );
  await beforeMutation();
  await link(view.finalPath, view.backupPath);
  await afterBoundary("backup-linked", view.view);
  await assertBoundFile(
    view.backupPath,
    view.record.backup,
    beforeMutation,
    "publication backup",
  );
}

async function publishPublicViewWithBackup(
  view,
  beforeMutation,
  afterBoundary,
) {
  const candidate = await assertBoundFile(
    view.temporaryPath,
    view.record.candidate,
    beforeMutation,
    "publication candidate",
  );
  await ensurePublicBackup(view, beforeMutation, afterBoundary);
  const promotionPath = path.join(
    path.dirname(view.finalPath),
    view.record.promoteName,
  );
  const promotion = await lstatBoundIfExists(promotionPath, beforeMutation);
  if (promotion) {
    if (
      !sameFileIdentity(promotion.entry, candidate.identity) ||
      promotion.digest !== candidate.digest
    ) {
      throw new Error("publication promote sidecar ownership changed");
    }
  } else {
    await beforeMutation();
    await link(view.temporaryPath, promotionPath);
    await afterBoundary("promote-linked", view.view);
  }

  const current = await lstatBoundIfExists(view.finalPath, beforeMutation);
  const isCandidate =
    current &&
    sameFileIdentity(current.entry, view.record.candidate.identity) &&
    current.digest === view.record.candidate.digest;
  const isOriginal =
    current &&
    view.record.original &&
    sameFileIdentity(current.entry, view.record.original.identity) &&
    current.digest === view.record.original.digest;
  if (!isCandidate) {
    if (!isOriginal && !(current === null && view.record.original === null)) {
      throw new Error("public destination identity or digest changed");
    }
    await beforeMutation();
    await rename(promotionPath, view.finalPath);
    await afterBoundary("destination-renamed", view.view);
  }
  await assertBoundFile(
    view.finalPath,
    view.record.candidate,
    beforeMutation,
    "published public destination",
  );
  await cleanupBoundSidecar(
    promotionPath,
    view.record.candidate,
    beforeMutation,
  );
  await afterBoundary("promote-cleaned", view.view);
}

async function rollbackPublicView(view, beforeMutation, afterBoundary) {
  await ensurePublicBackup(view, beforeMutation, afterBoundary);
  const promotionPath = path.join(
    path.dirname(view.finalPath),
    view.record.promoteName,
  );
  await cleanupBoundSidecar(
    promotionPath,
    view.record.candidate,
    beforeMutation,
  );
  const current = await lstatBoundIfExists(view.finalPath, beforeMutation);
  const isCandidate =
    current &&
    sameFileIdentity(current.entry, view.record.candidate.identity) &&
    current.digest === view.record.candidate.digest;
  const isOriginal =
    current &&
    view.record.original &&
    sameFileIdentity(current.entry, view.record.original.identity) &&
    current.digest === view.record.original.digest;
  if (!isCandidate) {
    if (isOriginal || (current === null && view.record.original === null)) {
      return;
    }
    throw new Error("public destination identity or digest changed");
  }
  if (view.record.original === null) {
    await beforeMutation();
    await unlink(view.finalPath);
    return;
  }
  const restorePath = path.join(
    path.dirname(view.finalPath),
    view.record.restoreName,
  );
  const restore = await lstatBoundIfExists(restorePath, beforeMutation);
  if (restore) {
    if (
      !sameFileIdentity(restore.entry, view.record.backup.identity) ||
      restore.digest !== view.record.backup.digest
    ) {
      throw new Error("publication restore sidecar ownership changed");
    }
  } else {
    await beforeMutation();
    await link(view.backupPath, restorePath);
    await afterBoundary("restore-linked", view.view);
  }
  await beforeMutation();
  await rename(restorePath, view.finalPath);
  await afterBoundary("destination-restored", view.view);
  await assertBoundFile(
    view.finalPath,
    view.record.original,
    beforeMutation,
    "restored public destination",
  );
  await cleanupBoundSidecar(
    restorePath,
    view.record.backup,
    beforeMutation,
  );
  await afterBoundary("restore-cleaned", view.view);
}

function assertPublicationJournal(journal, publicFinalPaths) {
  if (
    journal === null ||
    typeof journal !== "object" ||
    Array.isArray(journal) ||
    Object.keys(journal).sort().join(",") !==
      "backupFiles,fileRecords,publicConfig,schemaVersion,stagingName,temporaryFiles" ||
    journal.schemaVersion !== PUBLICATION_SCHEMA_VERSION ||
    typeof journal.stagingName !== "string" ||
    path.basename(journal.stagingName) !== journal.stagingName ||
    !journal.stagingName.startsWith(".private-stage-") ||
    journal.temporaryFiles === null ||
    typeof journal.temporaryFiles !== "object" ||
    Array.isArray(journal.temporaryFiles) ||
    Object.keys(journal.temporaryFiles).sort().join(",") !==
      "javascriptConfig,publicConfig,rustConfig" ||
    journal.backupFiles === null ||
    typeof journal.backupFiles !== "object" ||
    Array.isArray(journal.backupFiles) ||
    Object.keys(journal.backupFiles).sort().join(",") !==
      "javascriptConfig,publicConfig,rustConfig" ||
    journal.fileRecords === null ||
    typeof journal.fileRecords !== "object" ||
    Array.isArray(journal.fileRecords) ||
    Object.keys(journal.fileRecords).sort().join(",") !==
      "javascriptConfig,publicConfig,rustConfig"
  ) {
    throw new Error("publication journal has an invalid closed schema");
  }
  assertReleaseConfig(journal.publicConfig);
  for (const [key, finalPath] of Object.entries(publicFinalPaths)) {
    const temporaryName = journal.temporaryFiles[key];
    if (
      typeof temporaryName !== "string" ||
      path.basename(temporaryName) !== temporaryName ||
      !isOwnedTemporaryPath(
        path.join(path.dirname(finalPath), temporaryName),
        finalPath,
      )
    ) {
      throw new Error("publication journal has an invalid temporary file name");
    }
    const backupName = journal.backupFiles[key];
    if (
      backupName !== null &&
      (typeof backupName !== "string" ||
        path.basename(backupName) !== backupName ||
        !isOwnedTemporaryPath(
          path.join(path.dirname(finalPath), backupName),
          finalPath,
        ) ||
        backupName === temporaryName)
    ) {
      throw new Error("publication journal has an invalid backup file name");
    }
    const record = journal.fileRecords[key];
    const identityIsValid = (identity) =>
      identity !== null &&
      typeof identity === "object" &&
      !Array.isArray(identity) &&
      Object.keys(identity).sort().join(",") === "dev,ino" &&
      /^(?:0|[1-9][0-9]*)$/u.test(identity.dev) &&
      /^(?:0|[1-9][0-9]*)$/u.test(identity.ino);
    const digestIsValid = (digest) => /^[0-9a-f]{64}$/u.test(digest);
    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      Object.keys(record).sort().join(",") !==
        "backup,candidate,original,promoteName,restoreName" ||
      record.candidate === null ||
      typeof record.candidate !== "object" ||
      Object.keys(record.candidate).sort().join(",") !==
        "digest,identity,name" ||
      record.candidate.name !== temporaryName ||
      !identityIsValid(record.candidate.identity) ||
      !digestIsValid(record.candidate.digest) ||
      record.promoteName !== `${temporaryName}.promote` ||
      record.restoreName !==
        (backupName === null ? null : `${backupName}.restore`)
    ) {
      throw new Error("publication journal has an invalid ownership record");
    }
    if (backupName === null) {
      if (record.original !== null || record.backup !== null) {
        throw new Error("publication journal absence record is invalid");
      }
    } else if (
      record.original === null ||
      record.backup === null ||
      Object.keys(record.original).sort().join(",") !== "digest,identity" ||
      Object.keys(record.backup).sort().join(",") !== "digest,identity,name" ||
      record.backup.name !== backupName ||
      !identityIsValid(record.original.identity) ||
      !identityIsValid(record.backup.identity) ||
      record.original.identity.dev !== record.backup.identity.dev ||
      record.original.identity.ino !== record.backup.identity.ino ||
      !digestIsValid(record.original.digest) ||
      record.original.digest !== record.backup.digest
    ) {
      throw new Error("publication journal backup ownership record is invalid");
    }
  }
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

export async function generateDevnetReleaseConfig(options) {
  const allowedOptions = [
    "repositoryRoot",
    "beforeKeyGenerationHook",
    "beforeSecretFirstByteHook",
    "preParentPinHook",
    "preStagingCreateHook",
    "postValidationHook",
    "postSecretFileWriteHook",
    "postStagingPinReleaseHook",
    "postPublicPromotionHook",
    "publicationFaultHook",
  ];
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("generation options must be an object");
  }
  const unknownOption = Object.keys(options).find(
    (key) => !allowedOptions.includes(key),
  );
  if (unknownOption !== undefined) {
    throw new TypeError(
      `unknown option ${unknownOption}; identity overrides are forbidden`,
    );
  }
  const {
    repositoryRoot,
    beforeKeyGenerationHook,
    beforeSecretFirstByteHook,
    preParentPinHook,
    preStagingCreateHook,
    postValidationHook,
    postSecretFileWriteHook,
    postStagingPinReleaseHook,
    postPublicPromotionHook,
    publicationFaultHook,
  } = options;
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) {
    throw new TypeError("repository root must be an absolute path");
  }
  if (
    beforeKeyGenerationHook !== undefined &&
    typeof beforeKeyGenerationHook !== "function"
  ) {
    throw new TypeError("before-key-generation hook must be a function");
  }
  if (
    beforeSecretFirstByteHook !== undefined &&
    typeof beforeSecretFirstByteHook !== "function"
  ) {
    throw new TypeError("before-secret-first-byte hook must be a function");
  }
  if (
    preParentPinHook !== undefined &&
    typeof preParentPinHook !== "function"
  ) {
    throw new TypeError("pre-parent-pin hook must be a function");
  }
  if (
    preStagingCreateHook !== undefined &&
    typeof preStagingCreateHook !== "function"
  ) {
    throw new TypeError("pre-staging-create hook must be a function");
  }
  if (
    postValidationHook !== undefined &&
    typeof postValidationHook !== "function"
  ) {
    throw new TypeError("post-validation hook must be a function");
  }
  if (
    postSecretFileWriteHook !== undefined &&
    typeof postSecretFileWriteHook !== "function"
  ) {
    throw new TypeError("post-secret-file-write hook must be a function");
  }
  if (
    postStagingPinReleaseHook !== undefined &&
    typeof postStagingPinReleaseHook !== "function"
  ) {
    throw new TypeError("post-staging-pin-release hook must be a function");
  }
  if (
    postPublicPromotionHook !== undefined &&
    typeof postPublicPromotionHook !== "function"
  ) {
    throw new TypeError("post-public-promotion hook must be a function");
  }
  if (
    publicationFaultHook !== undefined &&
    typeof publicationFaultHook !== "function"
  ) {
    throw new TypeError("publication-fault hook must be a function");
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
  const incompleteStagingNames = (await readdir(devnetDirectory))
    .filter((entry) => entry.startsWith(".private-stage-"))
    .sort();

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
  const configDirectory = path.join(root, "config");
  await ensureSafeDirectory(configDirectory, rootReal, "release config directory");
  const generatedSourceDirectory = path.join(root, "src");
  await ensureSafeDirectory(
    generatedSourceDirectory,
    rootReal,
    "generated source directory",
  );

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
    if (!existingPrivateEntry.isDirectory()) {
      throw new Error(
        "private identity path already exists and is not a directory",
      );
    }
  }

  const publicConfigPath = path.join(
    configDirectory,
    "hakky-release-v1.json",
  );
  const rustConfigPath = path.join(sourceDirectory, "constants.rs");
  const javascriptConfigPath = path.join(
    generatedSourceDirectory,
    "hakky-release-config.generated.mjs",
  );
  const publicationJournalPath = path.join(
    devnetDirectory,
    PUBLICATION_JOURNAL_NAME,
  );
  const publicFinalPaths = {
    publicConfig: publicConfigPath,
    rustConfig: rustConfigPath,
    javascriptConfig: javascriptConfigPath,
  };
  let publicationJournal;
  const existingJournalEntry = await lstatIfExists(publicationJournalPath);
  if (existingJournalEntry) {
    await assertSafeOptionalFile(
      publicationJournalPath,
      rootReal,
      "publication journal",
    );
    const journalFile = await readBoundRegularFile(
      publicationJournalPath,
      async () => {},
    );
    const journalBytes = journalFile.contents;
    try {
      publicationJournal = JSON.parse(journalBytes);
    } catch (error) {
      throw new Error("publication journal is not valid JSON", { cause: error });
    }
    assertPublicationJournal(publicationJournal, publicFinalPaths);
    if (`${JSON.stringify(publicationJournal)}\n` !== journalBytes) {
      throw new Error("publication journal is not canonical");
    }
    const stagingMatches =
      incompleteStagingNames.length === 1 &&
      incompleteStagingNames[0] === publicationJournal.stagingName;
    if (
      (!existingPrivateEntry && !stagingMatches) ||
      (existingPrivateEntry && incompleteStagingNames.length !== 0)
    ) {
      throw new Error(
        "publication journal does not match the retained identity state",
      );
    }
  } else {
    if (incompleteStagingNames.length > 0) {
      throw new Error(
        `protected incomplete staging retained at ${path.join(
          devnetDirectory,
          incompleteStagingNames[0],
        )}; explicit recovery required`,
      );
    }
  }
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
  await assertSafeOptionalFile(
    javascriptConfigPath,
    rootReal,
    "JavaScript release config",
  );

  const parentPaths = [
    root,
    artifactsDirectory,
    devnetDirectory,
    configDirectory,
    generatedSourceDirectory,
    sourceDirectory,
  ];
  if (publicationJournal && !existingPrivateEntry) {
    parentPaths.push(
      path.join(devnetDirectory, publicationJournal.stagingName),
    );
  }
  if (existingPrivateEntry) {
    parentPaths.push(privateDirectory);
  }
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
  let privateHandleCreated = false;
  let publicTemporaryPath;
  let rustTemporaryPath;
  let javascriptTemporaryPath;
  let publicBackupPath;
  let rustBackupPath;
  let javascriptBackupPath;
  let publicationJournalTemporaryPath;
  let publicationJournalTemporaryBinding;
  let publicationJournalBinding;
  let publicationRecoveryActive = Boolean(publicationJournal);
  let privatePublished = Boolean(publicationJournal && existingPrivateEntry);

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

  async function invokeStagingHandoffHook(phase) {
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

  async function releaseStagingPin() {
    if (!stagingIdentityPin) {
      return;
    }
    if (!stagingPinReleased) {
      await stagingIdentityPin.release();
      stagingPinReleased = true;
    }
  }

  async function invokePublicationFaultHook(phase, view = null) {
    if (!PUBLICATION_FAULT_PHASES.has(phase)) {
      throw new Error("unknown internal publication phase");
    }
    if (publicationFaultHook) {
      await publicationFaultHook(
        Object.freeze({
          phase,
          view,
        }),
      );
    }
  }

  async function verifyPublishedPrivateIdentity(publicConfig, pinnedDevnetReal) {
    const verifyPublished = async () => {
      await verifyParentPin();
      await stagingIdentityPin.verifyPublished(privateDirectory, 1);
    };
    await verifyPublished();
    const privateReal = await validatePrivateDirectory(
      privateDirectory,
      pinnedDevnetReal,
      "private commit directory",
    );
    await validatePrivateIdentitySet(
      privateDirectory,
      privateReal,
      publicConfig,
      verifyPublished,
    );
  }

  function publicViews(publicConfig) {
    return [
      {
        key: "publicConfig",
        view: "public-config",
        finalPath: publicConfigPath,
        temporaryPath: publicTemporaryPath,
        backupPath: publicBackupPath,
        record: publicationJournal?.fileRecords.publicConfig,
        contents: `${JSON.stringify(publicConfig)}\n`,
      },
      {
        key: "rustConfig",
        view: "rust-config",
        finalPath: rustConfigPath,
        temporaryPath: rustTemporaryPath,
        backupPath: rustBackupPath,
        record: publicationJournal?.fileRecords.rustConfig,
        contents: renderRustReleaseConfig(publicConfig),
      },
      {
        key: "javascriptConfig",
        view: "javascript-config",
        finalPath: javascriptConfigPath,
        temporaryPath: javascriptTemporaryPath,
        backupPath: javascriptBackupPath,
        record: publicationJournal?.fileRecords.javascriptConfig,
        contents: renderJavaScriptReleaseConfig(publicConfig),
      },
    ];
  }

  async function rollbackPublicViews(views) {
    for (const view of views) {
      await rollbackPublicView(
        view,
        verifyParentPin,
        invokePublicationFaultHook,
      );
    }
  }

  async function publishPublicViews(views) {
    await verifyRetainedPins();
    await invokeStagingHandoffHook("publication");
    await verifyRetainedPins();
    for (const view of views) {
      await publishPublicViewWithBackup(
        view,
        verifyRetainedPins,
        invokePublicationFaultHook,
      );
      if (postPublicPromotionHook) {
        await postPublicPromotionHook(
          Object.freeze({
            finalPath: view.finalPath,
            view: view.view,
          }),
        );
      }
    }
  }

  async function reconcilePublicationSidecars(views) {
    for (const view of views) {
      await cleanupBoundSidecar(
        path.join(
          path.dirname(view.finalPath),
          view.record.promoteName,
        ),
        view.record.candidate,
        verifyParentPin,
      );
      if (view.record.restoreName) {
        await cleanupBoundSidecar(
          path.join(
            path.dirname(view.finalPath),
            view.record.restoreName,
          ),
          view.record.backup,
          verifyParentPin,
        );
      }
    }
    await cleanupBoundSidecar(
      `${publicationJournalPath}.pending`,
      {
        digest: publicationJournalBinding.digest,
        identity: publicationJournalBinding.identity,
      },
      verifyParentPin,
    );
  }

  async function assertNoJournalLessPublicationResidue() {
    for (const finalPath of Object.values(publicFinalPaths)) {
      await verifyParentPin();
      const names = await readdir(path.dirname(finalPath));
      await verifyParentPin();
      const escapedBaseName = path
        .basename(finalPath)
        .replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const residuePattern = new RegExp(
        `^\\.${escapedBaseName}\\.[0-9a-f]{24}\\.tmp(?:\\.(?:promote|restore))?$`,
        "u",
      );
      if (names.some((name) => residuePattern.test(name))) {
        throw new Error(
          "journal-less completed release has publication transaction residue",
        );
      }
    }
    await verifyParentPin();
    const devnetNames = await readdir(devnetDirectory);
    await verifyParentPin();
    if (devnetNames.includes(`${PUBLICATION_JOURNAL_NAME}.pending`)) {
      throw new Error(
        "journal-less completed release has publication transaction residue",
      );
    }
  }

  async function finalizePublicationFiles(views) {
    for (const view of views) {
      if (await lstatIfExists(view.temporaryPath)) {
        await assertBoundFile(
          view.temporaryPath,
          view.record.candidate,
          verifyParentPin,
          "publication candidate",
        );
        await verifyParentPin();
        await unlink(view.temporaryPath);
        await invokePublicationFaultHook("candidate-cleaned", view.view);
      }
      if (view.backupPath) {
        if (await lstatIfExists(view.backupPath)) {
          await assertBoundFile(
            view.backupPath,
            view.record.backup,
            verifyParentPin,
            "publication backup",
          );
          await verifyParentPin();
          await unlink(view.backupPath);
          await invokePublicationFaultHook("backup-cleaned", view.view);
        }
      }
    }
    await verifyParentPin();
    if (!publicationJournalBinding) {
      throw new Error("publication journal ownership is unavailable");
    }
    await assertBoundFile(
      publicationJournalPath,
      {
        digest: publicationJournalBinding.digest,
        identity: publicationJournalBinding.identity,
      },
      verifyParentPin,
      "publication journal",
    );
    await reconcilePublicationSidecars(views);
    await assertBoundFile(
      publicationJournalPath,
      {
        digest: publicationJournalBinding.digest,
        identity: publicationJournalBinding.identity,
      },
      verifyParentPin,
      "publication journal",
    );
    await verifyParentPin();
    await unlink(publicationJournalPath);
    await invokePublicationFaultHook("journal-cleaned");
    publicTemporaryPath = null;
    rustTemporaryPath = null;
    javascriptTemporaryPath = null;
    publicBackupPath = null;
    rustBackupPath = null;
    javascriptBackupPath = null;
    publicationJournal = null;
    publicationRecoveryActive = false;
  }

  async function validatePublishedViews(views) {
    for (const view of views) {
      const published = await readBoundRegularFile(
        view.finalPath,
        verifyParentPin,
      );
      if (
        published.contents !== view.contents ||
        published.digest !== view.record.candidate.digest ||
        !sameFileIdentity(
          published.entry,
          view.record.candidate.identity,
        )
      ) {
        const mismatch = [
          published.contents !== view.contents ? "contents" : null,
          published.digest !== view.record.candidate.digest
            ? "digest"
            : null,
          !sameFileIdentity(
            published.entry,
            view.record.candidate.identity,
          )
            ? "identity"
            : null,
        ]
          .filter(Boolean)
          .join(",");
        throw new Error(
          `committed public view ${view.finalPath} does not match the journal (${mismatch})`,
        );
      }
      if (await lstatIfExists(view.temporaryPath)) {
        const sourceEntry = await validateOwnedTemporaryFile(
          view.temporaryPath,
          view.finalPath,
          view.contents,
          verifyParentPin,
        );
        if (
          published.entry.dev !== sourceEntry.dev ||
          published.entry.ino !== sourceEntry.ino
        ) {
          throw new Error(
            `committed public view ${view.finalPath} is not the journaled file`,
          );
        }
      }
      if (view.backupPath && (await lstatIfExists(view.backupPath))) {
        await readRegularFile(view.backupPath, verifyParentPin);
      }
    }
  }

  try {
    parentIdentityPin = await createDirectoryIdentityPin(
      parentPaths,
      "parent",
      process.platform === "win32"
        ? publicationRecoveryActive && !privatePublished
          ? {
              attachStaging: {
                destination: privateDirectory,
                rootIndex: 2,
                stagingIndex: parentPaths.length - 1,
              },
            }
          : {
            createStaging: {
              destination: privateDirectory,
              rootIndex: 2,
            },
          }
        : {},
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
    if (publicationRecoveryActive) {
      const journal = await readBoundRegularFile(
        publicationJournalPath,
        verifyParentPin,
      );
      if (`${JSON.stringify(publicationJournal)}\n` !== journal.contents) {
        throw new Error("publication journal identity or digest changed");
      }
      publicationJournalBinding = journal;
      const pendingPath = `${publicationJournalPath}.pending`;
      const pending = await lstatBoundIfExists(pendingPath, verifyParentPin);
      if (pending) {
        if (
          pending.digest !== journal.digest ||
          !sameFileIdentity(pending.entry, journal.identity)
        ) {
          throw new Error("publication journal pending ownership changed");
        }
        await verifyParentPin();
        await unlink(pendingPath);
      }
    }

    const currentPrivateEntry = await lstatIfExists(privateDirectory);
    if (currentPrivateEntry && !publicationRecoveryActive) {
      if (
        currentPrivateEntry.isSymbolicLink() ||
        (await isWindowsReparsePoint(privateDirectory))
      ) {
        throw new Error(
          "private identity path already exists and is redirected by a reparse point",
        );
      }
      try {
        const publicLeaf = await readBoundRegularFile(
          publicConfigPath,
          verifyParentPin,
        );
        const publicConfig = JSON.parse(publicLeaf.contents);
        assertReleaseConfig(publicConfig);
        const canonicalPublicJson = `${JSON.stringify(publicConfig)}\n`;
        if (
          publicLeaf.contents !== canonicalPublicJson ||
          (await readBoundRegularFile(rustConfigPath, verifyParentPin))
            .contents !== renderRustReleaseConfig(publicConfig) ||
          (
            await readBoundRegularFile(
              javascriptConfigPath,
              verifyParentPin,
            )
          ).contents !== renderJavaScriptReleaseConfig(publicConfig)
        ) {
          throw new Error("completed public views do not match");
        }
        const privateReal = await validatePrivateDirectory(
          privateDirectory,
          pinnedDevnetReal,
          "private commit directory",
        );
        await validatePrivateIdentitySet(
          privateDirectory,
          privateReal,
          publicConfig,
          verifyParentPin,
        );
        await assertNoJournalLessPublicationResidue();
        await parentIdentityPin.release();
        parentIdentityPin = null;
        return {
          canonicalPublicJson,
          publicConfig,
          repositoryRoot: root,
        };
      } catch (error) {
        throw new Error(
          `private identity path already exists without a valid completed release: ${error.message}`,
        );
      }
    }

    if (publicationRecoveryActive) {
      const publicConfig = publicationJournal.publicConfig;
      const canonicalPublicJson = `${JSON.stringify(publicConfig)}\n`;
      stagingDirectory = currentPrivateEntry
        ? null
        : path.join(devnetDirectory, publicationJournal.stagingName);
      publicTemporaryPath = path.join(
        path.dirname(publicConfigPath),
        publicationJournal.temporaryFiles.publicConfig,
      );
      rustTemporaryPath = path.join(
        path.dirname(rustConfigPath),
        publicationJournal.temporaryFiles.rustConfig,
      );
      javascriptTemporaryPath = path.join(
        path.dirname(javascriptConfigPath),
        publicationJournal.temporaryFiles.javascriptConfig,
      );
      publicBackupPath = publicationJournal.backupFiles.publicConfig
        ? path.join(
            path.dirname(publicConfigPath),
            publicationJournal.backupFiles.publicConfig,
          )
        : null;
      rustBackupPath = publicationJournal.backupFiles.rustConfig
        ? path.join(
            path.dirname(rustConfigPath),
            publicationJournal.backupFiles.rustConfig,
          )
        : null;
      javascriptBackupPath = publicationJournal.backupFiles.javascriptConfig
        ? path.join(
            path.dirname(javascriptConfigPath),
            publicationJournal.backupFiles.javascriptConfig,
          )
        : null;
      const views = publicViews(publicConfig);

      if (currentPrivateEntry) {
        const privateReal = await validatePrivateDirectory(
          privateDirectory,
          pinnedDevnetReal,
          "private commit directory",
        );
        await validatePrivateIdentitySet(
          privateDirectory,
          privateReal,
          publicConfig,
          verifyParentPin,
        );
        await validatePublishedViews(views);
        await finalizePublicationFiles(views);
        await parentIdentityPin.release();
        parentIdentityPin = null;
        return {
          canonicalPublicJson,
          publicConfig,
          repositoryRoot: root,
        };
      }

      for (const view of views) {
        await assertBoundFile(
          view.temporaryPath,
          view.record.candidate,
          verifyParentPin,
          "publication candidate",
        );
        if (view.backupPath) {
          const backup = await lstatIfExists(view.backupPath);
          if (backup) {
            await assertBoundFile(
              view.backupPath,
              view.record.backup,
              verifyParentPin,
              "publication backup",
            );
          }
        }
      }

      const pinnedStagingParentReal = await validatePrivateDirectory(
        devnetDirectory,
        pinnedArtifactsReal,
        "devnet recovery parent",
      );
      stagingIdentityPin =
        process.platform === "win32"
          ? await parentIdentityPin.createStagingPin(
              publicationJournal.stagingName,
            )
          : await createDirectoryIdentityPin(
              [devnetDirectory, stagingDirectory],
              "staging recovery",
            );
      const stagingReal = await validatePrivateDirectory(
        stagingDirectory,
        pinnedStagingParentReal,
        "retained private staging",
      );
      await verifyRetainedPins();
      const expectedNames = [
        "initializer-keypair.json",
        "instance-nonce.hex",
        "program-keypair.json",
      ];
      const stagedNames = (await readdir(stagingDirectory)).sort();
      if (
        stagedNames.length !== expectedNames.length ||
        stagedNames.some((name, index) => name !== expectedNames[index])
      ) {
        throw new Error("retained private staging is not the exact identity set");
      }
      for (const fileName of expectedNames) {
        await validatePrivateFile(
          path.join(stagingDirectory, fileName),
          stagingReal,
        );
      }
      await rollbackPublicViews(views);
      await publishPublicViews(views);
      await verifyRetainedPins();
      if (process.platform === "win32") {
        await stagingIdentityPin.publishPrivate();
      } else {
        await directoryRenameNoReplace(stagingDirectory, privateDirectory);
        await stagingIdentityPin.verifyPublished(privateDirectory, 1);
      }
      stagingDirectory = null;
      privatePublished = true;
      await verifyPublishedPrivateIdentity(publicConfig, pinnedDevnetReal);
      await invokePublicationFaultHook("private-published");
      await finalizePublicationFiles(views);
      await stagingIdentityPin.release();
      stagingIdentityPin = null;
      await parentIdentityPin.release();
      parentIdentityPin = null;
      return {
        canonicalPublicJson,
        publicConfig,
        repositoryRoot: root,
      };
    }

    let stagingReal;
    if (process.platform === "win32") {
      let stagingName = `.private-stage-${randomBytes(12).toString("hex")}`;
      stagingDirectory = path.join(devnetDirectory, stagingName);
      await verifyParentPin();
      if (preStagingCreateHook) {
        const stagingNameOverride = await preStagingCreateHook(
          Object.freeze({
            devnetDirectory,
            stagingDirectory,
            stagingName,
          }),
        );
        if (stagingNameOverride !== undefined) {
          if (typeof stagingNameOverride !== "string") {
            throw new TypeError(
              "pre-staging-create hook must return a string or undefined",
            );
          }
          stagingName = stagingNameOverride;
          stagingDirectory = path.join(devnetDirectory, stagingName);
        }
      }
      stagingIdentityPin =
        await parentIdentityPin.createStagingPin(stagingName);
      await restrictPrivateDirectory(stagingDirectory);
      await verifyRetainedPins();
      stagingReal = await validatePrivateDirectory(
        stagingDirectory,
        pinnedDevnetReal,
      );
    } else {
      await verifyParentPin();
      stagingDirectory = await mkdtemp(
        path.join(devnetDirectory, ".private-stage-"),
      );
      await verifyParentPin();
      await restrictPrivateDirectory(stagingDirectory);
      stagingReal = await validatePrivateDirectory(
        stagingDirectory,
        pinnedDevnetReal,
      );
      await verifyParentPin();
      stagingIdentityPin = await createDirectoryIdentityPin(
        [devnetDirectory, stagingDirectory],
        "staging",
      );
    }
    if (postValidationHook) {
      await postValidationHook(
        Object.freeze({
          artifactsDirectory,
          devnetDirectory,
          retainedStagingIdentity:
            stagingIdentityPin.retainedIdentity,
          stagingDirectory,
        }),
      );
    }
    await verifyRetainedPins();

    if (beforeKeyGenerationHook) {
      await beforeKeyGenerationHook(
        Object.freeze({
          devnetDirectory,
          retainedStagingIdentity:
            stagingIdentityPin.retainedIdentity,
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
        () => {
          privateHandleCreated = true;
        },
        beforeSecretFirstByteHook,
      );
      if (postSecretFileWriteHook) {
        await postSecretFileWriteHook(
          Object.freeze({
            fileName,
            stagingDirectory,
          }),
        );
      }
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
      schemaVersion: RELEASE_SCHEMA_VERSION,
      network: RELEASE_NETWORK,
      programId: program.publicKey.toBase58(),
      initializer: initializer.publicKey.toBase58(),
      instanceCommitment: commitment.toString("hex"),
      ...FIXED_RELEASE_IDENTITIES,
      metadataUri: METADATA_URI,
    };
    const canonicalPublicJson = `${JSON.stringify(publicConfig)}\n`;
    publicTemporaryPath = await writeOwnedTemporaryFile(
      publicConfigPath,
      canonicalPublicJson,
      verifyRetainedPins,
    );
    rustTemporaryPath = await writeOwnedTemporaryFile(
      rustConfigPath,
      renderRustReleaseConfig(publicConfig),
      verifyRetainedPins,
    );
    javascriptTemporaryPath = await writeOwnedTemporaryFile(
      javascriptConfigPath,
      renderJavaScriptReleaseConfig(publicConfig),
      verifyRetainedPins,
    );
    const candidateBindings = {
      publicConfig: await readBoundRegularFile(
        publicTemporaryPath,
        verifyRetainedPins,
      ),
      rustConfig: await readBoundRegularFile(
        rustTemporaryPath,
        verifyRetainedPins,
      ),
      javascriptConfig: await readBoundRegularFile(
        javascriptTemporaryPath,
        verifyRetainedPins,
      ),
    };
    const originalBindings = {
      publicConfig: await lstatBoundIfExists(
        publicConfigPath,
        verifyRetainedPins,
      ),
      rustConfig: await lstatBoundIfExists(
        rustConfigPath,
        verifyRetainedPins,
      ),
      javascriptConfig: await lstatBoundIfExists(
        javascriptConfigPath,
        verifyRetainedPins,
      ),
    };
    publicBackupPath = originalBindings.publicConfig
      ? await allocateOwnedTemporaryPath(
          publicConfigPath,
          verifyRetainedPins,
        )
      : null;
    rustBackupPath = originalBindings.rustConfig
      ? await allocateOwnedTemporaryPath(rustConfigPath, verifyRetainedPins)
      : null;
    javascriptBackupPath = originalBindings.javascriptConfig
      ? await allocateOwnedTemporaryPath(
          javascriptConfigPath,
          verifyRetainedPins,
        )
      : null;

    publicationJournal = {
      schemaVersion: PUBLICATION_SCHEMA_VERSION,
      stagingName: path.basename(stagingDirectory),
      publicConfig,
      temporaryFiles: {
        publicConfig: path.basename(publicTemporaryPath),
        rustConfig: path.basename(rustTemporaryPath),
        javascriptConfig: path.basename(javascriptTemporaryPath),
      },
      backupFiles: {
        publicConfig: publicBackupPath
          ? path.basename(publicBackupPath)
          : null,
        rustConfig: rustBackupPath ? path.basename(rustBackupPath) : null,
        javascriptConfig: javascriptBackupPath
          ? path.basename(javascriptBackupPath)
          : null,
      },
      fileRecords: {},
    };
    for (const [key, finalPath] of Object.entries(publicFinalPaths)) {
      const candidate = candidateBindings[key];
      const original = originalBindings[key];
      const candidateName = publicationJournal.temporaryFiles[key];
      const backupName = publicationJournal.backupFiles[key];
      publicationJournal.fileRecords[key] = {
        candidate: {
          name: candidateName,
          digest: candidate.digest,
          identity: candidate.identity,
        },
        original: original
          ? {
              digest: original.digest,
              identity: original.identity,
            }
          : null,
        backup: original
          ? {
              name: backupName,
              digest: original.digest,
              identity: original.identity,
            }
          : null,
        promoteName: `${candidateName}.promote`,
        restoreName: original ? `${backupName}.restore` : null,
      };
      if (path.dirname(finalPath) !== path.dirname(
        path.join(path.dirname(finalPath), candidateName),
      )) {
        throw new Error("publication candidate escaped its parent");
      }
    }
    const publicationJournalBytes = `${JSON.stringify(publicationJournal)}\n`;
    publicationJournalTemporaryPath = `${publicationJournalPath}.pending`;
    publicationJournalTemporaryBinding = await writeExclusiveOwnedFile(
      publicationJournalTemporaryPath,
      publicationJournalBytes,
      verifyRetainedPins,
    );
    await verifyRetainedPins();
    await link(publicationJournalTemporaryPath, publicationJournalPath);
    publicationRecoveryActive = true;
    await invokePublicationFaultHook("journal-linked");
    const journalBinding = await readBoundRegularFile(
      publicationJournalPath,
      verifyRetainedPins,
    );
    publicationJournalBinding = journalBinding;
    const pendingBinding = await readBoundRegularFile(
      publicationJournalTemporaryPath,
      verifyRetainedPins,
    );
    if (
      journalBinding.digest !== pendingBinding.digest ||
      !sameFileIdentity(
        pendingBinding.entry,
        journalBinding.identity,
      )
    ) {
      throw new Error("publication journal pending ownership changed");
    }
    await verifyRetainedPins();
    await unlink(publicationJournalTemporaryPath);
    await invokePublicationFaultHook("journal-pending-cleaned");
    publicationJournalTemporaryPath = null;
    publicationJournalTemporaryBinding = null;

    const views = publicViews(publicConfig);
    await publishPublicViews(views);
    await verifyRetainedPins();
    if (process.platform === "win32") {
      await stagingIdentityPin.publishPrivate();
    } else {
      await directoryRenameNoReplace(stagingDirectory, privateDirectory);
      await stagingIdentityPin.verifyPublished(privateDirectory, 1);
    }
    stagingDirectory = null;
    privatePublished = true;
    await verifyPublishedPrivateIdentity(publicConfig, pinnedDevnetReal);
    await invokePublicationFaultHook("private-published");
    await finalizePublicationFiles(views);

    const result = {
      canonicalPublicJson,
      publicConfig,
      repositoryRoot: root,
    };
    await stagingIdentityPin.release();
    stagingIdentityPin = null;
    await parentIdentityPin.release();
    parentIdentityPin = null;
    return result;
  } catch (error) {
    const cleanupErrors = [];
    if (publicationRecoveryActive && publicationJournal) {
      if (!privatePublished) {
        try {
          await rollbackPublicViews(publicViews(publicationJournal.publicConfig));
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (stagingIdentityPin) {
        try {
          await releaseStagingPin();
          stagingIdentityPin = null;
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
      const retainedLocation = privatePublished
        ? privateDirectory
        : stagingDirectory;
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          `protected incomplete staging retained at ${retainedLocation}; recoverable publication ownership hard stop; rollback or pin release failed`,
        );
      }
      throw new Error(
        `protected incomplete staging retained at ${retainedLocation}; recoverable publication retained; retry generation to resume: ${error.message}`,
        { cause: error },
      );
    }
    if (
      privateHandleCreated &&
      stagingDirectory &&
      stagingIdentityPin &&
      parentIdentityPin
    ) {
      try {
        await invokeStagingHandoffHook("cleanup");
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      for (const cleanup of [
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
        () =>
          cleanupOwnedTemporaryFile(
            javascriptTemporaryPath,
            javascriptConfigPath,
            verifyParentPin,
          ),
        () =>
          cleanupOwnedTemporaryFile(
            publicBackupPath,
            publicConfigPath,
            verifyParentPin,
          ),
        () =>
          cleanupOwnedTemporaryFile(
            rustBackupPath,
            rustConfigPath,
            verifyParentPin,
          ),
        () =>
          cleanupOwnedTemporaryFile(
            javascriptBackupPath,
            javascriptConfigPath,
            verifyParentPin,
          ),
        () =>
          cleanupBoundSidecar(
            publicationJournalTemporaryPath,
            publicationJournalTemporaryBinding,
            verifyParentPin,
          ),
      ]) {
        try {
          await cleanup();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      try {
        await releaseStagingPin();
        stagingIdentityPin = null;
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      try {
        await parentIdentityPin.release();
        parentIdentityPin = null;
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      throw new Error(
        `devnet release generation failed; protected incomplete staging retained at ${stagingDirectory}; explicit recovery required`,
      );
    }
    const removeEmptyWindowsStage =
      process.platform === "win32" &&
      !privateHandleCreated &&
      stagingDirectory &&
      stagingIdentityPin &&
      parentIdentityPin;
    if (removeEmptyWindowsStage) {
      try {
        await invokeStagingHandoffHook("empty-cleanup");
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
      try {
        await stagingIdentityPin.removeEmpty();
        stagingPinReleased = true;
        stagingIdentityPin = null;
        stagingDirectory = null;
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (stagingIdentityPin) {
      try {
        await releaseStagingPin();
        if (process.platform === "win32") {
          stagingIdentityPin = null;
        }
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    const cleanups = [
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
      () =>
        cleanupOwnedTemporaryFile(
          javascriptTemporaryPath,
          javascriptConfigPath,
          verifyParentPin,
        ),
      () =>
        cleanupOwnedTemporaryFile(
          publicBackupPath,
          publicConfigPath,
          verifyParentPin,
        ),
      () =>
        cleanupOwnedTemporaryFile(
          rustBackupPath,
          rustConfigPath,
          verifyParentPin,
        ),
      () =>
        cleanupOwnedTemporaryFile(
          javascriptBackupPath,
          javascriptConfigPath,
          verifyParentPin,
        ),
      () =>
        cleanupBoundSidecar(
          publicationJournalTemporaryPath,
          publicationJournalTemporaryBinding,
          verifyParentPin,
        ),
    ];
    if (process.platform !== "win32") {
      cleanups.unshift(() =>
        cleanupOwnedStage(
          stagingDirectory,
          devnetDirectory,
          stagingIdentityPin,
          parentIdentityPin,
        ),
      );
    }
    for (const cleanup of cleanups) {
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
