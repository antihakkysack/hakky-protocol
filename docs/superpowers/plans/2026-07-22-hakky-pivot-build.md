# HAKKY Personal-Project Pivot Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy BTC product with a locally verified, personal Solana meme-coin repository, Meme Broadcast website, Sack Sentinel brand assets, launch-policy manifest, and read-only verification tooling.

**Architecture:** Keep the public site build-free under `web/`, with one JSON launch record driving explicit prelaunch and live states. Put all chain reads behind read-only Node scripts using Solana RPC; keep signing and Raydium mutations out of the repository. Generate deterministic vector/raster brand assets locally, test all policy values as data, and enforce personal-project and legacy-product hygiene in CI.

**Tech Stack:** Node.js 22, native `node:test`, ECMAScript modules, `@solana/web3.js` 1.98.4, `@solana/spl-token` 0.4.15, `sharp` 0.35.3, `serve` 14.2.6, static HTML/CSS/JavaScript, GitHub Pages.

## Global Constraints

- Network: Solana mainnet for launch; Solana devnet for rehearsal only.
- Token: Hakky Protocol / HAKKY, classic SPL Token, exactly 1,000,000 tokens, six decimals, `1,000,000,000,000` base units.
- Distribution: 80% public bonding curve, 20% post-graduation liquidity, 0% team, no vesting, no presale, no creator first-buy.
- Authorities: mint authority permanently null before public trading; freeze authority null; no token extensions, taxes, hooks, blacklist, or permanent delegate.
- Metadata: approved name, symbol, image, website, and X link are finalized, verified, and then made immutable.
- Launch: Raydium LaunchLab full configuration, SOL quote, 24 SOL graduation target, creator fees disabled, LP burned.
- Budget: creator-funded mainnet spend must be no more than 1.00 SOL.
- Brand: Meme Broadcast visual direction, Sack Sentinel / Agent 001 mascot, tagline “Keep crypto clean.”
- Positioning: fictional AI narrator and transparency mascot; never claim a working scanner, audit guarantee, trading agent, promised utility, or investment return.
- Ownership: personal project only; no third-party agency attribution, internal doctrine citation, or unrelated business branding.
- Hosting: static `hakky.xyz` site remains independent of the existing Hetzner server.
- Secrets: no seed phrase, private key, wallet file, authenticated RPC URL, or browser credential enters the repository.
- Mainnet, X, deploy, push, and server actions remain outside this build plan and require the separate live-rollout plan.

## Target File Structure

```text
hakky-protocol/
├── .github/workflows/
│   ├── pages.yml                  # existing static deployment
│   └── quality.yml                # Node checks and generated-asset verification
├── brand/
│   ├── sack-sentinel.svg          # canonical mascot source
│   └── x-banner.svg               # canonical 1500x500 banner source
├── docs/
│   ├── LAUNCH.md                  # human launch policy and proof rules
│   ├── TOKEN.md                   # canonical token specification
│   └── superpowers/               # approved design and implementation plans
├── launch/
│   ├── README.md                  # social kit index
│   ├── content-calendar.md        # short launch sequence
│   ├── prelaunch-post.md          # exact prelaunch post
│   ├── x-profile.md               # exact profile settings
│   └── assets/
│       ├── x-avatar.png           # generated 800x800 asset
│       ├── x-banner.png           # generated 1500x500 asset
│       └── og-card.png            # generated 1200x630 asset
├── proof/
│   └── README.md                  # format and publication policy
├── scripts/
│   ├── check-repo.mjs             # repository ownership/legacy scan
│   ├── check-site.mjs             # static-site contract checks
│   ├── rehearse-devnet.mjs        # disposable devnet rehearsal
│   ├── render-assets.mjs           # SVG-to-PNG renderer
│   └── verify-token.mjs            # read-only Solana mint verifier
├── src/
│   ├── mint-proof.mjs             # pure evidence evaluation
│   ├── social-copy.mjs            # deterministic proof-post builder
│   └── solana-rpc.mjs             # RPC-only evidence fetch
├── test/
│   ├── assets.test.mjs
│   ├── launch-policy.test.mjs
│   ├── mint-proof.test.mjs
│   ├── repository-hygiene.test.mjs
│   ├── site.test.mjs
│   └── social-copy.test.mjs
├── web/
│   ├── assets/
│   │   ├── og-card.png
│   │   └── sack-sentinel.svg
│   ├── data/launch.json
│   ├── lib/launch-policy.js
│   ├── CNAME
│   ├── README.md
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── package-lock.json
└── package.json
```

---

### Task 1: Preserve User Work and Establish the Personal-Project Boundary

**Files:**
- Create outside repository: `C:\hakky-protocol-backups\2026-07-22-hardhat-config-user-change.patch`
- Create: `scripts/check-repo.mjs`
- Create: `test/repository-hygiene.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Delete: `.github/workflows/contracts.yml`
- Delete: `contracts/.env.example`
- Delete: `contracts/contracts/AttestationRegistry.sol`
- Delete: `contracts/contracts/CleanBTC.sol`
- Delete: `contracts/contracts/CompliancePolicy.sol`
- Delete: `contracts/contracts/ReserveOracle.sol`
- Delete: `contracts/contracts/ReserveVault.sol`
- Delete: `contracts/contracts/interfaces/IHakky.sol`
- Delete: `contracts/deployments/sepolia.json`
- Delete: `contracts/hardhat.config.js`
- Delete: `contracts/package-lock.json`
- Delete: `contracts/package.json`
- Delete: `contracts/scripts/deploy.js`
- Delete: `contracts/scripts/redeem-demo.js`
- Delete: `contracts/scripts/seed-demo.js`
- Delete: `contracts/test/hakky.test.js`
- Delete: `services/.env.example`
- Delete: `services/Dockerfile`
- Delete: `services/README.md`
- Delete: `services/docker-compose.yml`
- Delete: `services/package-lock.json`
- Delete: `services/package.json`
- Delete: `services/tsconfig.json`
- Delete: `services/src/api/server.ts`
- Delete: `services/src/attestation/worker.ts`
- Delete: `services/src/orchestrator/worker.ts`
- Delete: `services/src/reserve-oracle/cron.ts`
- Delete: `services/src/shared/abis.ts`
- Delete: `services/src/shared/auth.ts`
- Delete: `services/src/shared/chain.ts`
- Delete: `services/src/shared/config.ts`
- Delete: `services/src/shared/db.ts`
- Delete: `services/src/shared/logger.ts`
- Delete: `services/src/shared/screening.ts`
- Delete: `provision/Caddyfile`
- Delete: `provision/README.md`
- Delete: `provision/docker-compose.yml`
- Delete: `provision/setup.sh`
- Delete: `docs/SPEC.md`
- Delete: `docs/whitepaper.md`
- Delete: `README.md`
- Delete: `SECURITY.md`
- Delete: `CONTRIBUTING.md`
- Delete: `launch/README.md`
- Delete: `launch/bio-and-assets.md`
- Delete: `launch/content-calendar.md`
- Delete: `launch/launch-week-posts.md`
- Delete: `launch/positioning.md`
- Delete: `launch/twitter-launch-thread.md`
- Delete: `launch/assets/x-avatar.png`
- Delete: `launch/assets/x-banner.png`
- Delete: `web/index.html`
- Delete: `web/README.md`

**Interfaces:**
- Consumes: current Git diff for `contracts/hardhat.config.js`.
- Produces: `scanRepository(root): Promise<Array<{file:string, rule:string}>>`; clean personal-project repository boundary; recoverable user patch.

- [ ] **Step 1: Preserve the user-owned Hardhat edit outside the repository**

Create `C:\hakky-protocol-backups\2026-07-22-hardhat-config-user-change.patch` with this exact content using the file-editing tool:

```diff
diff --git a/contracts/hardhat.config.js b/contracts/hardhat.config.js
index 8454183..65c23e1 100644
--- a/contracts/hardhat.config.js
+++ b/contracts/hardhat.config.js
@@ -10,5 +10,6 @@ require("@nomicfoundation/hardhat-toolbox");
  * @type import('hardhat/config').HardhatUserConfig
  */
 const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
+const HYPEREVM_RPC_URL = process.env.HYPEREVM_RPC_URL || "https://rpc.hyperliquid-testnet.xyz/evm";
 const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
 const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
@@ -32,6 +33,16 @@ module.exports = {
           },
         }
       : {}),
+    // Hyperliquid HyperEVM testnet (EVM-compatible; gas paid in HYPE).
+    ...(DEPLOYER_PRIVATE_KEY
+      ? {
+          hyperevmTestnet: {
+            url: HYPEREVM_RPC_URL,
+            chainId: 998,
+            accounts: [DEPLOYER_PRIVATE_KEY],
+          },
+        }
+      : {}),
   },
   etherscan: {
     apiKey: ETHERSCAN_API_KEY,
```

Run:

```powershell
rtk powershell -NoProfile -Command Get-FileHash -Algorithm SHA256 C:\hakky-protocol-backups\2026-07-22-hardhat-config-user-change.patch
rtk powershell -NoProfile -Command Get-Content -Raw C:\hakky-protocol-backups\2026-07-22-hardhat-config-user-change.patch
```

Expected: a SHA-256 hash is printed and the patch contains both `HYPEREVM_RPC_URL` and `hyperevmTestnet`. Report the path and hash before deleting the source file.

- [ ] **Step 2: Write the failing repository-hygiene test**

Create `test/repository-hygiene.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanRepository } from "../scripts/check-repo.mjs";

test("detects disallowed agency attribution without storing the name in source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakky-hygiene-"));
  const disallowed = Buffer.from("ZnJlc2hkaWdpdGFs", "base64").toString("utf8");
  await writeFile(path.join(root, "README.md"), `Built by ${disallowed}`);
  const violations = await scanRepository(root);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "personal-project-only");
});

test("the repository contains no disallowed attribution or active legacy product", async () => {
  assert.deepEqual(await scanRepository(process.cwd()), []);
});
```

- [ ] **Step 3: Run the test and verify the first failure**

Run:

```powershell
rtk node --test test/repository-hygiene.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/check-repo.mjs`.

- [ ] **Step 4: Implement the scanner**

Create `scripts/check-repo.mjs`:

```js
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
```

- [ ] **Step 5: Run the test and verify that active legacy files are detected**

Run:

```powershell
rtk node --test test/repository-hygiene.test.mjs
```

Expected: the synthetic detection test passes and the real-repository test fails with paths under the active legacy surfaces.

- [ ] **Step 6: Remove the exact legacy files listed for this task and establish root metadata**

Use the file-editing tool to delete the listed legacy files. Do not use a recursive deletion command. Update `.gitignore` to:

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Local environment and secrets
.env
.env.*
!.env.example

# Generated and transient evidence
artifacts/
.superpowers/

# Logs
*.log
npm-debug.log*

# OS / editor
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp
```

Replace `package.json` with:

```json
{
  "name": "hakky-protocol",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "HAKKY is a personal, transparent Solana fair-launch meme coin narrated by AntiHakkySack.",
  "homepage": "https://hakky.xyz",
  "repository": {
    "type": "git",
    "url": "https://github.com/antihakkysack/hakky-protocol.git"
  },
  "license": "MIT",
  "scripts": {
    "assets": "node scripts/render-assets.mjs",
    "check": "npm run test && npm run check:repo && npm run check:site",
    "check:repo": "node scripts/check-repo.mjs",
    "check:site": "node scripts/check-site.mjs",
    "preview": "serve web",
    "rehearsal:devnet": "node scripts/rehearse-devnet.mjs",
    "test": "node --test",
    "verify:token": "node scripts/verify-token.mjs"
  },
  "dependencies": {
    "@solana/spl-token": "0.4.15",
    "@solana/web3.js": "1.98.4"
  },
  "devDependencies": {
    "serve": "14.2.6",
    "sharp": "0.35.3"
  }
}
```

Run:

```powershell
rtk npm install
rtk node --test test/repository-hygiene.test.mjs
rtk npm run check:repo
```

Expected: `package-lock.json` is created, both tests pass, and `check:repo` prints `{"ok":true,"violations":[]}`. The repository is intentionally skeletal until Tasks 4–6 recreate the brand, website, and public documentation.

- [ ] **Step 7: Commit the repository boundary**

```powershell
rtk git add .gitignore package.json package-lock.json scripts/check-repo.mjs test/repository-hygiene.test.mjs .github/workflows/contracts.yml contracts services provision README.md SECURITY.md CONTRIBUTING.md docs/SPEC.md docs/whitepaper.md launch web/index.html web/README.md
rtk git commit -m "pivot: remove the legacy BTC product"
```

Expected: one bounded commit; the out-of-tree backup patch is not staged.

---

### Task 2: Encode the Launch Policy as Validated Data

**Files:**
- Create: `web/lib/launch-policy.js`
- Create: `web/data/launch.json`
- Create: `test/launch-policy.test.mjs`

**Interfaces:**
- Consumes: global token and Raydium constraints.
- Produces: `EXPECTED_POLICY`; `validateLaunchRecord(record): string[]`; canonical `web/data/launch.json`.

- [ ] **Step 1: Write failing launch-policy tests**

Create `test/launch-policy.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const record = JSON.parse(await readFile(new URL("../web/data/launch.json", import.meta.url), "utf8"));

test("approved prelaunch record is valid", () => {
  assert.deepEqual(validateLaunchRecord(record), []);
});

test("rejects supply inflation and team allocation", () => {
  const changed = structuredClone(record);
  changed.token.supplyBaseUnits = "2000000000000";
  changed.launch.teamAllocationBps = 500;
  assert.deepEqual(validateLaunchRecord(changed), [
    "token.supplyBaseUnits must equal 1000000000000",
    "launch.teamAllocationBps must equal 0",
  ]);
});

test("rejects hidden token controls and private launch paths", () => {
  const changed = structuredClone(record);
  changed.token.mintAuthority = "active";
  changed.token.transferFeeBps = 100;
  changed.token.transferHook = true;
  changed.launch.presale = true;
  assert.deepEqual(validateLaunchRecord(changed), [
    "token.mintAuthority must equal null",
    "token.transferFeeBps must equal 0",
    "token.transferHook must equal false",
    "launch.presale must equal false",
  ]);
});

test("live state requires verified proof fields", () => {
  const changed = structuredClone(record);
  changed.status = "live";
  assert.ok(validateLaunchRecord(changed).includes("live status requires proof"));
});

test("accepts a live record only with complete observed proof", () => {
  const changed = structuredClone(record);
  changed.status = "live";
  changed.token.mint = "11111111111111111111111111111111";
  changed.proof = {
    mint: changed.token.mint,
    launchId: "Launch111111111111111111111111111111111",
    launchTransaction: "Signature111111111111111111111111111111111111111111111111111111111111",
    solscanUrl: `https://solscan.io/token/${changed.token.mint}`,
    raydiumUrl: "https://raydium.io/launchpad/token/?mint=11111111111111111111111111111111",
    verifiedAt: "2026-07-22T00:00:00.000Z",
    supplyBaseUnits: "1000000000000",
    decimals: 6,
    tokenProgram: "spl-token",
    mintAuthority: null,
    freezeAuthority: null,
    creatorBalanceBaseUnits: "0",
    metadataImmutable: true,
    metadataName: "Hakky Protocol",
    metadataSymbol: "HAKKY",
    metadataUri: "https://hakky.xyz/metadata.json",
    curveAllocationBps: 8000,
    liquidityAllocationBps: 2000,
    teamAllocationBps: 0,
    creatorFeeEnabled: false,
    lpPolicy: "burn",
    quoteAsset: "SOL",
    graduationTargetSol: 24,
    creatorFirstBuySol: 0,
    creatorSpendSol: 0.25,
  };
  assert.deepEqual(validateLaunchRecord(changed), []);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
rtk node --test test/launch-policy.test.mjs
```

Expected: FAIL because `web/lib/launch-policy.js` and `web/data/launch.json` do not exist.

- [ ] **Step 3: Implement the launch policy**

Create `web/lib/launch-policy.js`:

```js
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
});

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
      [typeof record.proof?.metadataUri === "string" && /^(https:\/\/|ipfs:\/\/)/.test(record.proof.metadataUri), "proof.metadataUri must be a public HTTPS or IPFS URL"],
      [record.proof?.curveAllocationBps === EXPECTED_POLICY.curveAllocationBps, "proof.curveAllocationBps must equal 8000"],
      [record.proof?.liquidityAllocationBps === EXPECTED_POLICY.liquidityAllocationBps, "proof.liquidityAllocationBps must equal 2000"],
      [record.proof?.teamAllocationBps === EXPECTED_POLICY.teamAllocationBps, "proof.teamAllocationBps must equal 0"],
      [record.proof?.creatorFeeEnabled === false, "proof.creatorFeeEnabled must equal false"],
      [record.proof?.lpPolicy === EXPECTED_POLICY.lpPolicy, "proof.lpPolicy must equal burn"],
      [record.proof?.quoteAsset === "SOL", "proof.quoteAsset must equal SOL"],
      [record.proof?.graduationTargetSol === 24, "proof.graduationTargetSol must equal 24"],
      [record.proof?.creatorFirstBuySol === 0, "proof.creatorFirstBuySol must equal 0"],
      [Number.isFinite(record.proof?.creatorSpendSol) && record.proof.creatorSpendSol <= 1, "proof.creatorSpendSol must be at most 1"],
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
```

Create `web/data/launch.json`:

```json
{
  "schemaVersion": 1,
  "status": "prelaunch",
  "network": "mainnet-beta",
  "project": {
    "name": "Hakky Protocol",
    "symbol": "HAKKY",
    "personalProject": true
  },
  "token": {
    "mint": null,
    "program": "spl-token",
    "decimals": 6,
    "supplyUi": "1000000",
    "supplyBaseUnits": "1000000000000",
    "mintAuthority": null,
    "freezeAuthority": null,
    "transferFeeBps": 0,
    "transferHook": false,
    "blacklistControl": false,
    "permanentDelegate": false,
    "metadataImmutable": true
  },
  "launch": {
    "platform": "Raydium LaunchLab",
    "quoteAsset": "SOL",
    "curveAllocationBps": 8000,
    "liquidityAllocationBps": 2000,
    "teamAllocationBps": 0,
    "presale": false,
    "vesting": false,
    "graduationTargetSol": "24",
    "creatorFirstBuySol": "0",
    "creatorFeeEnabled": false,
    "lpPolicy": "burn",
    "creatorSpendCapSol": "1.00"
  },
  "proof": null
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```powershell
rtk node --test test/launch-policy.test.mjs
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```powershell
rtk git add web/lib/launch-policy.js web/data/launch.json test/launch-policy.test.mjs
rtk git commit -m "launch: encode the fixed HAKKY policy"
```

---

### Task 3: Build the Read-Only Solana Mint Verifier

**Files:**
- Create: `src/mint-proof.mjs`
- Create: `src/solana-rpc.mjs`
- Create: `scripts/verify-token.mjs`
- Create: `test/mint-proof.test.mjs`
- Create: `proof/README.md`

**Interfaces:**
- Consumes: `EXPECTED_POLICY` from `web/lib/launch-policy.js`; Solana RPC URL, mint address, creator wallet address.
- Produces: `evaluateMintEvidence(evidence): {ok:boolean, checks:Array, observed:object}`; `fetchMintEvidence(options): Promise<object>`; JSON proof artifact.

- [ ] **Step 1: Write failing evidence-evaluation tests**

Create `test/mint-proof.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";

const valid = {
  network: "mainnet-beta",
  tokenProgram: "spl-token",
  mint: "11111111111111111111111111111111",
  supplyBaseUnits: "1000000000000",
  decimals: 6,
  mintAuthority: null,
  freezeAuthority: null,
  creatorBalanceBaseUnits: "0"
};

test("accepts the approved immutable mint state", () => {
  const result = evaluateMintEvidence(valid);
  assert.equal(result.ok, true);
  assert.equal(result.checks.every((check) => check.ok), true);
});

test("rejects inflation, active authorities, and creator inventory", () => {
  const result = evaluateMintEvidence({
    ...valid,
    supplyBaseUnits: "1000000000001",
    mintAuthority: "MintAuthority1111111111111111111111111",
    freezeAuthority: "FreezeAuthority11111111111111111111111",
    creatorBalanceBaseUnits: "1"
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.checks.filter((check) => !check.ok).map((check) => check.id), [
    "fixed-supply",
    "mint-authority-revoked",
    "freeze-authority-none",
    "creator-balance-zero"
  ]);
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
rtk node --test test/mint-proof.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/mint-proof.mjs`.

- [ ] **Step 3: Implement the pure evaluator**

Create `src/mint-proof.mjs`:

```js
import { EXPECTED_POLICY } from "../web/lib/launch-policy.js";

export function evaluateMintEvidence(evidence) {
  const checks = [
    { id: "network-mainnet", ok: evidence.network === EXPECTED_POLICY.network, observed: evidence.network },
    { id: "classic-token-program", ok: evidence.tokenProgram === EXPECTED_POLICY.tokenProgram, observed: evidence.tokenProgram },
    { id: "fixed-supply", ok: evidence.supplyBaseUnits === EXPECTED_POLICY.supplyBaseUnits, observed: evidence.supplyBaseUnits },
    { id: "six-decimals", ok: evidence.decimals === EXPECTED_POLICY.decimals, observed: evidence.decimals },
    { id: "mint-authority-revoked", ok: evidence.mintAuthority === null, observed: evidence.mintAuthority },
    { id: "freeze-authority-none", ok: evidence.freezeAuthority === null, observed: evidence.freezeAuthority },
    { id: "creator-balance-zero", ok: evidence.creatorBalanceBaseUnits === "0", observed: evidence.creatorBalanceBaseUnits }
  ];
  return { ok: checks.every((check) => check.ok), checks, observed: evidence };
}
```

- [ ] **Step 4: Implement RPC evidence fetching**

Create `src/solana-rpc.mjs`:

```js
import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TokenAccountNotFoundError
} from "@solana/spl-token";

export async function fetchMintEvidence({ connection, network, mintAddress, creatorAddress }) {
  const mint = new PublicKey(mintAddress);
  const creator = new PublicKey(creatorAddress);
  const mintAccount = await getMint(connection, mint, "confirmed");
  const creatorAta = getAssociatedTokenAddressSync(mint, creator);
  let creatorBalance = 0n;
  try {
    creatorBalance = (await getAccount(connection, creatorAta, "confirmed")).amount;
  } catch (error) {
    if (!(error instanceof TokenAccountNotFoundError)) throw error;
  }
  return {
    network,
    tokenProgram: "spl-token",
    mint: mint.toBase58(),
    supplyBaseUnits: mintAccount.supply.toString(),
    decimals: mintAccount.decimals,
    mintAuthority: mintAccount.mintAuthority?.toBase58() ?? null,
    freezeAuthority: mintAccount.freezeAuthority?.toBase58() ?? null,
    creatorBalanceBaseUnits: creatorBalance.toString()
  };
}
```

Create `scripts/verify-token.mjs`:

```js
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Connection } from "@solana/web3.js";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { fetchMintEvidence } from "../src/solana-rpc.mjs";

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}

const mintAddress = readOption("--mint");
const creatorAddress = readOption("--creator");
const outputPath = readOption("--out");
const rpcIndex = process.argv.indexOf("--rpc");
const rpcUrl = rpcIndex === -1 ? "https://api.mainnet-beta.solana.com" : process.argv[rpcIndex + 1];
const connection = new Connection(rpcUrl, "confirmed");
const observed = await fetchMintEvidence({
  connection,
  network: "mainnet-beta",
  mintAddress,
  creatorAddress
});
const proof = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  rpcHost: new URL(rpcUrl).host,
  ...evaluateMintEvidence(observed)
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(proof, null, 2));
if (!proof.ok) process.exitCode = 1;
```

Create `proof/README.md`:

```markdown
# HAKKY launch proof

No mainnet proof exists before launch. A proof is publishable only after the
read-only verifier reports `ok: true` and the Raydium launch configuration has
been read back from the official launch page and transaction receipt.

Proof files must contain public addresses and transaction signatures only.
They must never contain wallet secrets or authenticated RPC URLs.
```

- [ ] **Step 5: Run unit tests and CLI failure check**

Run:

```powershell
rtk node --test test/mint-proof.test.mjs
rtk node scripts/verify-token.mjs
```

Expected: 2 tests pass; the CLI exits non-zero with `Missing --mint` before making a network request.

- [ ] **Step 6: Commit**

```powershell
rtk git add src/mint-proof.mjs src/solana-rpc.mjs scripts/verify-token.mjs test/mint-proof.test.mjs proof/README.md
rtk git commit -m "verify: add read-only Solana mint proof"
```

---

### Task 4: Produce the Sack Sentinel Asset Set

**Files:**
- Create: `brand/sack-sentinel.svg`
- Create: `brand/x-banner.svg`
- Create: `scripts/render-assets.mjs`
- Create: `test/assets.test.mjs`
- Create: `launch/assets/x-avatar.png`
- Create: `launch/assets/x-banner.png`
- Create: `launch/assets/og-card.png`
- Create: `web/assets/og-card.png`
- Create: `web/assets/sack-sentinel.svg`

**Interfaces:**
- Consumes: approved Meme Broadcast palette and Sack Sentinel geometry.
- Produces: canonical vector sources and exact-dimension public raster assets.

- [ ] **Step 1: Write failing asset-dimension tests**

Create `test/assets.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

for (const [file, width, height] of [
  ["launch/assets/x-avatar.png", 800, 800],
  ["launch/assets/x-banner.png", 1500, 500],
  ["launch/assets/og-card.png", 1200, 630],
  ["web/assets/og-card.png", 1200, 630]
]) {
  test(`${file} has approved dimensions`, async () => {
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
    assert.equal(metadata.format, "png");
  });
}
```

- [ ] **Step 2: Run the test and verify missing assets**

Run:

```powershell
rtk node --test test/assets.test.mjs
```

Expected: FAIL with file-not-found errors for all four PNGs.

- [ ] **Step 3: Create the canonical mascot SVG**

Create `brand/sack-sentinel.svg` and copy the same file to `web/assets/sack-sentinel.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-labelledby="title desc">
  <title id="title">AntiHakkySack Agent 001</title>
  <desc id="desc">Orange sack-shaped AI sentinel with a dark visor and Agent 001 badge.</desc>
  <rect width="800" height="800" rx="96" fill="#F8FF4A"/>
  <path d="M280 180 400 70l120 110-62 76H342z" fill="#FF965D" stroke="#160C2C" stroke-width="24" stroke-linejoin="round"/>
  <path d="M218 286c0-70 57-126 126-126h112c69 0 126 56 126 126v302c0 76-62 138-138 138h-88c-76 0-138-62-138-138z" fill="#FF965D" stroke="#160C2C" stroke-width="24"/>
  <rect x="264" y="332" width="272" height="132" rx="66" fill="#160C2C"/>
  <circle cx="344" cy="398" r="22" fill="#F8FF4A"/>
  <circle cx="456" cy="398" r="22" fill="#F8FF4A"/>
  <rect x="326" y="552" width="148" height="88" rx="12" fill="#F8FF4A" stroke="#160C2C" stroke-width="16" transform="rotate(-3 400 596)"/>
  <text x="400" y="610" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="46" fill="#160C2C">001</text>
</svg>
```

- [ ] **Step 4: Create the exact X banner SVG**

Create `brand/x-banner.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500">
  <rect width="1500" height="500" fill="#F8FF4A"/>
  <path d="M1010 0h490v500H850z" fill="#FF7AEB"/>
  <path d="M1260 0h240v500h-400z" fill="#7138FF"/>
  <text x="90" y="92" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#160C2C" letter-spacing="5">ANTIHAKKYSACK // AGENT 001</text>
  <text x="85" y="220" font-family="Arial Black,Arial,sans-serif" font-size="78" font-weight="900" fill="#160C2C">RUGS HATE THIS</text>
  <text x="85" y="305" font-family="Arial Black,Arial,sans-serif" font-size="78" font-weight="900" fill="#160C2C">LITTLE GUY.</text>
  <rect x="90" y="354" width="590" height="62" rx="8" fill="#160C2C"/>
  <text x="120" y="396" font-family="Arial, sans-serif" font-size="25" font-weight="900" fill="#FFFFFF">1,000,000 HAKKY · 0% TEAM · NO PRESALE</text>
  <g transform="translate(1050 35) scale(.53)">
    <path d="M280 180 400 70l120 110-62 76H342z" fill="#FF965D" stroke="#160C2C" stroke-width="24" stroke-linejoin="round"/>
    <path d="M218 286c0-70 57-126 126-126h112c69 0 126 56 126 126v302c0 76-62 138-138 138h-88c-76 0-138-62-138-138z" fill="#FF965D" stroke="#160C2C" stroke-width="24"/>
    <rect x="264" y="332" width="272" height="132" rx="66" fill="#160C2C"/>
    <circle cx="344" cy="398" r="22" fill="#F8FF4A"/><circle cx="456" cy="398" r="22" fill="#F8FF4A"/>
  </g>
</svg>
```

- [ ] **Step 5: Implement deterministic raster rendering**

Create `scripts/render-assets.mjs`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

await mkdir("launch/assets", { recursive: true });
const mascot = await readFile("brand/sack-sentinel.svg");
const banner = await readFile("brand/x-banner.svg");

await sharp(mascot).resize(800, 800).png().toFile("launch/assets/x-avatar.png");
await sharp(banner).resize(1500, 500).png().toFile("launch/assets/x-banner.png");

const ogBackground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#7138FF"/>
  <rect x="48" y="48" width="1104" height="534" rx="32" fill="#F8FF4A" stroke="#160C2C" stroke-width="10"/>
  <text x="92" y="190" font-family="Arial Black,Arial,sans-serif" font-size="68" fill="#160C2C">RUGS HATE THIS</text>
  <text x="92" y="270" font-family="Arial Black,Arial,sans-serif" font-size="68" fill="#160C2C">LITTLE GUY.</text>
  <text x="96" y="345" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#160C2C">1,000,000 HAKKY · 0% TEAM · NO PRESALE</text>
</svg>`);
const mascotLayer = await sharp(mascot).resize(390, 390).png().toBuffer();
const ogCard = await sharp(ogBackground)
  .composite([{ input: mascotLayer, left: 760, top: 185 }])
  .png()
  .toBuffer();
await writeFile("launch/assets/og-card.png", ogCard);
await writeFile("web/assets/og-card.png", ogCard);
```

- [ ] **Step 6: Render, test, and visually inspect all crops**

Run:

```powershell
rtk npm run assets
rtk node --test test/assets.test.mjs
```

Expected: 4 tests pass. Open each PNG and confirm the visor, eyes, badge, and all banner text are inside safe areas with no clipping.

- [ ] **Step 7: Commit**

```powershell
rtk git add brand web/assets launch/assets scripts/render-assets.mjs test/assets.test.mjs
rtk git commit -m "brand: add the Sack Sentinel asset system"
```

---

### Task 5: Rebuild `hakky.xyz` in the Approved Meme Broadcast Direction

**Files:**
- Create: `web/index.html`
- Create: `web/styles.css`
- Create: `web/app.js`
- Create: `web/README.md`
- Create: `scripts/check-site.mjs`
- Create: `test/site.test.mjs`
- Keep: `web/CNAME`

**Interfaces:**
- Consumes: `web/data/launch.json`, `validateLaunchRecord`, `web/assets/sack-sentinel.svg`.
- Produces: `buildLaunchView(record)` and a static prelaunch/live homepage.

- [ ] **Step 1: Write failing website-contract tests**

Create `test/site.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildLaunchView } from "../web/app.js";

const html = await readFile("web/index.html", "utf8");
const record = JSON.parse(await readFile("web/data/launch.json", "utf8"));

test("homepage contains the approved story and safety contract", () => {
  for (const text of [
    "Rugs hate this little guy.",
    "The first thing it cleaned was its own launch.",
    "1,000,000",
    "0% team",
    "no presale",
    "No official mint address exists yet",
    "no promised utility or returns"
  ]) assert.match(html.toLowerCase(), new RegExp(text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("prelaunch view never exposes buy links", () => {
  const view = buildLaunchView(record);
  assert.equal(view.live, false);
  assert.equal(view.mint, null);
  assert.equal(view.raydiumUrl, null);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```powershell
rtk node --test test/site.test.mjs
```

Expected: FAIL because the old homepage lacks the new contract and `web/app.js` does not exist.

- [ ] **Step 3: Implement the launch view model and safe renderer**

Create `web/app.js`:

```js
import { validateLaunchRecord } from "./lib/launch-policy.js";

export function buildLaunchView(record) {
  const issues = validateLaunchRecord(record);
  if (issues.length) throw new Error(`Invalid launch record: ${issues.join("; ")}`);
  if (record.status === "prelaunch") {
    return { live: false, mint: null, solscanUrl: null, raydiumUrl: null };
  }
  return {
    live: true,
    mint: record.proof.mint,
    solscanUrl: record.proof.solscanUrl,
    raydiumUrl: record.proof.raydiumUrl,
    supply: "1,000,000 (verified)",
    mintAuthority: "null (verified)",
    freezeAuthority: "null (verified)",
    teamAllocation: "0% (verified)",
    metadata: "immutable (verified)",
  };
}

export async function renderLaunchState(documentRef = document) {
  const response = await fetch("./data/launch.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Launch record HTTP ${response.status}`);
  const view = buildLaunchView(await response.json());
  const status = documentRef.querySelector("[data-launch-status]");
  const mint = documentRef.querySelector("[data-mint]");
  const actions = documentRef.querySelector("[data-live-actions]");
  if (!view.live) {
    status.textContent = "PRE-LAUNCH: No official mint address exists yet — ignore impostors.";
    actions.hidden = true;
    return;
  }
  status.textContent = "LIVE: Verify the mint before interacting.";
  mint.textContent = view.mint;
  documentRef.querySelector("[data-supply]").textContent = view.supply;
  documentRef.querySelector("[data-mint-authority]").textContent = view.mintAuthority;
  documentRef.querySelector("[data-freeze-authority]").textContent = view.freezeAuthority;
  documentRef.querySelector("[data-team-allocation]").textContent = view.teamAllocation;
  documentRef.querySelector("[data-metadata]").textContent = view.metadata;
  documentRef.querySelector("[data-solscan]").href = view.solscanUrl;
  documentRef.querySelector("[data-raydium]").href = view.raydiumUrl;
  actions.hidden = false;
}

if (typeof document !== "undefined") {
  renderLaunchState().catch(() => {
    document.querySelector("[data-launch-status]").textContent =
      "PROOF UNAVAILABLE: Do not trust contract addresses from replies or DMs.";
  });
}
```

- [ ] **Step 4: Replace the homepage with the approved content structure**

Replace `web/index.html` with:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="HAKKY is a personal, transparent Solana fair-launch meme coin narrated by AntiHakkySack.">
  <meta property="og:title" content="HAKKY — Rugs hate this little guy.">
  <meta property="og:description" content="1,000,000 HAKKY. 0% team. No presale. Keep crypto clean.">
  <meta property="og:image" content="https://hakky.xyz/assets/og-card.png">
  <title>HAKKY — AntiHakkySack Agent 001</title>
  <link rel="stylesheet" href="./styles.css">
  <script type="module" src="./app.js"></script>
</head>
<body>
  <header class="nav"><a href="#top" class="brand">HAKKY! / AGENT 001</a><nav><a href="#lore">Lore</a><a href="#launch">Fair launch</a><a href="#verify">Verify</a><a href="#faq">FAQ</a><a href="https://x.com/antihakkysack">X ↗</a></nav></header>
  <main id="top">
    <section class="hero">
      <div><p class="kicker">ANTIHAKKYSACK IS ONLINE</p><h1>Rugs hate this little guy.</h1><p class="lead">Solana's fictional AI sentinel entered the trenches with zero team tokens, no presale, and absolutely no chill. The first thing it cleaned was its own launch.</p><a class="button" href="#lore">Meet the agent</a><a class="button button-alt" href="#verify">Verify the launch</a></div>
      <img src="./assets/sack-sentinel.svg" alt="AntiHakkySack, the orange Sack Sentinel Agent 001">
      <p class="status" data-launch-status>PRE-LAUNCH: No official mint address exists yet — ignore impostors.</p>
    </section>
    <section class="stats" aria-label="Launch commitments"><div><strong>1,000,000</strong><span>fixed supply</span></div><div><strong>0%</strong><span>team allocation</span></div><div><strong>0</strong><span>presale tokens</span></div><div><strong>1 SOL</strong><span>creator spend cap</span></div></section>
    <section id="lore" class="section pink"><p class="eyebrow">THE LORE</p><h2>Every rug leaves a hakky sack behind.</h2><div class="cards"><article><h3>The problem</h3><p>Dirty launches hide supply, team bags, and removable liquidity behind loud promises. The trenches deserve a mascot that points at the receipts.</p></article><article><h3>The agent</h3><p>AntiHakkySack is HAKKY's fictional AI narrator and transparency mascot—not an audit service or guaranteed scam detector.</p></article></div></section>
    <section id="launch" class="section purple"><p class="eyebrow">100% PUBLIC DISTRIBUTION</p><h2>No founder bag hiding behind tokenomics.</h2><p>All one million tokens enter the Raydium launch mechanism. No vesting wallet. No team reserve. No creator first-buy.</p><div class="allocation"><span>80% public bonding curve</span><span>20% liquidity</span></div></section>
    <section id="verify" class="section"><p class="eyebrow">CHAIN BEATS CLAIMS</p><h2>Verify everything after launch.</h2><div class="proof"><div><span>Supply</span><strong data-supply>Required: 1,000,000</strong></div><div><span>Mint authority</span><strong data-mint-authority>Required: null</strong></div><div><span>Freeze authority</span><strong data-freeze-authority>Required: null</strong></div><div><span>Team allocation</span><strong data-team-allocation>Required: 0%</strong></div><div><span>Metadata</span><strong data-metadata>Required: immutable</strong></div><div><span>Mint</span><strong data-mint>Not published</strong></div></div><div data-live-actions hidden><a class="button" data-solscan rel="noopener">View Solscan</a><a class="button button-alt" data-raydium rel="noopener">Open Raydium</a></div></section>
    <section id="faq" class="section pink"><p class="eyebrow">STRAIGHT ANSWERS</p><h2>What HAKKY is—and is not.</h2><details><summary>Is AntiHakkySack a working security agent?</summary><p>No. Agent 001 starts as a fictional narrator and mascot. Real tools will only be claimed when they exist and can be verified.</p></details><details><summary>Is HAKKY an investment?</summary><p>HAKKY is a high-risk meme coin with no promised utility or returns. Nothing on this site is financial, legal, or tax advice.</p></details><details><summary>Where is the official mint?</summary><p>Before launch, nowhere. After launch, this page will publish it only after on-chain verification.</p></details></section>
  </main>
  <footer><span>ANTIHAKKYSACK © 2026 · KEEP CRYPTO CLEAN</span><span>PERSONAL PROJECT · HIGH-RISK MEME COIN · NO PROMISED UTILITY OR RETURNS</span></footer>
</body>
</html>
```

- [ ] **Step 5: Add the complete responsive visual system**

Create `web/styles.css`:

```css
:root{--yellow:#f8ff4a;--pink:#ff7aeb;--purple:#7138ff;--ink:#160c2c;--orange:#ff965d;--paper:#fffdf6;--white:#fff;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:var(--ink);background:var(--paper)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}a{color:inherit}.nav{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:18px clamp(20px,5vw,72px);border-bottom:3px solid var(--ink);background:var(--yellow);font-weight:950}.nav a{text-decoration:none}.nav nav{display:flex;gap:24px;font-size:.82rem;text-transform:uppercase}.hero{min-height:650px;display:grid;grid-template-columns:1.2fr .8fr;align-items:center;padding:64px clamp(24px,6vw,88px) 104px;background:linear-gradient(150deg,var(--yellow) 0 56%,var(--pink) 56% 79%,var(--purple) 79%);position:relative;overflow:hidden}.hero>div{z-index:1}.hero img{width:min(440px,90%);justify-self:center;filter:drop-shadow(18px 18px 0 rgba(22,12,44,.24));transform:rotate(4deg)}.kicker,.eyebrow{display:inline-block;padding:8px 10px;background:var(--ink);color:var(--white);font:900 .75rem/1 ui-monospace,monospace;letter-spacing:.12em}.hero h1{max-width:820px;margin:20px 0 18px;font-size:clamp(4rem,8vw,8rem);line-height:.82;letter-spacing:-.07em;text-transform:uppercase;text-shadow:5px 5px 0 var(--white)}.lead{max-width:720px;font-size:clamp(1rem,2vw,1.35rem);font-weight:700;line-height:1.5}.button{display:inline-block;margin:16px 8px 0 0;padding:14px 18px;border:3px solid var(--ink);border-radius:6px;background:var(--ink);color:var(--white);font-weight:950;text-decoration:none;text-transform:uppercase}.button-alt{background:var(--white);color:var(--ink)}.status{position:absolute;left:0;right:0;bottom:0;margin:0;padding:18px;background:var(--ink);color:var(--white);font:800 .82rem/1.3 ui-monospace,monospace;text-align:center}.stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:3px solid var(--ink)}.stats div{padding:28px 16px;border-right:3px solid var(--ink);text-align:center}.stats div:last-child{border-right:0}.stats strong,.stats span{display:block}.stats strong{font-size:clamp(1.8rem,3vw,3rem)}.stats span{margin-top:8px;font:800 .75rem/1.2 ui-monospace,monospace;text-transform:uppercase}.section{padding:72px clamp(24px,7vw,110px);border-bottom:3px solid var(--ink)}.section h2{max-width:900px;margin:16px 0 24px;font-size:clamp(2.6rem,6vw,6rem);line-height:.9;letter-spacing:-.06em}.section>p{max-width:850px;font-size:1.15rem;font-weight:650;line-height:1.6}.pink{background:#ffcaef}.purple{background:var(--purple);color:var(--white)}.cards{display:grid;grid-template-columns:1fr 1fr;gap:24px}.cards article{padding:28px;border:3px solid var(--ink);background:var(--white);box-shadow:10px 10px 0 var(--ink)}.cards h3{font-size:1.5rem}.cards p{font-weight:650;line-height:1.6}.allocation{display:grid;grid-template-columns:4fr 1fr;margin-top:32px;border:4px solid var(--white);color:var(--ink);font-weight:950;text-transform:uppercase}.allocation span{display:grid;min-height:100px;place-items:center;padding:16px;text-align:center}.allocation span:first-child{background:var(--yellow)}.allocation span:last-child{border-left:4px solid var(--white);background:var(--pink)}.proof{display:grid;grid-template-columns:1fr 1fr;gap:14px}.proof div{display:flex;justify-content:space-between;gap:20px;padding:18px;border:3px solid var(--ink);background:var(--white);font:800 .86rem/1.3 ui-monospace,monospace}.proof strong{text-align:right}.section details{max-width:900px;padding:20px 0;border-bottom:2px solid var(--ink)}summary{cursor:pointer;font-size:1.15rem;font-weight:900}.section details p{line-height:1.6}footer{display:flex;justify-content:space-between;gap:24px;padding:24px clamp(20px,5vw,72px);background:var(--ink);color:var(--white);font-size:.72rem;font-weight:800}@media(max-width:760px){.nav nav{display:none}.hero{grid-template-columns:1fr;padding-top:44px}.hero img{width:280px;margin:28px auto}.hero h1{font-size:4rem}.stats{grid-template-columns:1fr 1fr}.stats div:nth-child(2){border-right:0}.stats div:nth-child(-n+2){border-bottom:3px solid var(--ink)}.cards,.proof{grid-template-columns:1fr}.allocation{grid-template-columns:1fr}.allocation span:last-child{border-left:0;border-top:4px solid var(--white)}footer{flex-direction:column}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
```

- [ ] **Step 6: Add a static-site contract checker and update website documentation**

Create `scripts/check-site.mjs`:

```js
import { access, readFile } from "node:fs/promises";
import { validateLaunchRecord } from "../web/lib/launch-policy.js";

const html = await readFile("web/index.html", "utf8");
const launch = JSON.parse(await readFile("web/data/launch.json", "utf8"));
const required = [
  "Rugs hate this little guy.",
  "No official mint address exists yet",
  "1,000,000",
  "0% team",
  "no presale",
  "no promised utility or returns"
];
const missing = required.filter((value) => !html.toLowerCase().includes(value.toLowerCase()));
const issues = validateLaunchRecord(launch);
await access("web/assets/sack-sentinel.svg");
await access("web/CNAME");
if (missing.length || issues.length) {
  console.error(JSON.stringify({ ok: false, missing, issues }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, missing: [], issues: [] }, null, 2));
}
```

Replace `web/README.md` with:

```markdown
# HAKKY website

Static personal-project site for `hakky.xyz`. Serve with `npm run preview`.

`data/launch.json` controls the safe public state:

- `prelaunch`: no mint address or trading link is rendered;
- `live`: verified mint, Solscan, and Raydium links are rendered.

Run `npm run check` before deployment. The site has no wallet connector,
tracking script, backend dependency, or Hetzner dependency.
```

- [ ] **Step 7: Run tests and render QA**

Run:

```powershell
rtk node --test test/site.test.mjs
rtk npm run check:site
rtk npm run preview
```

Expected: 2 tests pass, `check:site` reports `ok: true`, and the local site renders without console errors. Inspect desktop and mobile widths; prelaunch state must hide Solscan and Raydium actions.

- [ ] **Step 8: Commit**

```powershell
rtk git add web scripts/check-site.mjs test/site.test.mjs
rtk git commit -m "site: rebuild hakky.xyz for the Solana pivot"
```

---

### Task 6: Rewrite Project and Social Documentation

**Files:**
- Create: `README.md`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/TOKEN.md`
- Create: `docs/LAUNCH.md`
- Create: `launch/README.md`
- Create: `launch/content-calendar.md`
- Create: `launch/x-profile.md`
- Create: `launch/prelaunch-post.md`
- Create: `src/social-copy.mjs`
- Create: `test/social-copy.test.mjs`

**Interfaces:**
- Consumes: approved story, launch policy, Sack Sentinel assets.
- Produces: exact public copy and `buildProofPost({mint}): string`.

- [ ] **Step 1: Write failing social-copy tests**

Create `test/social-copy.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildProofPost } from "../src/social-copy.mjs";

test("proof post includes the observed mint and stays within X limit", () => {
  const mint = "11111111111111111111111111111111";
  const post = buildProofPost({ mint });
  assert.match(post, new RegExp(mint));
  assert.match(post, /1,000,000 fixed supply/);
  assert.match(post, /0% team allocation/);
  assert.ok([...post].length <= 280);
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
rtk node --test test/social-copy.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/social-copy.mjs`.

- [ ] **Step 3: Implement deterministic launch-proof copy**

Create `src/social-copy.mjs`:

```js
export function buildProofPost({ mint }) {
  if (!mint) throw new Error("mint is required");
  return [
    "$HAKKY is live on Solana.",
    "",
    "1,000,000 fixed supply",
    "0% team allocation · no presale",
    "Mint revoked · freeze authority none",
    "LP burned",
    "",
    `Mint: ${mint}`,
    "",
    "Verify: https://hakky.xyz",
    "High-risk meme coin. No promised utility or returns."
  ].join("\n");
}
```

- [ ] **Step 4: Replace the root documentation with personal-project copy**

Use these exact README sections and facts:

```markdown
# HAKKY

**Rugs hate this little guy.**

HAKKY is a personal, transparent Solana fair-launch meme coin narrated by
AntiHakkySack, the fictional Sack Sentinel Agent 001.

## Fair-launch commitments

- 1,000,000 HAKKY fixed supply
- six decimals
- 100% public distribution: 80% bonding curve, 20% post-graduation liquidity
- 0% team allocation
- no presale, vesting, treasury, or creator first-buy
- mint authority revoked before public trading
- freeze authority absent
- creator fees disabled and LP burned
- creator-funded launch cost capped at 1.00 SOL

## Verify, don't trust

Before launch, no official mint address exists. Ignore addresses in replies and
DMs. After launch, `hakky.xyz` will publish the mint only after on-chain
verification.

## AntiHakkySack

Agent 001 starts as a fictional narrator and mascot, not a working audit service
or guaranteed scam detector.

## Project documents

- [Token policy](docs/TOKEN.md)
- [Launch and verification policy](docs/LAUNCH.md)

## Risk

HAKKY is a high-risk meme coin with no promised utility or returns. Nothing in
this repository is financial, legal, or tax advice.
```

Create `SECURITY.md`:

```markdown
# Security

## Scope

Security reports may cover the static website, launch manifest, read-only
verification scripts, dependency integrity, or impersonation of HAKKY and
AntiHakkySack.

HAKKY does not deploy a custom smart contract. The token uses the Solana token
program and Raydium LaunchLab. This repository has not received a third-party
security audit.

## Reporting

Do not publish an exploitable issue before it can be reviewed. Open a GitHub
security advisory for code or dependency issues. For an impersonation report,
include the public URL, account handle, and screenshots in a private repository
security report.

Never send seed phrases, private keys, wallet files, API tokens, or passwords.

## Official-address rule

Before launch, there is no official HAKKY mint. After launch, treat the mint on
`https://hakky.xyz` as official only when its Raydium and Solscan proof links
agree with the on-chain verifier output.
```

Create `CONTRIBUTING.md`:

```markdown
# Contributing

HAKKY is a personal project. Small fixes and evidence-backed improvements are
welcome through focused pull requests.

Every change must preserve these non-negotiable rules:

- 1,000,000 HAKKY fixed supply with six decimals;
- 100% public distribution and 0% team allocation;
- no presale, vesting, treasury, creator first-buy, taxes, or hidden controls;
- no active mint or freeze authority at public trading;
- no promise of utility, profit, returns, or guaranteed scam detection;
- no third-party agency attribution or unrelated product story.

Run `npm test` and `npm run check:repo` before opening a pull request. Keep
wallet secrets and credentials out of issues, commits, and test fixtures. Report
security problems using the private process in `SECURITY.md`.
```

- [ ] **Step 5: Create canonical token and launch documentation**

Create `docs/TOKEN.md`:

```markdown
# HAKKY token policy

| Field | Fixed value |
| --- | --- |
| Network | Solana mainnet-beta |
| Token program | Classic SPL Token |
| Name | Hakky Protocol |
| Symbol | HAKKY |
| Display supply | 1,000,000 |
| Decimals | 6 |
| Base-unit supply | 1,000,000,000,000 |
| Team allocation | 0% |
| Presale | None |
| Creator first-buy | None |
| Mint authority at public trading | `null` |
| Freeze authority | `null` |
| Transfer fee or tax | None |
| Transfer hooks | None |
| Blacklist control | None |
| Permanent delegate | None |
| Metadata mutability after verification | Disabled |

`null` mint and freeze authorities are launch requirements, not aspirations.
Public trading must not begin while either authority remains active. The verifier
also requires the creator wallet to hold zero HAKKY after LaunchLab setup.

HAKKY is a high-risk meme coin with no promised utility or returns.
```

Create `docs/LAUNCH.md`:

```markdown
# HAKKY launch and verification policy

## Approved Raydium LaunchLab configuration

- full-configuration mode with SOL as the quote asset;
- 80% of supply in the public bonding curve;
- 20% reserved by LaunchLab for post-graduation liquidity;
- 0% creator, team, treasury, marketing, or vesting allocation;
- 24 SOL minimum community-funded graduation target;
- no creator first-buy;
- creator-fee rights disabled;
- post-graduation LP burned;
- total creator-funded creation and transaction cost no more than 1.00 SOL.

All supply may pass through the launch wallet during setup. Before public
trading, all 1,000,000 HAKKY must be in the approved launch mechanism and the
creator wallet balance must be zero.

## Publication state

`prelaunch` means no official mint is shown and no address from replies or DMs
should be trusted. `live` is allowed only after the mainnet mint, launch
transaction, fixed supply, authorities, creator balance, allocation, fees, and
LP policy have independent readback evidence.

## Stop before signing

Stop if cost exceeds 1.00 SOL; any fixed token or allocation value differs;
creator fees cannot be disabled; LP cannot be burned; mint authority would
remain active; freeze authority or an unexpected token extension exists; the
wallet, metadata, links, preview, or live interface is ambiguous.

If a transaction fails, do not announce a launch or create another token
automatically. Save the signature and state, diagnose the existing mint, and
obtain explicit approval for any recovery transaction and cost.

## Mainnet proof record

The proof must record the network and RPC identity, classic token program, mint,
transaction signatures, supply, decimals, mint authority, freeze authority,
creator HAKKY balance, finalized metadata and immutable state, LaunchLab launch
address, curve and liquidity allocation, creator-fee state, graduation target,
quote asset, LP disposal, and official Raydium and Solscan URLs.
```

- [ ] **Step 6: Replace the social kit with exact personal-project copy**

Create `launch/x-profile.md`:

```markdown
# X profile

- Display name: `AntiHakkySack 🧼`
- Handle: `@antihakkysack`
- Bio: `AI sentinel for Solana's dirty trenches. No presale. No team bag. 1,000,000 $HAKKY. Fair launch on Raydium. Keep crypto clean.`
- Link: `https://hakky.xyz`
- Avatar: `assets/x-avatar.png`
- Banner: `assets/x-banner.png`
```

Create `launch/prelaunch-post.md`:

```markdown
AntiHakkySack is online. 🧼

Agent 001 entered Solana's trenches with zero team tokens, no presale, and no hidden mint.

1,000,000 $HAKKY. 100% public fair launch on Raydium.

No official mint address exists yet. Ignore impostors.

https://hakky.xyz
```

Create `launch/README.md`:

```markdown
# HAKKY launch kit

- [X profile copy](x-profile.md)
- [Prelaunch post](prelaunch-post.md)
- [Posting sequence](content-calendar.md)
- Proof-post generator: `src/social-copy.mjs`
- Avatar: `assets/x-avatar.png`
- Banner: `assets/x-banner.png`

Every public mint address must come from the verified mainnet proof. Do not add
price, volume, return, urgency, or undisclosed-promotion claims.
```

Create `launch/content-calendar.md`:

```markdown
# X posting sequence

1. Refresh the display name, bio, link, avatar, and banner after action-time
   confirmation.
2. Publish the prelaunch introduction with no mint address after action-time
   confirmation.
3. After mainnet readback passes, generate and publish the launch proof post
   containing the exact mint.
4. Pin that proof post so the verified mint remains the primary reference.
5. Publish one educational follow-up explaining how to compare the site mint,
   Raydium launch page, Solscan record, and null authorities.

Each save, publish, or pin action requires confirmation at action time. Posts
must not claim a price target, expected volume, investment return, artificial
deadline, or undisclosed paid promotion.
```

- [ ] **Step 7: Run social, repository, and full text scans**

Run:

```powershell
rtk node --test test/social-copy.test.mjs
rtk npm run check:repo
rtk rg -n -i "bitcoin|cbtc|sepolia|solidity|reserve oracle|attestation registry" README.md SECURITY.md CONTRIBUTING.md docs/TOKEN.md docs/LAUNCH.md launch web package.json .github
```

Expected: the social test passes; repository check reports `ok: true`; the explicit legacy scan has no matches. Also run the owner-requested agency-name scan using the encoded scanner, not by placing that name in a command or repository file.

- [ ] **Step 8: Commit**

```powershell
rtk git add README.md SECURITY.md CONTRIBUTING.md docs launch src/social-copy.mjs test/social-copy.test.mjs
rtk git commit -m "docs: publish the personal HAKKY launch story"
```

---

### Task 7: Add Devnet Rehearsal and CI Gates

**Files:**
- Create: `scripts/rehearse-devnet.mjs`
- Create: `.github/workflows/quality.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: Solana dependencies, `fetchMintEvidence`, `evaluateMintEvidence`, generated assets, all checks.
- Produces: disposable devnet evidence under ignored `artifacts/devnet-rehearsal/`; CI quality gate.

- [ ] **Step 1: Implement the disposable devnet rehearsal**

Create `scripts/rehearse-devnet.mjs`:

```js
import { mkdir, writeFile } from "node:fs/promises";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  AuthorityType,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer
} from "@solana/spl-token";
import { evaluateMintEvidence } from "../src/mint-proof.mjs";
import { fetchMintEvidence } from "../src/solana-rpc.mjs";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const payer = Keypair.generate();
const launchVaultOwner = Keypair.generate();
const airdrop = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
await connection.confirmTransaction(airdrop, "confirmed");

const mint = await createMint(connection, payer, payer.publicKey, null, 6);
const creatorAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
const vaultAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, launchVaultOwner.publicKey);
const fullSupply = 1_000_000_000_000n;
await mintTo(connection, payer, mint, creatorAta.address, payer, fullSupply);
await transfer(connection, payer, creatorAta.address, vaultAta.address, payer, fullSupply);
await setAuthority(connection, payer, mint, payer, AuthorityType.MintTokens, null);

const observed = await fetchMintEvidence({
  connection,
  network: "mainnet-beta",
  mintAddress: mint.toBase58(),
  creatorAddress: payer.publicKey.toBase58()
});
const proof = { cluster: "devnet", checkedAt: new Date().toISOString(), ...evaluateMintEvidence(observed) };
await mkdir("artifacts/devnet-rehearsal", { recursive: true });
await writeFile("artifacts/devnet-rehearsal/proof.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
if (!proof.ok) process.exitCode = 1;
```

The evaluator uses the policy label `mainnet-beta` intentionally because it checks the target token policy while `cluster: devnet` records where the rehearsal occurred.

- [ ] **Step 2: Add the quality workflow**

Create `.github/workflows/quality.yml`:

```yaml
name: quality

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run assets
      - run: npm run check
      - run: git diff --exit-code
```

Replace `.github/workflows/pages.yml` with:

```yaml
name: pages

on:
  push:
    branches: [main]
    paths:
      - "web/**"
      - "launch/assets/**"
      - ".github/workflows/pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/configure-pages@v5
        with:
          enablement: true
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Run the complete local quality gate**

Run:

```powershell
rtk npm ci
rtk npm run assets
rtk npm run check
rtk proxy git diff --check
```

Expected: all Node tests pass, repository and site checks report `ok: true`, generated assets produce no uncommitted changes after the first committed render, and Git reports no whitespace errors.

- [ ] **Step 4: Run the devnet rehearsal**

Run:

```powershell
rtk npm run rehearsal:devnet
```

Expected: output contains `"cluster":"devnet"`, `"ok":true`, classic token program, fixed supply, six decimals, null mint/freeze authorities, and zero creator balance. If the public faucet is unavailable, record that external limitation and rerun against devnet only after airdrop access returns; do not substitute mainnet.

- [ ] **Step 5: Perform desktop and mobile browser verification**

Run `rtk npm run preview`, then use the browser workflow to inspect:

- desktop viewport 1440x1000;
- mobile viewport 390x844;
- no horizontal overflow;
- prelaunch warning visible above the fold;
- live actions hidden;
- Sack Sentinel not clipped;
- all navigation targets and external links correct;
- no console errors;
- `hakky.xyz` renders the same static files locally.

Expected: screenshots show the approved Meme Broadcast direction on both sizes.

- [ ] **Step 6: Commit**

```powershell
rtk git add .github/workflows scripts/rehearse-devnet.mjs
rtk git commit -m "ci: gate the HAKKY launch build"
```

- [ ] **Step 7: Final build-plan verification**

Run:

```powershell
rtk npm ci
rtk npm run assets
rtk npm run check
rtk git status --short
```

Expected: all checks pass. The only acceptable untracked data is ignored local `artifacts/` and `.superpowers/`; tracked working tree is clean. Do not push, deploy, edit X, access Hetzner, connect a wallet, or spend SOL in this plan.
