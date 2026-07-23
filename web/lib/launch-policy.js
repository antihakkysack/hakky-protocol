import { validateLaunchShape } from "./launch-schema.generated.js";

export const EXPECTED_AUTHORITY_LIFECYCLE = Object.freeze({
  curveMintAuthority: "launchlab-program-pda",
  graduatedMintAuthority: null,
  freezeAuthority: null,
});

// The legacy keys remain exported until the v1 proof collectors are migrated by
// their dedicated tasks. Public launch validation below accepts only v2 records.
export const EXPECTED_POLICY = Object.freeze({
  network: "mainnet-beta",
  tokenProgram: "spl-token",
  tokenProgramAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  name: "Hakky Protocol",
  symbol: "HAKKY",
  decimals: 6,
  supplyUi: "1000000",
  supplyBaseUnits: "1000000000000",
  curveAllocationBps: 8000,
  liquidityAllocationBps: 2000,
  teamAllocationBps: 0,
  graduationTargetSol: "24",
  creatorFirstBuySol: "0",
  creatorFeeEnabled: false,
  lpPolicy: "burn",
  creatorSpendCapSol: "1.00",
  metadataImage: "https://hakky.xyz/assets/token.png",
  metadataWebsite: "https://hakky.xyz",
  metadataX: "https://x.com/antihakkysack",
});

export const LAUNCH_RECORD_SCHEMA_VERSION = 2;
export const LAUNCH_RECORD_FIELDS = Object.freeze(["schemaVersion", "status", "network", "project", "token", "launch", "proof"]);
export const PROJECT_FIELDS = Object.freeze(["name", "symbol", "personalProject"]);
export const TOKEN_FIELDS = Object.freeze([
  "mint", "program", "decimals", "supplyUi", "supplyBaseUnits", "mintAuthority", "freezeAuthority",
  "transferFeeBps", "transferHook", "blacklistControl", "permanentDelegate", "metadataImmutable",
  "metadataImage", "metadataWebsite", "metadataX",
]);
export const LAUNCH_FIELDS = Object.freeze([
  "platform", "quoteAsset", "curveAllocationBps", "liquidityAllocationBps", "teamAllocationBps", "presale",
  "vesting", "graduationTargetSol", "creatorFirstBuySol", "creatorFeeEnabled", "lpPolicy", "creatorSpendCapSol",
]);
export const LIVE_PROOF_FIELDS = Object.freeze([
  "mint", "creator", "launchId", "launchTransaction", "solscanUrl", "solscanTransactionUrl", "raydiumUrl",
  "mintVerifiedAt", "launchVerifiedAt", "verifiedAt", "supplyBaseUnits", "decimals", "tokenProgram",
  "mintAuthority", "freezeAuthority", "creatorBalanceBaseUnits", "metadataImmutable", "metadataName",
  "metadataSymbol", "metadataUri", "metadataImage", "metadataWebsite", "metadataX", "curveAllocationBps",
  "liquidityAllocationBps", "teamAllocationBps", "creatorFeeEnabled", "lpPolicy", "quoteAsset",
  "graduationTargetSol", "creatorFirstBuySol", "creatorSpendSol",
]);

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const PUBLIC_KEY_FIELDS = new Set([
  "address", "associatedToken", "baseVault", "configId", "creator", "feeKey", "launchId",
  "launchlab", "launchlabAuthority", "lockNftMint", "lockNftTokenAccount", "lockProgram",
  "lockedPosition", "lockVault", "lpMint", "metadata", "metadataAccount", "migration", "mint",
  "mintAuthority", "owner", "ownerProgram", "platformConfig", "pool", "programId", "quoteMint",
  "quoteVault", "system", "token", "tokenProgram", "updateAuthority", "withdrawalAuthority",
]);
const SIGNATURE_FIELDS = new Set(["creationSignature", "signature"]);
const TIMESTAMP_FIELDS = new Set(["checkedAt", "creationTime", "finalizedAt"]);
const CPMM_PROGRAM = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
const AMM_V4_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

function decodeBase58(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const bytes = [0];
  for (const character of value) {
    let carry = BASE58_ALPHABET.indexOf(character);
    if (carry < 0) return null;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) bytes.push(0);
  return bytes.reverse();
}

function encodeBase58(bytes) {
  if (bytes.length === 0) return "";
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes += 1;
  const digits = [0];
  for (let byteIndex = zeroes; byteIndex < bytes.length; byteIndex += 1) {
    let carry = bytes[byteIndex];
    for (let digitIndex = 0; digitIndex < digits.length; digitIndex += 1) {
      carry += digits[digitIndex] << 8;
      digits[digitIndex] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  const encoded = zeroes === bytes.length
    ? ""
    : digits.reverse().map((digit) => BASE58_ALPHABET[digit]).join("");
  return "1".repeat(zeroes) + encoded;
}

export function isCanonicalBase58(value, decodedLength) {
  const decoded = decodeBase58(value);
  return decoded !== null && decoded.length === decodedLength && encodeBase58(decoded) === value;
}

function isExactTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validateScalarSemantics(value, path, issues) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateScalarSemantics(item, `${path}/${index}`, issues));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}/${key}`;
    if (typeof child === "string" && PUBLIC_KEY_FIELDS.has(key) && !isCanonicalBase58(child, 32)) {
      issues.push(`${childPath} must decode canonically to a 32-byte public key`);
    }
    if (typeof child === "string" && SIGNATURE_FIELDS.has(key) && !isCanonicalBase58(child, 64)) {
      issues.push(`${childPath} must decode canonically to a 64-byte signature`);
    }
    if (TIMESTAMP_FIELDS.has(key) && !isExactTimestamp(child)) {
      issues.push(`${childPath} must be a real canonical UTC timestamp`);
    }
    if (key === "updateAuthorities" && Array.isArray(child)) {
      child.forEach((authority, index) => {
        if (!isCanonicalBase58(authority, 32)) {
          issues.push(`${childPath}/${index} must decode canonically to a 32-byte public key`);
        }
      });
    }
    validateScalarSemantics(child, childPath, issues);
  }
}

function normalizedPath(error) {
  if (error.keyword === "required") return `${error.instancePath}/${error.params.missingProperty}` || "/";
  if (error.keyword === "additionalProperties") return `${error.instancePath}/${error.params.additionalProperty}` || "/";
  return error.instancePath || "/";
}

function normalizeShapeErrors(errors = []) {
  return errors
    .map((error) => ({ path: normalizedPath(error), keyword: error.keyword, message: error.message ?? "validation failed" }))
    .sort((left, right) => left.path.localeCompare(right.path)
      || left.keyword.localeCompare(right.keyword)
      || left.message.localeCompare(right.message))
    .map(({ path, keyword, message }) => `${path} [${keyword}] ${message}`);
}

function isSortedBy(values, selector) {
  for (let index = 1; index < values.length; index += 1) {
    if (selector(values[index - 1]).localeCompare(selector(values[index])) > 0) return false;
  }
  return true;
}

function canonicalSum(values) {
  return values.reduce((sum, value) => sum + BigInt(value), 0n).toString();
}

function validateCommonVerified(record, proof, issues) {
  const mint = record.token.mint;
  if (proof.stage !== record.status) issues.push("proof stage must equal record status");
  if (proof.supply.baseUnits !== record.token.supplyBaseUnits
    || proof.supply.uiAmount !== record.token.uiSupply
    || proof.supply.decimals !== record.token.decimals
    || proof.supply.tokenProgram !== record.token.tokenProgram) {
    issues.push("proof supply must equal token supply");
  }
  if (proof.creatorBalance.owner !== proof.metadata.updateAuthority) {
    issues.push("metadata update authority must equal creator balance owner");
  }
  if (proof.creatorBalance.accounts.some((account) => account.mint !== mint || account.owner !== proof.creatorBalance.owner)) {
    issues.push("creator balance accounts must match the public mint and creator");
  }
  if (!isSortedBy(proof.creatorBalance.accounts, (account) => account.address)) {
    issues.push("creator balance accounts must be sorted by address");
  }
  const creatorAddresses = proof.creatorBalance.accounts.map((account) => account.address);
  if (new Set(creatorAddresses).size !== creatorAddresses.length) {
    issues.push("creator balance accounts must not repeat an address");
  }
  if (canonicalSum(proof.creatorBalance.accounts.map((account) => account.amountBaseUnits)) !== proof.creatorBalance.totalAmountBaseUnits) {
    issues.push("creator balance total must equal the exhaustive account sum");
  }
  if (proof.creatorBalance.totalAmountBaseUnits !== "0") issues.push("creator balance must equal zero");
  if (proof.fees.protocolBuyFeeRateMillionths !== proof.fees.protocolSellFeeRateMillionths) {
    issues.push("protocol buy and sell fee rates must match");
  }
  const costSum = canonicalSum([
    proof.cost.metadataUploadLamports,
    proof.cost.creationDebitLamports,
    proof.cost.recoveryDebitLamports,
    proof.cost.graduationDebitLamports,
  ]);
  if (costSum !== proof.cost.cumulativeCreatorDebitLamports) issues.push("creator cost must equal the exact four-term sum");
  if (BigInt(proof.cost.cumulativeCreatorDebitLamports) > BigInt(proof.cost.capLamports)) {
    issues.push("creator cost must remain within cap");
  }
  if (proof.quote.fundraisingLamports !== "24000000000" || proof.quote.graduationThresholdLamports !== "24000000000") {
    issues.push("quote fundraising and graduation threshold must equal 24000000000 lamports");
  }
  if (Date.parse(proof.observation.checkedAt) < Date.parse(proof.observation.finalizedAt)) {
    issues.push("observation checkedAt must be at or after finalizedAt");
  }
  if (proof.observation.finalizedSlot < proof.transactions.creation.finalizedSlot
    || Date.parse(proof.observation.finalizedAt) < Date.parse(proof.transactions.creation.finalizedAt)) {
    issues.push("proof chronology requires observation at or after creation");
  }
  const relevantTransaction = proof.transactions.graduation ?? proof.transactions.creation;
  if (proof.creatorBalance.finalizedSlot < relevantTransaction.finalizedSlot
    || Date.parse(proof.creatorBalance.finalizedAt) < Date.parse(relevantTransaction.finalizedAt)) {
    issues.push("creator balance must be finalized at or after the relevant transaction");
  }
  if (proof.creatorBalance.finalizedSlot > proof.observation.finalizedSlot
    || Date.parse(proof.creatorBalance.finalizedAt) > Date.parse(proof.observation.checkedAt)) {
    issues.push("creator balance must not be later than the observation");
  }
  if (proof.links.solscanMint !== `https://solscan.io/token/${mint}`) {
    issues.push("Solscan mint link must match token.mint");
  }
  if (proof.links.raydiumLaunchlab !== `https://raydium.io/launchpad/token/${mint}`) {
    issues.push("Raydium LaunchLab link must match token.mint");
  }
  if (proof.links.solscanCreationTransaction !== `https://solscan.io/tx/${proof.transactions.creation.signature}`) {
    issues.push("Solscan creation link must match the creation signature");
  }
}

function validateGraduated(proof, issues) {
  if (proof.transactions.graduation.finalizedSlot < proof.transactions.creation.finalizedSlot
    || Date.parse(proof.transactions.graduation.finalizedAt) < Date.parse(proof.transactions.creation.finalizedAt)
    || proof.observation.finalizedSlot < proof.transactions.graduation.finalizedSlot
    || Date.parse(proof.observation.finalizedAt) < Date.parse(proof.transactions.graduation.finalizedAt)) {
    issues.push("graduated proof chronology requires creation before graduation before observation");
  }
  if (proof.links.solscanGraduationTransaction !== `https://solscan.io/tx/${proof.transactions.graduation.signature}`) {
    issues.push("Solscan graduation link must match the graduation signature");
  }
  if (proof.links.raydiumPool !== `https://raydium.io/liquidity-pools/${proof.pool.address}`) {
    issues.push("Raydium pool link must match the verified pool");
  }
  if (proof.graduation.finalizedSlot !== proof.transactions.graduation.finalizedSlot
    || proof.graduation.finalizedAt !== proof.transactions.graduation.finalizedAt) {
    issues.push("graduation balance must share the finalized migration observation");
  }
  if (BigInt(proof.graduation.observedQuoteBalanceLamports) < BigInt(proof.graduation.configuredThresholdLamports)) {
    issues.push("observed graduation balance must meet the configured threshold");
  }
  if (proof.graduation.configuredThresholdLamports !== "24000000000") {
    issues.push("configured graduation threshold must equal 24000000000 lamports");
  }
  const expectedPoolProgram = proof.lpDisposition.kind === "burn-and-earn" ? CPMM_PROGRAM : AMM_V4_PROGRAM;
  if (proof.pool.programId !== expectedPoolProgram) {
    issues.push("pool program must match the LP disposition branch");
  }
  const evidence = proof.lpDisposition.evidenceAccounts;
  if (!isSortedBy(evidence, (account) => `${account.role}/${account.address}`)) {
    issues.push("LP evidence accounts must be sorted by role and address");
  }
  if (evidence.some((account) => account.finalizedSlot < proof.transactions.graduation.finalizedSlot
    || Date.parse(account.finalizedAt) < Date.parse(proof.transactions.graduation.finalizedAt))) {
    issues.push("LP evidence must be finalized at or after graduation");
  }
  if (proof.lpDisposition.kind === "lp-burn"
    && proof.lpDisposition.burnedBaseUnits !== proof.lpDisposition.totalSupplyBaseUnits) {
    issues.push("AMM-v4 burned LP must equal total LP supply");
  }
}

function unavailableResidue(record) {
  if (record.token?.mint !== null) return true;
  if (!record.proof || Object.keys(record.proof).length !== 2) return true;
  return Object.keys(record.proof).some((key) => !["stage", "availability"].includes(key));
}

export function validateLaunchRecord(record) {
  if (!validateLaunchShape(record)) return normalizeShapeErrors(validateLaunchShape.errors);
  const issues = [];
  if (record.status === "prelaunch") return issues;
  if (record.proof.availability === "unavailable") {
    if (unavailableResidue(record)) issues.push("unavailable record must not retain mint, destination, transaction, authority, balance, pool, or LP fields");
    return issues;
  }
  validateScalarSemantics(record, "", issues);
  validateCommonVerified(record, record.proof, issues);
  if (record.status === "curve-live") {
    if (record.proof.authorities.authorityKind !== EXPECTED_AUTHORITY_LIFECYCLE.curveMintAuthority) {
      issues.push("curve authority must be the LaunchLab program PDA");
    }
  } else {
    validateGraduated(record.proof, issues);
  }
  return issues;
}

export function isOfficialSolscanMintUrl(value, mint) {
  return value === `https://solscan.io/token/${mint}`;
}

export function isOfficialSolscanTransactionUrl(value, signature) {
  return value === `https://solscan.io/tx/${signature}`;
}

export function isOfficialRaydiumLaunchUrl(value, mint) {
  return value === `https://raydium.io/launchpad/token/${mint}`;
}
