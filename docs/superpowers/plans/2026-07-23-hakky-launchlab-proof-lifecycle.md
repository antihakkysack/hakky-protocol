# HAKKY LaunchLab Proof Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build strict, append-only Solana and Raydium proof artifacts that promote HAKKY through `prelaunch`, `curve-live`, and `graduated`, while preserving a schema-valid `unavailable` proof substate whenever canonical evidence cannot support the published stage.

**Architecture:** JSON Schema is normative for all three canonical artifacts and the public launch record. Read-only RPC collectors produce finalized raw evidence; pure evaluators reconcile transaction bytes against same-or-later account bytes; promotion builders consume only validated, content-hashed artifacts and an exact publication timestamp. Public stage and proof availability are orthogonal: `status` records the lifecycle stage, while `proof.availability` is either `verified` or `unavailable`; the unavailable branch contains no mint, destinations, observed authorities, or other verified values.

**Tech Stack:** Node.js 22 ESM, `node:test`, JSON Schema 2020-12 with `ajv@8.20.0`, `@solana/web3.js@1.98.4`, `@solana/spl-token@0.4.15`, SHA-256 and Ed25519 verification from `node:crypto`, official Raydium SDK source pinned to commit `fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c`, and official Metaplex Token Metadata source pinned to annotated tag object `b5d72daf3dd7165b157db85984700269ad6fdebe` / dereferenced `mpl-token-metadata@v5.1.1` commit `a7ee5e17ed60feaafeaa5582a4f46d9317c1b412`.

## Global Constraints

- The canonical artifact paths are exactly `proof/mainnet-mint.json`, `proof/mainnet-launchlab.json`, and `proof/mainnet-graduation.json`.
- Mint and LaunchLab artifacts use `schemaVersion: 2`; graduation uses `schemaVersion: 1`; the public launch record uses `schemaVersion: 2`.
- Every schema object sets `additionalProperties: false`; all fields are required unless a discriminated branch explicitly requires `null`.
- Public keys are canonical base58 strings, signatures are canonical base58 strings, timestamps are exact UTC RFC 3339 with milliseconds, slots are non-negative integers, and all token/lamport quantities are canonical unsigned decimal strings.
- All Solana observations use `finalized` commitment. Launch, mint, vault, metadata, pool, LP, and PlatformConfig account observations must be at the transaction slot or later.
- Curve-live mint authority must equal the exact Raydium LaunchLab authority PDA. Graduated mint authority and freeze authority must be null.
- The Raydium LaunchLab program ID is `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`; source-derived seeds, discriminators, layouts, and instruction meanings are pinned to official SDK commit `fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c`.
- The Metaplex Token Metadata program ID is `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`; PDA seeds, `MetadataV1` Borsh layout/tails, null padding rules, and `CreateMetadataAccountV3` discriminator/data/accounts are pinned to official repository commit `a7ee5e17ed60feaafeaa5582a4f46d9317c1b412`. Post-state `isMutable: false` is insufficient by itself because the program permits a later true-to-false transition; the creation transaction's finalized direct Metaplex CPI must independently encode `isMutable: false` or mint-v2 remains unavailable.
- Classic SPL Token, six decimals, `10000000000000` base units, `8000000000000` curve units, `2000000000000` liquidity units, zero vesting/team/creator-first-buy, wrapped SOL quote, `24000000000` lamport configured minimum, zero creator fee rights, and cumulative creator cost no greater than `1000000000` lamports are invariant.
- `cpmm` accepts only `burn-and-earn` with creator/platform shares `0` bps and irreversible locked share `10000` bps. `amm-v4` accepts only literal LP burn evidence with zero creator/platform/recoverable LP units, null withdrawal authority, and an empty fee-right list.
- Canonical artifacts are append-only. Promotion may atomically replace only `web/data/launch.json` and may move only `prelaunch -> curve-live -> graduated`, change proof availability from `verified` to `unavailable` without changing stage, or restore `unavailable -> verified` at the same or a later stage only after the stage-specific builder validates the complete canonical artifact set.
- Promotion builders accept no operator-authored runtime fact overrides. Curve and graduated builders accept only the exact publication timestamp. The unavailable builder accepts a validated ignored `observed-stage-v1` receipt produced by the fixed finalized stage observer and, only when the source record is already identity-free unavailable, the exact prior `observed-stage-v1` bytes plus the ignored `unavailable-continuity-v1` receipt that binds those source bytes to that prior stage evidence. It accepts no timestamp or fact override; no receipt is serialized into the public record.
- `proof.availability: "unavailable"` is an exact schema branch containing only `stage` and `availability`. Its matching `token.mint` is null, and it contains no source artifacts, links, transactions, authorities, balances, pool, or LP fields.
- The browser receives none of the Solana, Raydium, or AJV dependency graph.
- Keep `@solana/web3.js@1.98.4`, `@solana/spl-token@0.4.15`, and `entities@8.0.0` pinned; do not run `npm audit fix --force`. Recheck the two documented upstream exceptions by 2026-08-23.
- No mainnet transaction, wallet signature, metadata upload, or public mutation is part of this implementation plan.
- At the pinned SDK/IDL revisions, CPMM pool/migration/SPL layouts are available but the separate lock program's position/NFT/fee-right account layouts are not. The implementation must encode this as `source-coverage-unavailable`; it cannot emit a verified CPMM graduation artifact or treat later API data as a substitute until an official source is pinned and reviewed.
- The approved Raydium docs commit covers the exact semantics of the HAKKY target (`cpmm`, `platformScaleRaw = 0`, `creatorScaleRaw = 0`, `burnScaleRaw = 1000000`). It does not create an approval path: the same source proves the platform administrator can update the live migration scales, fees, wallets, and CPMM creator before graduation, and stock LaunchLab provides no freeze or authority-revocation instruction. Proof Task 4 and Operations Task 3 must consume the exact `platform-config-immutability-unavailable` control and must not emit `ok: true`, a canonical LaunchLab artifact, or an approval envelope.

---

## File Structure

**Create**

- `schemas/proof/mainnet-mint-v2.schema.json` — normative mint proof shape.
- `schemas/proof/mainnet-launchlab-v2.schema.json` — normative creation/curve proof shape.
- `schemas/proof/mainnet-graduation-v1.schema.json` — normative graduation proof and LP union.
- `schemas/web/launch-v2.schema.json` — lifecycle plus orthogonal availability union.
- `src/schema-validation.mjs` — Node-only AJV compilation and normalized errors.
- `scripts/render-launch-schema-validator.mjs` — deterministic AJV standalone browser-validator generator.
- `web/lib/launch-schema.generated.js` — generated dependency-free validator for launch-v2.
- `src/raydium-launchlab.mjs` — source-pinned PDA, instruction, and account decoding.
- `src/metaplex-metadata.mjs` — narrow immutable metadata decoder and digest binding.
- `src/launchlab-proof.mjs` — pure two-source LaunchLab reconciliation.
- `src/graduation-proof.mjs` — pure graduation reconciliation.
- `src/stage-observation.mjs` — finalized monotonic stage observer for fail-closed publication.
- `src/record-output.mjs` — shared atomic public-record replacement.
- `scripts/verify-launchlab.mjs` — read-only LaunchLab artifact CLI.
- `scripts/verify-graduation.mjs` — read-only graduation artifact CLI.
- `scripts/build-curve-live-record.mjs` — first verified promotion CLI.
- `scripts/build-graduated-record.mjs` — final verified promotion CLI.
- `scripts/build-unavailable-record.mjs` — deterministic fail-closed record CLI.
- `test/proof-schemas.test.mjs`
- `test/raydium-launchlab.test.mjs`
- `test/launchlab-proof.test.mjs`
- `test/graduation-proof.test.mjs`
- `test/stage-observation.test.mjs`
- `test/build-curve-live-record.test.mjs`
- `test/build-graduated-record.test.mjs`
- `test/build-unavailable-record.test.mjs`

**Modify**

- `package.json`, `package-lock.json`
- `web/data/launch.json`
- `web/lib/launch-policy.js`
- `src/solana-rpc.mjs`
- `src/mint-proof.mjs`
- `src/canonical-proof.mjs`
- `src/proof-output.mjs`
- `scripts/verify-token.mjs`
- `scripts/check-site.mjs`
- `test-support/launch-fixtures.mjs`
- `test/mint-proof.test.mjs`
- `test/canonical-proof.test.mjs`
- `test/launch-policy.test.mjs`
- `test/build-live-record.test.mjs` (replace with the stage-specific builder tests, then remove)
- `proof/README.md`

**Retire after migration**

- `scripts/build-live-record.mjs` — ambiguous `live` terminology and v1 flat proof model.

---

### Task 1: Commit Normative Schemas and Versioned Fixtures

**Files:**

- Create: `schemas/proof/mainnet-mint-v2.schema.json`
- Create: `schemas/proof/mainnet-launchlab-v2.schema.json`
- Create: `schemas/proof/mainnet-graduation-v1.schema.json`
- Create: `schemas/web/launch-v2.schema.json`
- Create: `src/schema-validation.mjs`
- Create: `scripts/render-launch-schema-validator.mjs`
- Create: `web/lib/launch-schema.generated.js`
- Create: `test/proof-schemas.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `web/data/launch.json`
- Modify: `web/lib/launch-policy.js`
- Modify: `test-support/launch-fixtures.mjs`
- Modify: `test/launch-policy.test.mjs`

**Interfaces:**

- Produces:

  ```js
  validateSchema(kind, value) // => { ok: boolean, errors: string[] }
  assertSchema(kind, value)   // => value, or throws Error with deterministic paths
  validateLaunchShape(value)  // generated browser-safe function => boolean
  ```

- `kind` is exactly one of `mint-v2`, `launchlab-v2`, `graduation-v1`, or `launch-v2`.
- Fixture exports are exactly:

  ```js
  createCanonicalMintProofV2()
  createCanonicalLaunchlabProofV2({ migrationType = "cpmm" } = {})
  createCanonicalGraduationProofV1({ migrationType = "cpmm" } = {})
  createPrelaunchRecordV2()
  createCurveLiveRecordV2({ availability = "verified", migrationType = "cpmm" } = {})
  createGraduatedRecordV2({ availability = "verified", migrationType = "cpmm" } = {})
  ```

- The web proof union is exact:

  ```js
  { stage: "curve-live", availability: "unavailable" }
  { stage: "graduated", availability: "unavailable" }
  ```

  or the verified stage object. Curve verified requires exact `stage`, `availability`, `sourceArtifacts`, `observation`, `supply`, `authorities`, `creatorBalance`, `allocations`, `quote`, `creatorFirstBuy`, `vesting`, `fees`, `cost`, `metadata`, `transactions`, and `links`. Graduated verified requires those objects plus `graduation`, `pool`, and the discriminated `lpDisposition`.

- [ ] **Step 1: Write failing schema tests**

  Add table-driven tests that validate all six fixture branches, then mutate every root and nested object with an extra property and assert rejection. Add separate cases for missing fields, noncanonical decimal strings (`"01"`, `"1.0"`, `-1`), non-millisecond timestamps, negative/fractional slots, URL credentials/query/fragment, cross-union CPMM fields in AMM-v4, and AMM-v4 fields in CPMM. Assert unavailable records have `token.mint === null`, exactly two proof keys, and no serialized destination or authority field.

- [ ] **Step 2: Run the schema tests and verify RED**

  Run:

  ```powershell
  rtk node --test test/proof-schemas.test.mjs
  ```

  Expected: FAIL because the schemas, validator module, and v2 fixtures do not exist.

- [ ] **Step 3: Add the schema dependency and exact schema files**

  Run:

  ```powershell
  rtk npm install --save-exact ajv@8.20.0
  rtk npm audit --omit=dev --json
  ```

  Expected: AJV adds no new production advisory; the existing Solana transitive exceptions remain separately documented. Stop and review if the root issue count increases.

  Implement each schema as JSON Schema 2020-12. Use `$defs` for canonical public keys, signatures, SHA-256 lowercase hex, unsigned decimal strings, exact timestamps, slots, canonical artifact descriptors, checks, and both LP branches. Use `oneOf` plus `const` discriminators for public status, availability, migration type, and LP kind.

  The artifact root keys must be exactly:

  ```text
  mint-v2: schemaVersion, network, identities, supply, authorities, creatorBalance, metadata, observation, checks, ok
  launchlab-v2: schemaVersion, network, identities, transaction, programs, platformConfig, allocations, quote, creatorFirstBuy, vesting, fees, migration, metadata, cost, links, observation, checks, ok
  graduation-v1: schemaVersion, network, identities, transaction, programs, supply, authorities, metadata, graduationBalance, pool, lpDisposition, fees, creatorBalance, cost, links, observation, checks, ok
  launch-v2: schemaVersion, status, network, project, token, launch, proof
  ```

  Root constants are exact: mint-v2 and launchlab-v2 use numeric `schemaVersion: 2`; graduation-v1 uses numeric `schemaVersion: 1`; launch-v2 uses numeric `schemaVersion: 2`; every network is `mainnet-beta`; artifact `ok` is the constant `true`; launch status is only `prelaunch`, `curve-live`, or `graduated` and proof availability is only `verified` or `unavailable` where applicable.

  The schema files, not prose or fixtures, are normative. They must set `additionalProperties: false` on every object and encode this complete nested contract; an implementer may not add, rename, infer, or zero-fill a field:

  | Artifact/object | Exact child keys | Exact value rules |
  |---|---|---|
  | common artifact descriptor | `path`, `sha256`, `schemaVersion` | repository-relative canonical path; lowercase SHA-256; exact schema-version constant |
  | common observation | `finalizedSlot`, `finalizedAt`, `checkedAt`, `rpcHost` | nonnegative safe integer; both timestamps are UTC RFC 3339 with milliseconds; `checkedAt` is the artifact verification time and is at or after `finalizedAt`; public HTTPS hostname only |
  | common creator balance | `owner`, `accounts`, `totalAmountBaseUnits`, `finalizedSlot`, `finalizedAt` | creator public key; exhaustive array sorted by address; canonical total; qualified finalized observation |
  | each creator-balance account | `address`, `mint`, `owner`, `amountBaseUnits`, `state`, `accountSha256` | canonical public keys; canonical amount; state `initialized` or `frozen`; exact raw-account digest |
  | common metadata | `name`, `symbol`, `uri`, `metadataAccount`, `metadataAccountSha256`, `jsonSha256`, `imageUri`, `imageSha256`, `externalUrl`, `twitter`, `updateAuthority`, `isMutable` | exact `Hakky Protocol`/`HAKKY`; content-addressed URI and hashes; exact `https://hakky.xyz` and `https://x.com/antihakkysack`; observed canonical Metaplex update-authority public key; `isMutable: false` |
  | common supply | `baseUnits`, `uiAmount`, `decimals`, `tokenProgram` | `10000000000000`; `10000000`; `6`; classic SPL Token program public key |
  | common authorities | `mintAuthority`, `authorityKind`, `freezeAuthority` | curve uses exact LaunchLab PDA plus `launchlab-program-pda`; graduated uses `null` plus `null`; freeze is always `null` |
  | common allocations | `publicCurveBaseUnits`, `publicCurveBps`, `liquidityBaseUnits`, `liquidityBps`, `teamBaseUnits`, `teamBps`, `totalBps` | canonical decimals; exactly 8000/2000/0/10000 bps and zero team units |
  | common quote | `mint`, `symbol`, `decimals`, `fundraisingLamports`, `graduationThresholdLamports` | wrapped SOL mint; `SOL`; 9; canonical unsigned decimals |
  | common first buy | `creatorLamports`, `creatorTokenBaseUnits` | both exactly `"0"` |
  | common vesting | `lockedBaseUnits`, `cliffSeconds`, `unlockSeconds` | all exactly `"0"` |
  | common fees | `protocolBuyFeeRateMillionths`, `protocolSellFeeRateMillionths`, `feeRateDenominator`, `creatorTradingFeeRateMillionths`, `creatorFeeKey`, `creatorFeeRights`, `snapshotImmutable` | canonical unsigned decimals; buy equals sell; denominator exactly `"1000000"` from the pinned SDK; creator rate `"0"`; key `null`; rights `false`; immutable snapshot `true` |
  | common cost | `metadataUploadLamports`, `creationDebitLamports`, `recoveryDebitLamports`, `graduationDebitLamports`, `cumulativeCreatorDebitLamports`, `capLamports`, `withinCap` | canonical unsigned decimals; exact four-term sum; pre-graduation uses graduation `"0"`; cap `1000000000`; boolean true only at or below cap |
  | mint-v2 `identities` | `mint`, `creator`, `metadataAccount`, `launchId`, `launchlabAuthority` | canonical public keys |
  | mint-v2 `observation` | `genesisHash`, `creationSignature`, `creationSlot`, `creationTime`, `creationTransactionSha256`, `metadataCreateCpiSha256`, `creationExecutionSha256`, `mintAccountSha256`, `metadataAccountSha256`, `finalizedSlot`, `finalizedAt`, `checkedAt`, `rpcHost` | exact mainnet genesis hash; canonical signature; exact raw transaction/CPI/canonical-execution hashes; raw mint/metadata digests; qualified finalized chronology; exact verification timestamp |
  | mint-v2 `checks` | `mainnetGenesis`, `creationTransaction`, `validSignatures`, `sourcePinnedAccountMetas`, `atomicImmutableMetadata`, `metadataAccountCreated`, `classicTokenProgram`, `exactSupply`, `launchlabAuthority`, `nullFreezeAuthority`, `zeroCreatorBalance`, `immutableMetadataPostState`, `metadataDigestMatch`, `finalized` | exact booleans, all `true` when `ok: true` |
  | launchlab-v2 `identities` | `mint`, `creator`, `launchId`, `configId`, `platformConfig`, `launchlabAuthority`, `baseVault`, `quoteVault`, `metadataAccount` | canonical public keys |
  | launchlab-v2 `transaction` | `signature`, `finalizedSlot`, `finalizedAt`, `instruction`, `instructionDiscriminatorHex`, `transactionSha256` | `initialize-v2`; `4399af27da102620`; finalized observation and hashes |
  | launchlab-v2 `programs` | `launchlab`, `token`, `metadata`, `system`, `associatedToken`, `quoteMint` | exact source-pinned/current launch-day public program identities; token is classic SPL |
  | launchlab-v2 `platformConfig` | `address`, `creationAccountSha256`, `verificationAccountSha256`, `updateAuthorities`, `mutableFields`, `mutabilityClassification`, `platformScaleRaw`, `creatorScaleRaw`, `burnScaleRaw`, `feeRateMillionths`, `creatorFeeRateMillionths`, `platformVestingScaleRaw`, `immutableBinding` | exact address/hashes/raw integers; `updateAuthorities` is an exhaustive sorted canonical-public-key array and includes the decoded platform administrator; `mutableFields` is the exhaustive sorted pinned-IDL set; classification is exactly `platform-mutable-per-launch-snapshot-verified`; fee-rate denominator is `1000000`; diagnostic evidence binds `immutableBinding` as `platform-admin-mutable-until-graduation`, which prevents construction of this verified schema until a separately reviewed mechanism proves on-chain immutability |
  | launchlab-v2 `migration` | `type`, `lpPolicy`, `platformLpBps`, `creatorLpBps`, `irreversibleLpBps` | `cpmm` + `burn-and-earn`, or `amm-v4` + `lp-burn`; exactly 0/0/10000 |
  | launchlab-v2 `links` | `solscanMint`, `solscanCreationTransaction`, `raydiumLaunchlab` | canonical credential/query/fragment-free HTTPS destinations derived from identities |
  | launchlab-v2 `observation` | `launchAccountSha256`, `baseVaultSha256`, `quoteVaultSha256`, `platformConfigSha256`, `finalizedSlot`, `finalizedAt`, `checkedAt`, `rpcHost` | exact account-byte hashes plus common observation fields |
  | launchlab-v2 `checks` | `transactionDecoded`, `accountsDecoded`, `sourcesAgree`, `immutableEconomics`, `allocationPolicy`, `feePolicy`, `costCap`, `metadataDigestMatch`, `finalized` | booleans, all `true` when `ok: true` |
  | graduation-v1 `identities` | `mint`, `creator`, `launchId`, `platformConfig`, `pool` | canonical public keys |
  | graduation-v1 `transaction` | `signature`, `finalizedSlot`, `finalizedAt`, `transactionSha256` | canonical finalized migration transaction |
  | graduation-v1 `programs` | `launchlab`, `migration`, `pool`, `token` | exact verified program identities |
  | graduation-v1 `graduationBalance` | `configuredThresholdLamports`, `observedQuoteBalanceLamports`, `status`, `finalizedSlot`, `finalizedAt` | separate canonical decimals; status constant `graduated`; qualified observation |
  | graduation-v1 `pool` | `address`, `programId`, `quoteVault`, `quoteVaultBalanceLamports`, `accountSha256` | canonical public identities, balance, and exact account hash |
  | CPMM `lpDisposition` | `kind`, `lpMint`, `lockedPosition`, `lockProgram`, `lockNftMint`, `lockNftTokenAccount`, `lockVault`, `platformLpBps`, `creatorLpBps`, `irreversibleLpBps`, `withdrawalAuthority`, `feeKey`, `feeRights`, `recoverableLpBaseUnits`, `evidenceAccounts` | `burn-and-earn`; exact LP/position/program/NFT/vault identities; 0/0/10000; both authorities `null`; `feeRights` exact empty array; recoverable `"0"`; branch-complete raw evidence array |
  | AMM-v4 `lpDisposition` | `kind`, `lpMint`, `burnedBaseUnits`, `totalSupplyBaseUnits`, `creatorLpBaseUnits`, `platformLpBaseUnits`, `recoverableLpBaseUnits`, `withdrawalAuthority`, `feeKey`, `feeRights`, `evidenceAccounts` | `lp-burn`; burn equals total supply; all held/recoverable values `"0"`; both authorities `null`; `feeRights` exact empty array; branch-complete raw evidence array |
  | each LP `evidenceAccounts` item | `role`, `address`, `ownerProgram`, `accountSha256`, `finalizedSlot`, `finalizedAt` | exact canonical identities, raw-account digest, and qualified finalized observation; array sorted by role/address; CPMM roles are only `lp-mint`, `locked-position`, `lock-nft-mint`, `lock-nft-token-account`, `lock-vault`, `fee-right-account`; AMM-v4 roles are only `lp-mint`, `burn-source`, `creator-lp-account`, `platform-lp-account`, `withdrawal-queue`, `fee-right-account`; every branch-required role must be present and no unpinned/missing account can be zero-filled |
  | graduation-v1 `links` | `solscanMint`, `solscanCreationTransaction`, `solscanGraduationTransaction`, `raydiumLaunchlab`, `raydiumPool` | canonical credential/query/fragment-free HTTPS destinations |
  | graduation-v1 `observation` | `launchAccountSha256`, `platformConfigSha256`, `poolAccountSha256`, `lpEvidenceSha256`, `finalizedSlot`, `finalizedAt`, `checkedAt`, `rpcHost` | exact launch/config/pool hashes; digest of canonical serialized `lpDisposition.evidenceAccounts`; common observation fields |
  | graduation-v1 `checks` | `artifactsAgree`, `graduated`, `nullAuthorities`, `poolVerified`, `lpDispositionVerified`, `feePolicy`, `costCap`, `finalized` | booleans, all `true` when `ok: true` |

  `mint-v2` uses the exact common `supply`, `authorities`, `creatorBalance`, and `metadata` objects. `launchlab-v2` uses exact common `allocations`, `quote`, `creatorFirstBuy`, `vesting`, `fees`, `metadata`, and `cost`. `graduation-v1` uses exact common `supply`, `authorities`, `metadata`, `fees`, `creatorBalance`, and `cost`, plus the listed graduation objects. No nullable value is allowed except the explicitly named account/authority/Fee Key fields.

  The exact sorted `platformConfig.mutableFields` value is `cpSwapConfig`, `creatorFeeRate`, `feeRate`, `feeWallet`, `image`, `migrateNftInfo`, `name`, `nftWallet`, `platformCpCreator`, `platformVestingScale`, `transferFeeExtensionAuth`, `vestingWallet`, `web`. It is derived from every field reachable through the pinned `update_platform_config` IDL enum, including `AllInfo`, not operator input. An unknown/new update enum or a missing administrator identity is a schema/evaluation hard stop.

  The fixed `launch-v2` root objects are exact:

  | Object | Exact child keys and constants |
  |---|---|
  | `project` | `name`, `symbol`, `agent`, `website`, `x`; exact values `Hakky Protocol`, `HAKKY`, `HakkyAgent`, `https://hakky.xyz`, `https://x.com/antihakkysack` |
  | `token` | `mint`, `supplyBaseUnits`, `uiSupply`, `decimals`, `tokenProgram`; mint is `null` only for prelaunch/unavailable and all other fields equal common supply |
  | `launch` | `venue`, `quoteSymbol`, `publicCurveBps`, `liquidityBps`, `teamBps`, `creatorFirstBuyLamports`, `vestingBaseUnits`, `creatorDebitCapLamports`; exact constants `Raydium LaunchLab`, `SOL`, 8000, 2000, 0, `"0"`, `"0"`, `"1000000000"` |
  | verified curve `sourceArtifacts` | `mint`, `launchlab`; each is the exact common descriptor |
  | verified graduated `sourceArtifacts` | `mint`, `launchlab`, `graduation`; each is the exact common descriptor |
  | verified `transactions` | curve has only `creation`; graduated has `creation` and `graduation`; each child has `signature`, `finalizedSlot`, `finalizedAt` |
  | verified curve `links` | `solscanMint`, `solscanCreationTransaction`, `raydiumLaunchlab` |
  | verified graduated `links` | `solscanMint`, `solscanCreationTransaction`, `solscanGraduationTransaction`, `raydiumLaunchlab`, `raydiumPool` |

  Verified web proof objects reuse the exact common objects above without aliases. Curve `observation` is the common observation object; graduated `observation` is the latest common observation object. Graduated `graduation`, `pool`, and `lpDisposition` are copied exactly from the graduation artifact. This is the one contract Public Tasks 1–2 consume.

- [ ] **Step 4: Implement deterministic Node and browser schema compilation**

  Implement `src/schema-validation.mjs` with a single AJV 2020 instance using `{ allErrors: true, strict: true, validateFormats: false, code: { source: true, esm: true, lines: true } }`. Load schemas from paths relative to `import.meta.url`, compile once, sort normalized errors by `instancePath`, `keyword`, and message, and never include source JSON values in errors.

  Implement `scripts/render-launch-schema-validator.mjs` with `ajv/dist/standalone/index.js`, the same `code.source`/`code.esm` options, and a named schema key `launchV2`. Generate the standalone module, append a deterministic wrapper `export const validateLaunchShape = launchV2;`, and reject output that lacks that export. Default mode writes only `web/lib/launch-schema.generated.js`. Exact `--check` mode renders entirely in memory, byte-compares against the existing generated file, writes nothing, and exits nonzero on absence or drift; no other CLI option is accepted. Add:

  ```json
  "schemas": "node scripts/render-launch-schema-validator.mjs"
  ```

- [ ] **Step 5: Upgrade the prelaunch record and browser-safe semantic validator**

  Change `web/data/launch.json` to v2 `prelaunch`, keep `token.mint` and `proof` null, and encode this exact expected lifecycle under launch policy:

  ```json
  {
    "curveMintAuthority": "launchlab-program-pda",
    "graduatedMintAuthority": null,
    "freezeAuthority": null
  }
  ```

  Update `web/lib/launch-policy.js` to import generated `validateLaunchShape`, then apply the fixed HAKKY semantic policy. Accept `prelaunch`, `curve-live`, and `graduated`, with the verified/unavailable proof union. Keep browser runtime dependency-free. Make `validateLaunchRecord` reject unavailable records that retain a mint, link, transaction, authority, balance, pool, or LP field.

- [ ] **Step 6: Run focused tests and verify GREEN**

  Run:

  ```powershell
  rtk node --test test/proof-schemas.test.mjs test/launch-policy.test.mjs
  rtk npm run schemas
  rtk node scripts/render-launch-schema-validator.mjs --check
  ```

  Expected: PASS, covering every lifecycle/availability branch, unknown-field rejection, and a byte-for-byte in-memory second render even while the generated file is still untracked.

- [ ] **Step 7: Refactor fixtures without changing behavior**

  Centralize canonical addresses, hashes, timestamps, slots, allocation strings, and both LP variants in `test-support/launch-fixtures.mjs`. Run the focused tests again and confirm identical results.

- [ ] **Step 8: Commit the schema slice**

  ```powershell
  rtk git add package.json package-lock.json schemas web/data/launch.json web/lib/launch-policy.js web/lib/launch-schema.generated.js src/schema-validation.mjs scripts/render-launch-schema-validator.mjs test-support/launch-fixtures.mjs test/proof-schemas.test.mjs test/launch-policy.test.mjs
  rtk git commit -m "proof: define strict lifecycle schemas"
  ```

---

### Task 2: Pin and Decode Raydium LaunchLab Evidence

**Files:**

- Create: `src/raydium-launchlab.mjs`
- Create: `test/raydium-launchlab.test.mjs`
- Create: `test-support/fixtures/launchlab/initialize-v2-transaction.json`
- Create: `test-support/fixtures/launchlab/migrate-to-cpswap-transaction.json`
- Create: `test-support/fixtures/launchlab/migrate-to-amm-transaction.json`
- Create: `test-support/fixtures/launchlab/platform-config-instructions.json`
- Create: `test-support/fixtures/launchlab/curve-accounts.json`
- Create: `test-support/fixtures/launchlab/graduation-accounts.json`
- Modify: `proof/README.md`

**Interfaces:**

- Consumes: canonical `PublicKey` support from `@solana/web3.js`.
- Produces:

  ```js
  export const RAYDIUM_LAUNCHLAB_PROGRAM_ID;
  export const RAYDIUM_SOURCE_PROVENANCE;
  export const RAYDIUM_IDL_SOURCE_PROVENANCE;
  export const SPL_TOKEN_SOURCE_PROVENANCE;
  export const HAKKY_SOURCE_COVERAGE_UNAVAILABLE;

  deriveLaunchlabAuthorityPda()
  derivePlatformConfigPda(platformAdmin)
  decodeLaunchlabCreationTransaction({ transactionBytes, accountKeys })
  decodeLaunchlabGraduationTransaction({ transactionBytes, accountKeys })
  decodePlatformConfigAuthorityInstruction({ instructionBytes, accountMetas, feePayer })
  decodeLaunchlabAccounts({ launchAccount, vaultAccount, platformConfigAccount })
  decodeGraduationAccounts({ launchAccount, poolAccount, platformConfigAccount })
  evaluateHakkyLaunchlabSourceCoverage({ migrationType, platformScaleRaw, creatorScaleRaw, burnScaleRaw })
  ```

- Return contracts are exact and frozen:

  | Function | Exact result |
  |---|---|
  | `deriveLaunchlabAuthorityPda()` | `{ publicKey, bump }`; always derives from UTF-8 `vault_auth_seed` and the fixed `RAYDIUM_LAUNCHLAB_PROGRAM_ID` |
  | `derivePlatformConfigPda(platformAdmin)` | `{ publicKey, bump }`; derives from UTF-8 `platform_config` plus the canonical administrator key and the fixed LaunchLab program |
  | `decodeLaunchlabCreationTransaction(...)` | `{ instruction, discriminatorHex, accounts, decimals, name, symbol, uri, curve, vesting, cpmmCreatorFeeOn }`; `instruction` is `initialize-v2`; `accounts` has exactly `payer`, `creator`, `configId`, `platformId`, `authority`, `launchId`, `mint`, `quoteMint`, `baseVault`, `quoteVault`, `metadataAccount`, `tokenProgramBase`, `tokenProgramQuote`, `metadataProgram`, `systemProgram`, `rentSysvar`, `eventAuthority`, `launchlabProgram`; `curve` has exactly `type`, `supply`, `totalSell`, `totalFundraising`, `migrationType`; `vesting` has exactly `lockedAmount`, `cliffPeriod`, `unlockPeriod`; every integer is `bigint` |
  | `decodeLaunchlabGraduationTransaction(...)` CPMM | `{ instruction, discriminatorHex, migrationType, accounts }`; instruction `migrate-to-cpswap`, discriminator `885cc8671cda908c`, migration type `cpmm`; accounts exactly `payer`, `baseMint`, `quoteMint`, `platformConfig`, `cpmmProgram`, `cpmmPool`, `cpmmAuthority`, `cpmmLpMint`, `cpmmBaseVault`, `cpmmQuoteVault`, `cpmmConfig`, `cpmmCreatePoolFee`, `cpmmObservation`, `lockProgram`, `lockAuthority`, `lockLpVault`, `launchlabAuthority`, `launchId`, `globalConfig`, `launchBaseVault`, `launchQuoteVault`, `poolLpToken`, `baseTokenProgram`, `quoteTokenProgram`, `associatedTokenProgram`, `systemProgram`, `rentSysvar`, `metadataProgram`; data is exactly the discriminator |
  | `decodeLaunchlabGraduationTransaction(...)` AMM-v4 | `{ instruction, discriminatorHex, migrationType, accounts, baseLotSize, quoteLotSize, marketVaultSignerNonce }`; instruction `migrate-to-amm`, discriminator `cf52c091fecf91df`, migration type `amm-v4`; accounts exactly `payer`, `baseMint`, `quoteMint`, `openbookProgram`, `market`, `requestQueue`, `eventQueue`, `bids`, `asks`, `marketVaultSigner`, `marketBaseVault`, `marketQuoteVault`, `ammProgram`, `ammPool`, `ammAuthority`, `ammOpenOrders`, `ammLpMint`, `ammBaseVault`, `ammQuoteVault`, `ammTargetOrders`, `ammConfig`, `ammCreateFeeDestination`, `launchlabAuthority`, `launchId`, `globalConfig`, `launchBaseVault`, `launchQuoteVault`, `poolLpToken`, `tokenProgram`, `associatedTokenProgram`, `systemProgram`, `rentSysvar`; lot sizes are `bigint`, nonce is integer, and data has no trailing bytes |
  | `decodePlatformConfigAuthorityInstruction(...)` create | `{ instruction, discriminatorHex, platformAdmin, platformConfig, accounts, paramsSha256 }`; instruction `create-platform-config`, discriminator `b05ac4affd71dc14`; accounts exactly `platformAdmin`, `platformFeeWallet`, `platformNftWallet`, `platformConfig`, `cpmmConfig`, `systemProgram`, `transferFeeExtensionAuthority`, `platformVestingWallet`; every `accountMetas` item has exactly `publicKey`, `isSigner`, `isWritable` derived from the versioned transaction message; require exact pinned-SDK transaction privileges, administrator signer, and derived PDA equality; argument bytes are preserved only as `paramsSha256`, not decoded into policy evidence |
  | `decodePlatformConfigAuthorityInstruction(...)` update | `{ instruction, discriminatorHex, platformAdmin, platformConfig, mutableVariant }`; instruction `update-platform-config`, discriminator `c33c4c81922d438f`; `mutableVariant` is exactly one of `fee-wallet`, `nft-wallet`, `migrate-nft-info`, `fee-rate`, `name`, `web`, `image`, `cp-swap-config`, `all-info`, `vesting-wallet`, `platform-vesting-scale`, `platform-cp-creator` for indices `0..11`; every `accountMetas` item has exactly `publicKey`, `isSigner`, `isWritable` derived from the versioned transaction message; require administrator signer, derived PDA equality, exact variant-dependent arity/privileges, and no trailing bytes |
  | `decodeLaunchlabAccounts(...)` | `{ launch, baseVault, quoteVault, platformConfig }`; `launch` has exactly the LaunchpadPool fields listed below; each vault has `address`, `mint`, `owner`, `amount`, `accountSha256`; `platformConfig` has exactly the listed observed economic fields and `accountSha256`; integers are `bigint` |
  | `decodeGraduationAccounts(...)` | `{ launch, pool, platformConfig }`; this is raw current-account decoding only; `pool` has `address`, `programId`, `baseMint`, `quoteMint`, `baseVault`, `quoteVault`, `accountSha256`; it never returns `lpDisposition`, burned/locked quantities, fee-right absence, or other historical conclusions |
  | `evaluateHakkyLaunchlabSourceCoverage(...)` | Accepts exactly the decoded HAKKY target values `cpmm`, `0n`, `0n`, `1000000n` and returns `HAKKY_SOURCE_COVERAGE_UNAVAILABLE`; every other shape is rejected as an unsupported coverage query. There is intentionally no covered/`ok: true` branch in this source revision. |

- PlatformConfig meta validation is observable-transaction exact. `feePayer` is the canonical message fee-payer key, not an operator assertion, and it must equal the resolved transaction message's first static signer. Create requires the pinned SDK's exact eight metas: admin `signer+writable`, fee wallet readonly, NFT wallet readonly, platform config writable, CPMM config writable, System readonly, transfer-extension authority readonly, vesting wallet readonly. This intentionally records the reviewed SDK/IDL divergence where the pinned SDK makes CPMM config writable although the IDL marks it readonly. Update variants other than indices `7`/`8` require exactly admin `signer+readonly` plus platform config `nonsigner+writable`; indices `7`/`8` require a third `cpmmConfig` meta that is `nonsigner+readonly`. The only allowed message-level privilege promotion is update admin readonly-to-writable when and only when admin equals `feePayer`; every other signer/writable mismatch fails closed.

- `HAKKY_SOURCE_COVERAGE_UNAVAILABLE` remains the graduation control for missing raw CPMM lock-position, NFT, and fee-right layouts. `HAKKY_PLATFORM_CONFIG_IMMUTABILITY_UNAVAILABLE` is exactly recursively frozen `{ ok: false, code: "platform-config-immutability-unavailable", reason: "platform-admin-can-update-graduation-economics" }` and controls the pre-signing and LaunchLab-proof stages. Both are control results, never canonical proof content; callers cannot replace either with operator-authored facts.

- `RAYDIUM_SOURCE_PROVENANCE` is exactly:

  ```js
  Object.freeze({
    repository: "https://github.com/raydium-io/raydium-sdk-V2",
    commit: "fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c",
    launchlabProgramId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  })
  ```

- `RAYDIUM_IDL_SOURCE_PROVENANCE` is exactly:

  ```js
  Object.freeze({
    repository: "https://github.com/raydium-io/raydium-idl",
    commit: "e7e0c96fe77bcf6a020b84a44c47a722aac8e359",
    launchpadPath: "raydium_launchpad/raydium_launchpad.json",
    cpmmPath: "raydium_cpmm/raydium_cp_swap.json",
  })
  ```

- `SPL_TOKEN_SOURCE_PROVENANCE` is exactly:

  ```js
  Object.freeze({
    package: "@solana/spl-token",
    version: "0.4.15",
    mintLayoutPath: "src/state/mint.ts",
    accountLayoutPath: "src/state/account.ts",
  })
  ```

- [ ] **Step 1: Write failing PDA and decoder contract tests**

  Test the exact PDA derived from the official seed bytes at the pinned commit. Test that creation decoding returns `instruction: "initialize-v2"`, rejects Token-2022, returns all program/account identities, and exposes only the exact instruction-level allocation, quote, migration, metadata, and vesting fields in the return contract above. Preview and proof reconciliation—not the instruction decoder—derive threshold, first-buy, fee, and creator cost from complete transaction, finalized account, and pre/post balance evidence. Test both exact migration instruction unions, discriminators, account orders, AMM argument decoding, short/trailing data, wrong fixed programs including the exact OpenBook mainnet program, and cross-kind field absence. Platform authority tests must supply exact transaction-derived account metas plus fee payer; reject a non-signer administrator, unauthorized signer/writable drift, wrong update arity, or a missing/writable `cpmmConfig` on variants `7`/`8`; accept only the documented fee-payer promotion. Assert the exact HAKKY coverage query returns `HAKKY_SOURCE_COVERAGE_UNAVAILABLE`, and assert this test file does not import schema-shape fixtures from `test-support/launch-fixtures.mjs`.

- [ ] **Step 2: Run the decoder tests and verify RED**

  ```powershell
  rtk node --test test/raydium-launchlab.test.mjs
  ```

  Expected: FAIL because `src/raydium-launchlab.mjs` does not exist.

- [ ] **Step 3: Record source-derived fixtures and provenance**

  Encode the reviewed instruction/account bytes and expected decoded values in the six JSON fixtures. Each fixture must contain `sourceRepository`, exact `sourceCommit`, `sourcePath`, discriminator bytes, base64 bytes, ordered account keys or exact transaction-derived account metas as applicable, fixed program identities, and expected public decoded values. The platform-config fixture records the exact pinned SDK transaction-message privileges, the IDL-vs-SDK create-time CPMM-config writability divergence, exact fee payer, and both two-meta and three-meta update variants. Do not use a live API response or an unpinned branch as a fixture source.

- [ ] **Step 4: Implement the narrow decoder**

  Use only these reviewed source facts from official commit `fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c`; fixtures must repeat their source file and line-range metadata so drift is reviewable:

  | Source path | Pinned facts to encode |
  |---|---|
  | `src/common/programId.ts` | mainnet LaunchLab program `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`, expected authority `WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh`, CPMM `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`, CPMM lock program `LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE`, lock authority `3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH`, AMM-v4 program `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`, and OpenBook program `srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX` |
  | `src/raydium/launchpad/pda.ts` | authority seed UTF-8 `vault_auth_seed`; pool seed path uses `POOL_SEED`, mint A, mint B; vault seed path uses `POOL_VAULT_SEED`, pool, mint |
  | `src/raydium/launchpad/instrument.ts` | `InitializeV2` discriminator bytes `[67,153,175,39,218,16,38,32]`; ordered 18 base accounts exactly as the return contract; optional platform-global-access is the only allowed 19th account; data layout is discriminator, `u8 decimals`, three `u32LE length + UTF-8 bytes` strings, curve `u8` index then LE integers, vesting three `u64LE`, and `u8 cpmmCreatorFeeOn` |
  | `src/raydium/launchpad/instrument.ts` | curve index 0 has `u64 supply`, `u64 totalSellA`, `u64 totalFundRaisingB`, `u8 migrateType`; index 1 or 2 omits `totalSellA`; the HAKKY decoder accepts only index 0 so the normalized return contract always contains `totalSell`; migration enum 0=`amm-v4`, 1=`cpmm` |
  | pinned launchpad IDL `migrate_to_cpswap` | discriminator `[136,92,200,103,28,218,144,140]`; exact ordered 28 accounts as normalized in the CPMM return contract; no args/trailing data; fixed LaunchLab, CPMM, CPMM lock, classic Token, ATA, System, Rent, and Metadata programs must match pinned identities |
  | pinned launchpad IDL `migrate_to_amm` | discriminator `[207,82,192,145,254,207,145,223]`; exact ordered 32 accounts as normalized in the AMM-v4 return contract; args are `u64LE base_lot_size`, `u64LE quote_lot_size`, `u8 market_vault_signer_nonce`; fixed LaunchLab, AMM-v4, OpenBook, classic Token, ATA, System, and Rent programs must match pinned identities |
  | pinned launchpad IDL plus SDK `create_platform_config` / `update_platform_config` | create discriminator `[176,90,196,175,253,113,220,20]`; update discriminator `[195,60,76,129,146,45,67,143]`; exact account order and observable transaction-message privilege policy from the return contracts; PDA seeds are UTF-8 `platform_config` plus `platform_admin`; update variants `0..11` and every `AllInfo` field define the exhaustive mutable-field set; variants `7`/`8` have the SDK's third readonly `cpConfigId` remaining account |
  | `src/raydium/launchpad/layout.ts` plus pinned launchpad IDL | LaunchpadPool/IDL `PoolState` is exactly 429 bytes with discriminator `[247,237,227,245,215,195,222,70]` (`f7ede3f5d7c3de46`) at `0..7`, epoch `8..15`, bump `16`, status `17`, decimals A/B `18/19`, migration `20`, ten `u64LE` values at offsets `21..100`, vesting five `u64LE` values at `101..140`, seven public keys at `141..364`, mint-program flag `365`, CPMM creator-fee enum `366`, platform-vesting share `u64LE` at `367..374`, and 54 reserved bytes |
  | `src/raydium/launchpad/layout.ts` | the ten launch integers in order are `supply`, `totalSellA`, `virtualA`, `virtualB`, `realA`, `realB`, `totalFundRaisingB`, `protocolFee`, `platformFee`, `migrateFee`; the seven public keys are `configId`, `platformId`, `mintA`, `mintB`, `vaultA`, `vaultB`, `creator` |
  | `src/raydium/launchpad/layout.ts` plus pinned launchpad IDL | PlatformConfig discriminator `[160,78,128,0,248,83,230,160]` (`a04e8000f853e6a0`) is `0..7`; epoch `8..15`; claim wallet `16..47`; lock-NFT wallet `48..79`; `platformScale` `80..87`; `creatorScale` `88..95`; `burnScale` `96..103`; `feeRate` `104..111`; name `112..175`; web `176..431`; image `432..687`; CPMM config `688..719`; `creatorFeeRate` `720..727`; transfer-extension authority `728..759`; vesting wallet `760..791`; `platformVestingScale` `792..799`; CPMM creator `800..831`; reserved bytes `832..939`; vector length `940..943`. Each curve item is exactly 491 bytes: epoch `0..7`, index `8`, config `9..40`, bonding fields `41..90`, padding `91..490`; total span is `944 + 491 * vectorLength`, and the vector must consume the exact buffer |
  | `src/raydium/cpmm/layout.ts` plus pinned CPMM IDL | CPMM `PoolState` uses discriminator `[247,237,227,245,215,195,222,70]` (`f7ede3f5d7c3de46`) and exact span 637: discriminator; `configId`, `poolCreator`, `vaultA`, `vaultB`, `mintLp`, `mintA`, `mintB`, `mintProgramA`, `mintProgramB`, `observationId`; `bump`, `status`, `lpDecimals`, `mintDecimalA`, `mintDecimalB`; `lpAmount`, both protocol fees, both fund fees, `openTime`, `epoch`; `feeOn`, `enableCreatorFee`, six padding bytes; both creator-fee amounts; and 28 reserved `u64` values |
  | `src/raydium/cpmm/pda.ts` | derive the CPMM locked-position PDA from UTF-8 `locked_liquidity` plus the lock NFT mint under the fixed mainnet lock program; no caller-supplied lock program is allowed |
  | `src/raydium/liquidity/layout.ts` | AMM-v4 uses the exact 752-byte `liquidityStateV4Layout` field order from the pinned SDK, including base/quote vaults, base/quote/LP mints, withdrawal/LP vaults, owner, and LP reserve; require account owner to equal the fixed AMM-v4 program before decoding |
  | `@solana/spl-token@0.4.15` `src/state/mint.ts` and `src/state/account.ts` | decode only exact classic-SPL `MintLayout` (82 bytes) and `AccountLayout` (165 bytes), require classic Token Program ownership, hash every raw account, and reject extensions/Token-2022 |
  | `src/raydium/launchpad/type.ts` | CPMM creator-fee enum 0=`OnlyTokenB`, 1=`BothToken`; neither value proves zero fees, so policy evaluation must use the immutable per-launch binding and rate fields |
  | `src/common/fee.ts` | `FEE_RATE_DENOMINATOR_VALUE` is exactly `1_000_000`; preserve raw millionths in proof and convert only for public display without rounding away a nonzero rate |

  `decodeGraduationAccounts()` is deliberately limited to raw launch, pool, and PlatformConfig account state. It rejects any `lpAccounts` argument and never constructs the graduation schema's semantic `lpDisposition` union: account-only input cannot establish AMM historical burned quantities or exhaustive fee-right absence, and the CPMM lock-program layouts are not pinned. Proof Task 6 owns transaction/account-history reconciliation. For CPMM Burn & Earn it must verify finalized CPMM pool bytes, LP mint bytes, lock NFT mint/account bytes, lock vault token-account bytes, the derived locked-position PDA, fixed lock program/authority ownership, and every fee-right public account needed by the exact graduation union. For AMM-v4 it must verify the pool owner, exact layout bytes, LP mint supply, burn transactions/destinations, creator/platform token accounts, withdrawal authority, and fee-right list. If the pinned SDK/IDL/SPL layouts do not define a required account or field, the collector returns the named source-coverage failure and the proof builder forces same-stage `unavailable`; never infer it or fill it from Raydium APIs.

  Decode integers to `bigint`, convert them to decimal strings only at the proof boundary, require the derived authority to equal the pinned expected authority, reject Token-2022, unknown curve/status/migration enums, optional accounts other than the one documented above, trailing/short data, and nonzero reserved bytes unless the pinned source explicitly assigns them. Return recursively frozen plain objects. Do not accept caller-supplied seeds, discriminators, layouts, program IDs, expected-authority overrides, or account-meta flags. The graduation proof evaluator may return `ok: true` only after Task 6 has consumed source-pinned finalized account bytes plus the required finalized transaction/inner-instruction history for every pool, LP, lock/burn, and fee-right fact.

- [ ] **Step 5: Run the decoder tests and verify GREEN**

  ```powershell
  rtk node --test test/raydium-launchlab.test.mjs
  ```

  Expected: PASS for PDA derivation, creation decoding, both migration transaction unions, raw source-covered CPMM/AMM-v4 pool decoding, exact transaction-meta signer enforcement, the exact HAKKY `source-coverage-unavailable` result, rejection of semantic LP-disposition input/output, and malformed-byte rejection. A fixture may prove fail-closed `unavailable`; it must not invent a verified LP-right result.

- [ ] **Step 6: Refactor common bounded byte readers**

  Extract internal `readU8`, `readU16LE`, `readU64LE`, `readPublicKey`, and exact-length helpers inside `src/raydium-launchlab.mjs`. Keep them unexported. Run the test again.

- [ ] **Step 7: Document provenance and commit**

  Add the exact repository, commit, program ID, fixture derivation rule, and drift-review requirement to `proof/README.md`.

  ```powershell
  rtk git add src/raydium-launchlab.mjs test/raydium-launchlab.test.mjs test-support/fixtures/launchlab proof/README.md
  rtk git commit -m "proof: pin LaunchLab decoding provenance"
  ```

---

### Task 3: Build Finalized Mint Proof v2

**Files:**

- Create: `src/metaplex-metadata.mjs`
- Create: `src/solana-transaction.mjs`
- Modify: `src/solana-rpc.mjs`
- Modify: `src/mint-proof.mjs`
- Modify: `scripts/verify-token.mjs`
- Modify: `src/proof-output.mjs`
- Modify: `schemas/proof/mainnet-mint-v2.schema.json`
- Modify: `src/schema-validation.mjs`
- Create: `test-support/mint-v2-provenance-fixtures.mjs`
- Modify: `test-support/launch-fixtures.mjs`
- Modify: `test/mint-proof.test.mjs`
- Create: `test/metaplex-metadata.test.mjs`
- Create: `test/solana-transaction.test.mjs`
- Modify: `test/proof-schemas.test.mjs`

**Reviewed source pins:**

- Raydium `raydium-sdk-V2@fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c`, `src/raydium/launchpad/instrument.ts:130-234`: exact `initializeV2` data and 18/19 ordered account metas.
- Metaplex tag object `b5d72daf3dd7165b157db85984700269ad6fdebe`, dereferenced `mpl-token-metadata@v5.1.1` commit `a7ee5e17ed60feaafeaa5582a4f46d9317c1b412`: `programs/token-metadata/program/src/lib.rs:25` (program ID); `clients/rust/src/generated/accounts/metadata.rs:19-82` (full order and PDA); `clients/rust/src/generated/types/key.rs:11-29` (`MetadataV1` ordinal 4); `state/data.rs:3-37`, `state/creator.rs:3-16`, `state/collection.rs:5-12,54-68`, `state/uses.rs:5-22`, generated `programmable_config.rs:12-16`, and `token_standard.rs:11-20` (nested Borsh types, Fungible ordinal 2); `state/metadata.rs:16-49,194-212` (607-byte allocation, bounds, fee flag, and allowed later true-to-false mutability); `utils/mod.rs:130-148` (NUL padding); `utils/metadata.rs:91-200,205-321` (V3 state, optional tails, padding and fee flag); generated `create_metadata_account_v3.rs:13-103` (discriminator 33, DataV2/isMutable/collectionDetails encoding, account order, and metas).
- Solana official RPC `getTransaction` contract plus Agave `v3.0.10` commit `96c3a8519a3bac8c7e7dd49b6d6aefcfeba09d90`, `transaction-status-client-types/src/lib.rs:541-545,595-619,630-635`: finalized response has exact `slot`, nullable `blockTime`, `meta`, base64 transaction tuple, version, `innerInstructions[].index`, base58 instruction data, account indices, and serialized `stackHeight`. Missing/null data required below is an evidence blocker, never an inferred value. Use raw JSON-RPC because `@solana/web3.js@1.98.4` typed parsing at source commit `c26c13bf841821d9bbf83bb476c567fe29d13821` drops `stackHeight`; pin that same commit's `src/programs/address-lookup-table/state.ts:23-80` for the 56-byte ALT metadata prefix and 32-byte address array layout.

**Interfaces:**

- Consumes: source-pinned `decodeLaunchlabCreationTransaction(...)`, `deriveLaunchlabAuthorityPda()`, `SPL_TOKEN_SOURCE_PROVENANCE`, the Operations Task 2 manifest/readback validators and bounded remote verifier, the mint-v2 schema, and the append-only publisher.
- Produces:

  ```js
  parsePublicRpcUrl(rawUrl) -> { url, hostname }
  createBoundedPublicRpcClient({ rawUrl, fetchImpl }) -> { hostname, call }
  fetchFinalizedCreationTransaction({ rpcClient, signature })
  fetchFinalizedLookupTables({ rpcClient, transactionMessage, minContextSlot })
  resolveCreationTransaction({ transactionResponse, lookupTableAccounts, requestedSignature })
  deriveMetadataPdas({ mint }) -> { metadata, edition, editionBump }
  decodeCreateMetadataAccountV3({ instructionData, accountKeys })
  decodeMetadataAccountV1({ accountBytes, expectedMint, expectedEditionBump })
  fetchFinalizedMintAccounts({ rpcClient, mintAddress, metadataAddress, minContextSlot })
  fetchFinalizedCreatorAccounts({ rpcClient, creatorAddress, mintAddress, minContextSlot })
  fetchMintEvidence({
    rpcClient,
    mintAddress,
    creatorAddress,
    metadataAddress,
    creationSignature,
    metadataManifest,
    metadataReadback,
    repositoryRoot,
    fetchImpl,
    now
  })
  evaluateMintEvidenceV2(evidence)
  runMintVerifier({ argv, createRpcClient, fetchEvidence, publishProof, repositoryRoot, now }) -> { proof, publication }
  ```

- `metadataManifest` and `metadataReadback` are exactly `MetadataManifestV1` and `MetadataReadbackV1` from Operations Task 2. Call `assertMetadataReadbackV1({ manifest, readback })` before connection construction or RPC. Rebuild canonical metadata bytes with `serializeMetadata(buildMetadata({ imageUri: manifest.image.uri }))`, read the fixed approved image from the trusted repository root, and call `verifyPublishedContent` for both identities using `expectedBytes`; require the normalized results to equal the supplied readback byte-for-byte and preserve exact `creatorPayment = { signature: null, debitLamports: "0" }`.
- `parsePublicRpcUrl` accepts only HTTPS, no username/password/query/fragment, only empty or `/` path, and a public DNS hostname. Reject IP literals, localhost, reserved/test/example names, nondefault ports, and every provider-authenticated URL. The proof keeps only canonical lowercase `hostname`; the URL is never echoed or serialized. The production default is the unauthenticated public mainnet-beta endpoint. Any provider-authenticated endpoint needs a separate reviewed execution boundary.
- `createBoundedPublicRpcClient` is the only production Solana transport; there is no separate default `Connection` fetch. Every genesis, transaction, status, lookup-table, owner-account, multi-account, slot, and block-time call goes through its frozen `call(method, params)` interface. Each call has one 15,000ms AbortController deadline and a 5,000,000-byte response cap, uses `redirect: "error"`, requires HTTP 200 plus JSON content, validates canonical decimal `Content-Length` when present, cancels/aborts oversized or rejected bodies, and accepts only an exact JSON-RPC 2.0 envelope whose numeric request `id` matches and which has exactly one of `result` or `error`. Unknown/malformed envelopes, redirects, hangs, size overflow, and RPC errors become fixed stage codes without response/provider text. Tests inject this boundary; no live RPC is run.
- The raw transaction request is exactly JSON-RPC `getTransaction(signature, { commitment: "finalized", encoding: "base64", maxSupportedTransactionVersion: 0 })`. Require an exact transaction tuple `[canonicalBase64, "base64"]`; decode and re-encode it byte-for-byte. Return exact `slot`, non-null `blockTime`, `version`, and `meta`; require `meta.err === null` and non-null `meta.innerInstructions`. Separately call raw JSON-RPC `getSignatureStatuses` with exact params `[[signature], { "searchTransactionHistory": true }]`; require exact one-element non-null `value`, `err === null`, a status slot matching the transaction slot, and `confirmationStatus === "finalized"`. Reject a null historical lookup rather than retrying with weaker parameters.
- `fetchFinalizedLookupTables` derives every table address only from the signed v0 message and fetches each raw account with `finalized` and `minContextSlot: C`; no caller-authored decoded ALT is accepted in production. Require matching requested address, Address Lookup Table program owner, response context at least `C`, exact source-pinned raw layout, valid activation/deactivation/extension fields, and every referenced writable/readonly index in signed-message order. It returns raw envelopes to the pure resolver.
- `resolveCreationTransaction` supports legacy and version 0 only. It requires RPC `version` to equal the deserialized message version, deserializes the exact transaction bytes, rejects every unsupported version/short/trailing encoding, resolves the finalized raw lookup-table envelopes, and requires the resulting writable/readonly addresses to equal `meta.loadedAddresses` in exact order. Legacy responses must have no lookups and `meta.loadedAddresses` must be absent or the exact empty partitions; v0 requires the exact object even when both partitions are empty. Decode every signature to exactly 64 bytes, every public key to exactly 32 bytes, canonically re-encode both, require signature count exactly `numRequiredSignatures`, require the requested signature to equal signature zero, and verify every required Ed25519 signature against the serialized message with `node:crypto`.
- Resolve message privileges from the static header and loaded-address partitions. Require exactly one outer LaunchLab `initializeV2`, call the pinned decoder, and bind its program ID, ordered keys, data, mint, creator, metadata account, launch ID, name, symbol, and URI to CLI, account, and manifest evidence. Message fee payer, decoded payer, and first static signer are identical. Payer and mint are signer+writable; creator is readonly+nonsigner unless it aliases payer; every one of the 18/19 source-pinned account metas must match, with only message-level privilege promotion caused by an explicitly accepted identical-key alias.
- The ordered Raydium meta policy from `src/raydium/launchpad/instrument.ts:130-234` is exact: `payer` signer+writable; `creator`, `configId`, `platformId`, `authority`, `quoteMint`, both classic Token Program entries, Metadata program, System program, Rent sysvar, event authority, LaunchLab program, and optional platform-global-access readonly+nonsigner; `launchId`, `baseVault`, `quoteVault`, and `metadataAccount` writable+nonsigner; `mint` signer+writable. The complete equality policy is closed: allow only `creator === payer`; require the two classic Token Program positions to repeat the same fixed readonly Token Program ID; require every other semantic position, including optional platform-global-access, to be distinct from every other position. The repeated Token Program is not a privilege promotion. Reject every unlisted alias and add pairwise alias mutations for the complete position set.
- The same outer-instruction index must have exactly one direct Metaplex inner instruction with program ID `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`, `stackHeight: 2`, discriminator `33`, and no trailing bytes. If `innerInstructions`, `stackHeight`, or that CPI is absent, mint-v2 is unavailable: a later immutable account is never substituted. Decode its exact `DataV2`, `isMutable`, and `collectionDetails`; require `isMutable: false`, exact HAKKY name/symbol/manifest URI, zero seller fee, null creators/collection/uses/collection-details, and exactly 6 or 7 ordered accounts with no remaining accounts: `metadata, mint, LaunchLab authority PDA, payer, updateAuthority, system program[, rent sysvar]`. Inner execution metadata does not expose the CPI's requested signer/writable bits, so the verifier must not claim or test them; transaction success proves only that sufficient privileges were available. Reconcile update authority and content with the finalized Metadata account. Reject every other Metaplex instruction anywhere in the transaction whose resolved account list touches this metadata PDA. Require metadata `preBalances[index] === 0` and a positive post-balance as corroborating creation evidence.
- Preserve self-contained hashes in `observation`: `creationTransactionSha256` is SHA-256 of the exact decoded transaction wire bytes and `metadataCreateCpiSha256` is SHA-256 of the canonically base58-decoded CPI instruction bytes. Before selecting metadata balances, require `preBalances` and `postBalances` lengths to equal the complete resolved message-key count, every balance to be a nonnegative safe integer, and exactly one resolved key equal to the metadata PDA; require its pre-balance `0` and positive post-balance. Require `dataBase58` and every public key to decode/re-encode canonically. Build `creationExecutionSha256` from UTF-8 `JSON.stringify(exactOrderedObject)` with no whitespace or trailing newline. `exactOrderedObject` has keys in exact order `slot`, `outerInstructionIndex`, `innerInstructionIndex`, `stackHeight`, `programId`, `accountKeys`, `dataBase58`, `metadataPreBalance`, `metadataPostBalance`, `loadedAddresses`; indices/slot/height are nonnegative safe integers; both selected balances are canonical unsigned decimal strings; `loadedAddresses` has exact ordered keys `writable`, `readonly` with canonical public-key arrays in execution order. Evaluator tests recompute all three and reject byte/balance/order drift; schema tests enforce required lowercase SHA-256 shape and reject missing/extra digest fields. Do not reduce finalized execution evidence to an unexplained boolean.
- `decodeMetadataAccountV1` is pure and pinned to Metaplex `Key::MetadataV1` plus the full Borsh account order: update authority, mint, padded name/symbol/URI, seller fee, creators, primary-sale flag, mutable flag, edition nonce, token standard, collection, uses, collection details, programmable config. It requires exactly 607 account bytes; verifies the decoded mint and `editionNonce = Some(expectedEditionBump)`; requires right-NUL padding only to 32/10/200 bytes, zero seller fee, null creators/collection/uses/collection details/programmable config, `primarySaleHappened: false`, `isMutable: false`, and `tokenStandard = Some(Fungible)`. For the narrow accepted shape, bytes `332..605` are zero and byte `606` is the Metaplex fee flag, accepted only as `0` or `1`. Reject unknown enum/option tags, interior NULs, truncation, wrong/missing edition bump, wrong token standard, unsupported nonzero padding, or any other length. `fetchFinalizedMintAccounts` independently verifies the raw envelope address, Metaplex program owner, metadata PDA derived from the expected mint, finalized context, and SHA-256 before calling the byte decoder; neither boundary claims fields unavailable in its input.
- Finalized chronology is explicit. Let creation slot be `C`. Enumerate every classic Token Program account owned by the creator at one finalized context `T >= C`, using the program-owner query rather than a mint filter, then decode/filter the target mint locally. Batch mint and metadata at finalized context `U >= T` with `minContextSlot: T`. Resolve block time for the exact `C`, `T`, and `U` slots, reject nulls, and require `creationTime <= creatorBalance.finalizedAt <= observation.finalizedAt <= checkedAt`. `getBlockTime` has no commitment parameter; finality comes from the finalized response contexts.
- Mint bytes must have the exact classic `MintLayout.span`, owner `Tokenkeg...`, fixed supply/decimals, `isInitialized === true`, LaunchLab authority PDA, and null freeze authority. Creator accounts must have exact classic `AccountLayout.span`, owner program, decoded owner/mint, initialized or frozen state, unique canonical addresses, raw SHA-256 hashes, and lexical address order. Empty target-mint results are valid only with the preserved finalized owner-query context. Reject Token-2022 owners/extensions and parsed-account substitutes.
- `evaluateMintEvidenceV2` returns the exact mint-v2 root object and calls `assertSchema("mint-v2", proof)` before returning.
- Mint-v2 `checks` expands to exact booleans `mainnetGenesis`, `creationTransaction`, `validSignatures`, `sourcePinnedAccountMetas`, `atomicImmutableMetadata`, `metadataAccountCreated`, `classicTokenProgram`, `exactSupply`, `launchlabAuthority`, `nullFreezeAuthority`, `zeroCreatorBalance`, `immutableMetadataPostState`, `metadataDigestMatch`, `finalized`; all 14 are required true.

- [ ] **Step 1: Add source provenance and transaction fixtures**

  Create a dedicated provenance-bearing fixture module; never import schema-shape-only `test-support/launch-fixtures.mjs`. Commit public bytes only: fixed MetadataV1 account bytes, fixed CreateMetadataAccountV3 CPI bytes, one fully signed legacy creation transaction, one fully signed v0 transaction, raw lookup-table account bytes, exact RPC metadata, and the expected decoded identities/privileges. Do not commit private/secret keys or code that regenerates them.

- [ ] **Step 2: Write RED transaction and Metaplex decoder tests**

  Test legacy/v0 parsing, lookup resolution, signature verification, signature-zero binding, fee payer, full initializeV2 key order/message privileges, exact one direct metadata CPI, exact 6/7 CPI account arity with no remaining accounts, CPI `isMutable: false`, CPI/account reconciliation, and all supported MetadataV1 fields. Mutate every discriminator/option/enum, outer account order/message privilege, inner CPI account count/order/identity/data, signature/count, lookup address/owner/context/layout/index/order, transaction tuple/base64 tag/alphabet/padding, RPC/message version, `meta.loadedAddresses` absence/shape/order, inner group/index/stack height, `isMutable`, auxiliary metadata field, padding/fee flag, owner/PDA/mint/edition bump/token standard, and content field one at a time; require a named fail-closed error. Do not invent inner signer/writable mutation tests because finalized inner execution records do not contain those bits.

- [ ] **Step 3: Rewrite mint evaluator/collector/CLI tests for curve-stage reality**

  Replace the null mint-authority success fixture with the derived LaunchLab PDA. Add failing cases for creator/wrong/null authority, non-null freeze authority, wrong supply/decimals/program, `isInitialized: false`, any creator balance, missing owner-query context, mint-filter shortcut, parsed accounts, duplicate/unsorted/wrong owner/mint/state/token-program accounts, observation/chronology drift, mutable-at-creation, mutable post-state, manifest/readback mismatch, remote byte mismatch, and non-finalized RPC. Assert the raw status request is exactly `getSignatureStatuses` with params `[[signature], { "searchTransactionHistory": true }]`, and reject null, non-finalized, errored, wrong-slot, shortened, or expanded status arrays. Add strict safe-RPC URL and raw CLI parsing cases plus hanging/redirect/oversized/malformed JSON-RPC envelope/id/result-error tests across every RPC method family. Remove `--out`; the only target is the canonical path. Update `test-support/launch-fixtures.mjs` to the exact 14-check contract and mutate each check to false, missing, and extra in schema tests.

- [ ] **Step 4: Run tests and verify RED**

  ```powershell
  rtk node --test test/solana-transaction.test.mjs test/metaplex-metadata.test.mjs test/mint-proof.test.mjs test/proof-schemas.test.mjs
  ```

  Expected: FAIL because safe transaction resolution, the pinned Metaplex decoder, atomic CPI binding, exhaustive finalized collection, and the expanded mint-v2 checks are absent.

- [ ] **Step 5: Implement transaction and Metaplex decoding**

  Implement only the exact source-pinned contracts above. Keep transaction decoding pure. No decoder may call RPC, infer a missing ALT, trust explorer/API labels, accept parsed instructions, or recover absent inner instructions from logs. Preserve raw transaction/account hashes internally for reconciliation.

- [ ] **Step 6: Implement finalized raw RPC collection and metadata readback binding**

  Follow the `C -> T -> U` algorithm exactly. Validate manifest/readback and local approved bytes before any RPC. Use only `createBoundedPublicRpcClient`, finalized commitment, raw base64 data, and explicit `minContextSlot`; no default `Connection`, second transport, `confirmed`, `jsonParsed`, mint-filter owner query, Token-2022, or unbounded fetch is allowed. Call `verifyPublishedContent` rather than implementing a weaker duplicate fetcher.

- [ ] **Step 7: Implement mint evaluation and the fixed CLI**

  Required public flags are exactly `--mint`, `--creator`, `--metadata-account`, `--creation-transaction`, `--metadata-manifest`, and `--metadata-readback`; the two metadata path values must be raw-normalized exact `artifacts/metadata/manifest.json` and `artifacts/metadata/readback.json`, pass the producer's repository confinement/reparse checks, and accept no aliases. Optional `--rpc` must pass the safe public URL policy. Reject duplicate, equals-form, positional, case-drift, unknown, missing, or non-array arguments before filesystem/network activity. Construct the proof only after full mainnet identity/evidence verification.

  Publication target is always the raw normalized repository path `proof/mainnet-mint.json`; there is no `--out`. Validate the complete proof schema before filesystem mutation. Reject lexical aliases, traversal, symlink/junction/reparse ancestors, an existing destination, and an untrusted/non-exclusive workspace. Publish with the exclusive temp/open-write-fsync-close-hard-link-cleanup contract; preserve `EEXIST` and never retry after a committed cleanup warning. `runMintVerifier` returns exact `{ proof, publication }`; only `proof` is schema-validated, serialized to the artifact, and printed as proof JSON. Publication receipts/warnings remain only in the return envelope, with committed cleanup warnings rendered as fixed stderr text; tests require no `publication`, warning, or temporary path in proof/stdout. The residual lstat-to-open race is accepted only for the documented trusted exclusively controlled workspace; otherwise stop.

- [ ] **Step 8: Run focused and cross-consumer tests and verify GREEN**

  ```powershell
  rtk node --test test/solana-transaction.test.mjs test/metaplex-metadata.test.mjs test/mint-proof.test.mjs test/raydium-launchlab.test.mjs test/metadata-integrity.test.mjs test/proof-schemas.test.mjs test/devnet-rehearsal.test.mjs
  rtk node --check src/solana-transaction.mjs
  rtk node --check src/metaplex-metadata.mjs
  rtk node --check src/solana-rpc.mjs
  rtk node --check src/mint-proof.mjs
  rtk node --check scripts/verify-token.mjs
  ```

  Expected: PASS with injected bytes/RPC/fetch/filesystem only and no network call. Operations Task 1 must land before this task, or backward-compatible mint exports must remain until it does; the repository may not contain an intermediate broken devnet rehearsal import.

- [ ] **Step 9: Run repository verification**

  ```powershell
  rtk npm test
  rtk npm run check:repo
  rtk git diff --check
  ```

  Expected: all tests pass; there is no canonical `proof/mainnet-mint.json`, metadata upload, wallet action, RPC call, or public mutation from the test run.

- [ ] **Step 10: Commit the mint proof slice**

  ```powershell
  rtk git add src/metaplex-metadata.mjs src/solana-transaction.mjs src/solana-rpc.mjs src/mint-proof.mjs src/proof-output.mjs scripts/verify-token.mjs schemas/proof/mainnet-mint-v2.schema.json src/schema-validation.mjs test-support/mint-v2-provenance-fixtures.mjs test-support/launch-fixtures.mjs test/solana-transaction.test.mjs test/metaplex-metadata.test.mjs test/mint-proof.test.mjs test/proof-schemas.test.mjs
  rtk git commit -m "proof: verify finalized curve mint state"
  ```

---

### Task 4: Build LaunchLab Proof v2 from Two Sources

**Files:**

- Create: `src/launchlab-proof.mjs`
- Create: `scripts/verify-launchlab.mjs`
- Create: `test/launchlab-proof.test.mjs`
- Create: `test-support/launchlab-proof-fixtures.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: pinned Raydium decoders, finalized RPC evidence, LaunchLab v2 schema, and `publishJsonProof`.
- Produces:

  ```js
  fetchLaunchlabEvidence({
    connection,
    mintAddress,
    creatorAddress,
    launchId,
    creationSignature,
    platformConfigAddress,
    metadataManifest,
    metadataReadback,
    recoverySignatures = [],
    fetchImpl
  })

  reconcileLaunchlabEvidence({
    transactionEvidence,
    accountEvidence,
    publicIdentifiers,
    checkedAt
  })

  runLaunchlabVerifier({ argv, connection, fetchEvidence, publishProof, now })
  ```

- [ ] **Step 1: Write failing reconciliation tests**

  Build independent source-provenance transaction and account fixtures in `test-support/launchlab-proof-fixtures.mjs`; do not import `test-support/launch-fixtures.mjs`, whose values are schema-shape-only. Assert every normal reconciliation check for mint, creator, launch ID, programs, PlatformConfig, its derived platform administrator/update-authority set, exhaustive pinned-IDL mutable-field classification, supply, allocation, quote mint, threshold, first buy, creator credit, fees, migration type, metadata, cost, links, and account hashes. Then require the exact Task 2 HAKKY coverage result and assert it prevents a schema-valid artifact, `ok: true`, and publication. Mutate each field on only one source and assert a named reconciliation check fails.

- [ ] **Step 2: Add immutable-rights and LP-union failures**

  Add cases where zero creation-time fees are administrator-mutable, the per-launch snapshot is not immutable, a creator Fee Key remains, platform/creator LP rights are nonzero, CPMM claims literal burn, AMM-v4 claims Burn & Earn, or an unrelated migration field is present.

- [ ] **Step 3: Run tests and verify RED**

  ```powershell
  rtk node --test test/launchlab-proof.test.mjs
  ```

  Expected: FAIL because the collector, reconciler, and CLI do not exist.

- [ ] **Step 4: Implement transaction/account collection**

  Validate the exact Operations Task 2 manifest/readback pair first. Fetch the finalized creation transaction as raw/versioned transaction data and resolve address lookup tables before decoding. Separately fetch launch, base vault, quote vault, metadata, and PlatformConfig bytes using `minContextSlot` equal to the finalized transaction slot. Because InitializeV2 contains the PlatformConfig address but not its administrator, trace that account's finalized creation and complete update history. Fetch every distinct history transaction as raw/versioned finalized data, independently resolve all of its address lookup tables, then derive that instruction's ordered account metas and canonical fee payer from the resolved message before calling `decodePlatformConfigAuthorityInstruction`. Require the decoded signer and derived PDA to match, and bind that administrator plus every pinned `update_platform_config` variant/`AllInfo` field into the exhaustive `updateAuthorities`/`mutableFields` evidence. If any complete finalized history transaction or address table is unavailable, hard stop; never infer the administrator, privilege flags, fee payer, or remaining accounts from an API or label. Treat Raydium API data as optional diagnostics only and exclude it from required checks.

- [ ] **Step 5: Implement pure reconciliation**

  Construct no LaunchLab-v2 root until all ordinary evidence checks pass. Require the metadata readback's exact fixed-zero/null creator-payment pair. Calculate `creationDebitLamports` from creator/payer pre/post balances and transaction fee, calculate `recoveryDebitLamports` from every distinct finalized recovery signature paid by the same creator, set both metadata and graduation debit to `"0"`, and require the exact four-term sum as `cumulativeCreatorDebitLamports <= 1000000000`. Reject duplicate, wrong-payer, unrelated, or non-finalized recovery signatures. Serialize the exhaustive sorted update-authority/mutable-field evidence and classification and require `fundraisingLamports` itself, not only a separate label, to equal `24000000000`. The exact tuple passes semantic source coverage, but the observed administrator and mutable fields force `platform-config-immutability-unavailable`; the reconciler cannot set `ok: true`, validate/publish a candidate root, or occupy `proof/mainnet-launchlab.json`.

- [ ] **Step 6: Implement the append-only CLI**

  Parse only public identifiers, `--metadata-manifest`, `--metadata-readback`, repeated public `--recovery-transaction <signature>` values, and an HTTPS RPC URL. Fetch the content-addressed metadata bytes independently, reject manifest/readback/digest drift or any creator-payment value other than the fixed zero/null pair, derive creation/recovery/graduation debits from finalized chain data, reject alternate output paths, and publish exactly `proof/mainnet-launchlab.json`. Add package script:

  ```json
  "verify:launchlab": "node scripts/verify-launchlab.mjs"
  ```

- [ ] **Step 7: Run focused and cross-schema tests**

  ```powershell
  rtk node --test test/launchlab-proof.test.mjs test/proof-schemas.test.mjs
  ```

  Expected: PASS for source-derived decoding/reconciliation checks, every fail-closed mismatch, and deterministic refusal to publish the exact HAKKY target while source coverage is unavailable. No current passing canonical LaunchLab artifact fixture exists.

- [ ] **Step 8: Refactor check construction**

  Extract one internal `check(id, observed, expected)` helper. Keep reconciliation inputs immutable and do not add operator override hooks. Re-run the tests.

- [ ] **Step 9: Commit the LaunchLab proof slice**

  ```powershell
  rtk git add package.json package-lock.json src/launchlab-proof.mjs scripts/verify-launchlab.mjs test/launchlab-proof.test.mjs test-support/launchlab-proof-fixtures.mjs
  rtk git commit -m "proof: reconcile LaunchLab creation evidence"
  ```

---

### Task 5: Bind Curve Evidence and Build Verified or Unavailable Records

**Files:**

- Modify: `src/canonical-proof.mjs`
- Create: `src/stage-observation.mjs`
- Create: `src/record-output.mjs`
- Create: `scripts/build-curve-live-record.mjs`
- Create: `scripts/build-unavailable-record.mjs`
- Create: `test/build-curve-live-record.test.mjs`
- Create: `test/build-unavailable-record.test.mjs`
- Create: `test/stage-observation.test.mjs`
- Modify: `test/canonical-proof.test.mjs`
- Modify: `scripts/check-site.mjs`
- Modify: `package.json`
- Modify: `proof/README.md`
- Remove after tests migrate: `scripts/build-live-record.mjs`
- Remove after tests migrate: `test/build-live-record.test.mjs`

**Interfaces:**

- Produces:

  ```js
  readCanonicalArtifact(relativePath, options)
  // => { path, sha256, value }

  loadCurveProofArtifacts(options)
  // => { mintArtifact, launchlabArtifact }

  validateCurveProofBinding({ record, mintArtifact, launchlabArtifact })
  // => string[]

  buildCurveLiveRecord({
    sourceRecord,
    mintArtifact,
    launchlabArtifact,
    publishedAt
  })

  verifyObservedLifecycleStage({
    connection,
    candidateStage,
    creationSignature,
    graduationSignature,
    expectedMint,
    expectedLaunchId
  })
  // => observed-stage-v1 receipt

  buildUnavailableRecord({
    sourceRecord,
    stageReceipt = null,
    sourceStageReceipt = null,
    sourceContinuityReceipt = null
  })
  // => { record, continuityReceipt }

  publishUnavailableRecord({
    targetPath,
    record,
    stageReceipt,
    continuityReceipt,
    artifactsRoot
  })

  publishLaunchRecord(targetPath, record, options)
  ```

- An `observed-stage-v1` receipt is a temporary, ignored public-only object with exact keys `schemaVersion`, `network`, `stage`, `mint`, `launchId`, `signature`, `finalizedSlot`, `finalizedAt`, `launchlabProgramId`, `checks`, `ok`. `checks` has exact booleans `mainnetGenesis`, `officialProgram`, `transactionFinalized`, `stageInstructionDecoded`, `launchAccountMatches`, and for graduated only `poolObserved`; all must be true. It is produced only from finalized RPC evidence using the fixed decoder, never from operator text, UI copy, an API, or a canonical proof artifact.
- An `unavailable-continuity-v1` receipt is temporary, ignored, public-only, and has exact keys `schemaVersion`, `network`, `stage`, `mint`, `launchId`, `publicRecordSha256`, `stageReceiptSha256`, `finalizedSlot`, `finalizedAt`, `ok`. It binds the canonical unavailable-record bytes to the canonical `observed-stage-v1` receipt bytes. The exact stage receipt is retained at `artifacts/launch/stage-receipts/<stageReceiptSha256>.json`; continuity is retained at `artifacts/launch/unavailable-continuity/<publicRecordSha256>.json`. Both paths are lowercase content digests over their exact canonical bytes, are ignored and append-only, are never committed or rendered, and contain no secret or authenticated endpoint.
- `buildUnavailableRecord` allows only four outcomes: prelaunch + a valid curve-live receipt -> curve-live/unavailable; curve-live + a valid graduated receipt -> graduated/unavailable; an already-unavailable record -> itself; or curve-live/unavailable + its exact prior stage receipt + valid continuity receipt + a matching graduated receipt -> graduated/unavailable. When the source is unavailable, it recomputes `publicRecordSha256` and `stageReceiptSha256`, validates both content-addressed paths and the source continuity receipt, and requires the new receipt identities and chronology to match. It preserves project, fixed token policy, and launch policy by exact-key copying; sets `token.mint` to null; and writes exactly `{ stage: targetStage, availability: "unavailable" }`. It returns the public record plus the next continuity receipt but never serializes any receipt, reason, mint, link, transaction, timestamp, authority, balance, pool, LP field, or canonical artifact content into the public record.
- `publishUnavailableRecord` writes/fsyncs the exact stage-receipt bytes and continuity bytes to new content-addressed paths before atomically replacing `web/data/launch.json`. Existing content-addressed bytes must match or it fails. If either ignored write/rename/fsync fails, the public rename is not attempted and the prior public bytes remain exact. Once the public rename commits, both matching ignored receipts already exist; cleanup failure returns a committed warning that explicitly says not to retry.

- [ ] **Step 1: Write failing canonical binding tests**

  Test content hashes over the exact artifact bytes, schema versions, `ok: true`, identity equality, metadata/supply equality, PDA authority, account-slot ordering, canonical links, and `mint.observation.checkedAt <= launchlab.observation.checkedAt`. Add malformed JSON and error-redaction cases. Add a case where an existing graduation artifact makes a curve-live record internally stale.

- [ ] **Step 2: Write failing curve promotion tests**

  Assert the builder consumes either prelaunch or curve-live/unavailable plus two artifact descriptors and `publishedAt`, emits `status: "curve-live"` and `proof.availability: "verified"`, records exact artifact paths/hashes, derives every public fact from artifacts, rejects other source states and every extra argument/property, and preserves source bytes after write/rename failure.

- [ ] **Step 3: Write failing minimally verified stage-receipt and unavailable-builder tests**

  Test finalized creation decoding to a curve-live receipt and finalized migration/launch-account decoding to a graduated receipt. Reject processed/confirmed data, wrong genesis/program/instruction, mismatched mint/launch, missing pool for graduation, unknown stage, and unqualified time. Then test prelaunch -> curve-live/unavailable, curve-live -> graduated/unavailable, idempotent same-stage unavailable, and curve-live/unavailable + exact prior stage receipt + exact source continuity + matching graduated receipt -> graduated/unavailable. Assert exact two-key public proof output, null mint, deterministic content-addressed paths/hashes, absence of every receipt/destination/evidence value in serialized JSON, schema validity, rejection of missing/tampered prior receipt or continuity, identity mismatch, stage jumps/regressions or fabricated receipts, and atomic preservation on every receipt/public-record write, fsync, rename, and cleanup failure. Explicitly place contradictory canonical artifacts beside the source file and assert the builder never reads them.

- [ ] **Step 4: Run tests and verify RED**

  ```powershell
  rtk node --test test/canonical-proof.test.mjs test/stage-observation.test.mjs test/build-curve-live-record.test.mjs test/build-unavailable-record.test.mjs
  ```

  Expected: FAIL because stage-specific loaders/builders and the unavailable branch do not exist.

- [ ] **Step 5: Implement content-hashed canonical loading and binding**

  Parse after hashing exact bytes, return public deterministic parse errors without echoing contents, validate each artifact against its normative schema, and compare every public record fact to its canonical source. Refuse curve verification when `proof/mainnet-graduation.json` exists.

- [ ] **Step 6: Extract atomic record publication**

  Move same-directory exclusive temporary creation, fsync, rename, owned-temp cleanup, and source-preservation behavior from `scripts/build-live-record.mjs` into `src/record-output.mjs`. Keep proof publication append-only in `src/proof-output.mjs`; do not reuse replace semantics for proof artifacts.

- [ ] **Step 7: Implement the stage observer and both record builders**

  Make curve promotion accept exactly `--published-at <timestamp>`. Make unavailable promotion accept only optional `--stage-evidence <ignored-json-path>`; require it for a new stage and reject it for same-stage idempotence. `verifyObservedLifecycleStage` must make its own finalized mainnet reads, call `decodeLaunchlabCreationTransaction` for curve-live or `decodeLaunchlabGraduationTransaction` for graduated, and verify the decoded launch/pool identities before issuing the receipt. Both builders read `web/data/launch.json`, use exact-key copying, validate the finished launch-v2 record, and only then replace it atomically.

  Add scripts:

  ```json
  "build:curve-live-record": "node scripts/build-curve-live-record.mjs",
  "build:unavailable-record": "node scripts/build-unavailable-record.mjs"
  ```

  Remove `build:live-record` after all references migrate.

- [ ] **Step 8: Teach site checking the orthogonal substate**

  Make `scripts/check-site.mjs` require canonical artifact binding only for `availability: "verified"`. For `unavailable`, require null mint, no destinations, no verified observations, and exact two-key proof. Keep `status` unchanged so Pages can state `VERIFICATION UNAVAILABLE` for the known lifecycle stage without claiming weaker or contradictory proof.

- [ ] **Step 9: Run focused tests and verify GREEN**

  ```powershell
  rtk node --test test/canonical-proof.test.mjs test/stage-observation.test.mjs test/build-curve-live-record.test.mjs test/build-unavailable-record.test.mjs
  ```

  Expected: PASS for verified promotion, stale graduation detection, unavailable generation, and atomic failures.

- [ ] **Step 10: Run existing site and policy integration tests**

  ```powershell
  rtk node --test test/launch-policy.test.mjs test/site.test.mjs test/canonical-proof.test.mjs
  ```

  Expected: PASS; renderer tests may still show prelaunch wording until the separate website presentation task changes copy.

- [ ] **Step 11: Commit the curve promotion slice**

  ```powershell
  rtk git add package.json package-lock.json src/canonical-proof.mjs src/stage-observation.mjs src/record-output.mjs scripts/build-curve-live-record.mjs scripts/build-unavailable-record.mjs scripts/check-site.mjs test/canonical-proof.test.mjs test/stage-observation.test.mjs test/build-curve-live-record.test.mjs test/build-unavailable-record.test.mjs proof/README.md
  rtk git rm scripts/build-live-record.mjs test/build-live-record.test.mjs
  rtk git commit -m "proof: build verified and unavailable curve records"
  ```

---

### Task 6: Build Graduation Proof v1

**Files:**

- Create: `src/graduation-proof.mjs`
- Create: `scripts/verify-graduation.mjs`
- Create: `test/graduation-proof.test.mjs`
- Create: `test-support/graduation-proof-fixtures.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: all three proof schemas, pinned Raydium decoders, curve artifacts, finalized RPC evidence, and append-only publication.
- Produces:

  ```js
  fetchGraduationEvidence({
    connection,
    mintAddress,
    creatorAddress,
    launchId,
    migrationSignature,
    poolAddress,
    recoverySignatures = []
  })

  reconcileGraduationEvidence({
    mintArtifact,
    launchlabArtifact,
    transactionEvidence,
    accountEvidence,
    checkedAt
  })

  runGraduationVerifier({ argv, connection, fetchEvidence, publishProof, now })
  ```

- [ ] **Step 1: Write failing invariant tests**

  Test identity agreement across all three artifacts, unchanged supply/decimals and the exact common metadata object/digests, null mint/freeze authorities, finalized migration signature, pool identity/program, observed quote-vault balance, configured threshold, creator balance, and `launchlab.observation.checkedAt <= graduation.observation.checkedAt`. Cost tests preserve metadata/creation debits, sum every distinct finalized recovery transaction paid by the creator, add migration debit only when the creator is payer, reject duplicate/unlisted/wrong-payer/non-finalized signatures, and require the exact four-term cumulative value at or below the cap.

- [ ] **Step 2: Write failing economic-drift tests**

  Re-fetch PlatformConfig and launch bytes in fixtures, then mutate creator fee rate, Fee Key, update authority, migration type, pool program, allocation, threshold, LP share/right, or immutable binding. Assert every mutation prevents `ok: true` and prevents publication.

- [ ] **Step 3: Write failing LP-disposition tests**

  Use only `test-support/graduation-proof-fixtures.mjs` source-provenance fixtures; never import the schema-shape-only `test-support/launch-fixtures.mjs`. For CPMM require the exact LP mint/locked-position/lock NFT/token-account/lock-vault identities, `0/0/10000` bps, no Fee Key, no withdrawal right, branch-complete raw `evidenceAccounts`, and `kind: "burn-and-earn"`. For AMM-v4 require LP mint, burned amount derived from finalized transaction/inner-instruction history rather than current accounts alone, zero creator/platform/recoverable units, null withdrawal authority, empty fee rights, branch-complete raw `evidenceAccounts`, and `kind: "lp-burn"`. Recompute `lpEvidenceSha256`; reject a missing required role, duplicate role/address, hash/slot drift, mixed shape, misleading mechanism label, and any account whose official source layout is not pinned.

- [ ] **Step 4: Run tests and verify RED**

  ```powershell
  rtk node --test test/graduation-proof.test.mjs
  ```

  Expected: FAIL because the graduation collector, reconciler, and CLI are absent.

- [ ] **Step 5: Implement finalized graduation collection**

  Fetch and decode the migration transaction through `decodeLaunchlabGraduationTransaction`, then fetch mint, launch, both vaults, metadata, PlatformConfig, pool, every migration-specific LP evidence account, creator token accounts, and every candidate fee-right account named by source-pinned instructions/layouts. Require all account contexts at or after the transaction slot, hash exact raw bytes, and build the exact sorted `evidenceAccounts` array. If any required lock/burn/right fact lacks a source-pinned account layout or finalized byte observation, return the named `source-coverage-unavailable` result and do not construct or publish a graduation artifact.

- [ ] **Step 6: Implement pure graduation reconciliation**

  Compare against both immutable curve artifacts, copy and revalidate the exact common metadata object/digests, calculate the exact four-term cumulative creator debit in lamports, retain configured threshold separately from observed graduation balance, recompute `lpEvidenceSha256`, and emit the exact graduation-v1 root. Set `ok: true` only after every two-source, source-coverage, raw-account, and cross-transition check passes and the schema validator accepts the artifact.

- [ ] **Step 7: Implement the append-only CLI**

  Accept only public identifiers, repeated public `--recovery-transaction <signature>` values, and an HTTPS RPC endpoint. Derive debit values only from finalized pre/post balances and fees; accept no lamport override. Publish exactly `proof/mainnet-graduation.json`; refuse overwrite via `publishJsonProof`. Add:

  ```json
  "verify:graduation": "node scripts/verify-graduation.mjs"
  ```

- [ ] **Step 8: Run tests and verify GREEN**

  ```powershell
  rtk node --test test/graduation-proof.test.mjs test/proof-schemas.test.mjs
  ```

  Expected: PASS for both migration transaction unions and schema branches, drift rejection, two-source reconciliation, exclusive publication when full source coverage exists, and deterministic same-stage unavailable behavior when it does not. No synthetic fixture may turn missing official lock/burn/right layout coverage into `ok: true`.

- [ ] **Step 9: Refactor shared transition comparisons**

  Extract internal identity, supply, metadata-digest, and chronology comparators without weakening exact error messages. Re-run the focused tests.

- [ ] **Step 10: Commit the graduation proof slice**

  ```powershell
  rtk git add package.json package-lock.json src/graduation-proof.mjs scripts/verify-graduation.mjs test/graduation-proof.test.mjs test-support/graduation-proof-fixtures.mjs
  rtk git commit -m "proof: verify finalized LaunchLab graduation"
  ```

---

### Task 7: Bind All Artifacts and Promote to Graduated

**Files:**

- Modify: `src/canonical-proof.mjs`
- Create: `scripts/build-graduated-record.mjs`
- Create: `test/build-graduated-record.test.mjs`
- Modify: `scripts/check-site.mjs`
- Modify: `test/canonical-proof.test.mjs`
- Modify: `package.json`
- Modify: `proof/README.md`

**Interfaces:**

- Consumes: a curve-live verified/unavailable or graduated unavailable source record and all three content-hashed canonical artifacts.
- Produces:

  ```js
  loadGraduatedProofArtifacts(options)
  // => { mintArtifact, launchlabArtifact, graduationArtifact }

  validateGraduatedProofBinding({
    record,
    mintArtifact,
    launchlabArtifact,
    graduationArtifact
  })
  // => string[]

  buildGraduatedRecord({
    sourceRecord,
    mintArtifact,
    launchlabArtifact,
    graduationArtifact,
    publishedAt
  })

  buildGraduatedRecordFile(options)
  ```

- [ ] **Step 1: Write failing three-artifact binding tests**

  Assert exact source paths/hashes, identity agreement, unchanged supply/metadata, null final authorities, creator-balance qualification, transaction/account slot ordering, observed versus configured graduation balance separation, canonical pool/LaunchLab/Solscan routes, exact fees, and migration-specific LP disposition.

- [ ] **Step 2: Write failing chronology and transition tests**

  Test `mint.observation.checkedAt <= launchlab.observation.checkedAt <= curvePublishedAt <= graduation.observation.checkedAt <= graduatedPublishedAt`. Accept curve-live/verified -> graduated/verified, curve-live/unavailable -> graduated/verified, and graduated/unavailable -> graduated/verified only when all three artifacts and their chronology validate. Reject prelaunch-to-graduated, unavailable-to-verified with any missing/invalid artifact, graduated-to-curve, repeated verified graduation, rewritten curve artifact bytes, and any publication timestamp not exact UTC RFC 3339.

- [ ] **Step 3: Write failing atomic publication tests**

  Inject temporary-name collision, partial write, fsync failure, rename failure, and cleanup failure. Assert the exact prior curve-live bytes remain intact unless rename completed; after a committed rename, return a warning that explicitly says not to retry.

- [ ] **Step 4: Run tests and verify RED**

  ```powershell
  rtk node --test test/build-graduated-record.test.mjs test/canonical-proof.test.mjs
  ```

  Expected: FAIL because graduated loading, binding, and promotion are absent.

- [ ] **Step 5: Implement graduated loading and binding**

  Read and hash all three exact paths, validate each schema, compare all immutable fields and evidence chronology, and validate the finished launch-v2 record. Do not infer missing facts or downgrade a failed graduated binding to curve-live.

- [ ] **Step 6: Implement deterministic graduated promotion**

  Parse exactly `--published-at <timestamp>`, require a schema-valid curve-live verified/unavailable or graduated unavailable source record, construct verified graduated proof only after all three artifacts and their chronology validate, then atomically replace `web/data/launch.json`. Add:

  ```json
  "build:graduated-record": "node scripts/build-graduated-record.mjs"
  ```

- [ ] **Step 7: Complete site-check integration**

  For verified graduated status, require all three artifacts and binding. For unavailable graduated status, require the exact unavailable branch and cleared mint/destinations. Ensure a binding failure returns `canonicalIssues` and never reports a valid weaker stage.

- [ ] **Step 8: Run focused tests and verify GREEN**

  ```powershell
  rtk node --test test/build-graduated-record.test.mjs test/canonical-proof.test.mjs test/build-unavailable-record.test.mjs
  ```

  Expected: PASS for verified graduation, unavailable graduation, chronology, and atomic recovery.

- [ ] **Step 9: Run the complete deterministic quality gate**

  ```powershell
  rtk npm ci
  rtk npm run schemas
  rtk node scripts/render-launch-schema-validator.mjs --check
  rtk git diff --exit-code -- web/lib/launch-schema.generated.js
  rtk node --check src/schema-validation.mjs
  rtk node --check src/raydium-launchlab.mjs
  rtk node --check src/metaplex-metadata.mjs
  rtk node --check src/mint-proof.mjs
  rtk node --check src/launchlab-proof.mjs
  rtk node --check src/graduation-proof.mjs
  rtk node --check src/canonical-proof.mjs
  rtk node --check scripts/verify-token.mjs
  rtk node --check scripts/verify-launchlab.mjs
  rtk node --check scripts/verify-graduation.mjs
  rtk node --check scripts/build-curve-live-record.mjs
  rtk node --check scripts/build-graduated-record.mjs
  rtk node --check scripts/build-unavailable-record.mjs
  rtk npm run assets
  rtk npm run assets
  rtk npm run check
  rtk git diff --check
  rtk git status --short
  ```

  Expected: all syntax checks and tests pass; both asset renders produce no second-render diff; `git diff --check` is clean; status lists only the intended proof-lifecycle changes before commit.

- [ ] **Step 10: Review the final proof boundary**

  Inspect the base-to-head diff and confirm: no private key/RPC credential path; no `confirmed` evidence read; no Raydium API as a required source; no fact override in promotion; no cross-kind LP field; no artifact overwrite; no unavailable record retaining mint/link/evidence data; and no source constant outside the pinned Raydium provenance module.

- [ ] **Step 11: Commit the graduated promotion slice**

  ```powershell
  rtk git add package.json package-lock.json src/canonical-proof.mjs scripts/build-graduated-record.mjs scripts/check-site.mjs test/build-graduated-record.test.mjs test/canonical-proof.test.mjs proof/README.md
  rtk git commit -m "proof: promote verified graduated state"
  ```

---

## Self-Review Checklist

- [ ] Every requirement in specification sections 3.1 through 3.4 maps to a schema, verifier, binding check, or promotion test above.
- [ ] `status` and `proof.availability` are independent discriminators, and unavailable records remain schema-valid while containing no contradictory proof value.
- [ ] Mint v2, LaunchLab v2, graduation v1, and launch v2 use the exact required root keys and reject unknown nested properties.
- [ ] Both migration types have mutually exclusive LP evidence shapes and truthful mechanism names.
- [ ] Every production function is introduced only after a focused test fails for the expected missing behavior.
- [ ] Artifact history is append-only and all public-record writes are atomic and recoverable.
- [ ] Raydium PDA/layout provenance is pinned to commit `fb2d829a559f9b6ca95922e4e6c69e3b5bddc95c` in code, fixtures, tests, and documentation.
- [ ] No step performs a wallet signature, mainnet transaction, metadata upload, deployment, or public mutation.
