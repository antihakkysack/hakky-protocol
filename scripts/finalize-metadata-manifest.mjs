import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  METADATA_DRAFT_PATH,
  METADATA_MANIFEST_PATH,
  assertLocalMetadataArtifacts,
  assertMetadataDraftV1,
  finalizeMetadataManifest,
  publishRepositoryArtifact,
  readCanonicalArtifact,
  serializeMetadataDraft,
  serializeMetadataManifest,
  validateContentAddressedUri,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run metadata:finalize -- --draft-manifest ${METADATA_DRAFT_PATH} --metadata-uri <content-addressed-uri> --out ${METADATA_MANIFEST_PATH}`;

export function parseFinalizeOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--draft-manifest",
        key: "draftManifestPath",
        validate(value) {
          if (value !== METADATA_DRAFT_PATH) throw new Error(`--draft-manifest must be the fixed path ${METADATA_DRAFT_PATH}`);
        },
      },
      { flag: "--metadata-uri", key: "metadataUri", validate: validateContentAddressedUri },
      {
        flag: "--out",
        key: "outputPath",
        validate(value) {
          if (value !== METADATA_MANIFEST_PATH) throw new Error(`--out must be the fixed path ${METADATA_MANIFEST_PATH}`);
        },
      },
    ],
  });
}

export async function runFinalize({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  publisherDependencies,
  onWarning,
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
  await publishRepositoryArtifact({
    repositoryRoot,
    relativePath: options.outputPath,
    bytes: serializeMetadataManifest(manifest),
    publisherDependencies,
    onWarning,
  });
  return manifest;
}

export async function main({ stdout = process.stdout, stderr = process.stderr, runImpl = runFinalize } = {}) {
  try {
    const manifest = await runImpl({
      onWarning(warning) {
        stderr.write(`${warning.message} Temporary path: ${warning.temporaryPath}\n`);
      },
    });
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
