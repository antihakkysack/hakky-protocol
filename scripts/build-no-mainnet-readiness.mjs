import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildNoMainnetReadinessV1,
  serializeNoMainnetReadinessV1,
} from "../src/no-mainnet-readiness.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const EVIDENCE_ROOT = "artifacts/independent-evidence";
const OUTPUT_PATH = "artifacts/readiness/no-mainnet-v1.json";
const USAGE =
  "Usage: npm run readiness:no-mainnet -- --build artifacts/build/candidate/<id> --evidence-root artifacts/independent-evidence --output artifacts/readiness/no-mainnet-v1.json";
const REQUIRED_OPERATOR_DOCUMENTS = Object.freeze([
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/LAUNCH.md",
  "docs/TOKEN.md",
  "proof/README.md",
  "launch/README.md",
  "docs/MAINNET-NO-GO-CHECKLIST.md",
]);

function normalizeCandidateBuildDirectory(value) {
  if (
    typeof value !== "string" ||
    !/^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u.test(value)
  ) {
    throw new Error(USAGE);
  }
  return value;
}

export function parseNoMainnetReadinessOptions(argv = process.argv.slice(2)) {
  if (argv.length !== 6) throw new Error(USAGE);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      !["--build", "--evidence-root", "--output"].includes(flag) ||
      typeof value !== "string" ||
      values.has(flag)
    ) {
      throw new Error(USAGE);
    }
    values.set(flag, value);
  }
  const buildDirectory = normalizeCandidateBuildDirectory(
    values.get("--build"),
  );
  if (
    values.get("--evidence-root") !== EVIDENCE_ROOT ||
    values.get("--output") !== OUTPUT_PATH
  ) {
    throw new Error(USAGE);
  }
  return {
    buildDirectory,
    evidenceRoot: EVIDENCE_ROOT,
    outputPath: OUTPUT_PATH,
  };
}

function resolveContained(repositoryRoot, relativePath) {
  const root = path.resolve(repositoryRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("readiness path escaped the repository");
  }
  return absolute;
}

async function readOptional(repositoryRoot, relativePath) {
  try {
    return await readFile(resolveContained(repositoryRoot, relativePath));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function parseRequiredJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export async function runNoMainnetReadiness({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  buildDirectory,
  evidenceRoot = EVIDENCE_ROOT,
  outputPath = OUTPUT_PATH,
  now = () => new Date(),
} = {}) {
  const root = path.resolve(repositoryRoot);
  const normalizedBuildDirectory =
    normalizeCandidateBuildDirectory(buildDirectory);
  if (evidenceRoot !== EVIDENCE_ROOT || outputPath !== OUTPUT_PATH) {
    throw new Error(USAGE);
  }

  const buildRecordPath =
    `${normalizedBuildDirectory}/build-record.json`;
  const candidatePath = `${normalizedBuildDirectory}/hakky_market.so`;
  const reproductionPath =
    "artifacts/build/candidate/reproduction-v1.json";
  const reproductionReceiptBytes = await readFile(
    resolveContained(root, reproductionPath),
  );
  const reproductionReceipt = parseRequiredJson(
    reproductionReceiptBytes,
    reproductionPath,
  );
  const rightBuildDirectory = reproductionReceipt?.right?.buildDirectory;
  if (
    reproductionReceipt?.left?.buildDirectory !==
      normalizedBuildDirectory ||
    typeof rightBuildDirectory !== "string" ||
    rightBuildDirectory === normalizedBuildDirectory ||
    !/^artifacts\/build\/candidate\/[a-z0-9][a-z0-9-]*$/u.test(
      rightBuildDirectory,
    )
  ) {
    throw new Error("reproduction receipt does not identify the selected build pair");
  }

  const operatorDocuments = await Promise.all(
    REQUIRED_OPERATOR_DOCUMENTS.map(async (documentPath) => ({
      path: documentPath,
      bytes: await readFile(resolveContained(root, documentPath)),
    })),
  );
  const input = {
    generatedAt: now().toISOString(),
    buildDirectory: normalizedBuildDirectory,
    buildRecordBytes: await readFile(
      resolveContained(root, buildRecordPath),
    ),
    candidateBytes: await readFile(resolveContained(root, candidatePath)),
    rightBuildRecordBytes: await readFile(
      resolveContained(root, `${rightBuildDirectory}/build-record.json`),
    ),
    rightCandidateBytes: await readFile(
      resolveContained(root, `${rightBuildDirectory}/hakky_market.so`),
    ),
    reproductionReceiptBytes,
    runtimeReceiptBytes: await readOptional(
      root,
      `${normalizedBuildDirectory}/runtime-receipt.json`,
    ),
    costLedgerBytes: await readOptional(
      root,
      "artifacts/cost/cost-ledger-v1.json",
    ),
    browserQaReceiptBytes: await readOptional(
      root,
      "artifacts/qa/browser-qa-v1.json",
    ),
    independentAuthoritiesBytes: await readFile(
      resolveContained(
        root,
        "config/independent-evidence-authorities-v1.json",
      ),
    ),
    independentScopeBytes: {
      securityAudit: await readOptional(
        root,
        `${evidenceRoot}/scopes/security-audit/scope.json`,
      ),
      economicReview: await readOptional(
        root,
        `${evidenceRoot}/scopes/economic-review/scope.json`,
      ),
      independentReproduction: await readOptional(
        root,
        `${evidenceRoot}/scopes/independent-reproduction/scope.json`,
      ),
    },
    optionalEvidenceBytes: {
      fullSuite: await readOptional(
        root,
        "artifacts/verify/final-suite-v1.json",
      ),
      metaplexPrefund: await readOptional(
        root,
        "artifacts/verify/metaplex-prefund-v1.json",
      ),
      devnetLifecycle: await readOptional(
        root,
        "artifacts/devnet-rehearsal/proof.json",
      ),
      imageIpfs: await readOptional(
        root,
        "artifacts/ipfs/image-ipfs-v1.json",
      ),
      metadataManifest: await readOptional(
        root,
        "artifacts/metadata/manifest.json",
      ),
      metadataReadback: await readOptional(
        root,
        "artifacts/metadata/readback.json",
      ),
      securityAudit: await readOptional(
        root,
        `${evidenceRoot}/security-audit/result.json`,
      ),
      economicReview: await readOptional(
        root,
        `${evidenceRoot}/economic-review/result.json`,
      ),
      independentReproduction: await readOptional(
        root,
        `${evidenceRoot}/independent-reproduction/result.json`,
      ),
      findingResolution: await readOptional(
        root,
        `${evidenceRoot}/findings/resolution.json`,
      ),
    },
    operatorDocuments,
  };
  const report = buildNoMainnetReadinessV1(input);
  const bytes = serializeNoMainnetReadinessV1(report);
  const absoluteOutput = resolveContained(root, outputPath);
  const outputDirectory = path.dirname(absoluteOutput);
  const temporaryOutput = path.join(
    outputDirectory,
    `.${path.basename(absoluteOutput)}.${randomUUID()}.tmp`,
  );
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(temporaryOutput, bytes, { flag: "wx" });
  try {
    await rm(absoluteOutput, { force: true });
    await rename(temporaryOutput, absoluteOutput);
  } catch (error) {
    await rm(temporaryOutput, { force: true });
    throw error;
  }
  return report;
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const options = parseNoMainnetReadinessOptions(argv);
    const report = await runNoMainnetReadiness(options);
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(
      `${error?.message || "no-mainnet readiness report failed"}\n`,
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
