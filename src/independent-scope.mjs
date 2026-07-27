import {
  assertBuildRecord,
  serializeBuildRecord,
} from "./release-manifest.mjs";
import { parseExactCliOptions } from "./exact-cli-options.mjs";
import { sha256Hex } from "./metadata-integrity.mjs";

export const INDEPENDENT_AUTHORITIES_PATH =
  "config/independent-evidence-authorities-v1.json";
export const INDEPENDENT_DESIGN_SPEC_PATH =
  "docs/superpowers/specs/2026-07-24-hakky-immutable-curve-pool-design.md";
export const INDEPENDENT_VECTOR_PATH =
  "programs/hakky-market/test-vectors/curve-pool-v1.json";
export const INDEPENDENT_VECTOR_SIDECAR_PATH =
  "programs/hakky-market/test-vectors/curve-pool-v1.json.sha256";
export const INDEPENDENT_EVIDENCE_CLASSES = Object.freeze([
  "security-audit",
  "economic-review",
  "independent-reproduction",
]);

const INPUT_KEYS = Object.freeze([
  "evidenceClass",
  "authorityRegistryBytes",
  "candidateBytes",
  "sourceArchiveBytes",
  "cargoLockBytes",
  "releaseConfigBytes",
  "designSpecBytes",
  "curveVectorBytes",
  "curveVectorSidecarBytes",
  "buildRecordBytes",
  "sourceCommit",
  "gitStatus",
]);
const SCOPE_KEYS = Object.freeze([
  "schemaVersion",
  "evidenceClass",
  "authorityRegistrySha256",
  "candidateSha256",
  "sourceCommit",
  "sourceArchiveSha256",
  "cargoLockSha256",
  "releaseConfigSha256",
  "designSpecSha256",
  "curveVectorSha256",
  "buildRecordSha256",
  "executableSha256",
  "executableLength",
]);
const AUTHORITY_KEYS = Object.freeze([
  "authorityId",
  "organization",
  "role",
  "sourceOrigin",
  "engagementUrl",
  "evidencePathPrefix",
  "ed25519PublicKey",
  "engagementSha256",
  "engagementApprovedAtUtc",
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const WHOLE_SECOND_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const CANDIDATE_PATTERN =
  /^artifacts\/build\/candidate\/([a-z0-9][a-z0-9-]*)\/hakky_market\.so$/u;
const BUILD_RECORD_PATTERN =
  /^artifacts\/build\/candidate\/([a-z0-9][a-z0-9-]*)\/build-record\.json$/u;

function fail() {
  throw new Error("independent-scope-invalid");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expected) {
  if (!isPlainObject(value)) fail();
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail();
  }
}

function exactBuffer(value) {
  if (!(value instanceof Uint8Array)) fail();
  const bytes = Buffer.from(value);
  if (bytes.byteLength === 0) fail();
  return bytes;
}

function canonicalAuthority(authority) {
  assertExactKeys(authority, AUTHORITY_KEYS);
  if (
    !/^[a-z0-9][a-z0-9-]{0,62}$/u.test(authority.authorityId) ||
    typeof authority.organization !== "string" ||
    authority.organization.trim() !== authority.organization ||
    authority.organization.length === 0 ||
    authority.organization.length > 200 ||
    !INDEPENDENT_EVIDENCE_CLASSES.includes(authority.role) ||
    !/^\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+\/$/u.test(
      authority.evidencePathPrefix,
    ) ||
    !SHA256_PATTERN.test(authority.ed25519PublicKey) ||
    !SHA256_PATTERN.test(authority.engagementSha256) ||
    !WHOLE_SECOND_UTC_PATTERN.test(authority.engagementApprovedAtUtc) ||
    new Date(authority.engagementApprovedAtUtc).toISOString().replace(".000Z", "Z") !==
      authority.engagementApprovedAtUtc
  ) {
    fail();
  }
  let origin;
  let engagement;
  try {
    origin = new URL(authority.sourceOrigin);
    engagement = new URL(authority.engagementUrl);
  } catch {
    fail();
  }
  if (
    origin.protocol !== "https:" ||
    origin.origin !== authority.sourceOrigin ||
    origin.username ||
    origin.password ||
    origin.port ||
    engagement.protocol !== "https:" ||
    engagement.origin !== authority.sourceOrigin ||
    engagement.username ||
    engagement.password ||
    engagement.port ||
    engagement.search ||
    engagement.hash ||
    !engagement.pathname.startsWith(authority.evidencePathPrefix) ||
    /%[0-9a-f]{2}/iu.test(authority.engagementUrl)
  ) {
    fail();
  }
  return Object.fromEntries(
    AUTHORITY_KEYS.map(key => [key, authority[key]]),
  );
}

function serializeAuthorities(value) {
  assertExactKeys(value, ["schemaVersion", "authorities"]);
  if (
    value.schemaVersion !== "hakky-independent-authorities-v1" ||
    !Array.isArray(value.authorities)
  ) {
    fail();
  }
  const authorities = value.authorities.map(canonicalAuthority);
  const ids = authorities.map(({ authorityId }) => authorityId);
  if (new Set(ids).size !== ids.length) fail();
  return Buffer.from(
    `${JSON.stringify({
      schemaVersion: "hakky-independent-authorities-v1",
      authorities,
    })}\n`,
    "utf8",
  );
}

export function assertIndependentAuthoritiesBytes(value) {
  const bytes = exactBuffer(value);
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail();
  }
  if (!bytes.equals(serializeAuthorities(parsed))) fail();
  return Object.freeze({
    schemaVersion: parsed.schemaVersion,
    authorities: Object.freeze(
      parsed.authorities.map(authority =>
        Object.freeze({ ...authority }),
      ),
    ),
  });
}

export function assertIndependentScopeV1(value) {
  assertExactKeys(value, SCOPE_KEYS);
  if (
    value.schemaVersion !== "hakky-independent-scope-v1" ||
    !INDEPENDENT_EVIDENCE_CLASSES.includes(value.evidenceClass) ||
    !GIT_COMMIT_PATTERN.test(value.sourceCommit) ||
    value.candidateSha256 !== value.executableSha256
  ) {
    fail();
  }
  for (const key of SCOPE_KEYS.filter(key => key.endsWith("Sha256"))) {
    if (!SHA256_PATTERN.test(value[key])) fail();
  }
  if (
    !/^[1-9][0-9]{0,5}$/u.test(value.executableLength) ||
    Number(value.executableLength) > 120_000
  ) {
    fail();
  }
  return value;
}

export function serializeIndependentScopeV1(value) {
  assertIndependentScopeV1(value);
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

export function buildIndependentScopeV1(input) {
  assertExactKeys(input, INPUT_KEYS);
  if (
    !INDEPENDENT_EVIDENCE_CLASSES.includes(input.evidenceClass) ||
    !GIT_COMMIT_PATTERN.test(input.sourceCommit) ||
    !["", "ok"].includes(input.gitStatus.trim())
  ) {
    fail();
  }
  const authorityRegistryBytes = exactBuffer(input.authorityRegistryBytes);
  assertIndependentAuthoritiesBytes(authorityRegistryBytes);
  const candidateBytes = exactBuffer(input.candidateBytes);
  if (candidateBytes.byteLength > 120_000) fail();
  const sourceArchiveBytes = exactBuffer(input.sourceArchiveBytes);
  const cargoLockBytes = exactBuffer(input.cargoLockBytes);
  const releaseConfigBytes = exactBuffer(input.releaseConfigBytes);
  const designSpecBytes = exactBuffer(input.designSpecBytes);
  const curveVectorBytes = exactBuffer(input.curveVectorBytes);
  const curveVectorSidecarBytes = exactBuffer(
    input.curveVectorSidecarBytes,
  );
  const buildRecordBytes = exactBuffer(input.buildRecordBytes);
  const curveVectorSha256 = sha256Hex(curveVectorBytes);
  if (
    !curveVectorSidecarBytes.equals(
      Buffer.from(`${curveVectorSha256}\n`, "utf8"),
    )
  ) {
    fail();
  }
  let buildRecord;
  try {
    buildRecord = JSON.parse(buildRecordBytes.toString("utf8"));
    assertBuildRecord(buildRecord);
  } catch {
    fail();
  }
  if (!buildRecordBytes.equals(serializeBuildRecord(buildRecord))) fail();
  const candidateSha256 = sha256Hex(candidateBytes);
  if (
    buildRecord.source.commit !== input.sourceCommit ||
    buildRecord.source.clean !== true ||
    buildRecord.executable.sha256 !== candidateSha256 ||
    buildRecord.executable.byteLength !== candidateBytes.byteLength ||
    buildRecord.dependencies.cargoLockSha256 !== sha256Hex(cargoLockBytes) ||
    buildRecord.release.configSha256 !== sha256Hex(releaseConfigBytes)
  ) {
    fail();
  }
  const scope = Object.freeze({
    schemaVersion: "hakky-independent-scope-v1",
    evidenceClass: input.evidenceClass,
    authorityRegistrySha256: sha256Hex(authorityRegistryBytes),
    candidateSha256,
    sourceCommit: input.sourceCommit,
    sourceArchiveSha256: sha256Hex(sourceArchiveBytes),
    cargoLockSha256: sha256Hex(cargoLockBytes),
    releaseConfigSha256: sha256Hex(releaseConfigBytes),
    designSpecSha256: sha256Hex(designSpecBytes),
    curveVectorSha256,
    buildRecordSha256: sha256Hex(buildRecordBytes),
    executableSha256: candidateSha256,
    executableLength: String(candidateBytes.byteLength),
  });
  const scopeBytes = serializeIndependentScopeV1(scope);
  return Object.freeze({
    scope,
    scopeBytes,
    scopeSha256: sha256Hex(scopeBytes),
  });
}

export function parseIndependentScopeOptions(argv) {
  const usage =
    "Usage: npm run evidence:scope -- --class <security-audit|economic-review|independent-reproduction> --candidate artifacts/build/candidate/<id>/hakky_market.so --build-record artifacts/build/candidate/<id>/build-record.json --output-root artifacts/independent-evidence/scopes/<class>";
  const parsed = parseExactCliOptions(argv, {
    usage,
    definitions: [
      {
        flag: "--class",
        key: "evidenceClass",
        validate(value) {
          if (!INDEPENDENT_EVIDENCE_CLASSES.includes(value)) {
            throw new Error(usage);
          }
        },
      },
      {
        flag: "--candidate",
        key: "candidatePath",
        validate(value) {
          if (!CANDIDATE_PATTERN.test(value)) throw new Error(usage);
        },
      },
      {
        flag: "--build-record",
        key: "buildRecordPath",
        validate(value) {
          if (!BUILD_RECORD_PATTERN.test(value)) throw new Error(usage);
        },
      },
      {
        flag: "--output-root",
        key: "outputRoot",
        validate(value) {
          if (
            !/^artifacts\/independent-evidence\/scopes\/(?:security-audit|economic-review|independent-reproduction)$/u.test(
              value,
            )
          ) {
            throw new Error(usage);
          }
        },
      },
    ],
  });
  const candidateId = CANDIDATE_PATTERN.exec(parsed.candidatePath)?.[1];
  const buildId = BUILD_RECORD_PATTERN.exec(parsed.buildRecordPath)?.[1];
  if (
    candidateId !== buildId ||
    parsed.outputRoot !==
      `artifacts/independent-evidence/scopes/${parsed.evidenceClass}`
  ) {
    throw new Error("candidate and scope paths must match");
  }
  return parsed;
}
