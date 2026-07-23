import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  IMAGE_SOURCE_PATH,
  METADATA_DIRECTORY,
  prepareMetadataBundle,
  serializeMetadataDraft,
  validateContentAddressedUri,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run metadata:prepare -- --image ${IMAGE_SOURCE_PATH} --image-uri <content-addressed-uri> --out ${METADATA_DIRECTORY}`;

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

export function parsePrepareOptions(argv) {
  const parsed = parseNamedOptions(argv, ["--image", "--image-uri", "--out"]);
  if (parsed["--image"] !== IMAGE_SOURCE_PATH) throw new Error(`--image must be the fixed path ${IMAGE_SOURCE_PATH}`);
  if (parsed["--out"] !== METADATA_DIRECTORY) throw new Error(`--out must be the fixed path ${METADATA_DIRECTORY}`);
  validateContentAddressedUri(parsed["--image-uri"]);
  return {
    imagePath: parsed["--image"],
    imageUri: parsed["--image-uri"],
    outDirectory: parsed["--out"],
  };
}

export async function runPrepare({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  publisherDependencies,
  onCommit,
} = {}) {
  const options = parsePrepareOptions(argv);
  return prepareMetadataBundle({ repositoryRoot, ...options, publisherDependencies, onCommit });
}

export async function main({ stdout = process.stdout, stderr = process.stderr, runImpl = runPrepare } = {}) {
  try {
    const draft = await runImpl();
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
