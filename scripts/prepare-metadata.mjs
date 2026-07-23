import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  IMAGE_SOURCE_PATH,
  METADATA_DIRECTORY,
  prepareMetadataBundle,
  serializeMetadataDraft,
  validateContentAddressedUri,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run metadata:prepare -- --image ${IMAGE_SOURCE_PATH} --image-uri <content-addressed-uri> --out ${METADATA_DIRECTORY}`;

export function parsePrepareOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--image",
        key: "imagePath",
        validate(value) {
          if (value !== IMAGE_SOURCE_PATH) throw new Error(`--image must be the fixed path ${IMAGE_SOURCE_PATH}`);
        },
      },
      { flag: "--image-uri", key: "imageUri", validate: validateContentAddressedUri },
      {
        flag: "--out",
        key: "outDirectory",
        validate(value) {
          if (value !== METADATA_DIRECTORY) throw new Error(`--out must be the fixed path ${METADATA_DIRECTORY}`);
        },
      },
    ],
  });
}

export async function runPrepare({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  publisherDependencies,
  onCommit,
  onWarning,
} = {}) {
  const options = parsePrepareOptions(argv);
  return prepareMetadataBundle({ repositoryRoot, ...options, publisherDependencies, onCommit, onWarning });
}

export async function main({ stdout = process.stdout, stderr = process.stderr, runImpl = runPrepare } = {}) {
  try {
    const draft = await runImpl({
      onWarning(warning) {
        stderr.write(`${warning.message} Temporary path: ${warning.temporaryPath}\n`);
      },
    });
    stdout.write(serializeMetadataDraft(draft));
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Metadata preparation failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
