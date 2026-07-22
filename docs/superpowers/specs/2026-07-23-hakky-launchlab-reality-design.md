# HAKKY LaunchLab Reality-Alignment Design

Date: 2026-07-23  
Status: user-approved direction; written specification awaiting user review

## 1. Decision

HAKKY will remain a Raydium LaunchLab public-only launch structure, but its
public evidence model will match LaunchLab's actual authority lifecycle instead
of claiming that mint authority is null throughout the bonding-curve phase.

The public state machine has three states:

1. `prelaunch`: no official mint or trading destination is published;
2. `curve-live`: the LaunchLab curve is publicly trading, the full fixed supply
   has already been minted, freeze authority is null, the creator balance was
   observed as zero at the recorded finalized slot/time, and mint authority is
   held by the exact Raydium LaunchLab program PDA;
3. `graduated`: the curve has migrated, mint authority is null, and the
   post-graduation pool and LP disposition have been independently verified.

The creator cannot sign for the LaunchLab PDA. The site must nevertheless show
the PDA authority plainly during `curve-live`; it must not describe that state
as revoked or null. Null mint authority remains mandatory in `graduated`.

The approved economic policy remains unchanged where the current platform can
prove it:

- classic SPL Token;
- Hakky Protocol / HAKKY;
- exactly 1,000,000 tokens with six decimals and
  `1,000,000,000,000` base units;
- 80% public bonding curve, 20% post-graduation liquidity, and 0% team
  allocation encoded in the launch;
- no presale, vesting, creator allocation, or creator first-buy;
- SOL quote and a configured minimum graduation threshold of 24 SOL;
- zero creator fee rights before and after graduation;
- no creator or platform LP share and full irreversible LP lock/burn treatment;
- immutable, content-addressed metadata before the official mint announcement;
- total creator-funded mainnet launch cost no greater than 1.00 SOL.

If the current Raydium interface, unsigned transaction, PlatformConfig, or
on-chain readback cannot prove any of those values, the launch stops before the
first signature. The default Raydium 90% Burn & Earn / 10% creator Fee Key split
does not satisfy this design.

Creation-time zero values are insufficient if a PlatformConfig administrator
can change a fee, allocation, LP, or claim-right invariant after signature. The
decoded program accounts and transaction must prove either that those values
are copied into immutable per-launch state or that no authorized party can
change them. Otherwise the launch stops before the first signature. A later
monitor is detection, not a substitute for this control.

## 2. Why the Previous Model Must Change

Current Raydium program documentation and SDK behavior distinguish the two
authority phases:

- `InitializeV2` creates and fully mints the classic SPL supply into the
  LaunchLab base vault;
- the LaunchLab authority PDA remains `mint_authority` while the public curve
  trades;
- buys transfer existing tokens from the base vault and do not call `mint_to`;
- freeze authority is null from initialization;
- migration revokes mint authority immediately after graduation.

Therefore, the previous requirement "mint authority null before public
trading" is incompatible with LaunchLab. Concealing that mismatch would be
worse than changing the policy. This design exposes the program-controlled
authority, keeps the fixed-supply checks, and adds a second proof transition
when authority becomes null.

The 24 SOL field is a configured minimum threshold, not a promise that the
graduation vault will contain exactly 24 SOL. A discrete final buy can push the
observed balance slightly above the configured threshold. Public copy must use
"24 SOL configured minimum graduation threshold" and report the observed
graduation balance separately.

## 3. Canonical State and Evidence

### 3.1 Prelaunch

`web/data/launch.json` remains the only published state record and contains:

- `status: "prelaunch"`;
- `token.mint: null`;
- `proof: null`;
- the fixed policy and expected authority lifecycle;
- no Raydium, Solscan, copy-address, or buy destination.

The expected lifecycle is policy, not observed proof:

```json
{
  "curveMintAuthority": "launchlab-program-pda",
  "graduatedMintAuthority": null,
  "freezeAuthority": null
}
```

The published state uses executable schema
`schemas/web/launch-v2.schema.json`. It is a `status`-discriminated union with
exact root keys `schemaVersion`, `status`, `network`, `project`, `token`,
`launch`, and `proof`; every root and nested object sets
`additionalProperties: false`. `schemaVersion` is `2`. `prelaunch` requires
`token.mint` and `proof` to be null. For `curve-live` and `graduated`, lifecycle
stage and proof availability are orthogonal discriminators. A verified curve
requires `proof.stage: "curve-live"`, `proof.availability: "verified"`, and exact
`sourceArtifacts`, `observation`, `supply`, `authorities`, `creatorBalance`,
`allocations`, `quote`, `creatorFirstBuy`, `vesting`, `fees`, `cost`,
`metadata`, `transactions`, and `links` objects. A verified graduation requires
`proof.stage: "graduated"`, `proof.availability: "verified"`, those same
objects, and exact `graduation`, `pool`, and discriminated `lpDisposition`
objects.

An unavailable non-prelaunch record preserves the known lifecycle `status` but
sets `token.mint` to null and permits only exact `proof.stage` and
`proof.availability: "unavailable"`. It contains no source artifact, mint,
destination, transaction, authority, balance, pool, LP, or other verified fact.
This is a deployable safety presentation, not a weaker lifecycle claim.
Status-inapplicable fields are rejected rather than made optional. The
promotion builders write only schema-valid v2 records and accept no arbitrary
extra property.

### 3.2 Curve-live canonical artifacts

The first public proof transition requires two append-only, content-hashed
repository artifacts:

```text
proof/mainnet-mint.json
proof/mainnet-launchlab.json
```

`proof/mainnet-mint.json` records direct Solana RPC evidence immediately after
LaunchLab initialization. Its strict schema version is `2` and contains only:

- network and verified mainnet genesis identity;
- classic Token Program ID;
- mint, creator, LaunchLab program ID, and the exact derived LaunchLab authority
  PDA;
- display supply, base-unit supply, and decimals;
- observed mint authority equal to that PDA;
- null freeze authority;
- zero creator HAKKY balance across every classic token account for the mint,
  explicitly qualified by finalized slot and time;
- metadata account, update authority, `isMutable`, URI, and content hashes;
- finalized account slot, block time, raw account-data hashes, exact
  `observation.checkedAt` verification timestamp, individual checks, and
  `ok: true` only when all checks pass.

`proof/mainnet-launchlab.json` records independent LaunchLab state and finalized
transaction evidence. Its strict schema version is `2` and contains only:

- mint, creator, launch ID, creation transaction, PlatformConfig, its update
  authorities and mutability classification, and program IDs;
- exact raw supply, curve-sale allocation, liquidity allocation, and vesting;
- SOL quote mint;
- configured 24 SOL minimum threshold in lamports;
- omitted creator first-buy and zero creator token credit;
- pre-migration `creatorFeeRate` equal to zero and proof that it is immutable
  for this launch;
- migration type, expected pool program, and the exact discriminated
  `lpDisposition` required by that migration type;
- proof that the selected full irreversible LP disposition is immutable for
  this launch and gives no creator or platform withdrawal/fee right;
- metadata name, symbol, URI, image, website, X address, mutability, and content
  digests;
- creator-funded finalized cost through creation;
- canonical Raydium and Solscan routes;
- finalized transaction slot, finalized account-observation slot, block time,
  raw account-data hashes, exact `observation.checkedAt` verification
  timestamp, two-source reconciliation checks, and `ok: true` only when all
  checks pass.

Neither file is hand-filled from memory. A deterministic read-only verifier
must construct each supported field from RPC, decoded transaction, Raydium
state, and operator-supplied public identifiers. Unknown fields, unsupported
schema versions, alternate routes, credentials in URLs, and incomplete
evidence fail closed.

Both schemas use the exact top-level field `schemaVersion`. Every object sets
`additionalProperties: false`; all fields are required unless the selected
discriminated union explicitly requires `null`. Public keys are canonical
base58 strings, timestamps are UTC RFC 3339 strings, slots are integers, and
token/lamport quantities are canonical unsigned decimal strings so JSON number
precision cannot alter them. URL fields are canonical HTTPS routes without
credentials, query, or fragment components. The implementation stores the
executable schemas under `schemas/proof/` and tests the prose examples against
them before any promotion code is accepted.

The required root objects are fixed:

| Artifact | Exact required root keys |
| --- | --- |
| mint v2 | `schemaVersion`, `network`, `identities`, `supply`, `authorities`, `creatorBalance`, `metadata`, `observation`, `checks`, `ok` |
| LaunchLab v2 | `schemaVersion`, `network`, `identities`, `transaction`, `programs`, `platformConfig`, `allocations`, `quote`, `creatorFirstBuy`, `vesting`, `fees`, `migration`, `metadata`, `cost`, `links`, `observation`, `checks`, `ok` |
| graduation v1 | `schemaVersion`, `network`, `identities`, `transaction`, `programs`, `supply`, `authorities`, `metadata`, `graduationBalance`, `pool`, `lpDisposition`, `fees`, `creatorBalance`, `cost`, `links`, `observation`, `checks`, `ok` |

The versioned executable schemas are normative for every nested key, type,
unit, enum, and null rule. They must be committed and reviewed before verifier
logic is implemented; verifier code may not define an undocumented field.

`migrationType` discriminates the LP evidence shape. `cpmm` requires
`lpDisposition.kind: "burn-and-earn"`, creator and platform shares of `0`
basis points, an irreversible locked share of `10000` basis points, the locked
position identity, and no creator Fee Key or withdrawal right. `amm-v4`
requires `lpDisposition.kind: "lp-burn"`, the LP mint, zero creator/platform
LP base units, the burned amount, zero outstanding recoverable LP base units,
null withdrawal authority, and an empty fee-right list. Fields belonging to the
other migration type are rejected rather than accepted as irrelevant zeroes.

"Finalized" means Solana `finalized` commitment. The two required independent
reconciliation paths are (1) the decoded finalized creation transaction and
(2) separately fetched finalized mint, launch, vault, metadata, and
PlatformConfig account bytes at the recorded same-or-later slot. A Raydium API
response may be supplementary evidence but cannot replace either path.

After both files pass, the deterministic promotion builder may create the
`curve-live` record. The builder accepts only an exact final verification
timestamp; it cannot accept overrides for mint, authorities, allocations,
fees, metadata, links, or spend.

### 3.3 Graduated canonical artifact

Graduation adds one append-only artifact:

```text
proof/mainnet-graduation.json
```

Its strict schema version is `1` and contains only:

- the same mint, creator, launch ID, program identities, and metadata digests;
- graduation/migration transaction and timestamp;
- observed quote-vault balance at graduation and the configured 24 SOL minimum;
- null mint authority and null freeze authority;
- unchanged total supply and decimals;
- post-graduation pool address and pool program;
- exact LP mint or locked-position identity;
- the migration-type-specific `lpDisposition` union, including creator,
  platform, and irreversible burn/lock shares or base-unit amounts;
- creator Fee Key presence/absence and every remaining fee right;
- creator token balance qualified by finalized slot/time and creator-funded
  cumulative mainnet cost;
- canonical Raydium pool, LaunchLab, Solscan token, and transaction routes;
- finalized transaction and account slots, block time, raw account-data hashes,
  exact `observation.checkedAt` verification timestamp, individual two-source
  checks, and `ok: true` only when all graduated invariants pass.

The artifact must prove zero creator and platform LP rights and full
irreversible lock/burn treatment. Public wording must name the mechanism that
actually occurred. "Burn & Earn permanent lock" must not be shortened to an
SPL burn if the LP supply was not literally burned.

At the pinned official SDK/IDL revisions reviewed for this design, the separate
CPMM lock program's position/NFT/fee-right account layouts are not published in
the pinned source set. That makes verified CPMM graduation unavailable and is a
pre-signature hard stop for this exact launch policy unless a newly pinned
official source and tests close the evidence gap. API data or UI copy cannot.

The graduation verifier re-fetches the bound PlatformConfig and all launch
accounts at `finalized` commitment. Any economic drift, newly authorized claim
right, or mismatch from the immutable per-launch values stops promotion and
renders verification unavailable.

The `graduated` promotion builder reads all three canonical artifacts. It
requires exact identity agreement, ordered timestamps, unchanged metadata and
supply, null final authorities, and complete LP/fee evidence. It accepts no
runtime fact overrides.

Each artifact stores `observation.checkedAt` as exact UTC RFC 3339 with
milliseconds. In the chronology below, `mintCheckedAt`,
`launchlabCheckedAt`, and `graduationCheckedAt` mean the corresponding
artifact's `observation.checkedAt`; they are not separate aliases or
operator-authored values.

### 3.4 Ordered timestamps and append-only history

The evidence chronology is:

```text
mintCheckedAt
  <= launchlabCheckedAt
  <= curvePublishedAt
  <= graduationCheckedAt
  <= graduatedPublishedAt
```

Curve-stage artifacts are never rewritten after publication. Graduation adds
new evidence so the repository preserves the authority transition instead of
replacing history.

## 4. Website Behavior

### 4.1 Prelaunch

The current fail-closed behavior remains: no mint, no trading destination, and
no claim that the launch has been verified.

The mobile warning becomes the first item in the hero's document and visual
order. At a `390 x 844` viewport, the complete text
"PRE-LAUNCH: No official mint address exists yet - ignore impostors." must be
visible above the fold. Desktop `1440 x 1000` composition remains unchanged,
with no horizontal overflow at either size.

### 4.2 Curve-live

The site publishes the official mint promptly after both curve artifacts pass.
Every mutable observation is historical evidence and is labeled with its
finalized slot and time; the site must not turn it into an unqualified current
claim. It shows:

- `CURVE LIVE - PROGRAM AUTHORITY ACTIVE`;
- the exact official mint and creation transaction;
- fixed observed supply and six decimals;
- mint authority equal to the displayed LaunchLab program PDA;
- an explanation that the creator cannot sign for the PDA and that Raydium
  revokes it at graduation;
- null freeze authority and "creator wallet balance observed as 0 at finalized
  slot/time";
- 80/20 allocation, 0% team allocation encoded in the launch, zero vesting, no
  creator first-buy, and SOL quote;
- 24 SOL configured minimum threshold and the curve phase observed at the
  displayed finalized slot/time;
- verified zero creator-fee settings and expected full LP lock/burn path;
- immutable metadata URI, image/content hashes, and official links;
- finalized creator spend versus the 1.00 SOL cap;
- canonical Raydium LaunchLab and Solscan destinations;
- a prominent statement that the post-graduation pool, final null mint
  authority, and LP disposition are not yet observed.

The curve-live proof post may be pinned because it is the first verified
official mint publication. It must describe the PDA authority and pending
graduation honestly.

### 4.3 Graduated

The site replaces the curve-phase qualifier with `GRADUATED - FINAL STATE
VERIFIED` and shows:

- null mint and freeze authorities;
- the migration transaction and pool;
- the observed graduation balance and configured threshold;
- exact permanent LP lock/burn mechanism, zero creator fee rights, and zero
  creator/platform LP withdrawal or LP-fee rights;
- unchanged supply, creator balance observed at the displayed finalized
  slot/time, metadata, and official mint;
- final cumulative creator-funded cost;
- canonical Raydium pool/LaunchLab and Solscan links.

The graduated proof post replaces the curve-live post as the pinned X post only
after a separate action-time approval. Earlier posts are not deleted.

### 4.4 Failure rendering

Malformed, missing, internally stale, or contradictory evidence never renders
a stronger state. "Internally stale" means the artifact is older than a state
or transaction it purports to describe, its slots/times are out of order, or a
newer canonical graduation artifact exists. Age alone does not invalidate a
truthful historical observation, but its slot/time qualifier is mandatory. The
client clears every stale destination and verified value before rendering. If
the repository says `curve-live` or `graduated` but its canonical artifacts do
not pass, the site shows `VERIFICATION UNAVAILABLE`, hides trading actions,
retains the high-risk disclosure, and does not silently fall back to an
apparently valid weaker state.

A deterministic unavailable-record builder may replace only the public launch
record. For a newly reached stage it consumes a temporary, public-only
`observed-stage-v1` receipt produced from finalized mainnet transaction and
LaunchLab account reads with the source-pinned decoder. This minimum receipt may
advance only prelaunch to curve-live or curve-live to graduated; it cannot come
from operator text, UI copy, or an API. The builder validates the transition,
then omits the receipt and every identity from output. It preserves the observed
lifecycle stage, clears all verified facts and destinations using the exact
unavailable schema branch, and never rewrites or accepts contradictory canonical
artifacts. This makes the fail-closed page deployable immediately after an
on-chain stage succeeds even when the stronger proof binding fails.

Publishing an unavailable record also produces an ignored
`unavailable-continuity-v1` receipt that binds the exact public-record bytes to
the exact `observed-stage-v1` receipt hash, mint, launch ID, stage, and finalized
slot/time. The exact observed-stage receipt bytes are retained at the ignored
content-addressed path
`artifacts/launch/stage-receipts/<stageReceiptSha256>.json`; the continuity
receipt is retained at
`artifacts/launch/unavailable-continuity/<publicRecordSha256>.json`. Both are
public-only evidence, never committed or rendered. Advancing an identity-free
unavailable source requires both receipts; the builder re-hashes the source
record and retained stage receipt, validates both receipt paths/digests, and
requires the new stage receipt to match their mint and launch ID. The public
unavailable record remains the exact two-key proof branch with a null mint and
no serialized identity. Publication writes/fsyncs the two immutable ignored
artifacts before atomically replacing the public record; a failure before the
public rename preserves the previous public bytes, while a completed rename
always has its matching retained evidence.

An unavailable warning is recoverable without stage regression. The
stage-specific verified builder may replace `curve-live/unavailable` with
`curve-live/verified` after the two canonical curve artifacts fully validate,
and may replace `graduated/unavailable` with `graduated/verified` after all
three canonical artifacts fully validate. A fully validated three-artifact
binding may also promote `curve-live/unavailable` directly to
`graduated/verified`. These paths accept only canonical artifacts plus the
exact publication timestamp; they never accept an identity, fact, or policy
override.

## 5. Metadata Integrity

The mutable `https://hakky.xyz/assets/token.png` URL remains a website asset but
is not sufficient as immutable token metadata evidence.

Before the mainnet approval envelope:

1. generate the exact metadata image and JSON locally;
2. compute and record SHA-256 digests;
3. publish the exact bytes to an approved content-addressed destination such as
   IPFS or Arweave under a separate upload/spend approval;
4. fetch the public URI and verify byte-for-byte digest equality;
5. require the decoded LaunchLab creation transaction to use that exact URI and
   create metadata with `isMutable: false` atomically;
6. require simulation to prove that immutable metadata outcome before signing.

If the official UI cannot accept the approved URI or create immutable metadata,
stop before the first creation signature. Post-creation metadata finalization is
not an approved recovery path because LaunchLab trading would already be public.
Metadata upload costs count toward the 1.00 SOL creator-funded mainnet cap when
the creator wallet pays them.

## 6. Transaction and Fee Gates

The launch-day controller must verify the official Raydium origin, mainnet
network, current program addresses, PlatformConfig, unsigned transaction, and
wallet simulation before requesting a signature.

The expected LaunchLab program ID is
`LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`, but launch-day official program
documentation and decoded transaction must agree before it is trusted.

The preview and simulation must prove:

- classic Token Program, not Token-2022;
- raw supply `1,000,000,000,000` and decimals `6`;
- raw curve allocation `800,000,000,000`, remaining 20% for migration, and
  locked/vested amount `0`;
- wrapped SOL quote mint
  `So11111111111111111111111111111111111111112`;
- configured target `24,000,000,000` lamports;
- no initial-buy instruction or creator token credit;
- pre-migration creator fee rate `0`, bound immutably to this launch;
- the exact migration-type-specific full irreversible LP disposition, bound
  immutably to this launch;
- no creator Fee Key or other continuing creator/platform claim right;
- no transfer fee, hook, blacklist, permanent delegate, or unexpected token
  extension;
- exact approved metadata and content-addressed URI;
- only the explained signers, programs, transfers, rent, platform fee, network
  fee, priority fee, and metadata cost;
- maximum cumulative creator lamport debit no greater than 1 SOL.

Protocol trading fees that apply equally to public curve transactions are not
creator allocation, but they must be disclosed. Referral parameters or tips
must be absent unless separately explained and approved; the default launch
envelope contains neither.

Accepting Raydium's legal terms, connecting a wallet, uploading metadata,
submitting each mainnet transaction, and spending SOL are separate action-time
approval gates. The user signs inside the wallet. No seed phrase, private key,
exported keypair, password, OTP, recovery code, authenticated RPC URL, or wallet
session store is requested or copied.

## 7. Devnet Rehearsal Recovery

The public Solana devnet faucet has repeatedly returned HTTP 429. The existing
bounded airdrop path remains, and a second explicitly selected mode is added:

```text
npm run rehearsal:devnet -- --external-funding
```

This mode:

- generates the payer only in process memory;
- prints only the public devnet address and required minimum test-SOL balance;
- polls the verified devnet RPC for up to ten minutes with a bounded interval;
- performs no mainnet request and rejects a non-devnet genesis hash before key
  generation;
- never writes or prints the payer secret key;
- removes any stale proof before starting;
- proceeds only after the public address is externally funded;
- writes only the ignored public proof after every fixed-supply, authority,
  transfer, and creator-balance check passes;
- exits without a proof when funding, confirmation, transaction, or evidence
  checks fail.

The official faucet page may require the user to sign in or solve a CAPTCHA.
Those actions require their participation; the controller does not inspect or
handle credentials. The rehearsal does not claim to simulate LaunchLab program
behavior. It proves the token-policy verifier and classic SPL authority flow;
LaunchLab-specific behavior is separately verified from official program state
and the mainnet transaction preview.

## 8. Release and Public-Surface Sequence

The candidate branch is not merged into the dirty local `main` checkout. The
preserved user Hardhat patch remains untouched.

The corrected release sequence is:

1. finish local implementation, complete task reviews and whole-branch review,
   and rerun deterministic assets plus the full quality gate;
2. obtain action-time approval to push the exact reviewed head to
   `codex/hakky-solana-pivot` on
   `https://github.com/antihakkysack/hakky-protocol.git`;
3. present the exact head/base SHAs and bounded PR title/body, then obtain a
   separate action-time approval before creating or updating the PR against the
   then-current remote `main`; stop, re-audit, and obtain fresh push/PR approvals
   if remote `main` changed;
4. wait for PR `quality` and review the exact diff;
5. present the exact head/base SHAs, merge method, automatic production Pages
   effect, `https://hakky.xyz` destination, expected record state, and rollback,
   then obtain an action-time approval that expressly authorizes both the exact
   merge and its automatic Pages deployment;
6. wait for both `quality` and Pages on `main` and verify `https://hakky.xyz`;
7. obtain separate owner/admin approval for GitHub About metadata and account-
   level custom-domain verification;
8. certify the deployed prelaunch page at desktop `1440 x 1000` and mobile
   `390 x 844` with screenshots, no console errors, correct links, warning above
   fold, and no mint or buy action;
9. obtain separate X profile-save and prelaunch-post approvals;
10. only then enter the Raydium legal/wallet/mainnet gates.

Pushing the feature branch alone does not deploy Pages because Pages triggers
only on `main`. Lack of branch protection means the controller must manually
pin the reviewed head SHA and passing check before requesting merge approval.

Current public BTC/cBTC website, repository metadata, and X copy are retired
only after their respective approved mutations and readbacks. Shared Git
history is not rewritten or force-pushed. The Hetzner server remains untouched.

## 9. Dependency Disposition

The current stable compatible Solana dependencies remain pinned:

- `@solana/web3.js@1.98.4`;
- `@solana/spl-token@0.4.15`;
- `entities@8.0.0`.

The audit findings are treated as two time-bounded upstream exceptions, not as
eight unrelated launch defects:

- `bigint-buffer`: no patched stable release; HAKKY uses fixed-size classic SPL
  layouts and currently falls back to pure JavaScript;
- `uuid`: the affected v3/v5/v6 output-buffer APIs are not used by `jayson`,
  which calls UUID v4.

Do not run `npm audit fix --force`; its proposed versions are incompatible
downgrades. Recheck upstream advisories by 2026-08-23 or sooner if the verifier,
RPC, layout, or runtime architecture changes. The browser receives none of the
Solana dependency graph.

## 10. Testing and Review

Implementation is test-driven and independently reviewed per bounded task.
Required coverage includes:

- strict schemas for `prelaunch`, `curve-live`, and `graduated`;
- exact unknown-field rejection for every artifact and state;
- LaunchLab PDA derivation and curve-stage authority checks;
- graduated null-authority checks;
- fixed supply, classic Token Program, null freeze authority, zero creator
  balance, and unchanged metadata across both transitions;
- 80/20 with 0% team allocation encoded in the launch, 24 SOL configured
  minimum, no first buy, zero vesting, zero creator fees, and full irreversible
  LP disposition;
- ordered append-only evidence and finalized two-source identity reconciliation
  using decoded transaction bytes and separately fetched raw account bytes;
- deterministic promotion builders with no runtime fact overrides;
- fail-closed stale-state clearing and destination hiding;
- exact curve-live and graduated public copy with no safety or return promise;
- rendered-entity, retired-identity, secret, URL, and special-host enforcement;
- externally funded devnet red/green tests, bounded polling, wrong-cluster
  rejection, stale-proof removal, and proof-secret absence;
- static mobile-warning contract plus live browser certification at both target
  viewports;
- workflow tests proving PR quality and `main`-only Pages deployment;
- fresh `npm ci`, two deterministic asset renders, complete `npm run check`,
  syntax checks, diff checks, and clean worktree;
- per-task reviews and a final base-to-head security/policy review with no open
  Critical or Important findings.

Tests prove artifact structure and deterministic logic. They do not prove live
Raydium settings, wallet identity, signatures, on-chain state, metadata
availability, or public deployment; those require exact external readback.

## 11. Stop and Recovery Behavior

Stop before signing when any field, program, account, fee, authority, metadata
value, LP right, cost, link, wallet identity, network, or transaction purpose is
unknown or mismatched.

After a failed or partially confirmed transaction:

- do not create another token automatically;
- do not broaden approval or retry the same submission blindly;
- save only public identifiers and visible statuses in the ignored session
  receipt;
- read the exact existing mint and LaunchLab state;
- present one bounded recovery operation, signatures, and maximum cost for new
  approval;
- publish no launch or proof claim until state is reconciled.

If curve creation succeeds but proof publication fails, trading may already be
public. The controller must preserve the mint and transaction identifiers,
publish nothing unverified, diagnose the existing state, and prioritize a
bounded proof/public-warning recovery instead of creating a replacement mint.

## 12. Acceptance Criteria

The project reaches the final pre-sign launch-approval gate only when:

1. this specification and its implementation plan are approved;
2. all implementation tasks and independent reviews are clean;
3. full local quality, deterministic assets, desktop/mobile certification, and
   the externally funded devnet rehearsal pass;
4. the exact candidate is on a passing PR and the approved prelaunch site is
   deployed from `main` at `https://hakky.xyz`;
5. public GitHub and X prelaunch surfaces no longer present the BTC/cBTC product;
6. the owner wallet public address, mainnet balance, and 1 SOL maximum envelope
   are resolved without exposing credentials;
7. immutable content-addressed metadata is uploaded and byte-verified;
8. the official live Raydium UI and decoded state prove every fixed value, zero
   creator fee right, full irreversible LP treatment, and the absence of an
   administrator path that can change those invariants after signature;
9. the complete unsigned transaction is simulated and explained;
10. the user receives the exact irreversible approval envelope immediately
    before signing.

The curve launch is publicly verified only after the first two canonical
artifacts, curve-live website deployment, and curve-live X proof readback all
agree. Graduation is verified only after the third artifact, graduated website
deployment, and graduated X proof readback agree.

HAKKY remains a high-risk meme coin with no promised utility, safety, scam
detection, or returns. "0% team" means only that the launch encodes no team
allocation; it does not prove that no associated person can ever participate.
HakkyAgent verifies published HAKKY launch facts; the user decides the risk.

## 13. Out of Scope

- creator or team HAKKY purchases at launch;
- buying BTC or using BTC to create traction;
- presale, vesting, airdrop, treasury, or marketing allocation;
- custom token contracts, Token-2022 extensions, taxes, hooks, blacklists, or
  permanent delegates;
- changing the X handle or GitHub repository owner;
- Hetzner deployment;
- seed phrases, private keys, exported wallet files, or unattended signing;
- declaring graduation before on-chain migration and LP readback.

## 14. Primary References

- Raydium LaunchLab account and authority lifecycle:
  <https://docs.raydium.io/products/launchlab/accounts>
- Raydium LaunchLab instructions:
  <https://docs.raydium.io/products/launchlab/instructions>
- Raydium bonding curve and graduation behavior:
  <https://docs.raydium.io/products/launchlab/bonding-curve>
- Raydium creator-fee behavior and default LP split:
  <https://docs.raydium.io/user-flows/how-creator-fees-work>
- Raydium LaunchLab platform configuration:
  <https://docs.raydium.io/products/launchlab/platform-config>
- Raydium current fee comparison:
  <https://docs.raydium.io/reference/fee-comparison>
- Raydium SDK LaunchLab instruction implementation:
  <https://github.com/raydium-io/raydium-sdk-V2/blob/master/src/raydium/launchpad/instrument.ts>
- Solana token authority semantics:
  <https://solana.com/docs/tokens/basics/set-authority>
- Metaplex metadata update and immutability:
  <https://www.metaplex.com/docs/tokens/update-token>
