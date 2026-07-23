import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import {
  instanceCommitment,
  renderRustReleaseConfig,
  restrictPrivateDirectory,
  restrictPrivateFile,
} from "../src/devnet-release-config.mjs";

const root = process.cwd();
const privateDirectory = path.join(root, "artifacts", "devnet", "private");
const publicConfigPath = path.join(
  root,
  "artifacts",
  "devnet",
  "public-release-config.json",
);
const rustConfigPath = path.join(
  root,
  "programs",
  "hakky-market",
  "src",
  "release_config.rs",
);

await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
await restrictPrivateDirectory(privateDirectory);

const program = Keypair.generate();
const initializer = Keypair.generate();
const nonce = randomBytes(32);
const commitment = instanceCommitment(nonce);

const privateFiles = [
  [
    path.join(privateDirectory, "program-keypair.json"),
    `${JSON.stringify([...program.secretKey])}\n`,
  ],
  [
    path.join(privateDirectory, "initializer-keypair.json"),
    `${JSON.stringify([...initializer.secretKey])}\n`,
  ],
  [path.join(privateDirectory, "instance-nonce.hex"), `${nonce.toString("hex")}\n`],
];

for (const [filePath, contents] of privateFiles) {
  await writeFile(filePath, contents, { encoding: "utf8", mode: 0o600 });
  await restrictPrivateFile(filePath);
}

const publicConfig = {
  programId: program.publicKey.toBase58(),
  initializer: initializer.publicKey.toBase58(),
  instanceCommitment: commitment.toString("hex"),
  paths: {
    publicReleaseConfig: path.relative(root, publicConfigPath).replaceAll("\\", "/"),
    rustReleaseConfig: path.relative(root, rustConfigPath).replaceAll("\\", "/"),
  },
};
const canonicalPublicJson = `${JSON.stringify(publicConfig, null, 2)}\n`;

await mkdir(path.dirname(publicConfigPath), { recursive: true });
await mkdir(path.dirname(rustConfigPath), { recursive: true });
await writeFile(publicConfigPath, canonicalPublicJson, "utf8");
await writeFile(
  rustConfigPath,
  renderRustReleaseConfig({
    programId: program.publicKey,
    initializer: initializer.publicKey,
    instanceCommitment: commitment,
  }),
  "utf8",
);

process.stdout.write(canonicalPublicJson);
