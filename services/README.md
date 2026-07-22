# Hakky Protocol — Off-chain services (the "framework")

The on-chain contracts define the rules; these services make the protocol *run*.
They screen deposits, publish proof-of-reserves, orchestrate mint/redeem, and serve
the public data the website and partners read.

> **Status:** Phase 1 scaffold, **testnet (Sepolia) only**. No mainnet, no real funds.
> Signing keys here are dev keys — production moves to KMS/HSM + multisig.

## Services

| Service | Kind | Responsibility |
| --- | --- | --- |
| [`shared`](src/shared/) | lib | Config, logger, Postgres pool, ethers client + contract ABIs. Imported by all services. |
| [`api`](src/api/server.ts) | HTTP | Public **read** API: `/proof-of-reserves`, `/attestation/:address`, `/health`. What the site reads. |
| `attestation-service` | worker + HTTP | Screens an address/BTC provenance and writes signed attestations to `AttestationRegistry`. *(next)* |
| `reserve-oracle` | cron | Reads custody balance and publishes `reserveSats` + report to `ReserveOracle`. *(next)* |
| `orchestrator` | worker | Watches custody for BTC deposits → `processDeposit`; processes redemptions → `settleRedeem`. *(next)* |

## Architecture

```
                         ┌─────────────────────────────┐
   Bitcoin custody  ───▶ │  orchestrator (deposit watch)│ ──▶ ReserveVault.processDeposit → mint cBTC
                         └─────────────────────────────┘
   screening provider ─▶  attestation-service          ──▶ AttestationRegistry.attest
   custody balance    ─▶  reserve-oracle (cron)         ──▶ ReserveOracle.updateReserves
                          api  ◀── reads chain ──────────▶  (site / partners)
                          Postgres ◀── all services (audit log, job state)
```

## Run locally (testnet)

```bash
cd services
cp .env.example .env          # fill RPC + deployed contract addresses
npm install
npm run dev:api               # http://localhost:8080/proof-of-reserves
```

Or the whole stack with Docker:

```bash
docker compose up --build
```

## Deploy to Hetzner

A one-shot provisioning script (Docker + Caddy auto-HTTPS) lands in [`provision/`](provision/) *(next)*.
Target: **Ubuntu 24.04, CX22/CPX21**. Point `api.hakky.xyz` at the box and Caddy handles TLS.

## Contract addresses

Services read addresses from env (`.env`), populated after deploying the contracts to Sepolia
(`cd ../contracts && npx hardhat run scripts/deploy.js --network sepolia`).
