import { readFile, writeFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";

const schemaUrl = new URL("../schemas/web/launch-v2.schema.json", import.meta.url);
const outputUrl = new URL("../web/lib/launch-schema.generated.js", import.meta.url);
const WRAPPER = "\nexport const validateLaunchShape = launchV2;\n";
const AJV_EQUAL_RUNTIME = "const func0 = require(\"ajv/dist/runtime/equal\").default;";
const INLINE_EQUAL_RUNTIME = `const func0 = (left, right) => {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && func0(left[key], right[key]));
};`;

export async function renderLaunchSchemaValidator() {
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: false,
    code: { source: true, esm: true, lines: true },
  });
  ajv.addSchema(schema, "launchV2");
  const standalone = standaloneCode(ajv, { launchV2: "launchV2" });
  const generated = `${standalone.replace(AJV_EQUAL_RUNTIME, INLINE_EQUAL_RUNTIME)}${WRAPPER}`;
  if (!generated.includes("export const validateLaunchShape = launchV2;")) {
    throw new Error("Generated launch validator is missing validateLaunchShape export");
  }
  if (generated.includes("require(") || generated.includes("from \"ajv/")) {
    throw new Error("Generated launch validator contains a runtime dependency");
  }
  return generated;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length > 1 || (argv.length === 1 && argv[0] !== "--check")) {
    throw new Error("Usage: node scripts/render-launch-schema-validator.mjs [--check]");
  }
  const generated = await renderLaunchSchemaValidator();
  if (argv[0] === "--check") {
    let existing;
    try {
      existing = await readFile(outputUrl, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error("Generated launch validator is missing");
      throw error;
    }
    if (existing !== generated) throw new Error("Generated launch validator is out of date");
    return;
  }
  await writeFile(outputUrl, generated, "utf8");
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
