import { randomUUID } from "node:crypto";
import {
  open,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

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

export async function publishLaunchRecord(targetPath, record, {
  openImpl = open,
  renameImpl = rename,
  unlinkImpl = unlink,
  randomUUIDImpl = randomUUID,
} = {}) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`launch-record-invalid: ${issues.join("; ")}`);

  const bytes = canonicalLaunchBytes(record);
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${randomUUIDImpl()}.tmp`,
  );
  let handle;
  let ownsTemporaryPath = false;
  try {
    handle = await openImpl(temporaryPath, "wx", 0o600);
    ownsTemporaryPath = true;
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await renameImpl(temporaryPath, targetPath);
    ownsTemporaryPath = false;
    return { committed: true, warning: null, bytes };
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
