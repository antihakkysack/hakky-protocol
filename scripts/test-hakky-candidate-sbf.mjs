import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  normalizeCandidateBuildDirectory,
  runExactSbf,
} from "./test-hakky-test-sbf.mjs";

const USAGE =
  "Usage: npm run program:test-candidate-sbf -- --build artifacts/build/candidate/<id>";

export function parseCandidateSbfArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== "--build") {
    throw new Error(USAGE);
  }
  return {
    buildDirectory: normalizeCandidateBuildDirectory(argv[1]),
  };
}

export async function main({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const { buildDirectory } = parseCandidateSbfArgs(argv);
    const result = await runExactSbf({
      lane: "candidate-sbf",
      buildDirectory,
    });
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "candidate-SBF runtime verification failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
