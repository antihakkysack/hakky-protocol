import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  METADATA_DRAFT_PATH,
  METADATA_MANIFEST_PATH,
  assertLocalMetadataArtifacts,
  assertMetadataDraftV1,
  finalizeMetadataManifest,
  publishArtifactBytes,
  readCanonicalArtifact,
  resolveRepositoryPath,
  serializeMetadataDraft,
  serializeMetadataManifest,
  validateContentAddressedUri,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run metadata:finalize -- --draft-manifest ${METADATA_DRAFT_PATH} --metadata-uri <content-addressed-uri> --out ${METADATA_MANIFEST_PATH}`;

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

export function parseFinalizeOptions(argv) {
  const parsed = parseNamedOptions(argv, ["--draft-manifest", "--metadata-uri", "--out"]);
  if (parsed["--draft-manifest"] !== METADATA_DRAFT_PATH) throw new Error(`--draft-manifest must be the fixed path ${METADATA_DRAFT_PATH}`);
  if (parsed["--out"] !== METADATA_MANIFEST_PATH) throw new Error(`--out must be the fixed path ${METADATA_MANIFEST_PATH}`);
  validateContentAddressedUri(parsed["--metadata-uri"]);
  return {
    draftManifestPath: parsed["--draft-manifest"],
    metadataUri: parsed["--metadata-uri"],
    outputPath: parsed["--out"],
  };
}

export async function runFinalize({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  publisherDependencies,
} = {}) {
  const options = parseFinalizeOptions(argv);
  const { value: draft } = await readCanonicalArtifact(
    repositoryRoot,
    options.draftManifestPath,
    serializeMetadataDraft,
    assertMetadataDraftV1,
  );
  await assertLocalMetadataArtifacts({ repositoryRoot, draft });
  const manifest = finalizeMetadataManifest({ draft, metadataUri: options.metadataUri });
  const outputPath = await resolveRepositoryPath(repositoryRoot, options.outputPath);
  await publishArtifactBytes(outputPath, serializeMetadataManifest(manifest), publisherDependencies);
  return manifest;
}

export async function main({ stdout = process.stdout, stderr = process.stderr, runImpl = runFinalize } = {}) {
  try {
    const manifest = await runImpl();
    stdout.write(serializeMetadataManifest(manifest));
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Metadata finalization failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
