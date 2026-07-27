import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  INDEPENDENT_AUTHORITIES_PATH,
  INDEPENDENT_DESIGN_SPEC_PATH,
  INDEPENDENT_VECTOR_PATH,
  INDEPENDENT_VECTOR_SIDECAR_PATH,
  buildIndependentScopeV1,
  parseIndependentScopeOptions,
} from "../src/independent-scope.mjs";
import { resolveRepositoryPath } from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(
  new URL("../", import.meta.url),
);

function defaultGit(args, repositoryRoot) {
  const result = spawnSync("rtk", ["git", ...args], {
    cwd: repositoryRoot,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: Buffer.from(result.stdout ?? []),
    stderr: Buffer.from(result.stderr ?? []),
  };
}

function runGit(gitImpl, repositoryRoot, args) {
  const result = gitImpl(args, repositoryRoot);
  if (
    result?.status !== 0 ||
    !(result.stdout instanceof Uint8Array) ||
    !(result.stderr instanceof Uint8Array)
  ) {
    throw new Error("independent scope git command failed");
  }
  return Buffer.from(result.stdout);
}

export async function runIndependentScopeBuild({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  gitImpl = defaultGit,
} = {}) {
  const options = parseIndependentScopeOptions(argv);
  const outputRoot = await resolveRepositoryPath(
    repositoryRoot,
    options.outputRoot,
  );
  if (await lstat(outputRoot).catch(error => {
    if (error?.code === "ENOENT") return null;
    throw error;
  })) {
    throw new Error("scope output already exists");
  }
  const gitStatus = runGit(
    gitImpl,
    repositoryRoot,
    ["status", "--porcelain=v1", "--untracked-files=all"],
  ).toString("utf8");
  const sourceCommit = runGit(
    gitImpl,
    repositoryRoot,
    ["rev-parse", "HEAD"],
  ).toString("utf8").trim();
  const sourceArchiveBytes = runGit(
    gitImpl,
    repositoryRoot,
    ["archive", "--format=tar", "HEAD"],
  );
  const fixedPaths = [
    INDEPENDENT_AUTHORITIES_PATH,
    "Cargo.lock",
    "config/hakky-release-v1.json",
    INDEPENDENT_DESIGN_SPEC_PATH,
    INDEPENDENT_VECTOR_PATH,
    INDEPENDENT_VECTOR_SIDECAR_PATH,
    options.candidatePath,
    options.buildRecordPath,
  ];
  const [
    authorityRegistryBytes,
    cargoLockBytes,
    releaseConfigBytes,
    designSpecBytes,
    curveVectorBytes,
    curveVectorSidecarBytes,
    candidateBytes,
    buildRecordBytes,
  ] = await Promise.all(
    fixedPaths.map(async relativePath =>
      readFile(await resolveRepositoryPath(repositoryRoot, relativePath)),
    ),
  );
  const result = buildIndependentScopeV1({
    evidenceClass: options.evidenceClass,
    authorityRegistryBytes,
    candidateBytes,
    sourceArchiveBytes,
    cargoLockBytes,
    releaseConfigBytes,
    designSpecBytes,
    curveVectorBytes,
    curveVectorSidecarBytes,
    buildRecordBytes,
    sourceCommit,
    gitStatus,
  });
  await mkdir(path.dirname(outputRoot), { recursive: true });
  await mkdir(outputRoot);
  await Promise.all([
    writeFile(
      path.join(outputRoot, "scope.json"),
      result.scopeBytes,
      { flag: "wx", mode: 0o600 },
    ),
    writeFile(
      path.join(outputRoot, "source.tar"),
      sourceArchiveBytes,
      { flag: "wx", mode: 0o600 },
    ),
  ]);
  return result;
}

export async function main({
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const result = await runIndependentScopeBuild();
    stdout.write(
      `${JSON.stringify({
        scope: result.scope,
        scopeSha256: result.scopeSha256,
        mainnetActionsAuthorized: false,
      }, null, 2)}\n`,
    );
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Independent scope build failed"}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
