import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  APPROVED_DECISIONS,
  classifyLoreItem,
} from "../src/lore-classification.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function markdownCell(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/\s+/gu, " ")
    .trim();
}

function itemLabel(item) {
  if (item.name.startsWith("t1_")) return "<comment text withheld from ledger>";
  const title = typeof item.title === "string" && item.title.trim()
    ? item.title.trim()
    : "<untitled submission>";
  return title.length <= 180 ? title : `${title.slice(0, 177)}...`;
}

function validateCorpus(corpus) {
  if (corpus?.schemaVersion !== 1) throw new Error("Lore corpus schemaVersion must equal 1");
  if (corpus?.complete !== true) throw new Error("Lore corpus must be complete before ledger generation");
  if (!Array.isArray(corpus.sources) || corpus.sources.length !== 4
      || corpus.sources.some((source) => source.complete !== true)) {
    throw new Error("All four lore corpus sources must be complete");
  }
  if (!Array.isArray(corpus.items) || corpus.items.length === 0) {
    throw new Error("Lore corpus must contain items");
  }
  const names = corpus.items.map((item) => item.name);
  if (names.some((name) => !/^t[13]_[a-z0-9]+$/u.test(name))) {
    throw new Error("Every lore item must have a canonical Reddit fullname");
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Lore corpus fullnames must be unique");
  }
}

export function buildLoreLedgers(corpus, { corpusSha256 }) {
  validateCorpus(corpus);
  if (!/^[0-9a-f]{64}$/u.test(corpusSha256)) {
    throw new Error("corpusSha256 must be a lowercase SHA-256 digest");
  }

  const classified = corpus.items
    .map((item) => ({ item, classification: classifyLoreItem(item) }))
    .sort((left, right) => left.item.name.localeCompare(right.item.name));
  const counts = Object.fromEntries(APPROVED_DECISIONS.map((decision) => [decision, 0]));
  for (const { classification } of classified) {
    if (!classification || !APPROVED_DECISIONS.includes(classification.decision)) {
      throw new Error("Every corpus item must receive exactly one approved decision");
    }
    counts[classification.decision] += 1;
  }

  const sourceRows = corpus.sources.map((source) => (
    `| ${markdownCell(source.id)} | ${markdownCell(source.provider)} | ${source.pages} | yes | ${markdownCell(source.primaryError ?? "none")} |`
  ));
  const countRows = APPROVED_DECISIONS.map((decision) => (
    `| ${decision} | ${counts[decision].toLocaleString("en-US")} |`
  ));
  const internalItemRows = classified.map(({ item, classification }) => {
    const cells = [
      `\`${item.name}\``,
      markdownCell(item.source),
      markdownCell(itemLabel(item)),
      markdownCell(item.permalink ?? "Unavailable"),
      item.name.startsWith("t1_") ? "comment" : "submission",
      classification.decision,
      markdownCell(classification.reason),
      markdownCell(classification.destination),
    ];
    return `| ${cells.join(" | ")} |`;
  });
  const publicItemRows = classified.map(({ item, classification }, index) => {
    const cells = [
      `item-${String(index + 1).padStart(4, "0")}`,
      markdownCell(item.source),
      item.name.startsWith("t1_") ? "comment" : "submission",
      classification.decision,
      markdownCell(classification.reason),
      markdownCell(classification.destination),
    ];
    return `| ${cells.join(" | ")} |`;
  });

  const internalLedger = `# HAKKY Internal Reddit Corpus Decision Ledger

This ignored local artifact contains the canonical source references needed for
editorial audit. It must not be committed, published, or treated as an official
trading, support, address, or announcement channel.

- Collected at: ${corpus.collectedAt}
- Collection complete: yes
- Retrieved unique items: ${corpus.items.length.toLocaleString("en-US")}
- Raw corpus SHA-256: \`${corpusSha256}\`
- Direct anonymous Reddit JSON: unavailable with HTTP 403
- Coverage fallback: Arctic Shift public archive, paginated to an empty final
  page for all four approved surfaces

## Source coverage

| Surface | Provider | Pages | Complete | Primary result |
| --- | --- | ---: | --- | --- |
${sourceRows.join("\n")}

## Public-use boundary

Only rows marked \`included\` or \`included-as-theme\` may inform the public
seven-transmission canon. \`included-as-theme\` means the safe abstract
principle may be rewritten while unsafe, personal, unsupported, copyrighted,
financial-performance, targeting, or real-person material remains excluded.
The public website never names or links the Reddit identity.

Music videos, music links, lyrics, dangerous physical instructions,
harassment, hate, unsupported real-world claims, trading strategies,
performance promises, personal/family details, incidental replies, unrelated
material, and third-party-authored subreddit items do not enter public lore.

## Decision totals

| Decision | Count |
| --- | ---: |
${countRows.join("\n")}

## Item ledger

Comment bodies are withheld. Submission titles and canonical permalinks are
retained only for local internal auditability.

| Fullname | Surface | Title or safe label | Canonical permalink | Type | Decision | Reason | Destination |
| --- | --- | --- | --- | --- | --- | --- | --- |
${internalItemRows.join("\n")}
`;

  const internalLedgerSha256 = createHash("sha256")
    .update(internalLedger, "utf8")
    .digest("hex");
  const publicLedger = `# HAKKY Reddit Corpus Decision Index

This committed index proves that every retrieved item received one editorial
decision without publishing the account identity, post titles, comment bodies,
canonical permalinks, or direct source links. The full source ledger remains an
ignored local artifact.

- Collected at: ${corpus.collectedAt}
- Collection complete: yes
- Retrieved unique items: ${corpus.items.length.toLocaleString("en-US")}
- Raw corpus SHA-256: \`${corpusSha256}\`
- Internal ledger SHA-256: \`${internalLedgerSha256}\`
- Direct anonymous source JSON: unavailable with HTTP 403
- Coverage fallback: Arctic Shift public archive, paginated to an empty final
  page for all four approved surfaces

## Source coverage

| Surface | Provider | Pages | Complete |
| --- | --- | ---: | --- |
${corpus.sources.map((source) => (
    `| ${markdownCell(source.id)} | ${markdownCell(source.provider)} | ${source.pages} | yes |`
  )).join("\n")}

## Public-use boundary

Only rows marked \`included\` or \`included-as-theme\` may inform the public
seven-transmission canon. A thematic inclusion preserves only the safe abstract
principle. Unsafe, personal, unsupported, copyrighted, financial-performance,
targeting, and real-person material remains excluded.

Music videos, music links, lyrics, dangerous physical instructions,
harassment, hate, unsupported real-world claims, trading strategies,
performance promises, personal/family details, incidental replies, unrelated
material, and third-party-authored subreddit items do not enter public lore.

## Decision totals

| Decision | Count |
| --- | ---: |
${countRows.join("\n")}

## Redacted item index

Opaque sequence numbers prove row completeness without exposing source
identifiers. The raw corpus hash and ignored internal-ledger hash bind this
index to the locally reviewed evidence.

| Item | Surface | Type | Decision | Reason | Destination |
| --- | --- | --- | --- | --- | --- |
${publicItemRows.join("\n")}
`;

  return Object.freeze({
    internalLedger,
    internalLedgerSha256,
    publicLedger,
  });
}

async function writeAtomic(outputPath, bytes) {
  const temporaryPath = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath)}-${randomUUID()}.tmp`,
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await writeFile(temporaryPath, bytes, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function main({
  root = PROJECT_ROOT,
  stdout = process.stdout,
} = {}) {
  const corpusPath = path.join(root, "artifacts", "reddit-lore", "corpus.json");
  const internalOutputPath = path.join(
    root,
    "artifacts",
    "reddit-lore",
    "decision-ledger.md",
  );
  const publicOutputPath = path.join(root, "docs", "lore", "reddit-corpus-ledger.md");
  const corpusBytes = await readFile(corpusPath);
  const corpus = JSON.parse(corpusBytes.toString("utf8"));
  const corpusSha256 = createHash("sha256").update(corpusBytes).digest("hex");
  const ledgers = buildLoreLedgers(corpus, { corpusSha256 });

  await writeAtomic(internalOutputPath, ledgers.internalLedger);
  await writeAtomic(publicOutputPath, ledgers.publicLedger);

  stdout.write(`${JSON.stringify({
    ok: true,
    publicOutputPath: path.relative(root, publicOutputPath).replaceAll("\\", "/"),
    internalOutputPath: path.relative(root, internalOutputPath).replaceAll("\\", "/"),
    corpusSha256,
    internalLedgerSha256: ledgers.internalLedgerSha256,
    itemCount: corpus.items.length,
  }, null, 2)}\n`);
  return 0;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
