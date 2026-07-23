import { constants as fsConstants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

function publicationError(code = "PUBLICATION_ERROR") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function samePath(left, right) {
  const normalize = (value) => {
    const result = path.normalize(path.resolve(value));
    return process.platform === "win32" ? result.toLowerCase() : result;
  };
  return normalize(left) === normalize(right);
}

function unsafe(stats) {
  return !stats || stats.isSymbolicLink() || stats.isReparsePoint?.() === true;
}

function identity(stats) {
  if (unsafe(stats) || !stats.isFile()) throw publicationError();
  const part = (value) => {
    if (typeof value === "bigint" && value >= 0n) return value.toString();
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) return String(value);
    throw publicationError();
  };
  return `${part(stats.dev)}:${part(stats.ino)}`;
}

function exactSize(stats, size) {
  if (!((typeof stats.size === "bigint" && stats.size === BigInt(size))
    || (typeof stats.size === "number" && Number.isInteger(stats.size) && stats.size === size))) {
    throw publicationError();
  }
}

async function exactDirectory(candidate, fileSystem) {
  const stats = await fileSystem.lstat(candidate);
  if (unsafe(stats) || !stats.isDirectory()) throw publicationError();
  const resolved = await fileSystem.realpath(candidate);
  if (!samePath(candidate, resolved)) throw publicationError();
}

async function exactFile(candidate, fileSystem) {
  const stats = await fileSystem.lstat(candidate);
  if (unsafe(stats) || !stats.isFile()) throw publicationError();
  const resolved = await fileSystem.realpath(candidate);
  if (!samePath(candidate, resolved)) throw publicationError();
  return stats;
}

async function assertParents(repositoryRoot, proofDirectory, fileSystem) {
  if (!samePath(path.dirname(proofDirectory), repositoryRoot)
    || path.basename(proofDirectory) !== "proof") throw publicationError();
  await exactDirectory(repositoryRoot, fileSystem);
  await exactDirectory(proofDirectory, fileSystem);
}

async function assertAbsent(candidate, fileSystem) {
  try {
    await fileSystem.lstat(candidate);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw publicationError();
  }
  const error = publicationError("EEXIST");
  error.code = "EEXIST";
  throw error;
}

async function assertBound(candidate, expectedBytes, expectedIdentity, fileSystem) {
  const before = await exactFile(candidate, fileSystem);
  const beforeIdentity = identity(before);
  exactSize(before, expectedBytes.length);
  let observed;
  try {
    observed = await fileSystem.readFile(candidate);
  } catch {
    throw publicationError();
  }
  const after = await exactFile(candidate, fileSystem);
  const afterIdentity = identity(after);
  exactSize(after, expectedBytes.length);
  if (!(observed instanceof Uint8Array) || !Buffer.from(observed).equals(expectedBytes)
    || beforeIdentity !== afterIdentity || afterIdentity !== expectedIdentity) throw publicationError();
}

async function cleanupOwnedTemp(tempPath, expectedIdentity, fileSystem) {
  if (!expectedIdentity) return "not-owned";
  let stats;
  try {
    stats = await exactFile(tempPath, fileSystem);
  } catch (error) {
    if (error?.code === "ENOENT") return "already-absent";
    throw error;
  }
  if (identity(stats) !== expectedIdentity) throw publicationError();
  try {
    stats = await fileSystem.lstat(tempPath);
  } catch (error) {
    if (error?.code === "ENOENT") return "already-absent";
    throw publicationError();
  }
  if (identity(stats) !== expectedIdentity) throw publicationError();
  try {
    await fileSystem.unlink(tempPath);
  } catch (error) {
    if (error?.code === "ENOENT") return "already-absent";
    throw publicationError();
  }
  return "removed";
}

export function resolveCanonicalMintProofPath({ repositoryRoot = process.cwd() } = {}) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) {
    throw new Error("repositoryRoot must be absolute");
  }
  return path.join(path.resolve(repositoryRoot), "proof", "mainnet-mint.json");
}

export async function publishJsonProof(outputPath, proof, {
  repositoryRoot = path.dirname(path.dirname(outputPath)),
  fileSystem = {},
  randomUUIDImpl = randomUUID,
} = {}) {
  const fs = {
    link: fileSystem.link ?? link,
    lstat: fileSystem.lstat ?? lstat,
    mkdir: fileSystem.mkdir ?? mkdir,
    open: fileSystem.open ?? open,
    readFile: fileSystem.readFile ?? readFile,
    realpath: fileSystem.realpath ?? realpath,
    unlink: fileSystem.unlink ?? unlink,
  };
  const root = path.resolve(repositoryRoot);
  const proofDirectory = path.join(root, "proof");
  const canonicalOutput = path.join(proofDirectory, "mainnet-mint.json");
  if (!path.isAbsolute(repositoryRoot) || !samePath(outputPath, canonicalOutput)) throw publicationError();
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) throw publicationError();
  if (typeof randomUUIDImpl !== "function") throw publicationError();
  try {
    await exactDirectory(root, fs);
    try {
      await fs.mkdir(proofDirectory);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    await assertParents(root, proofDirectory, fs);
  } catch {
    throw publicationError();
  }

  const bytes = Buffer.from(`${JSON.stringify(proof, null, 2)}\n`, "utf8");
  const tempPath = path.join(proofDirectory, `.mainnet-mint.${randomUUIDImpl()}.tmp`);
  let handle;
  let ownedIdentity;
  let committed = false;
  let linking = false;
  try {
    await assertParents(root, proofDirectory, fs);
    await assertAbsent(canonicalOutput, fs);
    handle = await fs.open(
      tempPath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL,
      0o600,
    );
    if (typeof handle?.stat !== "function" || typeof handle?.writeFile !== "function"
      || typeof handle?.sync !== "function" || typeof handle?.close !== "function") throw publicationError();
    const opened = await handle.stat();
    ownedIdentity = identity(opened);
    exactSize(opened, 0);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await assertParents(root, proofDirectory, fs);
    await assertAbsent(canonicalOutput, fs);
    await assertBound(tempPath, bytes, ownedIdentity, fs);
    linking = true;
    await fs.link(tempPath, canonicalOutput);
    committed = true;
    await assertParents(root, proofDirectory, fs);
    await assertBound(tempPath, bytes, ownedIdentity, fs);
    await assertBound(canonicalOutput, bytes, ownedIdentity, fs);
  } catch (error) {
    try {
      await handle?.close?.();
      if (!committed && ownedIdentity) {
        await assertParents(root, proofDirectory, fs);
        await cleanupOwnedTemp(tempPath, ownedIdentity, fs);
      }
    } catch {
      // Preserve the fixed primary result and never unlink an unowned path.
    }
    if (error?.code === "EEXIST" || (linking && error?.code === "EEXIST")) throw error;
    throw publicationError();
  }

  let cleanupFailed = false;
  try {
    await cleanupOwnedTemp(tempPath, ownedIdentity, fs);
  } catch {
    cleanupFailed = true;
  }
  await assertParents(root, proofDirectory, fs);
  await assertBound(canonicalOutput, bytes, ownedIdentity, fs);
  if (cleanupFailed) await assertBound(tempPath, bytes, ownedIdentity, fs);
  else await assertAbsent(tempPath, fs);

  const warnings = cleanupFailed
    ? [Object.freeze({
      code: "TEMP_UNLINK_FAILED",
      message: "Proof is committed. Do not retry publication.",
      temporaryPath: tempPath,
    })]
    : [];
  return Object.freeze({
    published: true,
    outputPath: canonicalOutput,
    warnings: Object.freeze(warnings),
  });
}
