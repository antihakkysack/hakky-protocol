import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  METADATA_MANIFEST_PATH,
  METADATA_READBACK_PATH,
  assertMetadataManifestV1,
  publishRepositoryArtifact,
  readCanonicalArtifact,
  serializeMetadataManifest,
  serializeMetadataReadback,
  verifyPublishedMetadata,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run metadata:verify -- --manifest ${METADATA_MANIFEST_PATH} --out ${METADATA_READBACK_PATH}`;

export function parseVerifyOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--manifest",
        key: "manifestPath",
        validate(value) {
          if (value !== METADATA_MANIFEST_PATH) throw new Error(`--manifest must be the fixed path ${METADATA_MANIFEST_PATH}`);
        },
      },
      {
        flag: "--out",
        key: "outputPath",
        validate(value) {
          if (value !== METADATA_READBACK_PATH) throw new Error(`--out must be the fixed path ${METADATA_READBACK_PATH}`);
        },
      },
    ],
  });
}

export async function runVerify({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  publisherDependencies,
  onWarning,
} = {}) {
  const options = parseVerifyOptions(argv);
  const { value: manifest } = await readCanonicalArtifact(
    repositoryRoot,
    options.manifestPath,
    serializeMetadataManifest,
    assertMetadataManifestV1,
  );
  const readback = await verifyPublishedMetadata({ manifest, fetchImpl, now });
  await publishRepositoryArtifact({
    repositoryRoot,
    relativePath: options.outputPath,
    bytes: serializeMetadataReadback(readback),
    publisherDependencies,
    onWarning,
  });
  return readback;
}

export async function main({ stdout = process.stdout, stderr = process.stderr, runImpl = runVerify } = {}) {
  try {
    const readback = await runImpl({
      onWarning(warning) {
        stderr.write(`${warning.message} Temporary path: ${warning.temporaryPath}\n`);
      },
    });
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
