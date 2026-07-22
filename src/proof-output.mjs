import { link, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function resolveProofOutputPath(outputPath, { cwd = process.cwd() } = {}) {
  const proofDirectory = path.resolve(cwd, "proof");
  const resolvedPath = path.resolve(cwd, outputPath);
  const relativePath = path.relative(proofDirectory, resolvedPath);
  if (
    relativePath === ""
    || relativePath === ".."
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    throw new Error("--out must resolve below proof/");
  }
  if (path.extname(resolvedPath) !== ".json") throw new Error("--out must name a .json file");
  return resolvedPath;
}

export async function publishJsonProof(outputPath, proof, {
  linkImpl = link,
  mkdirImpl = mkdir,
  openImpl = open,
  randomUUIDImpl = randomUUID,
  unlinkImpl = unlink,
} = {}) {
  const directory = path.dirname(outputPath);
  const contents = `${JSON.stringify(proof, null, 2)}\n`;
  const temporaryPath = path.join(directory, `.${path.basename(outputPath)}.${randomUUIDImpl()}.tmp`);
  let handle;
  let operationError;
  let ownsTemporaryPath = false;
  let published = false;
  try {
    await mkdirImpl(directory, { recursive: true });
    handle = await openImpl(temporaryPath, "wx", 0o600);
    ownsTemporaryPath = true;
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await linkImpl(temporaryPath, outputPath);
    published = true;
  } catch (error) {
    operationError = error;
  }

  if (handle) {
    try {
      await handle.close();
    } catch (error) {
      operationError ??= error;
    }
  }

  let unlinkError;
  if (ownsTemporaryPath) {
    try {
      await unlinkImpl(temporaryPath);
    } catch (error) {
      if (error?.code !== "ENOENT") unlinkError = error;
    }
  }

  if (operationError) throw operationError;
  if (!published) throw unlinkError ?? new Error("Proof publication did not reach the hard-link commit point");

  const warnings = unlinkError ? [{
    code: "TEMP_UNLINK_FAILED",
    message: "Proof is published. Temporary cleanup failed. Do not retry publication. Remove only the owned temporary file shown in this warning.",
    temporaryPath,
  }] : [];
  return { published: true, outputPath, warnings };
}
