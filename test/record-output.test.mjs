import assert from "node:assert/strict";
import {
  mkdtemp,
  open,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { publishLaunchRecord } from "../src/record-output.mjs";
import { createPrelaunchRecordV2 } from "../test-support/launch-fixtures.mjs";

async function temporaryLaunchFile() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakky-record-output-"));
  const targetPath = path.join(directory, "launch.json");
  const sourceBytes = "prior public launch bytes\n";
  await writeFile(targetPath, sourceBytes);
  return { directory, targetPath, sourceBytes };
}

test("validates before opening and publishes exact canonical launch bytes", async () => {
  const { directory, targetPath, sourceBytes } = await temporaryLaunchFile();
  let opens = 0;
  const invalidRecord = createPrelaunchRecordV2();
  invalidRecord.extra = true;
  await assert.rejects(
    publishLaunchRecord(targetPath, invalidRecord, {
      openImpl: async () => {
        opens += 1;
        throw new Error("must not open");
      },
    }),
    /launch-record-invalid/,
  );
  assert.equal(opens, 0);
  assert.equal(await readFile(targetPath, "utf8"), sourceBytes);

  const record = createPrelaunchRecordV2();
  const result = await publishLaunchRecord(targetPath, record);
  assert.deepEqual(result, {
    committed: true,
    warning: null,
    bytes: Buffer.from(`${JSON.stringify(record, null, 2)}\n`, "utf8"),
  });
  assert.equal(await readFile(targetPath, "utf8"), result.bytes.toString("utf8"));
  assert.deepEqual(await readdir(directory), ["launch.json"]);
});

test("exclusive collision, partial write, and rename failure preserve exact source bytes", async () => {
  const record = createPrelaunchRecordV2();

  {
    const { directory, targetPath, sourceBytes } = await temporaryLaunchFile();
    const collisionPath = path.join(directory, `.launch.json.${process.pid}.collision.tmp`);
    const collisionBytes = "owned by another operation\n";
    await writeFile(collisionPath, collisionBytes);
    await assert.rejects(
      publishLaunchRecord(targetPath, record, { randomUUIDImpl: () => "collision" }),
      { code: "EEXIST" },
    );
    assert.equal(await readFile(targetPath, "utf8"), sourceBytes);
    assert.equal(await readFile(collisionPath, "utf8"), collisionBytes);
  }

  {
    const { directory, targetPath, sourceBytes } = await temporaryLaunchFile();
    const partialWriteOpen = async (...arguments_) => {
      const handle = await open(...arguments_);
      return {
        async writeFile(contents) {
          await handle.writeFile(contents.subarray(0, 23));
          throw new Error("injected partial write failure");
        },
        sync: () => handle.sync(),
        close: () => handle.close(),
      };
    };
    await assert.rejects(
      publishLaunchRecord(targetPath, record, { openImpl: partialWriteOpen }),
      /injected partial write failure/,
    );
    assert.equal(await readFile(targetPath, "utf8"), sourceBytes);
    assert.deepEqual(await readdir(directory), ["launch.json"]);
  }

  {
    const { directory, targetPath, sourceBytes } = await temporaryLaunchFile();
    await assert.rejects(
      publishLaunchRecord(targetPath, record, {
        renameImpl: async () => {
          const error = new Error("injected rename failure");
          error.code = "EIO";
          throw error;
        },
      }),
      /injected rename failure/,
    );
    assert.equal(await readFile(targetPath, "utf8"), sourceBytes);
    assert.deepEqual(await readdir(directory), ["launch.json"]);
  }
});

test("cleanup failure before commit is explicit and never masks the triggering failure", async () => {
  const { targetPath, sourceBytes } = await temporaryLaunchFile();
  const partialWriteOpen = async (...arguments_) => {
    const handle = await open(...arguments_);
    return {
      async writeFile() {
        throw new Error("injected write failure");
      },
      sync: () => handle.sync(),
      close: () => handle.close(),
    };
  };
  await assert.rejects(
    publishLaunchRecord(targetPath, createPrelaunchRecordV2(), {
      openImpl: partialWriteOpen,
      unlinkImpl: async () => {
        throw new Error("injected cleanup failure");
      },
    }),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.match(error.message, /write failure.*cleanup failed/);
      assert.equal(error.errors.length, 2);
      return true;
    },
  );
  assert.equal(await readFile(targetPath, "utf8"), sourceBytes);
});
