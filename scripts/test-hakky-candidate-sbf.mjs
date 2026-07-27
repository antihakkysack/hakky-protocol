import path from "node:path";
import { pathToFileURL } from "node:url";

import { runExactSbf } from "./test-hakky-test-sbf.mjs";

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await runExactSbf({ lane: "candidate-sbf" });
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
