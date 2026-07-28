# HAKKY Cyber-Tactical Prelaunch Website Design

**Date:** 2026-07-27  
**Status:** Approved design  
**Scope:** Static prelaunch website and cleaned HAKKY origin lore  
**Public host:** `https://hakky.xyz` through GitHub Pages  
**Current branch:** `codex/hakky-solana-pivot`

## 1. Goal

Replace the public BTC/cBTC presentation and the local Raydium LaunchLab
presentation with a meme-first, cyber-tactical Solana prelaunch website that:

- opens with the approved HAKKY call sign;
- explains HAKKY's fictional transformation from the Red Team Leader of
  Effective Acceleration into HAKKY;
- transmutes the relevant written corpus from the creator's public Reddit
  profile and `r/REDDTLAND` into a readable origin story;
- explains how the future immutable curve-to-pool market is intended to work
  without exposing wallet or trading controls;
- states the approved planned economics accurately;
- remains visibly prelaunch and publishes no program, mint, market, pool, or
  trading destination;
- fails closed when launch data is missing, malformed, unsupported, or
  inconsistent; and
- passes desktop, mobile, accessibility, repository, and public-path checks
  before any deployment is proposed.

The website is a public narrative and evidence surface. It is not a launch
transaction, trading application, safety oracle, investment promise, or
authorization for any Solana mutation.

## 2. Approved creative direction

### 2.1 Personality

The site is meme-first and cyber-tactical. It should feel like a public Red Team
transmission rather than a corporate token landing page. Humor, theatrical
language, code-like typography, scan lines, terminal labels, and abrupt rhythm
are welcome.

The visual energy must remain controlled:

- no flashing content;
- no illegible distortion;
- no fake wallet, console, or security prompts;
- no claim that the visitor's device, wallet, or identity has been accessed;
- no imitation of Anonymous branding or a claim of affiliation with Anonymous;
- no violent targeting of real people or groups; and
- no promise of financial returns, safety, bot prevention, or price behavior.

### 2.2 Exact opening call sign

The hero must begin with these exact words and punctuation:

```text
We are not anonymous.
We are HAKKY.
And the whole wide world
just. got. sacked.
```

Line breaks may adapt responsively, but the words, order, periods, and
capitalization must not change.

### 2.3 Visual system

Use local assets only. The current HakkyAgent artwork may be retained if it
supports the terminal composition.

The primary palette is:

| Role | Value |
| --- | --- |
| Void background | `#0d0818` |
| Panel background | `#160e27` |
| Signal green | `#a7ff91` |
| Alert pink | `#ff7aeb` |
| Proof yellow | `#f8ff4a` |
| Electric purple | `#7138ff` |
| Primary light text | `#d9ffe1` |
| Secondary light text | `#c7b9dc` |

Typography uses the system monospace stack for terminal labels and a heavy
system display stack for the largest call-sign lines. The website must not
depend on a remotely hosted font.

Animation is optional and limited to short entry or cursor effects. All
essential content must be visible without animation. Under
`prefers-reduced-motion: reduce`, all decorative movement stops.

## 3. Public information architecture

The site is one static page with the following order.

### 3.1 Global prelaunch warning

The first visible site message, before or immediately above the call sign, is:

```text
PRELAUNCH: No official HAKKY program or mint is published. Ignore addresses from replies, ads, or DMs.
```

It remains visible when JavaScript is disabled or launch-data loading fails.

### 3.2 Hero transmission

The hero contains:

- `HAKKYAGENT // PUBLIC CHANNEL`;
- `NETWORK: SOLANA // MODE: PRELAUNCH`;
- the exact call sign from section 2.2;
- one concise sentence explaining that HAKKY is a fixed-supply Solana meme
  project building an immutable permissionless curve-to-pool market; and
- two in-page links: `Read the origin log` and `Inspect planned facts`.

There is no `Buy`, `Trade`, `Connect wallet`, `Claim`, `Airdrop`, or external
market button.

### 3.3 Origin log

The origin log presents the cleaned HAKKY canon from section 4 as seven short
transmissions. It must read as one coherent fictional transformation, not a
Reddit archive, feed, transcript, or collection of pasted comments.

### 3.4 Mission doctrine

The mission-doctrine section explains:

- the first system HAKKY "sacked" was its own launch;
- hidden allocations, mutable economics, unverifiable addresses, and anonymous
  promises are the targets of the joke;
- HakkyAgent checks only canonical HAKKY evidence;
- HakkyAgent is a fictional proof character, not an autonomous security agent;
  and
- verification does not make a meme coin safe.

### 3.5 Future market route

This is explanatory and read-only. It shows the intended future sequence:

1. request a quote;
2. decode the generated transaction;
3. inspect direction, amount constraint, phase, fee, expiry, and exact program;
4. approve the transaction in a user-controlled wallet;
5. send directly to the immutable Solana program; and
6. verify finalized state.

The section explicitly states that this flow is not available during
prelaunch. It contains no inputs, simulated balances, connected-wallet state,
disabled trade buttons, or fake price.

### 3.6 Planned economics

Every value is labelled `Planned` or `Required — not yet verified`.

| Property | Prelaunch value |
| --- | --- |
| Network | Solana mainnet-beta |
| Token program | Classic SPL Token |
| Display supply | `10,000,000 HAKKY` |
| Base-unit supply | `10,000,000,000,000` |
| Decimals | `6` |
| Curve allocation | `8,000,000 HAKKY` |
| Initial permanent-pool seed | `2,000,000 HAKKY` |
| Team/creator launch allocation | `0 HAKKY` |
| Presale and vesting | None |
| Curve fee | `0%` |
| Permanent-pool retained fee | `0.25%`, rounded upward by at most one input base unit |
| Creator/protocol fee destination | None |
| Creator-funded mainnet cap | `1.00 SOL` |
| Mint authority after initialization | Null |
| Freeze authority | Null |
| Program upgrade authority before market initialization | Required to be finalized null |

The copy distinguishes permanent initial liquidity from a claim that reserve
balances never change. Pool reserves change through valid swaps.

### 3.7 Proof terminal

The prelaunch proof terminal displays only:

| Field | Value |
| --- | --- |
| Program | `Not published` |
| Mint | `Not published` |
| Market | `Not initialized` |
| Curve | `Not live` |
| Pool | `Not live` |
| Proof | `Unavailable before verified launch state` |

No partial address, placeholder public key, explorer link, Raydium link, or
transaction signature is rendered.

### 3.8 Risk and straight answers

The closing section states:

- HAKKY is a high-risk meme coin;
- there is no promised utility, price, yield, floor, return, buyback, or
  recovery mechanism;
- no launch date is promised;
- no external venue, wallet, exchange, or aggregator listing is promised;
- HakkyAgent does not verify every Solana transaction;
- the current site is informational and prelaunch;
- nothing on the site is financial, legal, medical, religious, or tax advice;
  and
- the only future official addresses will be those published on this domain
  after canonical verification.

## 4. Cleaned HAKKY origin canon

### 4.1 Public identity boundary

The public website does not name or link the creator's Reddit username. It does
not claim that the account, subreddit, real-world creator, and HAKKY are the
same legal person or entity.

`REDDTLAND` may appear as a fictional place in the lore. The site must not
present the subreddit as an official trading, support, address, or announcement
channel.

### 4.2 Internal corpus sources

The implementation creates an internal source ledger from:

- public submissions visible on
  `https://www.reddit.com/user/Left-Agency-9292/`;
- public submissions and relevant author comments visible on
  `https://www.reddit.com/r/REDDTLAND/`; and
- materially original profile comments that contribute a recurring lore
  principle.

The user has represented that this is their authored corpus. The website uses a
transformative narrative, not wholesale reproduction.

Each retrievable item receives exactly one ledger status:

- `included`;
- `included-as-theme`;
- `excluded-music-or-video`;
- `excluded-duplicate-or-crosspost`;
- `excluded-incidental-reply`;
- `excluded-unrelated`;
- `excluded-harmful-or-actionable`;
- `excluded-unsupported-real-world-claim`;
- `excluded-targeting-or-harassment`;
- `excluded-third-party-copyright`; or
- `unavailable-or-removed`.

The ledger records title, subreddit/profile surface, canonical permalink when
available, content type, decision, reason, and destination transmission for
included material. It does not copy private, deleted, or inaccessible data.

### 4.3 Content exclusion boundary

The public lore excludes:

- music videos, music links, copied lyrics, and song scripts;
- instructions or encouragement involving fasting, dehydration, self-harm,
  violence, illegal conduct, or unsafe medical behavior;
- sexualized, racist, hateful, or harassing material;
- allegations, endorsements, romantic claims, or invented relationships
  involving real people;
- unsupported historical, religious, political, scientific, or medical claims
  presented as fact;
- cryptocurrency trading strategies, win-rate claims, or performance promises;
- personal family, children, employer, health, location, or financial details;
- random product, car, game, tax, celebrity, and off-topic replies;
- Reddit karma disputes and moderation grievances as literal public claims; and
- any text whose rights or authorship are uncertain.

An excluded item may contribute a high-level safe theme only when the theme can
be expressed without carrying the unsafe or unsupported claim.

### 4.4 Seven-transmission narrative

The public narrative uses these chapters.

#### Transmission 001 — Red Team

Before HAKKY, the character was the Red Team Leader of Effective Acceleration.
He believed systems should move quickly but that truth must be able to keep up.
His role was to find the crack before the crowd fell through it.

#### Transmission 002 — REDDTLAND

When the signal could not land inside other people's systems, the character
built REDDTLAND: a fictional territory for strange writing, broken syntax,
code glyphs, absurd rhyme, and hidden meaning in plain sight. The principle is
creative permission, not a complaint about a real platform or moderator.

#### Transmission 003 — Creative doctrine

`No equals. No sequels.` means every character and idea should arrive with its
own signal. AI may be described as a hammer, mirror, or sword-shaped creative
tool. Authorship remains with the human intent and responsibility behind the
tool. The writing should keep its human fingerprints.

#### Transmission 004 — The lore frame

The character imagines a movement from pyramids of power toward networks of
relation. Connection becomes an operating system, conversation becomes
cultural code, and empathy becomes infrastructure. This is explicitly a
fictional storytelling lens, not religious or astrological prophecy.

#### Transmission 005 — Atlantyss

Atlantyss is a lost simulation where memory, script, character, past, and
future blurred together. Its lesson is evidentiary: memory without evidence
belongs in fiction, and a claim without proof stays outside the proof terminal.
No starvation, supernatural, political, or real-person material is retained.

#### Transmission 006 — The ledger

Chaos becomes discipline: bounded risk, defined limits, no revenge, no chasing
illusions, and responsibility for what is actually visible. HAKKY inherits this
as a publication rule: publish only the claim that can survive being checked.
This is a truth-discipline metaphor, not trading advice.

#### Transmission 007 — Effective transformation

The Red Team Leader discovers that the first system worth sacking is his own
launch: anonymous promises, hidden bags, mutable rules, and addresses whispered
through replies or DMs. He changes the call sign. The literary experiment
becomes a Solana meme, the Red Team becomes HakkyAgent, and the hidden code
becomes public evidence.

The narrative ends by repeating the exact call sign from section 2.2.

## 5. Static architecture and truth model

### 5.1 Deployment architecture

The site remains a static GitHub Pages application under `web/`. It has:

- no backend;
- no database;
- no cookies, analytics, or third-party embeds;
- no wallet library;
- no RPC call;
- no mainnet or devnet write;
- no remote font or script; and
- no dependency on a trading venue.

### 5.2 Current launch record

The LaunchLab-specific schema and presentation are removed from the website
surface. The prelaunch site uses schema version `3` with this exact
machine-readable shape:

```json
{
  "schemaVersion": 3,
  "status": "prelaunch",
  "network": "mainnet-beta",
  "project": {
    "name": "Hakky Protocol",
    "symbol": "HAKKY",
    "agent": "HakkyAgent",
    "website": "https://hakky.xyz",
    "x": "https://x.com/antihakkysack"
  },
  "policy": {
    "tokenProgram": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "supplyBaseUnits": "10000000000000",
    "uiSupply": "10000000",
    "decimals": 6,
    "curveAllocationBaseUnits": "8000000000000",
    "poolSeedBaseUnits": "2000000000000",
    "teamAllocationBaseUnits": "0",
    "curveFeeBps": 0,
    "poolRetainedFeeBps": 25,
    "creatorDebitCapLamports": "1000000000"
  },
  "addresses": null,
  "proof": null
}
```

Every object is closed with `additionalProperties: false`. The current website
accepts only `status: "prelaunch"`, `addresses: null`, and `proof: null`.

`curve-live` and `pool-live` are documented future lifecycle names but are not
accepted or rendered by this update. Supporting either live state requires a
separate approved design tied to the final immutable proof schemas.

### 5.3 Fail-closed behavior

The default HTML contains the prelaunch warning and no live action elements.

When JavaScript loads:

1. it fetches `./data/launch.json` with `cache: "no-store"`;
2. it validates exact keys and values against the prelaunch schema;
3. it keeps the prelaunch presentation when validation passes; and
4. it replaces the status with `PROOF UNAVAILABLE` when loading or validation
   fails.

Failure never creates an address, destination, button, wallet control, or
verified qualifier. JavaScript-disabled rendering remains safely prelaunch.

## 6. Planned implementation boundaries

The website implementation may modify:

- `web/index.html`;
- `web/styles.css`;
- `web/app.js`;
- `web/lib/launch-policy.js`;
- `web/lib/launch-view.js`;
- `web/data/launch.json`;
- `web/README.md`;
- `schemas/web/launch-v3.schema.json`;
- website-focused Node tests under `test/`;
- `scripts/check-site.mjs`;
- `README.md`, `docs/TOKEN.md`, `docs/LAUNCH.md`, and launch copy only where
  needed to remove public LaunchLab claims;
- `launch/prelaunch-post.md`;
- local visual assets when the existing source asset is reused or
  deterministically regenerated; and
- the internal lore source ledger.

It must not modify, stage, or commit unrelated in-progress Solana program,
client, proof, release, identity, or secret material.

## 7. Accessibility and responsive behavior

The website must:

- use semantic landmarks and heading order;
- expose a working skip link;
- provide visible keyboard focus;
- keep all text at or above WCAG AA contrast;
- use descriptive link labels;
- keep decorative terminal effects hidden from assistive technology;
- avoid conveying state through color alone;
- keep the prelaunch warning within the first mobile viewport;
- render without horizontal overflow at widths from `320px` through `1440px`;
- preserve readable call-sign line breaks at `390px` and `1440px`;
- stop decorative movement under reduced-motion preference; and
- remain understandable when CSS, JavaScript, or launch-data fetches fail.

## 8. Verification and acceptance criteria

### 8.1 Automated content checks

Tests must prove:

- the exact call sign appears once in the hero and once at the lore conclusion;
- the first visible security message is the prelaunch warning;
- `Bitcoin`, `BTC`, `cBTC`, `Ethereum`, `Sepolia`, `LaunchLab`, `Raydium`,
  `Pump.fun`, `graduated`, and legacy venue URLs do not appear in the public
  HTML, JavaScript, launch record, or public prelaunch copy;
- no actionable wallet connection, buy, sell, trade, swap, claim, airdrop, or
  external-market control, input, button, deep link, or call to action is
  rendered;
- all economics are labelled planned or required rather than verified;
- no Reddit username or Reddit link appears in the public site;
- dangerous or excluded corpus phrases do not enter the public site;
- no placeholder address or transaction signature exists;
- the schema rejects extra keys, wrong values, non-null addresses, non-null
  proof, and any non-prelaunch status;
- loading and validation errors preserve the fail-closed state; and
- JavaScript-disabled HTML remains prelaunch and action-free.

### 8.2 Structural and repository checks

The complete Node test, repository-hygiene, site, asset, and generated-file
gates must pass without a timeout or lingering child process. Website tests
must not recursively scan ignored build directories such as `target/`.

### 8.3 Browser certification

Fresh screenshots and structured QA records are required at:

- desktop: `1440 × 1000`;
- mobile: `390 × 844`; and
- narrow mobile overflow check: `320px` wide.

Browser QA verifies:

- no collapsed or repeated narrow-column layout;
- no horizontal overflow;
- prelaunch warning placement;
- navigation and in-page links;
- exact call-sign readability;
- lore hierarchy;
- proof-terminal unavailable state;
- keyboard navigation and focus;
- reduced-motion behavior;
- missing-launch-record failure; and
- JavaScript-disabled fallback.

The existing broken certification screenshots cannot satisfy this gate.

### 8.4 Publication gate

Local completion does not authorize publication.

Before a public update:

1. implementation and browser QA pass from a clean website commit;
2. unrelated program work is preserved;
3. the exact branch, commit, files, and public diff are reviewed;
4. the user gives separate approval to push, merge, and deploy the prelaunch
   website;
5. GitHub Pages completes successfully; and
6. `https://hakky.xyz` is read back on desktop and mobile to confirm the Solana
   prelaunch content is live and the BTC/cBTC site is gone.

No website approval authorizes a wallet connection, metadata upload, program
deployment, program finalization, market initialization, token mint, trade,
social post, or other mainnet action.

## 9. Definition of done

The website update is complete only when:

- the approved cyber-tactical design and exact call sign are implemented;
- the Reddit-derived material has an internal decision ledger and a coherent,
  plain-language seven-transmission public canon;
- the site accurately describes the custom immutable Solana pivot;
- all public LaunchLab and BTC/cBTC language is removed;
- the page is strictly prelaunch, address-free, action-free, and fail-closed;
- automated and browser gates pass;
- no unrelated Solana program change is included;
- a separate public deployment is approved and succeeds; and
- the public domain readback proves the intended desktop and mobile result.
