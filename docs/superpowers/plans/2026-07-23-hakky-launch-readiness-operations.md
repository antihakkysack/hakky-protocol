# HAKKY Launch Readiness Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fail-closed operational tooling and release runbook needed to rehearse the token policy, prepare immutable metadata, inspect the exact unsigned Raydium transaction, preserve recovery evidence, and release through a reviewed PR before any mainnet signature.

**Architecture:** Keep all policy evaluation in small pure modules under `src/`, with CLI adapters under `scripts/` and ignored operational receipts under `artifacts/`. External uploads, wallet connections, signatures, pushes, merges, deployments, and social mutations remain human-approved actions; the tooling only prepares, verifies, and records public evidence. Any absent raw transaction, mutable economic control, mutable metadata, unexplained transfer, or non-full-lock LP outcome fails closed.

**Tech Stack:** Node.js 22 ESM, `node:test`, `@solana/web3.js@1.98.4`, `@solana/spl-token@0.4.15`, GitHub Actions, GitHub Pages, Solana JSON RPC, Raydium LaunchLab.

## Global Constraints

- Work only in `C:\hakky-protocol\.worktrees\hakky-solana-pivot`; preserve the dirty local `main` checkout and the user Hardhat patch.
- Use classic SPL Token, not Token-2022.
- Token identity is exactly `Hakky Protocol` / `HAKKY`, supply `1,000,000`, decimals `6`, and base-unit supply `1000000000000`.
- Allocation is `800000000000` base units on the public curve, `200000000000` for post-graduation liquidity, zero vesting, zero creator allocation, and no creator first-buy.
- Quote mint is wrapped SOL `So11111111111111111111111111111111111111112`; configured graduation threshold is `24000000000` lamports.
- Creator fee rights must be zero before and after graduation; creator and platform LP shares must be zero; LP treatment must be fully irreversible.
- A creation-time PlatformConfig snapshot is insufficient. If any administrator can later alter creator fees, LP allocation, or claim rights, stop before the first signature.
- Metadata must use the exact content-addressed image and JSON bytes and must be created atomically with `isMutable: false`; post-creation finalization is prohibited.
- The exact raw unsigned transaction is mandatory. A screenshot, UI summary, or separately reconstructed transaction is not equivalent evidence.
- Maximum cumulative creator debit for approved mainnet launch operations is `1000000000` lamports.
- Never request, copy, print, persist, or commit a seed phrase, private key, exported keypair, password, OTP, recovery code, authenticated RPC URL, or wallet session.
- Every upload, upload payment, legal acceptance, wallet connection, mainnet signature, exact maximum SOL debit, push, PR create/update, merge, GitHub metadata save, Pages/domain mutation, X save/post/pin, recovery signature/spend, and graduation signature/spend requires separate action-time approval. One approval may cover the initial creation signature and its exact maximum debit only when the presented envelope expressly names both. Because merging to `main` automatically starts production Pages, the merge approval may cover that deployment only when the envelope separately and expressly names the exact SHA, merge action, automatic Pages production effect, destination, and rollback; no approval carries forward to another operation.
- The currently pinned official SDK/IDL does not expose the CPMM lock-program account layouts required to prove the approved permanent-lock/no-fee-right outcome. Source-coverage absence is a pre-signature hard stop unless a newly pinned official source plus tests closes it; a UI toggle, API response, or promise of later verification is insufficient.
- This plan supersedes `docs/superpowers/plans/2026-07-22-hakky-live-launch.md`. A feature-branch push does not deploy Pages: reviewed branch -> PR quality -> approved merge -> `main` quality and Pages.

---

### Task 1: Add the externally funded devnet rehearsal mode

**Files:**
- Modify: `scripts/rehearse-devnet.mjs`
- Modify: `test/devnet-rehearsal.test.mjs`
- Modify: `docs/LAUNCH.md`

**Interfaces:**
- Consumes: existing `confirmSignature()`, classic-SPL rehearsal operations, and ignored `artifacts/devnet-rehearsal/proof.json`. It deliberately does not consume the mainnet curve-stage mint-v2 evaluator.
- Produces: `parseRehearsalOptions(argv) -> { fundingMode: "faucet" | "external" }`; `withDeadline(operationFactory, remainingMs) -> Promise<unknown>`; `waitForExternalFunding({ connection, address, minimumLamports, maxAttempts, delayMs, maxWaitMs, monotonicNow, sleepImpl, withDeadline }) -> Promise<bigint>`; `fetchDevnetRehearsalEvidence(...) -> evidence`; `evaluateDevnetRehearsalEvidence(evidence) -> proof`; `assertDevnetRehearsalProofV2(proof) -> proof`; `runDevnetRehearsal({ fundingMode, connection, createConnection, onExternalAddress, onPublicationWarning, ...dependencies }) -> Promise<proof>`.

The devnet evidence contract is independent from mainnet mint-v2 and rejects every unknown key. Evidence has exact keys `cluster`, `genesisHash`, `tokenProgram`, `mint`, `payer`, `vaultOwner`, `supplyBaseUnits`, `decimals`, `mintAuthority`, `freezeAuthority`, `payerTokenBalanceBaseUnits`, `vaultTokenBalanceBaseUnits`, `observation`; `observation` has exact `commitment`, `slot`, `checkedAt`. Require the canonical devnet genesis, classic Token Program ID, canonical public keys, supply `"1000000000000"`, six decimals, null mint/freeze authorities, payer-owned HAKKY balance `"0"`, intended vault-owner HAKKY balance `"1000000000000"`, commitment `"finalized"`, nonnegative safe slot, and a real UTC millisecond timestamp. `fetchDevnetRehearsalEvidence` uses only classic-token raw accounts, obtains a finalized barrier slot after the rehearsal operations, and reads mint plus exhaustive payer/vault token-account sets with `finalized` and `minContextSlot` at least that barrier; every response context must meet the barrier. It rejects Token-2022, wrong owners/mints, uninitialized/invalid account states, missing context, duplicate accounts, and any mixed or non-finalized observation. Do not reuse the mainnet evaluator or require LaunchLab/metadata.

The public proof is rebuilt from that whitelist with exact root keys `schemaVersion`, `cluster`, `checkedAt`, `identities`, `supply`, `authorities`, `balances`, `observation`, `checks`, `ok`; version is `devnet-rehearsal-v2`. Nested shapes are exact: `identities` has `mint`, `payer`, `vaultOwner`, `tokenProgram`; `supply` has `baseUnits`, `decimals`; `authorities` has `mintAuthority`, `freezeAuthority`; `balances` has `payerBaseUnits`, `vaultBaseUnits`; `observation` has `genesisHash`, `commitment`, `slot`, `checkedAt`; every check has only `id`, `ok`. Ordered check IDs are exactly `devnet-genesis`, `classic-token-program`, `canonical-identities`, `fixed-supply`, `six-decimals`, `mint-authority-revoked`, `freeze-authority-none`, `payer-token-balance-zero`, `vault-token-balance-full`, `finalized-observation`, with every `ok` exactly `true`; root `ok` is exactly `true`, `observation.genesisHash` equals `DEVNET_GENESIS_HASH`, and root `checkedAt` equals `observation.checkedAt`. `assertDevnetRehearsalProofV2` rejects every unknown key, wrong type/value/order, duplicate/missing check, and timestamp mismatch. The proof contains public keys and observations only, never keypair/secret bytes, raw RPC errors, or dependency objects. `runDevnetRehearsal` always calls the real evaluator and this independent validator; neither is injectable.

Execution order is exact: parse and validate mode plus injected dependencies and every retry/deadline parameter; resolve and non-recursively unlink only the exact stale `artifacts/devnet-rehearsal/proof.json`; lazily use an injected `connection` or call validated `createConnection()` exactly once; verify devnet genesis; then generate keys and branch funding exactly once. Never construct the default connection in a function-parameter initializer. A stale-proof unlink failure stops before connection construction/RPC, key generation, or address disclosure, although the stale leaf may remain. In external mode `onExternalAddress` is a required function with no default no-op. Wrong genesis and every operation/evidence/pre-link failure leave the canonical proof absent and attempt cleanup only of the run-owned temporary leaf. `EEXIST` at the hard-link commit preserves the concurrently appearing proof, fails closed, and never claims that file as this run's artifact. After a successful hard-link commit the proof is published; if owned-temp unlink then fails, invoke validated `onPublicationWarning("TEMP_UNLINK_FAILED")` exactly once outside the proof, preserve the committed proof, resolve successfully with the proof, and explicitly forbid automatic retry. A throwing warning callback is swallowed after fixed stderr reporting and cannot convert the committed publication into failure or trigger retry. `main()` renders only that fixed warning to stderr. Success publishes one canonical JSON document with two-space indentation, LF, one trailing newline, and the exclusive temporary-file/fsync/hard-link no-clobber pattern. Validate the trusted output root/ancestors and never recursively delete.

- [ ] **Step 1: Write RED option and external-funding tests**

Add tests to `test/devnet-rehearsal.test.mjs` that prove the exact CLI contract and forbid faucet use in external mode:

```js
import { parseRehearsalOptions, waitForExternalFunding } from "../scripts/rehearse-devnet.mjs";

test("parses only the two supported funding modes", () => {
  assert.deepEqual(parseRehearsalOptions([]), { fundingMode: "faucet" });
  assert.deepEqual(parseRehearsalOptions(["--external-funding"]), { fundingMode: "external" });
  assert.throws(() => parseRehearsalOptions(["--unknown"]), /Usage:/);
});

test("external funding prints only the public address and never requests an airdrop", async () => {
  const payer = Keypair.generate();
  const vaultOwner = Keypair.generate();
  const generated = [payer, vaultOwner];
  let airdropCalls = 0;
  const announcements = [];
  await runDevnetRehearsal({
    fundingMode: "external",
    connection: rehearsalConnection({
      getBalanceValues: [0, 2_000_000_000],
      requestAirdrop: async () => { airdropCalls += 1; },
    }),
    generateKeypair: () => generated.shift(),
    onExternalAddress: (message) => announcements.push(message),
    onPublicationWarning: () => {},
    operations: successfulOperations(),
    fetchEvidence: () => successfulEvidence(),
    fundingDelayMs: 0,
  });
  assert.equal(airdropCalls, 0);
  assert.deepEqual(announcements, [{
    address: payer.publicKey.toBase58(),
    minimumLamports: "2000000000",
  }]);
  assert.doesNotMatch(JSON.stringify(announcements), new RegExp(Buffer.from(payer.secretKey).toString("hex"), "i"));
});
```

Add paired faucet/external cases proving the branch occurs exactly once. External mode requires and awaits exactly one `onExternalAddress({ address, minimumLamports: "2000000000" })` call, polls only finalized balance, and never calls `requestAirdrop` on success, timeout, callback failure, or RPC error. Faucet mode never calls the external callback or external balance poll and never falls back to it. Wrong genesis performs no key generation, callback, poll, or airdrop. Invalid CLI/programmatic mode performs no stale deletion, lazy connection construction, or network call. Validate `createConnection`, `onPublicationWarning`, and every other injected function before stale removal. The CLI matrix also rejects duplicate flags, `--external-funding=value`, case drift, positional values, multiple values, and non-array input before deletion or connection construction.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
rtk node --test test/devnet-rehearsal.test.mjs
```

Expected: FAIL because `parseRehearsalOptions`, `waitForExternalFunding`, and the injected external-funding controls do not exist.

- [ ] **Step 3: Implement bounded external funding without changing the faucet path**

In `scripts/rehearse-devnet.mjs`, add the exact parser and balance poller:

```js
export function parseRehearsalOptions(argv) {
  if (argv.length === 0) return { fundingMode: "faucet" };
  if (argv.length === 1 && argv[0] === "--external-funding") {
    return { fundingMode: "external" };
  }
  throw new Error("Usage: npm run rehearsal:devnet -- [--external-funding]");
}

```

Implement `withDeadline(operationFactory, remainingMs)` first: validate a function and positive safe-integer duration, invoke the factory exactly once, race it against one timer, clear that timer in `finally`, and replace dependency text with a fixed stage error. Implement `waitForExternalFunding(...)` from the exact interface above. Validate `maxAttempts` as a positive safe integer, `delayMs` as a nonnegative safe integer, `maxWaitMs` as a positive safe integer no greater than `600000`, `minimumLamports` as a positive bigint, and every clock/sleep/deadline dependency as a function. One monotonic `start + maxWaitMs` deadline covers every poll, transient error, and scheduled delay. Each attempt calls `getBalance(address, "finalized")` through `withDeadline` using only the remaining time; accept only a nonnegative safe-integer result before bigint conversion. Low balance and transient RPC failure each consume one attempt. Schedule attempt N against `start + (N - 1) * delayMs` rather than sleeping after arbitrary RPC latency, and clear every timer. Add deterministic tests for a hanging poll, transient failures followed by success, all-error exhaustion, low-balance exhaustion, exact 600-second deadline, and RPC latency not extending the wall-clock bound. Production defaults are exactly 120 attempts, 5,000ms schedule, and 600,000ms overall.

Extend `runDevnetRehearsal()` with `fundingMode`, `onExternalAddress`, `fundingMaxAttempts`, `fundingDelayMs`, and deterministic clock/deadline dependencies. After exact stale removal and devnet-genesis verification, external mode awaits the one public callback, waits for finalized balance, and never invokes `requestAirdrop`; faucet mode preserves its own path with no external callback/poll/fallback. Make rehearsal transaction confirmation/evidence reads finalized. Add the independent fetch/evaluator contract above; “zero payer balance” always means zero payer-owned HAKKY base units, never zero SOL. Change `main({ argv, runRehearsal, stdout, stderr })` to parse injected/default `argv` before runner/connection construction and print only the public address message before final proof output.

The preceding RPC requirement is bounded as follows: validate every identity/faucet/confirmation attempt count, schedule delay, and maximum wait before stale deletion; use one monotonic overall deadline per stage with every call wrapped by `withDeadline`; count transient failures against the fixed attempt budget; require signature status exactly `finalized`; and expose only fixed identity/funding/confirmation errors. Production maxima are three attempts with a 500ms schedule and 15,000ms for identity, three attempts with a 500ms schedule and 30,000ms for faucet, and 120 attempts with a 1,000ms schedule and 120,000ms for each signature confirmation. The independent fetch/evaluator/validator contract above is mandatory; "zero payer balance" means zero payer-owned HAKKY base units, never zero SOL.

- [ ] **Step 4: Add RED timeout, wrong-cluster, and stale-proof cases**

Add cases that assert: non-devnet identity prevents key generation and address disclosure; 120 unsuccessful balance polls fail within the one deadline; transient balance RPC errors remain bounded and can recover; all-error exhaustion fails; wrong genesis, timeout, and every operation/evidence/pre-link failure leave the canonical proof absent; wrong program/vault, short vault balance, residual payer balance, non-null authority, non-finalized or missing account context, duplicate account, Token-2022 owner, and unknown evidence keys fail. Mutate one field at a time across every exact proof root/nested/check shape and require the independent proof validator to reject it. Seed dependency/RPC errors with the payer secret encoded as hex, base64, and decimal arrays, then prove stdout, stderr, callback payloads, proof, and thrown public stage errors contain none of those values.

Test stale cleanup and publication explicitly: invalid options do not delete; unlink removes only the exact proof leaf; cleanup failure stops before RPC/key generation; successful output is canonical/exclusive; a concurrently appearing proof is preserved and causes failure; open/write/fsync/pre-link faults never publish; and post-commit temp-unlink failure preserves the committed proof, calls `onPublicationWarning("TEMP_UNLINK_FAILED")` exactly once, and still resolves with the proof without retry even if the callback throws. `main()` emits only fixed public stage messages such as option, cleanup, identity, funding, confirmation, token-operation, evidence, publication, or committed-cleanup warning; it never echoes raw RPC/operation text.

- [ ] **Step 5: Run GREEN tests and refactor common funding flow**

Run:

```powershell
rtk node --test test/devnet-rehearsal.test.mjs
rtk node --check scripts/rehearse-devnet.mjs
```

Expected: PASS with injected connections/operations/funding observations/clock/callbacks only. Refactor only duplicated safe setup; do not merge the two funding modes into an operation that can silently fall back. During implementation/review, never run `npm run rehearsal:devnet`, instantiate the default live connection, call a faucet, disclose a generated address for funding, or request external funds.

- [ ] **Step 6: Document the exact rehearsal boundary**

Update `docs/LAUNCH.md` with:

```markdown
Run `npm run rehearsal:devnet -- --external-funding` when the public faucet is unavailable. The command prints one ephemeral public devnet address, waits for at least 2 devnet SOL under one ten-minute monotonic deadline, and never writes its secret key. “Zero payer balance” in its proof means zero payer-owned HAKKY base units, not zero SOL. It proves finalized classic-SPL devnet state including the intended vault owner's full HAKKY balance only; it does not simulate Raydium LaunchLab or mainnet metadata.
```

- [ ] **Step 7: Commit the devnet slice**

```powershell
rtk git add scripts/rehearse-devnet.mjs test/devnet-rehearsal.test.mjs docs/LAUNCH.md
rtk git commit -m "launch: add externally funded devnet rehearsal"
```

---

### Task 2: Prepare and verify the immutable metadata bundle

**Files:**
- Create: `src/metadata-integrity.mjs`
- Create: `src/exact-cli-options.mjs`
- Create: `scripts/prepare-metadata.mjs`
- Create: `scripts/finalize-metadata-manifest.mjs`
- Create: `scripts/verify-metadata-upload.mjs`
- Create: `test/metadata-integrity.test.mjs`
- Create: `test/metadata-review-fixes.test.mjs`
- Modify: `package.json`
- Modify: `docs/LAUNCH.md`
- Modify: `proof/README.md`

**Interfaces:**
- Consumes: deterministic `web/assets/token.png`, `isPublicHostname()` from `web/lib/public-host.js`, and user-approved content-addressed image/metadata destinations.
- Produces: `sha256Hex(bytes) -> string`; `validateContentAddressedUri(uri) -> URL`; `buildMetadata(input) -> object`; `serializeMetadata(metadata) -> Buffer`; `serializeMetadataDraft(draft) -> Buffer`; `serializeMetadataManifest(manifest) -> Buffer`; `serializeMetadataReadback(readback) -> Buffer`; `prepareMetadataBundle(options) -> MetadataDraftV1`; `assertMetadataDraftV1(value) -> value`; `finalizeMetadataManifest({ draft, metadataUri }) -> MetadataManifestV1`; `assertMetadataManifestV1(value) -> value`; `verifyPublishedContent(options) -> contentReadback`; `verifyPublishedMetadata({ manifest, fetchImpl, now }) -> MetadataReadbackV1`; `assertMetadataReadbackV1({ manifest, readback }) -> readback`; `parseExactCliOptions(argv, contract) -> object`; `publishRepositoryArtifact({ repositoryRoot, relativePath, bytes, ... }) -> publication`; ignored `artifacts/metadata/token.png`, `token.json`, `draft-manifest.json`, `manifest.json`, and `readback.json`.

The cross-plan metadata contract is exact; every object rejects unknown keys:

| Object | Exact keys and rules |
|---|---|
| `MetadataDraftV1` | `schemaVersion`, `image`, `metadata`; version constant `metadata-draft-v1`; image is the final manifest image object; metadata has exact keys `sourcePath`, `byteLength`, `sha256`, `name`, `symbol`, `imageUri` and deliberately has no metadata URI |
| `MetadataManifestV1` | `schemaVersion`, `image`, `metadata`; version constant `metadata-manifest-v1` |
| manifest `image` | `sourcePath`, `uri`, `byteLength`, `sha256`; `sourcePath` is exactly `artifacts/metadata/token.png`; approved canonical content-addressed URI; nonnegative safe integer; lowercase 64-character SHA-256 digest |
| manifest `metadata` | `sourcePath`, `uri`, `byteLength`, `sha256`, `name`, `symbol`, `imageUri`; `sourcePath` is exactly `artifacts/metadata/token.json`; exact deterministic JSON URI/size/hash and approved HAKKY values; `imageUri` equals `image.uri` byte-for-byte |
| `MetadataReadbackV1` | `schemaVersion`, `image`, `metadata`, `creatorPayment`, `verifiedAt`, `ok`; version constant `metadata-readback-v1`; UTC millisecond timestamp; `ok: true` only on exact byte equality |
| each readback content object | `uri`, `resolvedUrl`, `byteLength`, `sha256`; identity-preserving public URL and exact manifest size/hash |
| readback `creatorPayment` | exact constant `{ "signature": null, "debitLamports": "0" }`; this iteration forbids creator-wallet/SOL metadata-upload payments |

`src/metadata-integrity.mjs` exports `assertMetadataDraftV1(value)`, `finalizeMetadataManifest({ draft, metadataUri })`, `assertMetadataManifestV1(value)`, and `assertMetadataReadbackV1({ manifest, readback })`. Proof Tasks 3–4 and Operations Task 3 consume only these validators; no task may invent a metadata alias or accept a URI/hash without the paired manifest and readback. The paired validators enforce every cross-object relation: exact source paths; draft/manifest `metadata.imageUri === image.uri`; manifest/readback URI, byte length, and digest equality for both objects; safe integer byte lengths; lowercase 64-character digests; canonical resolved content identity; exact approved name/symbol; canonical payment signature/debit pairing; and exact unknown-key rejection. Each one-field mutation has a named failing test.

The URI contract is deliberately narrow. Accept only raw, canonical `ipfs://<cidv1-base32>` whose lowercase unpadded base32 payload decodes to the exact 36-byte CIDv1/raw/sha2-256 tuple `0x01 0x55 0x12 0x20 <32 digest bytes>` and re-encodes byte-for-byte, with no path, port, credentials, query, or fragment; or exact `https://arweave.net/<43-character-base64url-transaction-id>` whose unpadded base64url segment decodes to exactly 32 bytes and re-encodes byte-for-byte, with no port, extra path, credentials, query, or fragment. For IPFS, the embedded 32-byte multihash digest must equal `sha256Hex(expectedBytes)` before prepare, finalize, or remote readback can succeed; fixtures use CIDs computed from their exact bytes, never decorative examples. Validate the raw string before `URL` normalization so case-sensitive identity is never silently rewritten. Resolve IPFS only as `https://ipfs.io/ipfs/<same-cid>` and Arweave only as the same canonical `https://arweave.net/<same-transaction-id>` path. Fetch with `redirect: "manual"`; allow at most three hops, and before following each `Location` require HTTPS, no credentials/port/query/fragment, the same exact provider hostname (`ipfs.io` or `arweave.net`), and the same scheme-specific content identity and canonical path. Reject redirect loops, encoded path separators, dot segments, private/special hosts, and any identity/host/path drift. One overall 15-second `AbortController` deadline covers every fetch, redirect, and body read. Reject malformed, mismatched, or greater-than-74,230-byte `Content-Length` before reading; consume native response streams only through a 74,230-byte cap, cancel immediately on the first byte beyond the exact expected length, and permit `arrayBuffer()` fallback only after an exact trustworthy `Content-Length` proves the body is bounded. Cancel every unconsumed redirect response body before evaluating or following its target. On every ordinary verification failure, abort the shared request controller before clearing the deadline and explicitly cancel any unconsumed pre-body response; a cancellation failure must never replace the primary verification error.

All five artifact paths are fixed repository-relative paths. The prepare CLI accepts only the exact input `web/assets/token.png` and output directory `artifacts/metadata`; finalize accepts only `artifacts/metadata/draft-manifest.json` and `artifacts/metadata/manifest.json`; verify accepts only `artifacts/metadata/manifest.json` and `artifacts/metadata/readback.json`. Reject absolute, UNC, device, drive-relative, traversal, alternate-separator, and case-drifted spellings. Publication never accepts a caller-validated absolute output path: it takes the verified repository root plus one exact fixed relative artifact path and repeats `lstat`/`realpath` confinement immediately before temporary creation, immediately before the hard-link commit, and immediately after it. Reject a symlink, junction, reparse point, or any ancestor that resolves outside the repository at every boundary. This is a defense-in-depth workflow for a trusted, exclusively controlled local workspace, not a race-free filesystem sandbox against a privileged concurrent local process: Node does not expose handle-relative `openat`/link operations across the supported platforms. If the workspace is not exclusively controlled for the command duration, stop before prepare/finalize/verify.

Every artifact serializer reconstructs the exact documented key order, uses `JSON.stringify(value, null, 2)`, UTF-8 LF, and exactly one trailing newline. Caller property order never controls bytes. Writers use the existing `publishJsonProof`-style exclusive temporary-file, flush, hard-link/no-clobber commit, and owned-temp cleanup discipline for binary and JSON bytes. Exact-byte replay may succeed idempotently; a divergent existing file fails. Prepare publishes `token.png` and `token.json` before publishing `draft-manifest.json` last, so no consumer can observe a committed draft naming incomplete content. Injected write/fsync/link/cleanup failures must never replace an existing artifact or publish the manifest early.

- [ ] **Step 1: Write RED deterministic-byte and URI tests**

Create `test/metadata-integrity.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetadata,
  serializeMetadata,
  sha256Hex,
  validateContentAddressedUri,
  verifyPublishedContent,
} from "../src/metadata-integrity.mjs";

const IMAGE_URI = "ipfs://bafkreie6m4wnyrkomjeyopg7gwnvdipy62t7riipav6xp6c6zttqlpfiua";
const METADATA_URI = "ipfs://bafkreidgs6ooffmvxyflsar56griun3ca6j7kgtx7yum3l2pfphttxbzjy";

test("serializes exact HAKKY metadata bytes deterministically", () => {
  const metadata = buildMetadata({ imageUri: IMAGE_URI });
  assert.deepEqual(metadata, {
    name: "Hakky Protocol",
    symbol: "HAKKY",
    description: "HAKKY is a high-risk public-only Solana meme coin launch. HakkyAgent verifies published launch facts; it does not promise safety or returns.",
    image: IMAGE_URI,
    external_url: "https://hakky.xyz",
    twitter: "https://x.com/antihakkysack",
  });
  assert.equal(serializeMetadata(metadata).toString("utf8").endsWith("\n"), true);
  assert.equal(sha256Hex(Buffer.from("HAKKY")), "4a72026d8c69a1cde54008588eee6fffda23290eec418820db8499c1956e3a10");
});

test("accepts only content-addressed public metadata destinations", () => {
  assert.equal(validateContentAddressedUri(IMAGE_URI).protocol, "ipfs:");
  assert.throws(() => validateContentAddressedUri("https://hakky.xyz/assets/token.png"), /content-addressed/);
  const credentialedUri = new URL("https://example.com/token.json");
  credentialedUri.username = ["sample", "user"].join("-");
  assert.throws(() => validateContentAddressedUri(credentialedUri.href), /credentials/);
});

test("remote verification requires exact metadata bytes and final URI", async () => {
  const expected = Buffer.from("{\"name\":\"Hakky Protocol\"}\n");
  const receipt = await verifyPublishedContent({
    expectedBytes: expected,
    expectedUri: METADATA_URI,
    fetchImpl: async () => ({
      ok: true,
      url: "https://ipfs.io/ipfs/bafkreidgs6ooffmvxyflsar56griun3ca6j7kgtx7yum3l2pfphttxbzjy",
      arrayBuffer: async () => expected,
    }),
  });
  assert.equal(receipt.sha256, sha256Hex(expected));
  assert.equal(receipt.byteLength, expected.byteLength);
});
```

The metadata CID above is the exact raw/sha2-256 CID of `expected`; the image CID is the exact raw/sha2-256 CID of the approved `web/assets/token.png`. A syntactically valid raw CID whose embedded digest differs from the exact bytes must fail before any fetch.

- [ ] **Step 2: Run metadata tests and verify RED**

```powershell
rtk node --test test/metadata-integrity.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/metadata-integrity.mjs`.

- [ ] **Step 3: Implement deterministic metadata construction and hashing**

Create `src/metadata-integrity.mjs` using `createHash("sha256")`, the exact canonical serializers and content-address/redirect contract above. Validate the raw URI before `URL` construction; never let URL hostname normalization define a CID. Map IPFS reads to the same CID below `https://ipfs.io/ipfs/` and Arweave reads to the exact transaction-ID path on `arweave.net`. Use bounded manual redirect handling and validate every hop before issuing the next GET. Reject credentials, ports, extra paths, encoded separators, dot segments, query, fragment, redirect loops, redirects to a different host/path/content identity, private/special hosts, non-2xx responses, size mismatches, and digest mismatches.

The exported builder must hard-code the approved name, symbol, description, `https://hakky.xyz`, and `https://x.com/antihakkysack`; callers may supply only `imageUri`.

- [ ] **Step 4: Add RED CLI-path and no-upload tests**

Test that `scripts/prepare-metadata.mjs` accepts only `--image`, `--image-uri`, and `--out`; requires the exact fixed source/output paths above; copies exact bytes; writes canonical `token.json` plus `draft-manifest.json`; and has no HTTP upload or credential option. Test that `scripts/finalize-metadata-manifest.mjs` accepts only `--draft-manifest`, `--metadata-uri`, and `--out`, requires the exact fixed paths, validates the provider-returned content address, rehashes local files, and writes the canonical final manifest without uploading. Test that `scripts/verify-metadata-upload.mjs` accepts only `--manifest` and `--out`, requires the exact fixed paths, performs no wallet/RPC operation, fixes `creatorPayment` to `{ "signature": null, "debitLamports": "0" }`, and writes the canonical readback only after remote equality. Reject `--creator`, payment/signature, RPC, provider-credential, upload, and every unknown option.

Add failures for missing/fake/noncanonical final URI; CID case drift; invalid CIDv1/Arweave identity; valid CID with the wrong embedded content digest; credentials/port/query/fragment; encoded separators, extra path, dot segment, redirect loop, private/special host, and same/different-host or same/different-identity redirects outside the exact allowed mapping; changed draft bytes; any creator-payment field other than the fixed zero/null pair; manifest/readback drift; unsafe byte lengths; malformed digest; and unknown keys. Mutate every relational field independently. Add path failures for absolute, UNC/device, drive-relative, traversal, separator/case drift, and symlink/junction/reparse ancestors. Add existing-identical, existing-different, partial prior run, and injected open/write/fsync/link/cleanup failures, asserting the manifest/readback is never published early and existing bytes are never replaced. Rebuild each draft, manifest, and readback from differently ordered inputs and assert byte-identical canonical serialization.

Add deterministic validate-then-swap hooks for the pre-temporary, pre-commit, and post-commit boundaries; each Windows-junction/POSIX-symlink probe must reject without writing outside the fixture repository. Add overall-timeout/abort, slow-redirect deadline, malformed/oversized/mismatched `Content-Length`, non-success response, resolved-URL drift, redirect-body cancellation-before-follow, exact streamed body, streaming overflow/cancel, cancellation-failure error preservation, hanging-cleanup deadline, and bounded `arrayBuffer()` fallback tests. Permanent tests assert the five leaves are ignored and untracked but never require production leaves to remain absent after a later approved upload workflow.

Recompute the canonical metadata bytes inside every draft/manifest validator using `serializeMetadata(buildMetadata({ imageUri }))`; require its exact byte length and SHA-256, including the fixed description, website, X URL, key order, LF, and trailing newline. Pin the approved deterministic image to exact byte length `74230` and SHA-256 `9e672cdc454e6249873cdf359b51a1f8f6a7f8a10f057d77f85ecce705bca8a0`; tests compare those constants to `web/assets/token.png`. Prepare/finalize must require `artifacts/metadata/token.png` to remain byte-identical to that approved source. Add consistently forged draft/file mutations where all attacker-controlled length/hash fields agree with changed bytes and still require rejection.

For no-upload proof, run prepare/finalize with injected network functions that throw if called. Remote verification may issue only bounded GET requests with `redirect: "manual"` and has no RPC or wallet dependency. No CLI may send, simulate, sign, pay, or upload.

- [ ] **Step 5: Implement the three narrow CLIs and package scripts**

Add to `package.json`:

```json
"metadata:prepare": "node scripts/prepare-metadata.mjs",
"metadata:finalize": "node scripts/finalize-metadata-manifest.mjs",
"metadata:verify": "node scripts/verify-metadata-upload.mjs"
```

All three CLIs use the single shared `src/exact-cli-options.mjs` parser for exact cardinality, duplicate, positional, equals-form, case, and path rejection. The preparation and finalization CLIs use only the fixed paths above and the exclusive canonical writers. The verification CLI is read-only against the remote content destination, has no chain/wallet dependency, and writes only `artifacts/metadata/readback.json`. None uploads.

This iteration permits only provider-account/free uploads performed with no connected Solana wallet and no creator-wallet payment. The readback therefore emits the contract constant `{ "signature": null, "debitLamports": "0" }`; validators and every downstream cost/signing consumer accept only that exact pair. This is an explicit action-workflow invariant, not an inferred chain fact. If a provider requires a wallet, SOL, token, or on-chain payment—or any creator-wallet upload/payment attempt has occurred—stop before upload/readback and revise the reviewed plan; never hand-author zero to conceal a payment. The action-time upload gate records that the provider flow had no Solana wallet connection or payment request.

- [ ] **Step 6: Run GREEN tests and a deterministic local rehearsal**

```powershell
rtk npm run assets
rtk node --test test\metadata-integrity.test.mjs test\metadata-review-fixes.test.mjs
rtk node --check src\exact-cli-options.mjs
rtk node --check src\metadata-integrity.mjs
rtk node --check scripts\prepare-metadata.mjs
rtk node --check scripts\finalize-metadata-manifest.mjs
rtk node --check scripts\verify-metadata-upload.mjs
```

Expected: tests pass and rehearse the exact fixed relative paths only beneath a fresh `mkdtemp` repository fixture with an injected repository root; no test command writes `artifacts/metadata/*` in the real worktree. Permanent tests require all five production leaves to stay ignored and untracked, not absent forever. The controller performs a one-time pre-provider check that they are currently absent; a later separately approved provider workflow may legitimately create them. Test fixture CIDs must never enter a mainnet approval envelope.

Also assert all five fixed artifact leaves are ignored, no artifact is staged/tracked, repeated generation produces byte-identical files, and the worktree differs only by the intended tracked implementation/docs/tests.

- [ ] **Step 7: Document the upload approval boundary and hard stop**

Update `docs/LAUNCH.md` and `proof/README.md`: image and metadata uploads are separately approved browser/provider actions; the selected provider flow must have no Solana wallet connection or payment request; prepare locally, upload image, prepare JSON/draft, upload that exact JSON, finalize the production manifest with the provider-returned metadata address, and verify both remote byte sequences. The creation transaction must use the exact verified metadata URI and atomically create `isMutable: false`; otherwise stop before signing.

- [ ] **Step 8: Commit the metadata slice**

```powershell
rtk git add src/exact-cli-options.mjs src/metadata-integrity.mjs scripts/prepare-metadata.mjs scripts/finalize-metadata-manifest.mjs scripts/verify-metadata-upload.mjs test/metadata-integrity.test.mjs test/metadata-review-fixes.test.mjs package.json docs/LAUNCH.md proof/README.md
rtk git commit -m "launch: add immutable metadata preparation gates"
```

Stage `package-lock.json` only if an intentionally reviewed dependency change is required; otherwise it must remain unchanged.

---

### Task 3: Decode and evaluate the exact unsigned LaunchLab transaction

**Files:**
- Create: `src/launchlab-preview.mjs`
- Create: `src/launchlab-rpc.mjs`
- Create: `src/raydium-origin.mjs`
- Create: `src/wallet-readiness.mjs`
- Create: `scripts/verify-launchlab-preview.mjs`
- Create: `scripts/verify-raydium-origin.mjs`
- Create: `scripts/verify-wallet-readiness.mjs`
- Create: `test/launchlab-preview.test.mjs`
- Create: `test/launchlab-rpc.test.mjs`
- Create: `test/raydium-origin.test.mjs`
- Create: `test/wallet-readiness.test.mjs`
- Create: `test-support/launchlab-preview-fixtures.mjs`
- Modify: `package.json`
- Modify: `docs/LAUNCH.md`
- Modify: `proof/README.md`

**Interfaces:**
- Consumes: exact base64 serialized unsigned `VersionedTransaction`, the proof plan's source-pinned `decodeLaunchlabCreationTransaction()`, `decodeCreateMetadataAccountV3()`, bounded raw JSON-RPC client, raw lookup-table decoder/ordered-resolution primitives, and `evaluateHakkyLaunchlabSourceCoverage()`, finalized RPC account bytes, exact raw simulation result, exact `MetadataManifestV1`/`MetadataReadbackV1`, approved creator public key, a fresh finalized wallet-readiness receipt, an action-day official-origin receipt, and the canonical LaunchLab program ID `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`.
- Produces: `verifyOfficialRaydiumOrigin({ uiUrl, fetchImpl, checkedAt }) -> officialOriginReceipt`; `fetchWalletReadiness({ rpcClient, creatorAddress, requiredLamports, checkedAt }) -> walletReadinessReceipt`; `fetchUnsignedLookupTables({ rpcClient, transactionMessage }) -> { lookupTableAccounts, lookupBarrierSlot }`; `decodeUnsignedLaunchTransaction({ serialized, lookupTableAccounts, lookupBarrierSlot }) -> normalizedPreview`; `fetchPreviewState({ rpcClient, normalizedPreview, minimumSlot }) -> finalizedState`; `evaluateLaunchPreview({ preview, state, simulation, metadataManifest, metadataReadback, officialOriginReceipt, walletReadinessReceipt, creator }) -> evaluation`; `buildApprovalEnvelope(evaluation) -> envelope`; ignored `artifacts/mainnet-session/official-origin.json`, `wallet-readiness.json`, `preview.json`, and `approval-envelope.json`.

The origin receipt has exact keys `schemaVersion`, `checkedAt`, `uiUrl`, `uiOrigin`, `docsUrl`, `docsSha256`, `documentedProgramId`, `pinnedProgramId`, `checks`, `ok`. The verifier fetches `https://docs.raydium.io/introduction/what-is-raydium` and `https://docs.raydium.io/reference/program-addresses` with redirect-origin checks, requires the first to identify `raydium.io` as the official app and the second to identify the exact current LaunchLab program, requires the browser URL origin to be exactly `https://raydium.io`, and requires the documented ID to equal the pinned decoder ID. DNS success, search results, screenshots, cached receipts, `api-v3`, and lookalike/subdomain URLs are insufficient. The receipt expires after 30 minutes and must be regenerated immediately before preview approval; any fetch/parse/drift failure stops signing.

The wallet receipt has exact keys `schemaVersion`, `network`, `creator`, `genesisHash`, `finalizedBalanceLamports`, `requiredLamports`, `finalizedSlot`, `checkedAt`, `rpcHost`, `checks`, `ok`. `checks` has exact booleans `mainnetGenesis`, `creatorMatches`, `finalizedBalance`, `sufficientBalance`; all are true when `ok: true`. The CLI receives only the public creator plus validated metadata readback, requires its exact fixed zero/null creator-payment pair, sets `requiredLamports = 1000000000`, reads `HAKKY_RPC_URL` through Proof Task 3's exact safe public-URL parser, constructs the bounded raw client once, calls exact JSON-RPC `getGenesisHash` with `[]` and `getBalance` with `[creatorAddress, { "commitment": "finalized" }]`, requires the raw balance context and canonical nonnegative safe-integer lamport value, and expires after five minutes. It serializes only the bounded client's canonical lowercase hostname. No `Connection`, authenticated endpoint, or second Solana transport is allowed. Before running it, the operator must read the selected wallet's visible public address and require byte-for-byte equality with the creator; screenshot/account labels alone are insufficient.

- [ ] **Step 1: Write RED policy-matrix tests**

Create fixture builders whose exact HAKKY policy-target case contains:

```js
export const HAKKY_TARGET_RAW_VALUES = Object.freeze({
  launchlabProgramId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  tokenProgramId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  quoteMint: "So11111111111111111111111111111111111111112",
  supply: "1000000000000",
  totalSell: "800000000000",
  totalFundraising: "24000000000",
  lockedAmount: "0",
  decimals: 6,
  creatorFeeRateMillionths: "0",
  protocolBuyFeeRateMillionths: "10000",
  protocolSellFeeRateMillionths: "10000",
  feeRateDenominator: "1000000",
  firstBuyInstructionCount: 0,
  creatorTokenCredit: "0",
  metadataUploadLamports: "0",
  maximumCreationDebitLamports: "1000000000",
  cumulativeCreatorDebitCapLamports: "1000000000",
  migrationType: "cpmm",
  platformScaleRaw: "0",
  creatorScaleRaw: "0",
  burnScaleRaw: "1000000",
});
```

The current pinned-source result for this exact target is the frozen `{ ok: false, code: "source-coverage-unavailable", reason: "cpmm-burn-scale-lp-rights-unmapped" }`. Assert `evaluateLaunchPreview()` includes the exact failed `source-coverage-unavailable` check, returns `ok: false`, and `buildApprovalEnvelope()` refuses to produce an envelope. There is no passing approval-envelope fixture in this slice. For each field, mutate one value and require `ok: false`. The protocol fee is an observed fixture value, not a policy constant; require it to be preserved in the non-approvable diagnostic evaluation. Add dedicated failures for Token-2022, transfer fee/hook/permanent delegate, 90/10 LP split, creator/platform Fee Key, platform-only mutable fee/LP settings, unknown signer/program/transfer destination, referral/tip, metadata URI/hash mismatch, any nonzero/non-null metadata creator payment, `isMutable: true`, expired/wrong official-origin receipt, wrong/expired/insufficient/non-finalized wallet receipt, selected-wallet mismatch, simulation error, missing/null raw inner instructions, wrong outer index or stack height, missing/duplicate/extra/reordered Metaplex CPI accounts, `replaceRecentBlockhash: true`, simulation-byte drift, expired blockhash without full preview regeneration, and any creation debit above `1000000000`.

- [ ] **Step 2: Run preview tests and verify RED**

```powershell
rtk node --test test/raydium-origin.test.mjs test/wallet-readiness.test.mjs test/launchlab-preview.test.mjs test/launchlab-rpc.test.mjs
```

Expected: FAIL because the preview and RPC modules do not exist.

- [ ] **Step 3: Implement strict raw transaction decoding**

Use `VersionedTransaction.deserialize(Buffer.from(serialized, "base64"))`. Resolve every address-table lookup from finalized RPC data before inspecting compiled instructions. Require exactly one LaunchLab instruction and pass its exact bytes and ordered account keys to the proof plan's source-pinned decoder; require its normalized result to contain `instruction: "initialize-v2"`. When platform authority history is decoded, derive exact `publicKey`/`isSigner`/`isWritable` account metas and the canonical fee payer from the resolved versioned transaction message and pass both to the canonical authority decoder. Do not duplicate the discriminator, Borsh layout, seed, account flags, fee-payer rule, fixed OpenBook identity, or account-order constants in the preview module. Reject trailing or missing bytes through that canonical decoder.

Reject `InitializeWithToken2022`, any unknown LaunchLab instruction in the creation transaction, and any unclassified transfer. Preserve raw instruction bytes, ordered account keys, signer/writable flags, recent blockhash, and SHA-256 of the serialized transaction in the normalized preview.

- [ ] **Step 4: Implement finalized account reads and simulation capture**

In `src/launchlab-rpc.mjs`, implement these exact finalized-only calls:

```js
export async function fetchPreviewState({ rpcClient, normalizedPreview, minimumSlot }) {
  const addresses = normalizedPreview.requiredAccountAddresses;
  const result = await rpcClient.call("getMultipleAccounts", [addresses, {
    commitment: "finalized",
    encoding: "base64",
    minContextSlot: minimumSlot,
  }]);
  if (!Number.isSafeInteger(result?.context?.slot)
    || result.context.slot < 0
    || result.context.slot < minimumSlot) throw new Error("stale finalized account context");
  return {
    contextSlot: result.context.slot,
    accounts: normalizeAndHashFinalizedAccounts({ addresses, result }),
  };
}

export async function simulatePreview({ rpcClient, canonicalBase64, accountAddresses, minContextSlot }) {
  return rpcClient.call("simulateTransaction", [canonicalBase64, {
    sigVerify: false,
    replaceRecentBlockhash: false,
    commitment: "finalized",
    encoding: "base64",
    innerInstructions: true,
    minContextSlot,
    accounts: { encoding: "base64", addresses: accountAddresses },
  }]);
}
```

Use Proof Task 3's bounded raw client for lookup-table reads, wallet readiness, finalized preview state, and simulation; no `Connection` or second Solana transport is allowed. `fetchUnsignedLookupTables` first calls raw `getSlot` with exact params `[{ "commitment": "finalized" }]` and requires a nonnegative safe-integer result. It derives every lookup address only from the unsigned message, uses raw `getAccountInfo` with base64/finalized and `minContextSlot` equal to that base slot for each table, requires every raw response context slot to be a nonnegative safe integer at least that requested base slot, and validates the source-pinned owner/layout/indices. It returns `lookupBarrierSlot` as the greatest of the base slot and every qualified table response context, so legacy and lookup-free v0 messages still have a finalized barrier. Compute `preStateBarrier = max(walletReadinessReceipt.finalizedSlot, lookupBarrierSlot)` and pass it as `fetchPreviewState.minimumSlot`; then compute `simulationBarrier = max(preStateBarrier, finalizedState.contextSlot)` and pass it as `simulatePreview.minContextSlot`. Require both finalized-state and raw-simulation context slots to be nonnegative safe integers before comparison, and require the simulation slot to be at least `simulationBarrier`. Require the simulated transaction bytes to re-encode to the exact supplied base64, `err === null`, and raw non-null `innerInstructions`. Under the same outer InitializeV2 index, require exactly one direct stack-height-2 CreateMetadataAccountV3 CPI, decode it with the shared pinned decoder, and require the exact 6/7-account HAKKY shape, manifest identity, and `isMutable: false`. Post-simulation accounts or logs cannot substitute for absent CPI evidence. If the blockhash is expired or any fresh unsigned transaction differs byte-for-byte, discard all preview evidence, obtain a fresh raw unsigned transaction from the official flow, and repeat origin, wallet-readiness, lookup-table, finalized-account, simulation, hash, and approval-envelope verification; never set `replaceRecentBlockhash: true`.

Define `normalizeAndHashFinalizedAccounts` in the same module, reject null/extra/out-of-order results, require mainnet genesis identity, exact account owners, and expected LaunchLab/Token/Metadata/System programs, and record the response slot for every normalized account. `fetchPreviewState` returns exact `contextSlot` plus those normalized `accounts`; no caller may supply or override that context. Reject any mock/client whose captured call omits the exact options above. Store raw account hashes, sanitized simulation logs, compute units, returned post-account hashes, exact decoded metadata-CPI evidence, and fee calculation. Sanitize thrown errors so authenticated RPC URLs and raw wallet data never reach stdout.

- [ ] **Step 5: Implement the immutable-economic-binding hard stop**

Before any immutable-economic approval check, `evaluateLaunchPreview()` must call `evaluateHakkyLaunchlabSourceCoverage()` with only decoded source values. At the current pin the exact HAKKY target returns `source-coverage-unavailable`; preserve that exact failed check and stop. It cannot return `ok: true`, and `buildApprovalEnvelope()` cannot emit an envelope. A current PlatformConfig value, UI toggle, screenshot, operator assertion, or injected coverage object is not a substitute.

A future separate source-pin/TDD amendment may add a covered branch only when the official sources map the configuration to the full migration-specific disposition. For CPMM that means a discriminated Burn & Earn result with creator/platform shares `0` and irreversible share `10000` basis points plus every lock/Fee-Key/right layout. For AMM v4 it means source-pinned LP-burn semantics with zero creator/platform LP units, zero recoverable LP supply, null withdrawal authority, and an empty fee-right list. Never accept irrelevant zero fields from the other migration branch.

- [ ] **Step 6: Implement the CLI and deterministic approval envelope**

Add to `package.json`:

```json
"verify:raydium-origin": "node scripts/verify-raydium-origin.mjs",
"verify:wallet-readiness": "node scripts/verify-wallet-readiness.mjs",
"verify:launch-preview": "node scripts/verify-launchlab-preview.mjs"
```

The exact runtime commands are:

```powershell
$env:HAKKY_CREATOR = Read-Host "Approved creator public key"
$env:HAKKY_RAYDIUM_URL = Read-Host "Current official Raydium LaunchLab browser URL"
rtk npm run verify:raydium-origin -- --ui-url $env:HAKKY_RAYDIUM_URL --out artifacts/mainnet-session/official-origin.json
rtk npm run verify:wallet-readiness -- --creator $env:HAKKY_CREATOR --metadata-readback artifacts/metadata/readback.json --out artifacts/mainnet-session/wallet-readiness.json
rtk npm run verify:launch-preview -- --transaction artifacts/mainnet-session/unsigned-transaction.base64 --creator $env:HAKKY_CREATOR --metadata-manifest artifacts/metadata/manifest.json --metadata-readback artifacts/metadata/readback.json --official-origin artifacts/mainnet-session/official-origin.json --wallet-readiness artifacts/mainnet-session/wallet-readiness.json --out artifacts/mainnet-session/preview.json
```

The CLIs accept no seed, keypair, approval override, fee override, program override, source-coverage override, or manual policy value. The preview recomputes the required balance from the validated metadata readback and rejects a different receipt amount. The preview CLI writes `preview.json` and `approval-envelope.json` only when every check passes; with the current exact unavailable result it writes neither and exits nonzero with the sanitized code. If a later separately reviewed pin enables coverage, the envelope contains the transaction hash, exact wallet/creator identity, finalized balance and slot, every signer/program/transfer, metadata upload debit, maximum creation debit, exact cumulative maximum, observed protocol trading-fee rate, zero creator fee/right result, irreversible LP settings, official-origin receipt hash/expiry, wallet receipt hash/expiry, and a statement that it authorizes only the exact serialized transaction. Immediately before wallet signing, present this envelope again and obtain action-time approval whose scope expressly names both the exact transaction hash/signature action and exact maximum creation debit; if either changes, the approval is void and a fresh preview is required.

- [ ] **Step 7: Run GREEN tests and refactor decoder boundaries**

```powershell
rtk node --test test/raydium-origin.test.mjs test/wallet-readiness.test.mjs test/launchlab-preview.test.mjs test/launchlab-rpc.test.mjs
rtk node --check src/raydium-origin.mjs
rtk node --check src/wallet-readiness.mjs
rtk node --check src/launchlab-preview.mjs
rtk node --check src/launchlab-rpc.mjs
rtk node --check scripts/verify-raydium-origin.mjs
rtk node --check scripts/verify-wallet-readiness.mjs
rtk node --check scripts/verify-launchlab-preview.mjs
```

Expected: PASS for byte/RPC/policy validation, the exact deterministic source-coverage hard stop, absence of preview/envelope output, and all malformed-input cases. Keep byte decoding, RPC reads, policy evaluation, and CLI I/O in separate functions so a reviewer can reject any boundary independently.

- [ ] **Step 8: Document transaction acquisition as a non-bypassable gate**

Update `docs/LAUNCH.md` and `proof/README.md`: if the official Raydium UI or wallet cannot expose the exact raw unsigned transaction before signing, stop. Never substitute a re-created SDK transaction or a screenshot.

- [ ] **Step 9: Commit the preview slice**

```powershell
rtk git add src/raydium-origin.mjs src/wallet-readiness.mjs src/launchlab-preview.mjs src/launchlab-rpc.mjs scripts/verify-raydium-origin.mjs scripts/verify-wallet-readiness.mjs scripts/verify-launchlab-preview.mjs test/raydium-origin.test.mjs test/wallet-readiness.test.mjs test/launchlab-preview.test.mjs test/launchlab-rpc.test.mjs test-support/launchlab-preview-fixtures.mjs package.json package-lock.json docs/LAUNCH.md proof/README.md
rtk git commit -m "launch: enforce unsigned LaunchLab preview gates"
```

---

### Task 4: Preserve public session and recovery evidence without expanding approval

**Files:**
- Create: `src/session-receipt.mjs`
- Create: `scripts/session-receipt.mjs`
- Create: `test/session-receipt.test.mjs`
- Modify: `package.json`
- Modify: `SECURITY.md`
- Modify: `docs/LAUNCH.md`
- Modify: `proof/README.md`

**Interfaces:**
- Consumes: validated preview hash, metadata manifest/readback hashes, approved creator address, visible wallet/RPC statuses, public transaction signatures, finalized readback, and exact base64 serialized unsigned recovery-transaction bytes.
- Produces: `createSessionReceipt({ preview, metadataManifest, metadataReadback, checkedAt }) -> receipt`; `recordPublicTransactionEvent(receipt,event) -> receipt`; `decodeRecoveryTransaction({ serialized, addressLookupTables, simulation, feeQuote }) -> normalizedRecovery`; `buildRecoveryEnvelope({ receipt, readback, serializedTransaction, addressLookupTables, simulation, feeQuote, checkedAt }) -> envelope`; `writeSessionReceiptAtomic(path,receipt)`; ignored `artifacts/mainnet-session/session-receipt.json` and `recovery-envelope.json`.

- [ ] **Step 1: Write RED exact-schema and monotonic-transition tests**

Create `test/session-receipt.test.mjs` with these exact root keys and no others:

```js
{
  schemaVersion: "mainnet-session-v1",
  network: "mainnet-beta",
  creator,
  mint,
  launchId,
  previewTransactionSha256,
  metadataManifestSha256,
  metadataReadbackSha256,
  costBaseline,
  debitCapLamports: "1000000000",
  events: [],
}
```

Each event has exactly these keys:

```js
{
  sequence,
  operationId,
  operationKind,
  state,
  purpose,
  signature,
  slot,
  observedAt,
  transactionSha256,
  debitLamports,
  visibleStatus,
}
```

`creator`, `mint`, and `launchId` are the exact canonical public keys decoded from the preview. `costBaseline` has exactly `metadataPaymentSignature`, `metadataPaymentLamports`, `verifiedAt`: values are copied from the validated hashed `MetadataReadbackV1` and are necessarily null, `"0"`, and its verification timestamp; no nonzero branch or caller override exists in this iteration. `sequence` is a positive safe integer; `operationId` is 1–64 characters matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`; `operationKind` is exactly `creation`, `recovery`, or `graduation`; `purpose` is 1–120 characters matching `^[A-Za-z0-9 .,:;()/_-]+$`; `signature` is a canonical Solana signature or `null`; `transactionSha256` is lowercase 64-character hex or `null`; `slot` is a nonnegative safe integer or `null`; `observedAt` is an exact UTC RFC 3339 timestamp with milliseconds; and `debitLamports` is a canonical unsigned decimal string. `visibleStatus` is exactly `not-submitted`, `submitted`, `pending`, `failed`, `finalized-success`, or `finalized-failed` and maps from `state` exactly as follows: `prepared -> not-submitted`, `submitted -> submitted`, `visible-pending -> pending`, `visible-failed -> failed`, `finalized-success -> finalized-success`, and `finalized-failed -> finalized-failed`.

Prove that only these event states are accepted:

```js
const ALLOWED_EVENT_STATES = [
  "prepared",
  "submitted",
  "visible-failed",
  "visible-pending",
  "finalized-success",
  "finalized-failed",
];
```

Enforce this exact same-operation transition table:

| Current state | Allowed next state |
|---|---|
| no event | `prepared` |
| `prepared` | `submitted`, `visible-failed` |
| `submitted` | `visible-pending`, `finalized-success`, `finalized-failed` |
| `visible-pending` | `visible-pending`, `finalized-success`, `finalized-failed` |
| `visible-failed` | terminal |
| `finalized-success` | terminal |
| `finalized-failed` | terminal |

`prepared` requires null signature, slot, and transaction hash. `submitted` and `visible-pending` require the same canonical signature and null slot/transaction hash. Finalized states require that same signature, non-null slot, and transaction hash. `visible-failed` is allowed only from `prepared`, represents a pre-submission wallet rejection, and requires null signature, slot, and transaction hash. A post-submission UI/RPC failure appends `visible-pending`, preserving the signature until either finalized outcome is observed; it can never become terminal merely because the wallet display failed. Every operation begins with one `prepared` event; subsequent events reuse that operation ID and must preserve its operation kind and purpose. An operation ID cannot begin a second chain. Global sequence increases by exactly one, `observedAt` is monotonic, and cumulative creator debit is always `costBaseline.metadataPaymentLamports` plus only the latest debit snapshot for each distinct operation; it must remain at or below `1000000000` lamports.

Define and test this exact recovery-envelope root, with no extra keys:

```js
{
  schemaVersion: "recovery-envelope-v1",
  network: "mainnet-beta",
  creator,
  mint,
  launchId,
  sourceSessionSha256,
  previewTransactionSha256,
  currentState,
  proposedOperation,
  cost,
  expiresAt,
  requiresFreshActionTimeApproval: true,
}
```

`currentState` has exactly `stage`, `finalizedSlot`, `finalizedAt`, `checkedAt`, `mintAccountSha256`, `launchAccountSha256`, `platformConfigAccountSha256`; stage is `curve-live` or `graduated`, every account/hash value comes from the same finalized read, and `checkedAt` is the actual observation time with `finalizedAt <= checkedAt`. `proposedOperation` has exactly `operationId`, `operationKind`, `purpose`, `transactionSha256`, `signers`, `programs`, `transfers`; operation kind is the constant `recovery`, and every other field is derived by the canonical decoder from exact serialized transaction bytes—never accepted from a caller-authored JSON fact. Signer/program arrays are unique canonical keys sorted lexically, and each decoded transfer has exactly `source`, `destination`, `assetKind`, `mint`, `amountBaseUnits` where `assetKind` is `sol` with null mint or `spl-token` with canonical mint. `cost` has exactly `cumulativeBeforeLamports`, `maximumAdditionalLamports`, `cumulativeMaximumLamports`, `capLamports`, `withinCap`; baseline plus receipt events determines the before value, the fee quote/simulation plus decoded SOL/rent debits determines the maximum additional value, the sum is exact, cap is `1000000000`, and `withinCap` is true. `expiresAt` is an exact UTC millisecond timestamp no more than five minutes after `currentState.checkedAt`.

The initial implementation's exact recovery decoder registry is intentionally empty: `SUPPORTED_RECOVERY_DECODERS = Object.freeze({})`. No generic recovery transaction is safe to classify in advance. `decodeRecoveryTransaction()` therefore returns the named `recovery-operation-unsupported` hard stop for every transaction, and `buildRecoveryEnvelope()` cannot emit an approvable envelope. A later concrete recovery requires a separate reviewed TDD change that adds one exact operation key with fixed program IDs, instruction discriminators/layouts, ordered accounts, purpose constant, allowed transfer/debit rules, and source-derived fixtures; only then may the dispatcher produce the schema above. This limitation prevents a future failure from silently broadening authority.

Step 1 tests validate the envelope schema in isolation, assert the registry is deeply frozen and empty, and assert every serialized transaction causes both decoder and builder to stop with the exact unsupported error without writing an envelope. No passing builder fixture exists in this slice.

Reject unknown fields, reverse transitions, a second creation operation, a transient post-submission failure becoming terminal, an automatic retry, private-key-shaped arrays, credential-bearing URLs, free-form wallet dumps, identity/session/hash drift, missing or mismatched metadata baseline, caller-authored transaction facts, serialized-transaction/hash/signer/program/transfer/cost mismatches, duplicate signers/programs, invalid SOL/SPL transfer unions, stale observation/expired envelopes, unclassified instructions/debits, any recovery while the exact decoder registry is empty, and recovery or graduation cost that would push cumulative creator debit over the cap. A recovery operation may begin only after a later operation-specific decoder produces a fresh recovery envelope and the user separately approves its exact signature/spend; it is never synthesized or submitted by the receipt module.

- [ ] **Step 2: Run receipt tests and verify RED**

```powershell
rtk node --test test/session-receipt.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/session-receipt.mjs`.

- [ ] **Step 3: Implement public-only receipt normalization**

Implement the exact root/event schemas, readback-derived immutable metadata cost baseline, state-to-visible-status mapping, transition table, operation-chain identity rules, global sequence/timestamp monotonicity, baseline-plus-latest-operation debit accounting, and monotonic event appends. Store only public keys, signatures, slots, RFC 3339 timestamps, fixed visible statuses, transaction/metadata hashes, action purpose, and decimal-string lamport caps. Import the shared same-directory exclusive temporary-file, fsync, owned-temp cleanup, and atomic rename helper from `src/record-output.mjs`; never reference the removed legacy builder and never use `publishJsonProof()` because the session receipt evolves before finalization.

- [ ] **Step 4: Implement bounded recovery-envelope construction**

Implement `SUPPORTED_RECOVERY_DECODERS` as the exact frozen empty object and test that `decodeRecoveryTransaction()` deterministically returns `recovery-operation-unsupported` before parsing or trusting caller-authored facts. Also implement the generic unsigned-transaction framing/hash/address-table resolver as an internal helper for a future operation-specific decoder, but do not classify a program, instruction, purpose, transfer, fee, rent debit, or approvable maximum from it in this slice.

Implement strict `assertRecoveryEnvelopeV1()` for the future exact schema, but make `buildRecoveryEnvelope()` stop with `recovery-operation-unsupported` while the registry is empty. It must never fall back to a generic decoder, caller-supplied facts, “retry”, or “create replacement”. Document the required future change: add a concrete operation decoder/fixtures first, then bind the current receipt/readback, finalized one-slot state, derived transaction facts, baseline-inclusive cost, `checkedAt`, five-minute expiry, and fresh-approval flag before enabling one envelope branch.

- [ ] **Step 5: Implement the CLI without an approval switch**

Add to `package.json`:

```json
"session:receipt": "node scripts/session-receipt.mjs"
```

The CLI supports `init`, `record-status`, and `build-recovery` subcommands with public JSON input files under `artifacts/mainnet-session/`. `init` requires the validated preview/manifest/readback trio and derives `costBaseline`; `build-recovery` requires `--transaction <base64-file>` plus the receipt/readback but deterministically exits `recovery-operation-unsupported` until an exact reviewed decoder is added. It deliberately has no generic or caller-authored signer/program/transfer/cost option and no `approve`, `sign`, `send`, or `retry` subcommand.

- [ ] **Step 6: Run GREEN tests, syntax checks, and repository secret scan**

```powershell
rtk node --test test/session-receipt.test.mjs test/repository-hygiene.test.mjs
rtk node --check src/session-receipt.mjs
rtk node --check scripts/session-receipt.mjs
rtk npm run check:repo
```

Expected: PASS with no tracked artifact or secret finding.

- [ ] **Step 7: Document every action-time approval boundary**

Update `SECURITY.md`, `docs/LAUNCH.md`, and `proof/README.md` to state that legal acceptance, wallet connection, metadata upload, metadata-payment debit, initial creation signature, exact maximum creation debit, every recovery signature/spend, every graduation signature/spend, push, PR create/update, merge plus its automatic Pages deployment, GitHub metadata/domain save, and X save/post/pin are distinct action-time approvals. A single initial envelope approval covers both the creation signature and exact maximum debit only when it expressly names both; a pre-merge envelope covers both merge and automatic Pages only when it separately names each effect for the exact SHA. No approval carries forward; the receipt records evidence only and never counts as approval.

- [ ] **Step 8: Commit the recovery-evidence slice**

```powershell
rtk git add src/session-receipt.mjs scripts/session-receipt.mjs test/session-receipt.test.mjs package.json package-lock.json SECURITY.md docs/LAUNCH.md proof/README.md
rtk git commit -m "launch: add bounded recovery evidence"
```

---

### Task 5: Enforce the reviewed PR-to-main Pages release order

**Files:**
- Create: `test/workflow-release.test.mjs`
- Modify: `test/repository-hygiene.test.mjs`
- Modify: `scripts/check-repo.mjs`
- Modify: `docs/superpowers/plans/2026-07-22-hakky-live-launch.md`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `docs/LAUNCH.md`
- Modify: `proof/README.md`
- Modify: `launch/README.md`
- Read/verify only unless tests expose a mismatch: `.github/workflows/quality.yml`
- Read/verify only unless tests expose a mismatch: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: current workflows, reviewed branch `codex/hakky-solana-pivot`, repository `https://github.com/antihakkysack/hakky-protocol.git`, and the exact passing head SHA.
- Produces: executable workflow-order tests, one current runbook, and `releaseLifecycleState({ stage, availability, reviewedSha, xCopySha })` as a documented operator procedure. The procedure has no automatic push/merge/deploy/X implementation; every external mutation remains a separately approved manual/tool action.

- [ ] **Step 1: Write RED workflow-order tests**

Create `test/workflow-release.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("quality runs for pull requests and main", async () => {
  const workflow = await readFile(".github/workflows/quality.yml", "utf8");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:\s+[\s\S]*branches: \[main\]/);
});

test("Pages deploys from main only and waits for reusable quality", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  assert.match(workflow, /push:\s+[\s\S]*branches: \[main\]/);
  assert.doesNotMatch(workflow, /pull_request:|workflow_dispatch:/);
  assert.match(workflow, /quality:\s+[\s\S]*uses: \.\/\.github\/workflows\/quality\.yml/);
  assert.match(workflow, /deploy:\s+[\s\S]*needs: quality/);
});

test("the superseded rollout cannot be treated as the active launch runbook", async () => {
  const scanner = await readFile("scripts/check-repo.mjs", "utf8");
  assert.match(scanner, /2026-07-23-hakky-launch-readiness-operations\.md/);
  assert.doesNotMatch(scanner, /LIVE_LAUNCH_PLAN = "docs\/superpowers\/plans\/2026-07-22-hakky-live-launch\.md"/);
});
```

- [ ] **Step 2: Run the workflow test and verify RED**

```powershell
rtk node --test test/workflow-release.test.mjs
```

Expected: workflow assertions pass, but the active-runbook assertion fails because `scripts/check-repo.mjs` still points to the 2026-07-22 plan.

- [ ] **Step 3: Supersede the old plan and update the active-runbook pointer**

Add directly below the old plan title:

```markdown
> **Superseded:** Do not execute this plan. It is replaced by `docs/superpowers/plans/2026-07-23-hakky-launch-readiness-operations.md`, which corrects the LaunchLab authority lifecycle and the feature-branch -> PR quality -> approved merge -> main Pages sequence.
```

Change `scripts/check-repo.mjs::LIVE_LAUNCH_PLAN` to:

```js
const LIVE_LAUNCH_PLAN = "docs/superpowers/plans/2026-07-23-hakky-launch-readiness-operations.md";
```

- [ ] **Step 4: Replace stale operational claims in active documentation**

Update the listed active documents to use `prelaunch`, `curve-live`, and `graduated`; describe the LaunchLab PDA mint authority during the curve; time-qualify creator balance; distinguish 24 SOL configured minimum from observed graduation balance; distinguish Burn & Earn permanent lock from an SPL burn; and repeat the hard stops for mutable PlatformConfig, absent raw unsigned transaction, non-atomic immutable metadata, and non-full-lock LP disposition. Preserve the pinned Solana dependency versions, the prohibition on `npm audit fix --force`, and the 2026-08-23 review date for the two documented upstream exceptions.

- [ ] **Step 5: Run GREEN workflow and hygiene tests**

```powershell
rtk node --test test/workflow-release.test.mjs test/repository-hygiene.test.mjs
rtk npm run check:repo
```

Expected: PASS. Do not edit workflow permissions or add `workflow_dispatch`.

- [ ] **Step 6: Run the complete local release gate**

Run each command separately:

```powershell
rtk npm ci
rtk npm run assets
rtk npm run check
rtk npm run assets
rtk git diff --check
rtk git status --short
```

Expected: fresh install succeeds; both deterministic renders produce no second-run diff; full checks pass; diff check is clean; only intended plan/task changes are present.

- [ ] **Step 7: Commit the release-order slice**

```powershell
rtk git add test/workflow-release.test.mjs test/repository-hygiene.test.mjs scripts/check-repo.mjs docs/superpowers/plans/2026-07-22-hakky-live-launch.md README.md CONTRIBUTING.md SECURITY.md docs/LAUNCH.md proof/README.md launch/README.md
rtk git commit -m "release: enforce reviewed main Pages sequence"
```

- [ ] **Step 8: Obtain approval to push the exact reviewed branch**

Present the branch, destination, outgoing commits, exact head SHA, full diff summary, and passing local commands. Obtain immediate approval before:

```powershell
rtk git push -u origin codex/hakky-solana-pivot
```

Expected: only the feature branch is updated. Pages does not deploy.

- [ ] **Step 9: Obtain PR approval, open the PR, and wait for exact-head quality**

After the approved push, present the exact head SHA, then-current base SHA, title/body, changed-file summary, and destination. Obtain separate action-time approval to create or update only that PR before the external mutation. If remote `main` changed, stop and create a fresh reviewed integration commit or verification worktree; do not rebase, rewrite, force-push, or update the PR without separate approval. Rerun the complete gate and request fresh push and PR approvals. The PR description must list exact files, risks, test commands, manual verification, rollback, and `AUTO` Pages impact.

Expected: `quality` passes for the exact reviewed head SHA; inspect the exact base-to-head diff before requesting merge.

- [ ] **Step 10: Obtain separate merge plus automatic-Pages approval and verify main Pages**

Present an action-time envelope naming the exact passing head/base SHAs, merge method, production destination `https://hakky.xyz`, automatic Pages effect, expected record status/availability, and rollback commit procedure. Obtain approval that expressly and separately authorizes both the exact merge and its automatic production Pages deployment. After merge, wait for both `quality` and `pages` on `main`. Verify `https://hakky.xyz` at `1440 x 1000` and `390 x 844`, no console errors, warning above the fold, correct links, and no mint/buy action while prelaunch.

Expected: production is changed only by the approved merge to `main`; branch push alone never deploys.

- [ ] **Step 11: Repeat the reviewed release gate for every observed lifecycle transition**

  Add this exact procedure to `docs/LAUNCH.md`, `proof/README.md`, and `launch/README.md` for `curve-live/verified`, `curve-live/unavailable`, `graduated/verified`, and `graduated/unavailable`:

  1. Begin only from a finalized `observed-stage-v1` receipt. If the source record is unavailable, also require its exact content-addressed ignored continuity receipt and the retained prior stage receipt; re-hash both against their digest paths and verify that they bind the source bytes and same mint/launch ID. If full binding passes, build the verified record; otherwise build the unavailable record and persist the new content-addressed stage/continuity receipts before the public rename. Never regress to prelaunch or curve-live after a later stage is observed.
  2. Commit only the stage-appropriate canonical artifacts, `web/data/launch.json`, and generated stage copy. Temporary stage/session/browser evidence stays ignored. Run the full local release gate plus both-viewport certification for that exact record.
  3. Present exact branch, base, commit list, head SHA, diff summary, canonical artifact hashes, record status/availability, and passing commands. Obtain action-time approval to push only that exact SHA.
  4. Present the exact head/base SHAs and bounded PR title/body, then obtain separate action-time approval before creating or updating the PR. Require exact-head quality and base-to-head security/proof review. If remote main moved, create and review a fresh integration commit; never rewrite a published branch or update the PR without fresh approval.
  5. Present a pre-merge envelope naming the exact head/base SHAs, merge method, automatic production Pages effect, `https://hakky.xyz` destination, expected stage/availability, and rollback. Obtain approval that expressly authorizes both the merge and that automatic deployment. Wait for `main` quality and Pages, then read back both viewports and assert exact heading, qualifier, stage, availability, protocol buy/sell fee disclosure, independent creation/graduation links when applicable, no console/network errors, and no stale destination. Save the ignored stage report.
  6. Present the exact stage-correct X copy and its hash. Obtain separate approvals for save/post and for pin replacement. Read back the live post text, URL, account, and pin state. Earlier posts stay published; an unavailable warning replaces the pin until a later separately approved verified post.
  7. If Pages or proof readback fails after the on-chain stage exists, the only rollback is a newly reviewed same-stage unavailable record and warning. A later separately reviewed release may replace that warning with same-stage verified evidence only after the complete canonical artifact set passes. Never restore a weaker lifecycle claim or delete evidence posts automatically.

  Add workflow-order tests that require all four transition labels, the non-regression rule, unavailable continuity binding, complete-artifact unavailable-to-verified recovery, separate push/PR/merge-plus-auto-Pages/X approvals, Pages and X readback, and same-stage unavailable rollback language in the active runbook.

- [ ] **Step 12: Keep account-level and launch actions separately gated**

After deployed readback, request separate approval for GitHub About metadata/custom-domain verification, then separate X profile/post actions. Only after those readbacks may the controller enter Raydium legal acceptance, wallet connection, raw transaction capture, simulation, and exact-signature approval. No earlier approval carries forward.

---

## Final Integration and Recovery Gate

- [ ] Run `rtk node --test` and require all tests to pass.
- [ ] Run `rtk npm run check` and require repository, site, copy, schema, secret, and workflow gates to pass.
- [ ] Run `rtk npm run assets` twice and require the second run to leave no diff.
- [ ] Run `rtk git diff --check` and inspect `rtk git status --short` for intended files only.
- [ ] Review every new CLI for the absence of signing, sending, uploading, retrying, or credential capture.
- [ ] Confirm the external devnet proof remains ignored and contains no secret.
- [ ] Confirm metadata upload/readback hashes agree and production URIs are content-addressed.
- [ ] Confirm the raw unsigned transaction hash in the approval envelope exactly matches the wallet transaction presented for signing.
- [ ] Stop if PlatformConfig or another administrator can change creator fees, LP allocation, or claim rights after signature.
- [ ] Stop if simulation cannot prove atomic immutable metadata, exact allocation, no first-buy, no extensions, full irreversible LP treatment, equal disclosed protocol buy/sell fees, and `metadata upload debit + maximum creation debit <= 1000000000` lamports.
- [ ] After a failed or partial transaction, record public evidence, read finalized existing state, propose one bounded recovery operation, and obtain fresh approval; never create a replacement mint automatically.
- [ ] After each observed stage, complete the same-stage verified-or-unavailable Pages and X readback loop before calling public publication complete.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-hakky-launch-readiness-operations.md`. Execute with `superpowers:subagent-driven-development` task-by-task, with specification and code-quality review after each task. Use `superpowers:executing-plans` only if running inline with explicit checkpoints.
