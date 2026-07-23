import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  METADATA_MANIFEST_PATH,
  METADATA_READBACK_PATH,
  assertMetadataManifestV1,
  publishArtifactBytes,
  readCanonicalArtifact,
  resolveRepositoryPath,
  serializeMetadataManifest,
  serializeMetadataReadback,
  verifyPublishedMetadata,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run metadata:verify -- --manifest ${METADATA_MANIFEST_PATH} --out ${METADATA_READBACK_PATH}`;

function parseNamedOptions(argv, names) {
  if (!Array.isArray(argv) || argv.length !== names.length * 2) throw new Error(USAGE);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!names.includes(name) || Object.hasOwn(parsed, name) || typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error(USAGE);
    }
    parsed[name] = value;
  }
  if (names.some((name) => !Object.hasOwn(parsed, name))) throw new Error(USAGE);
  return parsed;
}

export function parseVerifyOptions(argv) {
  const parsed = parseNamedOptions(argv, ["--manifest", "--out"]);
  if (parsed["--manifest"] !== METADATA_MANIFEST_PATH) throw new Error(`--manifest must be the fixed path ${METADATA_MANIFEST_PATH}`);
  if (parsed["--out"] !== METADATA_READBACK_PATH) throw new Error(`--out must be the fixed path ${METADATA_READBACK_PATH}`);
  return { manifestPath: parsed["--manifest"], outputPath: parsed["--out"] };
}

export async function runVerify({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  publisherDependencies,
} = {}) {
  const options = parseVerifyOptions(argv);
  const { value: manifest } = await readCanonicalArtifact(
    repositoryRoot,
    options.manifestPath,
    serializeMetadataManifest,
    assertMetadataManifestV1,
  );
  const readback = await verifyPublishedMetadata({ manifest, fetchImpl, now });
  const outputPath = await resolveRepositoryPath(repositoryRoot, options.outputPath);
  await publishArtifactBytes(outputPath, serializeMetadataReadback(readback), publisherDependencies);
  return readback;
}

export async function main({ stdout = process.stdout, stderr = process.stderr, runImpl = runVerify } = {}) {
  try {
    const readback = await runImpl();
    stdout.write(serializeMetadataReadback(readback));
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Metadata verification failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
