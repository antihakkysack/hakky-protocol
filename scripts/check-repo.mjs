import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SKIP_DIRS = new Set([".git", ".superpowers", "node_modules", "artifacts"]);
const BINARY_EXTENSIONS = new Set([".gif", ".ico", ".jpg", ".jpeg", ".png", ".webp", ".woff", ".woff2"]);
const decode = (value) => Buffer.from(value, "base64").toString("utf8");
const PERSONAL_PROJECT_NEEDLE = decode("ZnJlc2hkaWdpdGFs");
const LEGACY_NEEDLES = [
  "Y2J0Yw==",
  "Y2xlYW5iaXRjb2lu",
  "cmVzZXJ2ZW9yYWNsZQ==",
  "YXR0ZXN0YXRpb25yZWdpc3RyeQ==",
  "c2Vwb2xpYQ==",
  "c29saWRpdHk=",
  "aGFyZGhhdA==",
].map(decode);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (!BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

function normalized(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function scanRepository(root = process.cwd()) {
  const violations = [];
  for (const file of await walk(root)) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    const content = normalized(await readFile(file, "utf8"));
    if (content.includes(PERSONAL_PROJECT_NEEDLE)) {
      violations.push({ file: relative, rule: "personal-project-only" });
    }
    const isDesignRecord = relative.startsWith("docs/superpowers/");
    if (!isDesignRecord && LEGACY_NEEDLES.some((needle) => content.includes(needle))) {
      violations.push({ file: relative, rule: "legacy-product-active" });
    }
  }
  return violations.sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const violations = await scanRepository();
  if (violations.length) {
    console.error(JSON.stringify({ ok: false, violations }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ ok: true, violations: [] }, null, 2));
  }
}
