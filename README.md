<div align="center">

# 🧼 Hakky Protocol

### The clean-Bitcoin layer — `1 cBTC = 1 verifiably clean BTC`

**Keep crypto clean.**

[![License: MIT](https://img.shields.io/badge/License-MIT-14B8A6.svg)](LICENSE)
[![Contracts](https://img.shields.io/badge/contracts-Solidity_0.8.24-0E9B8E.svg)](contracts/)
[![Tests](https://img.shields.io/badge/tests-15%2F15_passing-0E9B8E.svg)](contracts/test/)
[![Not a mixer](https://img.shields.io/badge/not-a_mixer-F7931A.svg)](#hakky-is-not-a-mixer)

</div>

---

## What is Hakky?

Not all Bitcoin is treated equally. Coins that trace back to hacks, scams, or
sanctioned wallets get **frozen on arrival** at exchanges and OTC desks — even
when the current holder did nothing wrong. Meanwhile "clean" BTC trades at a
**premium**, and screening today is opaque, off-chain, and non-portable.

**Hakky Protocol turns cleanliness into a portable, on-chain asset.** It issues
**cBTC ("Clean BTC")** — a token backed **1:1 by BTC held in verifiable reserve**,
where the backing coins have passed provenance screening, and where cleanliness
is **proven on-chain** via signed attestations and a proof-of-reserves invariant.

> **1 cBTC = 1 clean BTC**, redeemable 1:1, fully backed, transparent by design.

## Hakky is *not* a mixer

This is the single most important thing to understand about Hakky.

| A mixer / tumbler | Hakky Protocol |
| --- | --- |
| **Breaks** the link between sender and receiver | **Keeps** provenance transparent and on-chain |
| **Obscures** where funds came from | **Attests** where funds came from, in public |
| Serves people with something to hide | Serves honest holders who want to **prove** it |
| Makes coins *more* suspect | Makes coins *portably clean* across venues |

Hakky screens **for** cleanliness and hides nothing. It is a compliance and
provenance tool — **not** a way to anonymize, mix, launder, or evade lawful
process.

## How it works

```
   ┌────────────┐   screen    ┌─────────────────────┐   attest    ┌──────────────────────┐
   │  Your BTC  │────────────▶│  Provenance check   │────────────▶│  AttestationRegistry │
   └────────────┘             └─────────────────────┘             └──────────────────────┘
         │                                                                    │
         │ deposit to custody                                                 │ signed, on-chain
         ▼                                                                    ▼
   ┌────────────┐   verify + mint (supply ≤ reserves)   ┌──────────────────────────────────┐
   │ReserveVault│──────────────────────────────────────▶│  cBTC minted 1:1 to your address │
   └────────────┘                                        └──────────────────────────────────┘
         ▲                                                                    │
         │ burn cBTC → release BTC 1:1                                        │ hold · transfer · use in DeFi
         └────────────────────────────── redeem ◀────────────────────────────┘
```

1. **Screen** — BTC provenance is checked; an accredited attestor publishes a signed cleanliness attestation on-chain.
2. **Mint** — the `ReserveVault` mints cBTC 1:1, but only while `totalSupply() ≤ reserveSats()`.
3. **Use & redeem** — hold or transfer cBTC anywhere; burn it to redeem native BTC 1:1.

## Architecture

Five small, auditable contracts. Each does one job; all are public.

| Contract | Responsibility |
| --- | --- |
| [`CleanBTC.sol`](contracts/contracts/CleanBTC.sol) | cBTC ERC-20 (8 decimals). Supply capped by proven reserves; optionally compliance-gated transfers. |
| [`AttestationRegistry.sol`](contracts/contracts/AttestationRegistry.sol) | Transparent registry of signed, expiring cleanliness attestations per address. |
| [`ReserveOracle.sol`](contracts/contracts/ReserveOracle.sol) | Publishes attested BTC reserves (proof-of-reserves) backing cBTC 1:1. |
| [`CompliancePolicy.sol`](contracts/contracts/CompliancePolicy.sol) | `MONITOR` / `GATED` / `ALLOWLIST` transfer modes. Ships **monitor-only**. |
| [`ReserveVault.sol`](contracts/contracts/ReserveVault.sol) | Mint/redeem gateway between native BTC and cBTC, with replay protection. |

**The core invariant** — enforced at mint time — is that cBTC in circulation can
never exceed the BTC in reserve:

```solidity
require(totalSupply() + amount <= reserveOracle.reserveSats());
```

## Quickstart

```bash
# 1. Contracts
cd contracts
npm install
npm run build         # compile
npm test              # 15 passing

# 2. Local deploy (spins up a demo of the full stack)
npx hardhat node                       # in one terminal
npm run deploy:local -- --network localhost   # in another

# 3. Website (static — serve the web/ folder)
npx serve web         # or open web/index.html directly
```

Testnet deploys read from environment variables (nothing secret is committed) —
see [`contracts/hardhat.config.js`](contracts/hardhat.config.js):

```bash
export SEPOLIA_RPC_URL=...       # RPC endpoint
export DEPLOYER_PRIVATE_KEY=...  # funded testnet key
npx hardhat run scripts/deploy.js --network sepolia
```

## Repository layout

```
hakky-protocol/
├── contracts/     # Solidity contracts, tests, deploy scripts (Hardhat)
├── web/           # Static landing site (deployable to GitHub Pages / Vercel)
├── docs/          # SPEC.md (canonical) + whitepaper.md
├── launch/        # Twitter/X launch kit (thread, positioning, calendar, brand)
└── README.md
```

- **Canonical spec:** [`docs/SPEC.md`](docs/SPEC.md)
- **Whitepaper:** [`docs/whitepaper.md`](docs/whitepaper.md)
- **Launch kit:** [`launch/README.md`](launch/README.md)

## Trust model (read this)

v1 is **honest about its trust assumptions**. Like every 1:1 BTC-backed token in
production today, reserves are held with qualified custody and a multisig
publishes the proof-of-reserves attestation. **This is not trustless**, and we
say so plainly. The [roadmap](docs/whitepaper.md) moves toward MPC/threshold
custody, a multi-attestor network, and zk proof-of-reserves.

`$HAKKY` is a **roadmap governance token**. There is no token sale, presale, or
airdrop, and none is implied by this repository.

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md). Please **do not** open a
public issue for security reports. These contracts have **not yet been audited**;
do not use them with real funds until a formal audit is complete.

## Disclaimer

This repository and its contents are provided for informational and
developmental purposes only. Nothing here is financial, investment, legal, or
tax advice, nor an offer to sell or a solicitation to buy any security, token,
or financial instrument. Digital assets carry risk, including smart-contract,
custody, regulatory, and de-peg risk up to total loss. Always do your own
research. See the [full disclaimer in the whitepaper](docs/whitepaper.md).

## License

[MIT](LICENSE) © 2026 Hakky Protocol · *Audit, don't assume.*
