import path from "node:path";
import { pathToFileURL } from "node:url";

import { main as buildMain } from "./build-hakky-sbf.mjs";

export async function main(options = {}) {
  return buildMain({
    ...options,
    argv: ["--lane", "test-sbf"],
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
