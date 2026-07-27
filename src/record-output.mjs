import { randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { validateUnavailablePublication } from "./canonical-proof.mjs";
import { validateLaunchRecord } from "./legacy-launch-v2-policy.mjs";

function canonicalLaunchBytes(record) {
  return Buffer.from(`${JSON.stringify(record, null, 2)}\n`, "utf8");
}

async function removeOwnedTemporaryFile(temporaryPath, unlinkImpl) {
  try {
    await unlinkImpl(temporaryPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function writeBytesAtomic(targetPath, bytes, {
  openImpl = open,
  renameImpl = rename,
  unlinkImpl = unlink,
  randomUUIDImpl = randomUUID,
} = {}) {
  if (typeof targetPath !== "string" || !path.isAbsolute(targetPath)
    || !(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error("atomic-write-invalid");
  }
  const exactBytes = Buffer.from(bytes);
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${randomUUIDImpl()}.tmp`,
  );
  let handle;
  let ownsTemporaryPath = false;
  try {
    handle = await openImpl(temporaryPath, "wx", 0o600);
    ownsTemporaryPath = true;
    await handle.writeFile(exactBytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await renameImpl(temporaryPath, targetPath);
    ownsTemporaryPath = false;
    return { committed: true, warning: null, bytes: exactBytes };
  } catch (error) {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {
        // Cleanup below still removes the exclusively owned path when possible.
      }
    }
    if (ownsTemporaryPath) {
      try {
        await removeOwnedTemporaryFile(temporaryPath, unlinkImpl);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `${error instanceof Error ? error.message : String(error)}; temporary-file cleanup failed`,
        );
      }
    }
    throw error;
  }
}

export async function publishLaunchRecord(targetPath, record, dependencies = {}) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`launch-record-invalid: ${issues.join("; ")}`);
  return writeBytesAtomic(targetPath, canonicalLaunchBytes(record), dependencies);
}

function receiptError() {
  return new Error("receipt-publication");
}

async function readExistingReceipt(targetPath, readFileImpl) {
  try {
    return await readFileImpl(targetPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw receiptError();
  }
}

async function publishAppendOnlyReceipt(targetPath, bytes, {
  fileSystem,
  randomUUIDImpl,
}) {
  try {
    await fileSystem.mkdir(path.dirname(targetPath), { recursive: true });
  } catch {
    throw receiptError();
  }
  const existing = await readExistingReceipt(targetPath, fileSystem.readFile);
  if (existing !== null) {
    if (!Buffer.from(existing).equals(bytes)) throw receiptError();
    return { outputPath: targetPath, warnings: [] };
  }

  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${randomUUIDImpl()}.tmp`,
  );
  let handle;
  let ownsTemporaryPath = false;
  let committed = false;
  try {
    handle = await fileSystem.open(temporaryPath, "wx", 0o600);
    ownsTemporaryPath = true;
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fileSystem.link(temporaryPath, targetPath);
    committed = true;
    const observed = await fileSystem.readFile(targetPath);
    if (!Buffer.from(observed).equals(bytes)) throw receiptError();
  } catch (error) {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {
        // The exclusively owned path is still cleaned below when possible.
      }
    }
    if (!committed && error?.code === "EEXIST") {
      const raced = await readExistingReceipt(targetPath, fileSystem.readFile);
      if (raced !== null && Buffer.from(raced).equals(bytes)) committed = true;
    }
    if (!committed && ownsTemporaryPath) {
      try {
        await fileSystem.unlink(temporaryPath);
      } catch {
        // Keep the primary fixed publication error and never touch an unowned path.
      }
    }
    if (!committed) throw receiptError();
  }

  const warnings = [];
  if (ownsTemporaryPath) {
    try {
      await fileSystem.unlink(temporaryPath);
    } catch {
      warnings.push({
        code: "RECEIPT_TEMP_UNLINK_FAILED",
        message: "Unavailable record is committed. Do not retry publication.",
        temporaryPath,
      });
    }
  }
  return { outputPath: targetPath, warnings };
}

export async function publishUnavailableRecord({
  targetPath,
  record,
  stageReceipt,
  continuityReceipt,
  artifactsRoot,
  fileSystem: suppliedFileSystem = {},
  randomUUIDImpl = randomUUID,
  publishLaunchRecordImpl = publishLaunchRecord,
}) {
  const issues = validateUnavailablePublication({ record, stageReceipt, continuityReceipt });
  if (issues.length) throw new Error("unavailable-publication-invalid");
  if (typeof targetPath !== "string"
    || !path.isAbsolute(targetPath)
    || typeof artifactsRoot !== "string"
    || !path.isAbsolute(artifactsRoot)
    || typeof randomUUIDImpl !== "function"
    || typeof publishLaunchRecordImpl !== "function") {
    throw new Error("unavailable-publication-invalid");
  }
  const fileSystem = {
    link: suppliedFileSystem.link ?? link,
    mkdir: suppliedFileSystem.mkdir ?? mkdir,
    open: suppliedFileSystem.open ?? open,
    readFile: suppliedFileSystem.readFile ?? readFile,
    unlink: suppliedFileSystem.unlink ?? unlink,
  };
  const stageReceiptPath = path.join(
    artifactsRoot,
    "launch",
    "stage-receipts",
    `${continuityReceipt.stageReceiptSha256}.json`,
  );
  const continuityReceiptPath = path.join(
    artifactsRoot,
    "launch",
    "unavailable-continuity",
    `${continuityReceipt.publicRecordSha256}.json`,
  );
  const stageResult = await publishAppendOnlyReceipt(
    stageReceiptPath,
    canonicalLaunchBytes(stageReceipt),
    { fileSystem, randomUUIDImpl },
  );
  const continuityResult = await publishAppendOnlyReceipt(
    continuityReceiptPath,
    canonicalLaunchBytes(continuityReceipt),
    { fileSystem, randomUUIDImpl },
  );
  const publicResult = await publishLaunchRecordImpl(targetPath, record);
  return {
    committed: publicResult?.committed === true,
    stageReceiptPath,
    continuityReceiptPath,
    warnings: [
      ...stageResult.warnings,
      ...continuityResult.warnings,
      ...(publicResult?.warning ? [publicResult.warning] : []),
    ],
  };
}
