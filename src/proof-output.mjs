import { link, mkdir, open, rm } from "node:fs/promises";
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

export async function publishJsonProof(outputPath, proof) {
  const directory = path.dirname(outputPath);
  const contents = `${JSON.stringify(proof, null, 2)}\n`;
  const temporaryPath = path.join(directory, `.${path.basename(outputPath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    await mkdir(directory, { recursive: true });
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(temporaryPath, outputPath);
  } finally {
    if (handle) await handle.close();
    await rm(temporaryPath, { force: true });
  }
}
