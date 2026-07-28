import { randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  readFile,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseExactCliOptions } from "../src/exact-cli-options.mjs";
import {
  IMAGE_IPFS_CID_PATH,
  IMAGE_IPFS_RECEIPT_PATH,
  IMAGE_IPFS_SOURCE_PATH,
  serializeImageIpfsReceiptV1,
  verifyImageIpfsV1,
} from "../src/image-ipfs-proof.mjs";
import {
  APPROVED_IMAGE_CID,
  resolveRepositoryPath,
} from "../src/metadata-integrity.mjs";

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(
  new URL("../", import.meta.url),
);
const USAGE = `Usage: npm run metadata:image:verify -- --cid-file ${IMAGE_IPFS_CID_PATH}`;

export function parseImageIpfsOptions(argv) {
  return parseExactCliOptions(argv, {
    usage: USAGE,
    definitions: [
      {
        flag: "--cid-file",
        key: "cidFilePath",
        validate(value) {
          if (value !== IMAGE_IPFS_CID_PATH) {
            throw new Error(
              `--cid-file must be the fixed path ${IMAGE_IPFS_CID_PATH}`,
            );
          }
        },
      },
    ],
  });
}

async function readExistingExact(outputPath, bytes, readFileImpl) {
  try {
    const existing = await readFileImpl(outputPath);
    if (!Buffer.from(existing).equals(bytes)) {
      throw new Error("image-ipfs-receipt-conflict");
    }
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function publishReceipt({
  repositoryRoot,
  bytes,
  fileSystem = {},
  randomUUIDImpl = randomUUID,
}) {
  const linkImpl = fileSystem.link ?? link;
  const mkdirImpl = fileSystem.mkdir ?? mkdir;
  const openImpl = fileSystem.open ?? open;
  const readFileImpl = fileSystem.readFile ?? readFile;
  const unlinkImpl = fileSystem.unlink ?? unlink;
  const directoryRelativePath = path.posix.dirname(
    IMAGE_IPFS_RECEIPT_PATH,
  );
  const directoryPath = await resolveRepositoryPath(
    repositoryRoot,
    directoryRelativePath,
  );
  await mkdirImpl(directoryPath, { recursive: true });
  await resolveRepositoryPath(repositoryRoot, directoryRelativePath);
  const outputPath = await resolveRepositoryPath(
    repositoryRoot,
    IMAGE_IPFS_RECEIPT_PATH,
  );
  if (await readExistingExact(outputPath, bytes, readFileImpl)) {
    return { outputPath, idempotent: true };
  }

  const temporaryRelativePath = path.posix.join(
    directoryRelativePath,
    `.${path.posix.basename(IMAGE_IPFS_RECEIPT_PATH)}.${randomUUIDImpl()}.tmp`,
  );
  let temporaryPath = await resolveRepositoryPath(
    repositoryRoot,
    temporaryRelativePath,
  );
  let handle;
  let ownsTemporary = false;
  let committed = false;
  try {
    handle = await openImpl(temporaryPath, "wx", 0o600);
    ownsTemporary = true;
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    temporaryPath = await resolveRepositoryPath(
      repositoryRoot,
      temporaryRelativePath,
    );
    const verifiedOutputPath = await resolveRepositoryPath(
      repositoryRoot,
      IMAGE_IPFS_RECEIPT_PATH,
    );
    const verifiedDirectoryPath = await resolveRepositoryPath(
      repositoryRoot,
      directoryRelativePath,
    );
    if (
      path.dirname(temporaryPath) !== verifiedDirectoryPath ||
      path.dirname(verifiedOutputPath) !== verifiedDirectoryPath
    ) {
      throw new Error("image-ipfs-receipt-confinement");
    }
    try {
      await linkImpl(temporaryPath, verifiedOutputPath);
      committed = true;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      committed = await readExistingExact(
        verifiedOutputPath,
        bytes,
        readFileImpl,
      );
    }
    const observed = await readFileImpl(verifiedOutputPath);
    if (!Buffer.from(observed).equals(bytes)) {
      throw new Error("image-ipfs-receipt-conflict");
    }
    return { outputPath: verifiedOutputPath, idempotent: !committed };
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {
        // The owned temporary path is still cleaned below.
      }
    }
    if (ownsTemporary) {
      try {
        await unlinkImpl(temporaryPath);
      } catch (error) {
        if (!committed && error?.code !== "ENOENT") throw error;
      }
    }
  }
}

export async function runImageIpfsVerification({
  argv = process.argv.slice(2),
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  publisherDependencies,
} = {}) {
  const options = parseImageIpfsOptions(argv);
  const cidPath = await resolveRepositoryPath(
    repositoryRoot,
    options.cidFilePath,
  );
  const imagePath = await resolveRepositoryPath(
    repositoryRoot,
    IMAGE_IPFS_SOURCE_PATH,
  );
  const [cidBytes, imageBytes] = await Promise.all([
    readFile(cidPath),
    readFile(imagePath),
  ]);
  const expectedCidBytes = Buffer.from(`${APPROVED_IMAGE_CID}\n`, "utf8");
  if (!Buffer.from(cidBytes).equals(expectedCidBytes)) {
    throw new Error("image-ipfs-cid-file-invalid");
  }
  const receipt = await verifyImageIpfsV1({
    cid: APPROVED_IMAGE_CID,
    imageBytes,
    fetchImpl,
    now,
  });
  const bytes = serializeImageIpfsReceiptV1(receipt);
  await publishReceipt({
    repositoryRoot,
    bytes,
    fileSystem: publisherDependencies,
  });
  return receipt;
}

export async function main({
  stdout = process.stdout,
  stderr = process.stderr,
  runImpl = runImageIpfsVerification,
} = {}) {
  try {
    const receipt = await runImpl();
    stdout.write(serializeImageIpfsReceiptV1(receipt));
    return 0;
  } catch (error) {
    stderr.write(`${error?.message || "Image IPFS verification failed"}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  process.exitCode = await main();
}
