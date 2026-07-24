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
  { holdOpen = false, createStaging = null } = {},
) {
  const encodedPaths = paths
    .map(
      (candidate) =>
        `'${Buffer.from(candidate, "utf8").toString("base64")}'`,
    )
    .join(", ");
  const createRootIndex = createStaging?.rootIndex ?? -1;
  const encodedPrivatePath = createStaging
    ? Buffer.from(createStaging.destination, "utf8").toString("base64")
    : "";
  return `
Add-Type -TypeDefinition @'
${WINDOWS_PIN_TYPE}
'@
$encodedPaths = @(${encodedPaths})
$createRootIndex = ${createRootIndex}
$privatePath = ${
    createStaging
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
      $false,
      $index -eq $createRootIndex
    )
    [void]$pins.Add($pin)
    $identities += $pin.Identity
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
  { createStaging } = {},
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
      if (!createStaging) {
        throw new Error(`${label} identity pin cannot create staging`);
      }
      if (stagingFacade) {
        throw new Error(`${label} staging identity is already retained`);
      }
      const response = await sendCommand(
        "CREATE_STAGING",
        Buffer.from(stagingName, "utf8").toString("base64"),
      );
      const expectedPath = path.join(
        retainedPaths[createStaging.rootIndex],
        stagingName,
      );
      const stagingIndex = identities.length;
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
  beforeKeyGenerationHook,
  beforeSecretFirstByteHook,
  preParentPinHook,
  preStagingCreateHook,
  postValidationHook,
  postSecretFileWriteHook,
  postStagingPinReleaseHook,
}) {
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
  const incompleteStagingName = (await readdir(devnetDirectory))
    .filter((entry) => entry.startsWith(".private-stage-"))
    .sort()[0];
  if (incompleteStagingName) {
    throw new Error(
      `protected incomplete staging retained at ${path.join(
        devnetDirectory,
        incompleteStagingName,
      )}; explicit recovery required`,
    );
  }

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
  let privateHandleCreated = false;
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

  try {
    parentIdentityPin = await createDirectoryIdentityPin(
      parentPaths,
      "parent",
      process.platform === "win32"
        ? {
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
    await invokeStagingHandoffHook("publication");
    await verifyRetainedPins();
    if (process.platform === "win32") {
      await stagingIdentityPin.publishPrivate();
    } else {
      await directoryRenameNoReplace(stagingDirectory, privateDirectory);
      await stagingIdentityPin.verifyPublished(privateDirectory, 1);
    }
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
    await stagingIdentityPin.release();
    stagingIdentityPin = null;
    await parentIdentityPin.release();
    parentIdentityPin = null;
    return result;
  } catch (error) {
    const cleanupErrors = [];
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
