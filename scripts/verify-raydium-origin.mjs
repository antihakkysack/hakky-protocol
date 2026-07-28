import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  MAINNET_SESSION_PATHS,
  serializeMainnetSessionJson,
  writeMainnetSessionJson,
} from "../src/mainnet-session-artifact.mjs";
import { verifyOfficialRaydiumOrigin } from "../src/raydium-origin.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const USAGE = `Usage: npm run verify:raydium-origin -- --ui-url <https://raydium.io/...> --out ${MAINNET_SESSION_PATHS.officialOrigin}`;

export function parseOriginOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      { flag: "--ui-url", key: "uiUrl" },
      {
        flag: "--out",
        key: "outputPath",
        validate(value) {
          if (value !== MAINNET_SESSION_PATHS.officialOrigin) throw new Error(USAGE);
        },
      },
    ],
  });
}

export async function runOriginVerifier({
  argv = process.argv.slice(2),
  repositoryRoot = REPOSITORY_ROOT,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  writeImpl = writeMainnetSessionJson,
} = {}) {
  const options = parseOriginOptions(argv);
  const checkedAt = now().toISOString();
  const receipt = await verifyOfficialRaydiumOrigin({
    uiUrl: options.uiUrl,
    fetchImpl,
    checkedAt,
  });
  await writeImpl({
    repositoryRoot,
    relativePath: options.outputPath,
    value: receipt,
  });
  return receipt;
}

function publicError(error) {
  const message = error instanceof Error ? error.message : "";
  return /^(?:raydium-origin-|mainnet-session-|Usage:)/u.test(message)
    ? message
    : "Raydium origin verification failed.";
}

export async function main({
  runImpl = runOriginVerifier,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const receipt = await runImpl();
    stdout.write(serializeMainnetSessionJson(receipt));
    return receipt.ok === true ? 0 : 1;
  } catch (error) {
    stderr.write(`${publicError(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}

