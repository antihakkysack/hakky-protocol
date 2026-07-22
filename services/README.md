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
| [`attestation-service`](src/attestation/worker.ts) | worker + HTTP | Screens an address (stub provider) and writes a signed attestation to `AttestationRegistry`. `POST /screen`. |
| [`reserve-oracle`](src/reserve-oracle/cron.ts) | cron | Reads the (stubbed) custody balance and publishes `reserveSats` + report to `ReserveOracle`. |
| [`orchestrator`](src/orchestrator/worker.ts) | worker + HTTP | `POST /deposit` → `processDeposit` (mint); watches `RedeemRequested` → `settleRedeem`. |

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

A one-shot provisioning script (Docker + Caddy auto-HTTPS) lives in [`../provision/`](../provision/).
It brings up Postgres, the API, all three workers, and Caddy. Target: **Ubuntu 24.04, CPX22**.
Point `api.hakky.xyz` at the box and Caddy handles TLS. See [`provision/README.md`](../provision/README.md).

## Contract addresses

Services read addresses from env (`.env`), populated after deploying the contracts to Sepolia
(`cd ../contracts && npx hardhat run scripts/deploy.js --network sepolia`).
