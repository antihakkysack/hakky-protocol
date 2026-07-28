# HakkyAgent identity and verification-claim design

Date: 2026-07-22
Status: approved direction; implementation pending written-spec review

## Decision

Rename the public blockchain proof agent from AntiHakkySack / Sack Sentinel
Agent 001 to **HakkyAgent**. HAKKY remains the token symbol and Hakky Protocol
remains the project and launch-policy name.

The public positioning is:

> **HakkyAgent verifies the facts. You decide the risk.**

HakkyAgent is the named verification identity for the repository's real,
deterministic HAKKY launch checks. It is not a universal transaction judge,
guaranteed scam detector, financial adviser, or promise that a transaction or
token is safe.

## Verified scope

HakkyAgent may claim verification only when the corresponding repository check
has passed and canonical evidence is available. The current scope is:

- the HAKKY mint identity and classic SPL Token program;
- fixed base-unit supply and six decimals;
- null mint and freeze authorities;
- zero HAKKY held by the approved creator identity;
- canonical metadata and official links;
- LaunchLab allocation, quote asset, graduation target, fee, LP, and creator
  spend facts when both canonical proof artifacts reconcile with the live web
  record.

The project must not claim that HakkyAgent verifies every Solana transaction,
labels transactions as good or bad, audits arbitrary tokens, predicts scams, or
removes financial risk.

## Public identity migration

All active public surfaces will use `HakkyAgent` as one word:

- website title, metadata, navigation labels, hero, story, FAQ, footer, image
  alternative text, and accessible SVG title/description;
- README, security and launch documentation, package description, and social
  launch copy;
- X display name and future post copy;
- rendered avatar, banner, Open Graph art, and token-art text where the former
  agent name or Agent 001 label is baked into the image;
- tests and active-source policy assertions.

The existing orange proof-sentinel mascot and visual direction remain; only its
identity and baked text change. Public copy may describe HakkyAgent as an AI
blockchain proof agent, provided the verified scope and risk boundary remain
adjacent and clear.

## Account and URL boundary

The existing account locations remain unchanged during this rename:

- X handle: `@antihakkysack`
- GitHub repository: `https://github.com/antihakkysack/hakky-protocol`

Those strings are account addresses, not the current agent name. Changing the
X handle, repository owner, or repository URL is a separate live action and
requires action-time approval. No account mutation is part of this local code
change.

## State, evidence, and failure behavior

Prelaunch pages continue to show no official mint or trading destination.
HakkyAgent verification language becomes live only when the canonical mint and
LaunchLab artifacts pass the existing reconciliation gate. Missing, malformed,
failed, or inconsistent evidence must reset the public surface to prelaunch and
must never leave a verified label or destination visible.

## Test and acceptance requirements

- Active public files and generated raster assets contain no former agent name,
  Sack Sentinel name, or Agent 001 label.
- Historical design and implementation records may retain the former terms as
  project history and are excluded from the active-surface assertion.
- The exact tagline appears on the website and in the root project story.
- Claims tests reject universal safety, good/bad transaction, guaranteed scam
  detection, and guaranteed-return language.
- Account URLs remain the approved X and GitHub addresses.
- Deterministic asset golden hashes are intentionally updated and verified.
- Full repository, site, proof, social-copy, and asset checks pass without
  publishing, deploying, editing X, signing, spending SOL, or accessing
  Hetzner.

## Out of scope

- Renaming the HAKKY token or Hakky Protocol project;
- changing the X handle or GitHub owner/repository URL;
- building a general Solana transaction-classification service;
- promising that verified facts make an asset safe;
- any push, deployment, wallet connection, signature, mainnet transaction,
  social-account edit, or server change.
