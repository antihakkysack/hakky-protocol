import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const RUST_IMAGE =
  "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3";

export function runNative({ repositoryRoot = DEFAULT_REPOSITORY_ROOT, exec = execFileSync } = {}) {
  const root = path.resolve(repositoryRoot);
  const common = [
    "docker",
    "run",
    "--rm",
    "-v",
    `${root}:/workspace:rw`,
    "-w",
    "/workspace",
    RUST_IMAGE,
  ];
  for (const cargoArguments of [
    ["fmt", "--all", "--check"],
    ["test", "--workspace", "--locked"],
    ["test", "--workspace", "--locked", "--all-features"],
    ["clippy", "--workspace", "--all-targets", "--all-features", "--locked", "--", "-D", "warnings"],
  ]) {
    exec("rtk", [...common, "cargo", ...cargoArguments], {
      cwd: root,
      stdio: "inherit",
    });
  }
}

export function main({ stderr = process.stderr } = {}) {
  try {
    runNative();
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "native program verification failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
