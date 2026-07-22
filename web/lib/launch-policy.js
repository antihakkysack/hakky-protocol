export const EXPECTED_POLICY = Object.freeze({
  network: "mainnet-beta",
  tokenProgram: "spl-token",
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

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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

function hasBase58DecodedLength(value, expectedLength) {
  return decodeBase58(value)?.length === expectedLength;
}

function isPublicHostname(hostname) {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host === "::1") return false;
  const octets = host.split(".");
  if (octets.length === 4 && octets.every((octet) => /^\d+$/.test(octet))) {
    const [first, second] = octets.map(Number);
    return first !== 0
      && first !== 10
      && first !== 127
      && !(first === 169 && second === 254)
      && !(first === 172 && second >= 16 && second <= 31)
      && !(first === 192 && second === 168);
  }
  return !/^f[cd]/.test(host) && !/^fe[89ab]/.test(host);
}

function isPublicMetadataUri(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return isPublicHostname(url.hostname);
    return url.protocol === "ipfs:"
      && (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(url.hostname) || /^b[a-z2-7]{10,}$/.test(url.hostname));
  } catch {
    return false;
  }
}

function isExactIsoTimestamp(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isOfficialMintUrl(value, hostname, mint) {
  try {
    const url = new URL(value);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const queryValues = [...url.searchParams.values()];
    return url.protocol === "https:"
      && url.hostname === hostname
      && (pathSegments.includes(mint) || queryValues.includes(mint));
  } catch {
    return false;
  }
}

export function validateLaunchRecord(record) {
  const issues = [];
  const checks = [
    [record.network === EXPECTED_POLICY.network, `network must equal ${EXPECTED_POLICY.network}`],
    [record.project?.name === EXPECTED_POLICY.name, `project.name must equal ${EXPECTED_POLICY.name}`],
    [record.project?.symbol === EXPECTED_POLICY.symbol, `project.symbol must equal ${EXPECTED_POLICY.symbol}`],
    [record.project?.personalProject === true, "project.personalProject must equal true"],
    [record.token?.program === EXPECTED_POLICY.tokenProgram, "token.program must equal spl-token"],
    [record.token?.decimals === EXPECTED_POLICY.decimals, "token.decimals must equal 6"],
    [record.token?.supplyUi === EXPECTED_POLICY.supplyUi, "token.supplyUi must equal 1000000"],
    [record.token?.supplyBaseUnits === EXPECTED_POLICY.supplyBaseUnits, "token.supplyBaseUnits must equal 1000000000000"],
    [record.token?.mintAuthority === null, "token.mintAuthority must equal null"],
    [record.token?.freezeAuthority === null, "token.freezeAuthority must equal null"],
    [record.token?.transferFeeBps === 0, "token.transferFeeBps must equal 0"],
    [record.token?.transferHook === false, "token.transferHook must equal false"],
    [record.token?.blacklistControl === false, "token.blacklistControl must equal false"],
    [record.token?.permanentDelegate === false, "token.permanentDelegate must equal false"],
    [record.token?.metadataImmutable === true, "token.metadataImmutable must equal true"],
    [record.token?.metadataImage === EXPECTED_POLICY.metadataImage, "token.metadataImage must equal https://hakky.xyz/assets/token.png"],
    [record.token?.metadataWebsite === EXPECTED_POLICY.metadataWebsite, "token.metadataWebsite must equal https://hakky.xyz"],
    [record.token?.metadataX === EXPECTED_POLICY.metadataX, "token.metadataX must equal https://x.com/antihakkysack"],
    [record.launch?.platform === "Raydium LaunchLab", "launch.platform must equal Raydium LaunchLab"],
    [record.launch?.quoteAsset === "SOL", "launch.quoteAsset must equal SOL"],
    [record.launch?.curveAllocationBps === EXPECTED_POLICY.curveAllocationBps, "launch.curveAllocationBps must equal 8000"],
    [record.launch?.liquidityAllocationBps === EXPECTED_POLICY.liquidityAllocationBps, "launch.liquidityAllocationBps must equal 2000"],
    [record.launch?.teamAllocationBps === EXPECTED_POLICY.teamAllocationBps, "launch.teamAllocationBps must equal 0"],
    [record.launch?.presale === false, "launch.presale must equal false"],
    [record.launch?.vesting === false, "launch.vesting must equal false"],
    [record.launch?.graduationTargetSol === EXPECTED_POLICY.graduationTargetSol, "launch.graduationTargetSol must equal 24"],
    [record.launch?.creatorFirstBuySol === EXPECTED_POLICY.creatorFirstBuySol, "launch.creatorFirstBuySol must equal 0"],
    [record.launch?.creatorFeeEnabled === false, "launch.creatorFeeEnabled must equal false"],
    [record.launch?.lpPolicy === EXPECTED_POLICY.lpPolicy, "launch.lpPolicy must equal burn"],
    [record.launch?.creatorSpendCapSol === EXPECTED_POLICY.creatorSpendCapSol, "launch.creatorSpendCapSol must equal 1.00"],
  ];
  for (const [ok, message] of checks) if (!ok) issues.push(message);
  if ((record.launch?.curveAllocationBps ?? 0) + (record.launch?.liquidityAllocationBps ?? 0) !== 10000) {
    issues.push("curve and liquidity allocations must total 10000 bps");
  }
  if (record.status === "live") {
    if (!record.proof) issues.push("live status requires proof");
    for (const key of ["mint", "launchId", "launchTransaction", "solscanUrl", "raydiumUrl", "verifiedAt"]) {
      if (!record.proof?.[key]) issues.push(`live status requires proof.${key}`);
    }
    const proofChecks = [
      [record.proof?.supplyBaseUnits === EXPECTED_POLICY.supplyBaseUnits, "proof.supplyBaseUnits must equal 1000000000000"],
      [record.proof?.decimals === EXPECTED_POLICY.decimals, "proof.decimals must equal 6"],
      [record.proof?.tokenProgram === EXPECTED_POLICY.tokenProgram, "proof.tokenProgram must equal spl-token"],
      [record.proof?.mintAuthority === null, "proof.mintAuthority must equal null"],
      [record.proof?.freezeAuthority === null, "proof.freezeAuthority must equal null"],
      [record.proof?.creatorBalanceBaseUnits === "0", "proof.creatorBalanceBaseUnits must equal 0"],
      [record.proof?.metadataImmutable === true, "proof.metadataImmutable must equal true"],
      [record.proof?.metadataName === EXPECTED_POLICY.name, "proof.metadataName must equal Hakky Protocol"],
      [record.proof?.metadataSymbol === EXPECTED_POLICY.symbol, "proof.metadataSymbol must equal HAKKY"],
      [isPublicMetadataUri(record.proof?.metadataUri), "proof.metadataUri must be a public HTTPS or IPFS URL"],
      [record.proof?.metadataImage === EXPECTED_POLICY.metadataImage, "proof.metadataImage must equal https://hakky.xyz/assets/token.png"],
      [record.proof?.metadataWebsite === EXPECTED_POLICY.metadataWebsite, "proof.metadataWebsite must equal https://hakky.xyz"],
      [record.proof?.metadataX === EXPECTED_POLICY.metadataX, "proof.metadataX must equal https://x.com/antihakkysack"],
      [hasBase58DecodedLength(record.proof?.mint, 32), "proof.mint must be a Solana base58 public key"],
      [hasBase58DecodedLength(record.proof?.launchId, 32), "proof.launchId must be a Solana base58 public key"],
      [hasBase58DecodedLength(record.proof?.launchTransaction, 64), "proof.launchTransaction must be a Solana base58 signature"],
      [isOfficialMintUrl(record.proof?.solscanUrl, "solscan.io", record.proof?.mint), "proof.solscanUrl must be an HTTPS solscan.io URL for proof.mint"],
      [isOfficialMintUrl(record.proof?.raydiumUrl, "raydium.io", record.proof?.mint), "proof.raydiumUrl must be an HTTPS raydium.io URL for proof.mint"],
      [isExactIsoTimestamp(record.proof?.verifiedAt), "proof.verifiedAt must be an exact ISO-8601 timestamp"],
      [record.proof?.curveAllocationBps === EXPECTED_POLICY.curveAllocationBps, "proof.curveAllocationBps must equal 8000"],
      [record.proof?.liquidityAllocationBps === EXPECTED_POLICY.liquidityAllocationBps, "proof.liquidityAllocationBps must equal 2000"],
      [record.proof?.teamAllocationBps === EXPECTED_POLICY.teamAllocationBps, "proof.teamAllocationBps must equal 0"],
      [record.proof?.creatorFeeEnabled === false, "proof.creatorFeeEnabled must equal false"],
      [record.proof?.lpPolicy === EXPECTED_POLICY.lpPolicy, "proof.lpPolicy must equal burn"],
      [record.proof?.quoteAsset === "SOL", "proof.quoteAsset must equal SOL"],
      [record.proof?.graduationTargetSol === 24, "proof.graduationTargetSol must equal 24"],
      [record.proof?.creatorFirstBuySol === 0, "proof.creatorFirstBuySol must equal 0"],
      [Number.isFinite(record.proof?.creatorSpendSol) && record.proof.creatorSpendSol >= 0 && record.proof.creatorSpendSol <= 1, "proof.creatorSpendSol must be a finite number from 0 to 1"],
    ];
    for (const [ok, message] of proofChecks) if (!ok) issues.push(message);
    if (record.token?.mint !== record.proof?.mint) issues.push("token.mint must equal proof.mint");
  } else if (record.status !== "prelaunch") {
    issues.push("status must equal prelaunch or live");
  } else {
    if (record.token?.mint !== null) issues.push("prelaunch token.mint must equal null");
    if (record.proof !== null) issues.push("prelaunch proof must equal null");
  }
  return issues;
}
