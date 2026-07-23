import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod } from "node:fs/promises";
import { promisify } from "node:util";

export const INSTANCE_DOMAIN = "HAKKY_INSTANCE_V1";
export const METADATA_URI = "https://hakky.xyz/metadata/hakky-v1.json";
const execFileAsync = promisify(execFile);

async function restrictWindowsAcl(privatePath, permissions) {
  const username = process.env.USERNAME;
  if (!username) {
    throw new Error("USERNAME is required to restrict private files on Windows");
  }
  const identity = process.env.USERDOMAIN
    ? `${process.env.USERDOMAIN}\\${username}`
    : username;
  await execFileAsync(
    "icacls",
    [
      privatePath,
      "/inheritance:r",
      "/grant:r",
      `${identity}:${permissions}`,
      `*S-1-5-18:${permissions}`,
      `*S-1-5-32-544:${permissions}`,
    ],
    { windowsHide: true },
  );
}

export async function restrictPrivateDirectory(directory) {
  await chmod(directory, 0o700);
  if (process.platform === "win32") {
    await restrictWindowsAcl(directory, "(OI)(CI)F");
  }
}

export async function restrictPrivateFile(filePath) {
  await chmod(filePath, 0o600);
  if (process.platform === "win32") {
    await restrictWindowsAcl(filePath, "F");
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
