import { readFile, writeFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";

const schemaUrl = new URL("../schemas/web/launch-v2.schema.json", import.meta.url);
const outputUrl = new URL("../web/lib/launch-schema.generated.js", import.meta.url);
const WRAPPER = "\nexport const validateLaunchShape = launchV2;\n";

export async function renderLaunchSchemaValidator() {
  const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: false,
    code: { source: true, esm: true, lines: true },
  });
  ajv.addSchema(schema, "launchV2");
  const generated = `${standaloneCode(ajv, { launchV2: "launchV2" })}${WRAPPER}`;
  if (!generated.includes("export const validateLaunchShape = launchV2;")) {
    throw new Error("Generated launch validator is missing validateLaunchShape export");
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
