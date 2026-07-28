import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RUST_VENDOR_IMAGE =
  "rust@sha256:f49565f188ee00bc2a18dd418183f2c5f23ef7d6e691890517ed341a598f67c3";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const DEPENDENCY_ROOT_RELATIVE = "artifacts/build/dependencies";
const VENDOR_RELATIVE = `${DEPENDENCY_ROOT_RELATIVE}/vendor`;
const MANIFEST_NAME = "vendor-manifest.json";
const CONFIG_NAME = "source-config.toml";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertContained(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("vendor target must stay inside the repository artifact directory");
  }
  if (!relative.replaceAll("\\", "/").startsWith(`${DEPENDENCY_ROOT_RELATIVE}/`)) {
    throw new Error("vendor target escaped artifacts/build/dependencies");
  }
}

export function planVendorMaterialization(repositoryRoot = DEFAULT_REPOSITORY_ROOT) {
  const root = path.resolve(repositoryRoot);
  const dependencyRoot = path.join(root, DEPENDENCY_ROOT_RELATIVE);
  const vendorDirectory = path.join(root, VENDOR_RELATIVE);
  return {
    command: [
      "rtk",
      "docker",
      "run",
      "--rm",
      "-v",
      `${root}:/workspace:rw`,
      "-w",
      "/workspace",
      RUST_VENDOR_IMAGE,
      "cargo",
      "vendor",
      "--locked",
      "--versioned-dirs",
      VENDOR_RELATIVE.replaceAll("\\", "/"),
    ],
    configPath: path.join(dependencyRoot, CONFIG_NAME),
    dependencyRoot,
    manifestPath: path.join(dependencyRoot, MANIFEST_NAME),
    repositoryRoot: root,
    vendorDirectory,
  };
}

async function walkFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`vendor symlink is forbidden: ${absolute}`);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
      else throw new Error(`unsupported vendor entry: ${absolute}`);
    }
  }
  await visit(root);
  return files;
}

export async function hashVendorTree(vendorDirectory) {
  const files = await walkFiles(vendorDirectory);
  const digest = createHash("sha256");
  for (const file of files) {
    const relative = path.relative(vendorDirectory, file).replaceAll("\\", "/");
    digest.update(relative);
    digest.update("\0");
    digest.update(await readFile(file));
    digest.update("\0");
  }
  return { fileCount: files.length, treeSha256: digest.digest("hex") };
}

async function assertCargoChecksums(vendorDirectory) {
  const packages = (await readdir(vendorDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (packages.length === 0) throw new Error("vendor bundle contains no packages");
  for (const packageName of packages) {
    const checksumPath = path.join(vendorDirectory, packageName, ".cargo-checksum.json");
    const entry = await lstat(checksumPath).catch(() => null);
    if (!entry?.isFile() || entry.isSymbolicLink()) {
      throw new Error(`vendor package lacks a regular checksum: ${packageName}`);
    }
    const checksum = JSON.parse(await readFile(checksumPath, "utf8"));
    if (typeof checksum.package !== "string" || typeof checksum.files !== "object") {
      throw new Error(`vendor checksum is malformed: ${packageName}`);
    }
  }
  return packages.length;
}

export async function sealVendorBundle(repositoryRoot = DEFAULT_REPOSITORY_ROOT) {
  const plan = planVendorMaterialization(repositoryRoot);
  assertContained(plan.repositoryRoot, plan.vendorDirectory);
  const packageCount = await assertCargoChecksums(plan.vendorDirectory);
  const tree = await hashVendorTree(plan.vendorDirectory);
  const lockBytes = await readFile(path.join(plan.repositoryRoot, "Cargo.lock"));
  const config = [
    "[source.crates-io]",
    'replace-with = "vendored-sources"',
    "",
    "[source.vendored-sources]",
    'directory = "/vendor"',
    "",
    "[net]",
    "offline = true",
    "",
  ].join("\n");
  await mkdir(plan.dependencyRoot, { recursive: true });
  await writeFile(plan.configPath, config, "utf8");
  const manifest = {
    schemaVersion: "hakky-cargo-vendor-v1",
    materializationImage: RUST_VENDOR_IMAGE,
    command: plan.command,
    cargoLockSha256: sha256(lockBytes),
    sourceConfigSha256: sha256(Buffer.from(config)),
    packageCount,
    ...tree,
  };
  await writeFile(plan.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function validateVendorBundle(repositoryRoot = DEFAULT_REPOSITORY_ROOT) {
  const plan = planVendorMaterialization(repositoryRoot);
  const manifest = JSON.parse(await readFile(plan.manifestPath, "utf8"));
  if (
    manifest.schemaVersion !== "hakky-cargo-vendor-v1" ||
    manifest.materializationImage !== RUST_VENDOR_IMAGE
  ) {
    throw new Error("vendor manifest identity mismatch");
  }
  const lockBytes = await readFile(path.join(plan.repositoryRoot, "Cargo.lock"));
  if (manifest.cargoLockSha256 !== sha256(lockBytes)) {
    throw new Error("vendor manifest does not match Cargo.lock");
  }
  const configBytes = await readFile(plan.configPath);
  if (manifest.sourceConfigSha256 !== sha256(configBytes)) {
    throw new Error("vendor source config hash mismatch");
  }
  const tree = await hashVendorTree(plan.vendorDirectory);
  if (
    manifest.fileCount !== tree.fileCount ||
    manifest.treeSha256 !== tree.treeSha256
  ) {
    throw new Error("vendor tree hash mismatch");
  }
  await assertCargoChecksums(plan.vendorDirectory);
  return manifest;
}

export async function runVendorMaterialization({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  exec = execFileSync,
} = {}) {
  const plan = planVendorMaterialization(repositoryRoot);
  assertContained(plan.repositoryRoot, plan.vendorDirectory);
  await rm(plan.vendorDirectory, { recursive: true, force: true });
  await mkdir(plan.dependencyRoot, { recursive: true });
  const [executable, ...args] = plan.command;
  exec(executable, args, {
    cwd: plan.repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  return sealVendorBundle(plan.repositoryRoot);
}

export async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const manifest = await runVendorMaterialization();
    stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Cargo vendor materialization failed"}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
