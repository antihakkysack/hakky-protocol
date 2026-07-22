import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanRepository } from "../scripts/check-repo.mjs";

async function scanFixture(files, { trackedFiles = Object.keys(files) } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents);
  }
  return scanRepository(root, { trackedFiles });
}

test("detects disallowed agency attribution without storing the name in source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  const disallowed = Buffer.from("ZnJlc2hkaWdpdGFs", "base64").toString("utf8");
  await writeFile(path.join(root, "README.md"), `Built by ${disallowed}`);
  const violations = await scanRepository(root, { trackedFiles: ["README.md"] });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "personal-project-only");
});

test("detects an active legacy product marker without storing it in source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  const legacyMarker = Buffer.from("c29saWRpdHk=", "base64").toString("utf8");
  await writeFile(path.join(root, "README.md"), `Built with ${legacyMarker}`);
  const violations = await scanRepository(root, { trackedFiles: ["README.md"] });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "legacy-product-active");
});

test("detects expanded active legacy vocabulary while excluding historical design records", async () => {
  const decodedMarkers = [
    "Yml0Y29pbg==",
    "ZXRoZXJldW0=",
    "cHJvb2Ygb2YgcmVzZXJ2ZXM=",
    "UmVzZXJ2ZVZhdWx0",
    "cHJvdmVuYW5jZQ==",
    "Y29tcGxpYW5jZQ==",
  ].map((value) => Buffer.from(value, "base64").toString("utf8"));
  const contents = decodedMarkers.join(" | ");
  const violations = await scanFixture({
    "README.md": contents,
    "docs/superpowers/specs/history.md": contents,
  });
  assert.deepEqual(violations, [{ file: "README.md", rule: "legacy-product-active" }]);
});

test("repository checker rejects retired agent labels on every active public surface", async () => {
  const retiredLabel = Buffer.from("QU5USUhBS0tZU0FDSyAvLyBBR0VOVCAwMDE=", "base64").toString("utf8");
  const activeFiles = [
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "brand/fixture.svg",
    "docs/LAUNCH.md",
    "docs/TOKEN.md",
    "docs/superpowers/plans/2026-07-22-hakky-live-launch.md",
    "launch/fixture.md",
    "package.json",
    "proof/fixture.md",
    "scripts/check-site.mjs",
    "scripts/render-assets.mjs",
    "src/social-copy.mjs",
    "web/fixture.html",
  ];
  const violations = await scanFixture(Object.fromEntries(
    activeFiles.map((file) => [file, retiredLabel]),
  ));

  assert.deepEqual(violations, activeFiles.map((file) => ({
    file,
    rule: "retired-agent-identity",
  })));
});

test("repository checker normalizes case, compatibility forms, and invisible retired display labels", async () => {
  const [retiredName, retiredMascot, retiredBadge] = [
    "QW50aUhha2t5U2Fjaw==",
    "U2FjayBTZW50aW5lbA==",
    "QWdlbnQgMDAx",
  ].map((value) => Buffer.from(value, "base64").toString("utf8"));
  const alternatingCase = (value) => [...value].map((character, index) => (
    index % 2 ? character.toUpperCase() : character.toLowerCase()
  )).join("");
  const fullwidth = (value) => [...value].map((character) => {
    const code = character.codePointAt(0);
    return code >= 0x21 && code <= 0x7e ? String.fromCodePoint(code + 0xfee0) : character;
  }).join("");
  const fixtures = {
    "brand/mixed-name.svg": alternatingCase(retiredName),
    "launch/invisible-name.md": `${retiredName.slice(0, 4)}\u200b${retiredName.slice(4)}`,
    "proof/lower-mascot.md": retiredMascot.toLowerCase(),
    "web/invisible-mascot.html": retiredMascot.replace(" ", "\u2060"),
    "web/bidi-badge.html": `${retiredBadge.slice(0, 2)}\u202e${retiredBadge.slice(2)}`,
    "web/fullwidth-badge.html": fullwidth(retiredBadge),
  };

  assert.deepEqual(await scanFixture(fixtures), Object.keys(fixtures).sort().map((file) => ({
    file,
    rule: "retired-agent-identity",
  })));
});

test("repository checker rejects unsupported HakkyAgent claims on active surfaces", async () => {
  const violations = await scanFixture({
    "README.md": "HakkyAgent verifies every good transaction and guarantees safety.",
    "proof/claim.md": "HakkyAgent guarantees scam detection and returns.",
  });

  assert.deepEqual(violations, [
    { file: "README.md", rule: "unsupported-agent-claim" },
    { file: "proof/claim.md", rule: "unsupported-agent-claim" },
  ]);
});

test("repository checker rejects claim bypasses across active surfaces outside the identity file list", async () => {
  const violations = await scanFixture({
    "CONTRIBUTING.md": "HakkyAgent is a guaranteed scam detector.",
    "brand/claim.svg": "HakkyAgent verifies every Solana transaction.",
    "docs/TOKEN.md": "HakkyAgent au\u202edits arbitrary tokens.",
    "scripts/render-assets.mjs": "HakkyAgent\nverifies every transaction.",
    "src/social-copy.mjs": "Hakky\u200bAgent guarantees scam detection.",
  });

  assert.deepEqual(violations, [
    { file: "CONTRIBUTING.md", rule: "unsupported-agent-claim" },
    { file: "brand/claim.svg", rule: "unsupported-agent-claim" },
    { file: "docs/TOKEN.md", rule: "unsupported-agent-claim" },
    { file: "scripts/render-assets.mjs", rule: "unsupported-agent-claim" },
    { file: "src/social-copy.mjs", rule: "unsupported-agent-claim" },
  ]);
});

test("repository checker rejects rendered character-reference identity and claim bypasses", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  const retiredLabel = Buffer.from("U2FjayBTZW50aW5lbA==", "base64").toString("utf8");
  const encodedAlias = retiredAlias.replace("s", "&#115;");
  const encodedLabel = retiredLabel.replace(" ", "&nbsp;");
  const violations = await scanFixture({
    "brand/named-claim.svg": "HakkyAgent verifies ev&escr;ry transaction.",
    "docs/TOKEN.md": "HakkyAgent verifies ev&#x65;ry transaction.",
    "launch/encoded-alias.md": encodedAlias,
    "proof/encoded-label.md": encodedLabel,
    "web/numeric-claim.html": "HakkyAgent verifies ev&#101;ry transaction.",
  });

  assert.deepEqual(violations, [
    { file: "brand/named-claim.svg", rule: "unsupported-agent-claim" },
    { file: "docs/TOKEN.md", rule: "unsupported-agent-claim" },
    { file: "launch/encoded-alias.md", rule: "retired-agent-identity" },
    { file: "proof/encoded-label.md", rule: "retired-agent-identity" },
    { file: "web/numeric-claim.html", rule: "unsupported-agent-claim" },
  ]);
});

test("repository checker preserves exact account destinations and harmless rendered entities", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  assert.deepEqual(await scanFixture({
    "launch/harmless-entities.md": "HakkyAgent verifies published HAKKY launch facts &amp; evidence.",
    "web/account-with-copy.html": [
      `<a href="https://x.com/${retiredAlias}">X</a>`,
      "<p>HakkyAgent documents &notARealEntity; literally.</p>",
    ].join("\n"),
  }), []);
});

test("repository checker allows explicit claim disclaimers on active surfaces", async () => {
  assert.deepEqual(await scanFixture({
    "brand/disclaimer.svg": "HakkyAgent does not verify every transaction.",
    "docs/TOKEN.md": "HakkyAgent does not audit arbitrary tokens.",
    "src/social-copy.mjs": "HakkyAgent never predicts scams.",
    "web/disclaimer.html": "HakkyAgent is not a guaranteed scam detector.",
  }), []);
});

test("repository checker rejects lower-case retired aliases outside exact account addresses", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  const violations = await scanFixture({
    "README.md": `Topics: ${retiredAlias}`,
    "launch/extended-addresses.md": [
      `https://x.com/${retiredAlias}/status/1`,
      `https://github.com/${retiredAlias}/hakky-protocol/issues`,
    ].join("\n"),
  });

  assert.deepEqual(violations, [
    { file: "README.md", rule: "retired-agent-identity" },
    { file: "launch/extended-addresses.md", rule: "retired-agent-identity" },
  ]);
});

test("repository checker rejects Unicode and zero-width extensions of retired account addresses", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  const violations = await scanFixture({
    "web/unicode-addresses.html": [
      `@${retiredAlias}\u00e9`,
      `https://x.com/${retiredAlias}\u00e9`,
      `@${retiredAlias}\u0301`,
      `@${retiredAlias}\u200b/status/1`,
    ].join("\n"),
  });

  assert.deepEqual(violations, [
    { file: "web/unicode-addresses.html", rule: "retired-agent-identity" },
  ]);
});

test("repository checker rejects query, fragment, path, and dot-path account extensions", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  const violations = await scanFixture({
    "brand/handle-dot-path.svg": `@${retiredAlias}./status/1`,
    "brand/handle-fragment.svg": `@${retiredAlias}#profile`,
    "brand/handle-path.svg": `@${retiredAlias}/status/1`,
    "brand/handle-query.svg": `@${retiredAlias}?utm=1`,
    "launch/github-query.md": `https://github.com/${retiredAlias}/hakky-protocol.git?ref=x`,
    "proof/x-dot-path.md": `https://x.com/${retiredAlias}./status/1`,
    "web/x-query.html": `https://x.com/${retiredAlias}?utm=1`,
  });

  assert.deepEqual(violations, [
    { file: "brand/handle-dot-path.svg", rule: "retired-agent-identity" },
    { file: "brand/handle-fragment.svg", rule: "retired-agent-identity" },
    { file: "brand/handle-path.svg", rule: "retired-agent-identity" },
    { file: "brand/handle-query.svg", rule: "retired-agent-identity" },
    { file: "launch/github-query.md", rule: "retired-agent-identity" },
    { file: "proof/x-dot-path.md", rule: "retired-agent-identity" },
    { file: "web/x-query.html", rule: "retired-agent-identity" },
  ]);
});

test("repository checker rejects punctuation-led extensions after every approved account form", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  const approvedForms = {
    handle: `@${retiredAlias}`,
    x: `https://x.com/${retiredAlias}`,
    github: `https://github.com/${retiredAlias}/hakky-protocol`,
    "github-git": `https://github.com/${retiredAlias}/hakky-protocol.git`,
  };
  const punctuationExtensions = {
    semicolon: ";status",
    colon: ":status",
    comma: ",status",
    exclamation: "!status",
  };
  const fixtures = Object.fromEntries(Object.entries(approvedForms).flatMap(
    ([formName, address]) => Object.entries(punctuationExtensions).map(
      ([punctuationName, extension]) => [
        `web/${formName}-${punctuationName}-extension.txt`,
        `${address}${extension}`,
      ],
    ),
  ));
  const violations = await scanFixture(fixtures);

  assert.deepEqual(violations, Object.keys(fixtures).sort().map((file) => ({
    file,
    rule: "retired-agent-identity",
  })));
});

test("repository checker preserves terminal punctuation before safe followers", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  const address = `https://x.com/${retiredAlias}`;
  const sentencePunctuation = {
    period: ".",
    comma: ",",
    semicolon: ";",
    colon: ":",
    exclamation: "!",
  };
  const closingDelimiters = {
    "double-quote": "\"",
    "single-quote": "'",
    backtick: "`",
    bracket: "]",
    parenthesis: ")",
    brace: "}",
    angle: ">",
  };
  const fixtures = {};
  for (const [punctuationName, punctuation] of Object.entries(sentencePunctuation)) {
    fixtures[`web/${punctuationName}-at-end.txt`] = `${address}${punctuation}`;
    fixtures[`web/${punctuationName}-before-whitespace.txt`] = `${address}${punctuation} next`;
    for (const [delimiterName, delimiter] of Object.entries(closingDelimiters)) {
      fixtures[`web/${punctuationName}-before-${delimiterName}.txt`] = `${address}${punctuation}${delimiter}`;
    }
  }

  assert.deepEqual(await scanFixture(fixtures), []);
});

test("repository checker allows only the exact approved retired account addresses", async () => {
  const retiredAlias = Buffer.from("YW50aWhha2t5c2Fjaw==", "base64").toString("utf8");
  assert.deepEqual(await scanFixture({
    "launch/account-addresses.md": [
      `Handle: \`@${retiredAlias}\``,
      `Repository: [source](https://github.com/${retiredAlias}/hakky-protocol)`,
    ].join("\n"),
    "package.json": JSON.stringify({
      repository: { url: `https://github.com/${retiredAlias}/hakky-protocol.git` },
    }),
    "web/account-link.html": `<a href="https://x.com/${retiredAlias}">X</a>`,
    "web/account-sentences.html": [
      `Follow @${retiredAlias}.`,
      `X account: https://x.com/${retiredAlias}.`,
      `Repository: https://github.com/${retiredAlias}/hakky-protocol.`,
      `Clone URL: https://github.com/${retiredAlias}/hakky-protocol.git.`,
      `Follow @${retiredAlias}, then verify the profile.`,
      `Official X: https://x.com/${retiredAlias}!`,
    ].join("\n"),
  }), []);
});

test("identity rules exclude internal history and fixtures while secret scanning remains global", async () => {
  const retiredLabel = Buffer.from("U2FjayBTZW50aW5lbA==", "base64").toString("utf8");
  const unsupportedClaim = "HakkyAgent verifies every good transaction and guarantees safety.";
  const sensitiveAssignment = `const apiKey = "${["SYNTHETIC", "OPAQUE", "LITERAL"].join("_")}";`;
  const violations = await scanFixture({
    "docs/superpowers/plans/history.md": `${retiredLabel}\n${unsupportedClaim}`,
    "scripts/check-repo.mjs": `${retiredLabel}\n${unsupportedClaim}\n${sensitiveAssignment}`,
    "src/internal.mjs": `${retiredLabel}\n${unsupportedClaim}`,
    "test/negative-fixture.test.mjs": `${retiredLabel}\n${unsupportedClaim}\n${sensitiveAssignment}`,
  });

  assert.deepEqual(violations, [
    { file: "scripts/check-repo.mjs", rule: "secret-credential-assignment" },
    { file: "test/negative-fixture.test.mjs", rule: "secret-credential-assignment" },
  ]);
});

test("detects credential assignments, private-key material, mnemonic phrases, wallet arrays, and service tokens", async () => {
  const credentialName = ["API", "KEY"].join("_");
  const headerFixture = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
  const footerFixture = ["-----END ", "PRIVATE KEY-----"].join("");
  const phraseAssignmentName = ["seed", "phrase"].join("_");
  const phraseFixture = Array.from({ length: 12 }, (_, index) => `fixtureword${String.fromCharCode(97 + index)}`).join(" ");
  const serviceFixture = ["ghp", "_", "A".repeat(36)].join("");
  const fixtures = {
    ".env.production": `${credentialName}=${"a".repeat(32)}\n`,
    "signing.pem": `${headerFixture}\n${"A".repeat(48)}\n${footerFixture}\n`,
    "recovery.txt": `${phraseAssignmentName}=${phraseFixture}\n`,
    "wallet-key.json": JSON.stringify(Array.from({ length: 64 }, (_, index) => index)),
    "service.txt": `token=${serviceFixture}\n`,
  };
  const violations = await scanFixture(fixtures);
  const rules = new Set(violations.map(({ rule }) => rule));
  for (const rule of [
    "secret-credential-assignment",
    "secret-private-key-material",
    "secret-mnemonic-phrase",
    "secret-wallet-key-array",
    "secret-service-token",
  ]) {
    assert.ok(rules.has(rule), `${rule} was not detected`);
  }
});

test("detects current GitHub token prefixes with underscore-bearing synthetic bodies", async () => {
  const prefixes = [
    ["github", "pat", ""].join("_"),
    ...["p", "o", "u", "s", "r"].map((kind) => ["gh", kind, "_"].join("")),
  ];
  const syntheticBody = ["SYNTHETIC", "NONFUNCTIONAL", "MARKER", "A".repeat(40)].join("_");
  const fixtures = Object.fromEntries(prefixes.map((prefix, index) => [
    `github-token-${index}.txt`,
    `fixture=${prefix}${syntheticBody}\n`,
  ]));

  assert.deepEqual(await scanFixture(fixtures), Object.keys(fixtures).sort().map((file) => ({
    file,
    rule: "secret-service-token",
  })));
});

test("does not classify short or unrelated GitHub-like synthetic markers as service tokens", async () => {
  const fineGrainedPrefix = ["github", "pat", ""].join("_");
  const classicPrefix = ["gh", "p", "_"].join("");
  assert.deepEqual(await scanFixture({
    "short-fine-grained.txt": `fixture=${fineGrainedPrefix}SHORT_MARKER\n`,
    "short-classic.txt": `fixture=${classicPrefix}SHORT_MARKER\n`,
    "unrelated-prefix.txt": `fixture=${["gh", "x", "_"].join("")}${"A".repeat(48)}\n`,
  }), []);
});

test("detects current stateless GitHub installation tokens with official punctuation and length", async () => {
  const installationPrefix = ["gh", "s", "_"].join("");
  const statelessBody = [
    "A".repeat(260),
    ".",
    ["B".repeat(80), "-", "C".repeat(89)].join(""),
    ".",
    ["D".repeat(40), "_", "E".repeat(49)].join(""),
  ].join("");
  const installationFixture = `${installationPrefix}${statelessBody}`;

  assert.ok(installationFixture.length >= 520);
  assert.deepEqual(await scanFixture({
    "bounded-installation-token.txt": `fixture=(${installationFixture})\n`,
  }), [
    { file: "bounded-installation-token.txt", rule: "secret-service-token" },
  ]);
});

test("keeps GitHub installation token boundaries and short false-positive controls", async () => {
  const installationPrefix = ["gh", "s", "_"].join("");
  const longBody = ["A".repeat(180), ".", "B".repeat(180), ".", "C".repeat(180)].join("");
  assert.deepEqual(await scanFixture({
    "embedded-prefix.txt": `fixture=x${installationPrefix}${longBody}\n`,
    "short-installation.txt": `fixture=${installationPrefix}${"A".repeat(35)}\n`,
    "unrelated-installation.txt": `fixture=${["gh", "x", "_"].join("")}${longBody}\n`,
  }), []);
});

test("detects multiline YAML credential scalars and indented block values", async () => {
  const apiCredential = ["api", "key"].join("_");
  const clientCredential = ["client", "secret"].join("_");
  const opaqueScalar = ["SYNTHETIC", "MULTILINE", "CREDENTIAL"].join("_");
  const violations = await scanFixture({
    "block-value.yml": `${clientCredential}:\n  |-\n    ${opaqueScalar}\n    SECOND_FRAGMENT\n`,
    "list-block-value.yml": `- ${apiCredential}: |\n    ${opaqueScalar}\n`,
    "list-plain-value.yml": `- ${apiCredential}:\n    ${opaqueScalar}\n`,
    "plain-scalar.yml": `${apiCredential}:\n  ${opaqueScalar}\n`,
    "standard-block.yml": `${apiCredential}: >-\n  ${opaqueScalar}\n  SECOND_FRAGMENT\n`,
  });

  assert.deepEqual(violations, [
    { file: "block-value.yml", rule: "secret-credential-assignment" },
    { file: "list-block-value.yml", rule: "secret-credential-assignment" },
    { file: "list-plain-value.yml", rule: "secret-credential-assignment" },
    { file: "plain-scalar.yml", rule: "secret-credential-assignment" },
    { file: "standard-block.yml", rule: "secret-credential-assignment" },
  ]);
});

test("multiline YAML credential scanning preserves placeholders, environment references, and containers", async () => {
  const apiCredential = ["api", "key"].join("_");
  const clientCredential = ["client", "secret"].join("_");
  const environmentReference = ["${", "SECRET_FROM_ENV", "}"].join("");
  assert.deepEqual(await scanFixture({
    "environment.yml": `${apiCredential}:\n  ${environmentReference}\n`,
    "list-container.yml": `- ${clientCredential}:\n    provider:\n      name: example\n`,
    "list-environment.yml": `- ${apiCredential}:\n    ${environmentReference}\n`,
    "list-placeholder-block.yml": `- ${apiCredential}: |\n    REDACTED\n`,
    "list-placeholder.yml": `- ${apiCredential}:\n    REDACTED\n`,
    "nested-container.yml": `${clientCredential}:\n  provider:\n    name: example\n`,
    "placeholder-block.yml": `${apiCredential}:\n  |\n    REDACTED\n`,
    "placeholder-standard-block.yml": `${clientCredential}: |\n  REDACTED\n`,
    "unrelated.yml": `description:\n  ${["SYNTHETIC", "PUBLIC", "TEXT"].join("_")}\n`,
  }), []);
});

test("credential assignments cannot hide behind names, uppercase literals, or public URLs", async () => {
  const assignmentName = ["API", "KEY"].join("_");
  const colonAssignmentName = ["API", "KEY"].join(":");
  const definitionLikeAssignmentName = [assignmentName, "PATTERN"].join("_");
  const opaqueUppercase = "A".repeat(32);
  const opaqueLowercase = ["lowercase", "opaque", "value"].join("-");
  const opaqueUrl = ["https://example.com", "opaque-secret-path"].join("/");

  assert.deepEqual(await scanFixture({
    "colon.env": `${colonAssignmentName}=${opaqueLowercase}\n`,
    "lowercase-pattern.env": `${definitionLikeAssignmentName}=${opaqueLowercase}\n`,
    "uppercase.env": `${assignmentName}=${opaqueUppercase}\n`,
    "url.env": `token=${opaqueUrl}\n`,
  }), [
    { file: "colon.env", rule: "secret-credential-assignment" },
    { file: "lowercase-pattern.env", rule: "secret-credential-assignment" },
    { file: "uppercase.env", rule: "secret-credential-assignment" },
    { file: "url.env", rule: "secret-credential-assignment" },
  ]);
});

test("detects credential assignments embedded in ordinary single-line code without flagging unrelated properties", async () => {
  const credentialProperty = ["api", "Key"].join("");
  const opaqueLiteral = ["SYNTHETIC", "OPAQUE", "LITERAL"].join("_");
  const violations = await scanFixture({
    "inline-safe.mjs": `const config = { monkey: "${opaqueLiteral}", apiUrl: "https://example.test" };\n`,
    "inline-sensitive.mjs": `const config = { ${credentialProperty}: "${opaqueLiteral}" };\n`,
  });

  assert.deepEqual(violations, [
    { file: "inline-sensitive.mjs", rule: "secret-credential-assignment" },
  ]);
});

test("invalidates an environment alias after reassignment while preserving an unchanged alias", async () => {
  const environmentName = ["API", "KEY"].join("_");
  const credentialProperty = ["api", "Key"].join("");
  const opaqueLiteral = ["SYNTHETIC", "OPAQUE", "LITERAL"].join("_");
  const changedAlias = ["runtime", "Credential"].join("");
  const stableAlias = ["stable", "Credential"].join("");
  const violations = await scanFixture({
    "changed-alias.mjs": [
      `let ${changedAlias} = process.env.${environmentName};`,
      `${changedAlias} = "${opaqueLiteral}";`,
      `const config = { ${credentialProperty}: ${changedAlias} };`,
    ].join("\n"),
    "stable-alias.mjs": [
      `const ${stableAlias} = process.env.${environmentName};`,
      `const config = { ${credentialProperty}: ${stableAlias} };`,
    ].join("\n"),
  });

  assert.deepEqual(violations, [
    { file: "changed-alias.mjs", rule: "secret-credential-assignment" },
  ]);
});

test("explicit placeholder and environment-reference allowlist avoids false positives", async () => {
  const environmentName = ["API", "KEY"].join("_");
  const boundReferenceName = ["RUNTIME", "CREDENTIAL", "REFERENCE"].join("_");
  const githubReference = ["${{", "secrets.DEPLOY_TOKEN", "}}"].join(" ");
  const safe = [
    `const apiKey = process.env.${environmentName};`,
    `const ${boundReferenceName} = process.env.${environmentName};`,
    `apiKey=${boundReferenceName}`,
    `${environmentName}=REDACTED`,
    ["password", "change-me"].join("="),
    ["client_secret", "${SECRET_FROM_ENV}"].join("="),
    `token=${githubReference}`,
    `${environmentName}=<API_KEY>`,
  ].join("\n");
  assert.deepEqual(await scanFixture({ "safe-fixtures.txt": safe }), []);
});

test("repository scan is deterministic and ignores untracked files", async () => {
  const credentialName = ["API", "KEY"].join("_");
  const violations = await scanFixture({
    "tracked.txt": "public information\n",
    "untracked.env": `${credentialName}=${"b".repeat(32)}\n`,
  }, { trackedFiles: ["tracked.txt"] });
  assert.deepEqual(violations, []);
});

test("Pages deployment has no manual dispatch and still depends on reusable quality", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.match(workflow, /quality:\s+[\s\S]*uses: \.\/\.github\/workflows\/quality\.yml/);
  assert.match(workflow, /deploy:\s+[\s\S]*needs: quality/);
});

test("legacy contracts and services ignore remnants are not tracked", async () => {
  for (const file of ["contracts/.gitignore", "services/.gitignore", "services/.dockerignore"]) {
    await assert.rejects(access(file), { code: "ENOENT" });
  }
});

test("the repository contains no disallowed attribution or active legacy product", async () => {
  assert.deepEqual(await scanRepository(process.cwd()), []);
});
