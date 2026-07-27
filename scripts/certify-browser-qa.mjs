import { execFile } from "node:child_process";
import {
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BROWSER_QA_BASE_URL,
  BROWSER_QA_OBSERVATION_PATH,
  BROWSER_QA_RECEIPT_PATH,
  BROWSER_QA_SCHEMA_VERSION,
  assertBrowserObservationV1,
  serializeBrowserQaReceiptV1,
} from "../src/browser-qa.mjs";
import {
  resolveRepositoryPath,
  sha256Hex,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(
  new URL("../", import.meta.url),
);
const execFileAsync = promisify(execFile);
const SITE_FILES = Object.freeze([
  "web/app.js",
  "web/data/launch.json",
  "web/index.html",
  "web/styles.css",
]);

async function hashRepositoryFile(repositoryRoot, relativePath) {
  const absolutePath = await resolveRepositoryPath(
    repositoryRoot,
    relativePath,
  );
  const bytes = await readFile(absolutePath);
  if (bytes.byteLength === 0) {
    throw new Error("browser-qa-empty-file");
  }
  return {
    path: relativePath,
    byteLength: bytes.byteLength,
    sha256: sha256Hex(bytes),
  };
}

async function currentSourceCommit(repositoryRoot) {
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: repositoryRoot, windowsHide: true },
  );
  return stdout.trim();
}

export async function runBrowserQaCertification({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  sourceCommit,
  now = () => new Date(),
} = {}) {
  const observationPath = await resolveRepositoryPath(
    repositoryRoot,
    BROWSER_QA_OBSERVATION_PATH,
  );
  let observation;
  try {
    observation = JSON.parse(await readFile(observationPath, "utf8"));
  } catch {
    throw new Error("browser-qa-observation-invalid");
  }
  assertBrowserObservationV1(observation);

  const resolvedCommit =
    sourceCommit ?? await currentSourceCommit(repositoryRoot);
  const siteFiles = await Promise.all(
    SITE_FILES.map(relativePath =>
      hashRepositoryFile(repositoryRoot, relativePath),
    ),
  );
  const viewports = await Promise.all(
    observation.viewports.map(async (viewport) => {
      const screenshot = await hashRepositoryFile(
        repositoryRoot,
        `artifacts/qa/browser-qa-${viewport.id}.png`,
      );
      const { flowDisclosureVisible: _flowDisclosureVisible, ...result } =
        viewport;
      return { ...result, screenshot };
    }),
  );
  const receipt = {
    schemaVersion: BROWSER_QA_SCHEMA_VERSION,
    sourceCommit: resolvedCommit,
    baseUrl: BROWSER_QA_BASE_URL,
    siteFiles,
    viewports,
    prelaunchControls: {
      flowDisclosureVisible: true,
      walletControlsPresent: false,
      transactionControlsPresent: false,
      automaticSignature: false,
      automaticSend: false,
      automaticRetry: false,
    },
    verifiedAt: now().toISOString(),
    mainnetActionsAuthorized: false,
  };
  const bytes = serializeBrowserQaReceiptV1(receipt);
  const outputPath = await resolveRepositoryPath(
    repositoryRoot,
    BROWSER_QA_RECEIPT_PATH,
  );
  await writeFile(outputPath, bytes);
  const observed = await readFile(outputPath);
  if (!Buffer.from(observed).equals(bytes)) {
    throw new Error("browser-qa-receipt-write-failed");
  }
  return receipt;
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    if (argv.length !== 0) throw new Error("Usage: npm run qa:browser:certify");
    const receipt = await runBrowserQaCertification();
    stdout.write(serializeBrowserQaReceiptV1(receipt));
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Browser QA certification failed"}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
