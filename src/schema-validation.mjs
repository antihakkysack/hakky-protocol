import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const SCHEMA_URLS = Object.freeze({
  "mint-v2": new URL("../schemas/proof/mainnet-mint-v2.schema.json", import.meta.url),
  "launchlab-v2": new URL("../schemas/proof/mainnet-launchlab-v2.schema.json", import.meta.url),
  "graduation-v1": new URL("../schemas/proof/mainnet-graduation-v1.schema.json", import.meta.url),
  "launch-v2": new URL("../schemas/web/launch-v2.schema.json", import.meta.url),
});

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
  code: { source: true, esm: true, lines: true },
});

const validators = new Map(
  Object.entries(SCHEMA_URLS).map(([kind, url]) => {
    const schema = JSON.parse(readFileSync(url, "utf8"));
    return [kind, ajv.compile(schema)];
  }),
);

function normalizedPath(error) {
  if (error.keyword === "required") return `${error.instancePath}/${error.params.missingProperty}` || "/";
  if (error.keyword === "additionalProperties") return `${error.instancePath}/${error.params.additionalProperty}` || "/";
  return error.instancePath || "/";
}

function normalizeErrors(errors = []) {
  return errors
    .map((error) => ({
      instancePath: normalizedPath(error),
      keyword: error.keyword,
      message: error.message ?? "validation failed",
    }))
    .sort((left, right) => left.instancePath.localeCompare(right.instancePath)
      || left.keyword.localeCompare(right.keyword)
      || left.message.localeCompare(right.message))
    .map(({ instancePath, keyword, message }) => `${instancePath} [${keyword}] ${message}`);
}

function validatorFor(kind) {
  const validator = validators.get(kind);
  if (!validator) throw new Error(`Unknown schema kind: ${kind}`);
  return validator;
}

export function validateSchema(kind, value) {
  const validator = validatorFor(kind);
  const ok = validator(value);
  return { ok, errors: ok ? [] : normalizeErrors(validator.errors) };
}

export function assertSchema(kind, value) {
  const result = validateSchema(kind, value);
  if (!result.ok) throw new Error(`Schema ${kind} validation failed:\n${result.errors.join("\n")}`);
  return value;
}
