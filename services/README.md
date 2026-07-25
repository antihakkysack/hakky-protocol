# Hakky Protocol — Off-chain services (the "framework")

The on-chain contracts define the rules; these services make the protocol *run*.
They screen deposits, publish proof-of-reserves, orchestrate mint/redeem, and serve
the public data the website and partners read.

> **Status:** demo mode is the default. A fail-closed mainnet configuration exists
> for a maximum one-BTC pilot, but it is not launch approval and has not been
> deployed. See [`../docs/LIVE_PILOT.md`](../docs/LIVE_PILOT.md).

## Services

| Service | Kind | Responsibility |
| --- | --- | --- |
| [`shared`](src/shared/) | lib | Config, logger, Postgres pool, ethers client + contract ABIs. Imported by all services. |
| [`api`](src/api/server.ts) | HTTP | Public **read** API: `/proof-of-reserves`, `/attestation/:address`, `/health`. What the site reads. |
| [`attestation-service`](src/attestation/worker.ts) | worker + HTTP | Demo screening or an explicit manual-evidence verdict, then writes an attestation. `POST /screen`. |
| [`reserve-oracle`](src/reserve-oracle/cron.ts) | cron | Demo balance or safe confirmed UTXOs from a Bitcoin Core custody wallet, then publishes `reserveSats` + report. |
| [`orchestrator`](src/orchestrator/worker.ts) | worker + HTTP | Verifies confirmed custody outpoints before mint; durably indexes redemptions; verifies exact outbound Bitcoin payouts before settlement. |

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

## Safety modes

- `OPERATING_MODE=demo` permits stubs and a shared development signer.
- `OPERATING_MODE=live` refuses to start unless configured for Ethereum
  mainnet, Bitcoin mainnet/Core, at least six Bitcoin confirmations, at least
  twelve EVM confirmations, manual verified redemptions, non-stub screening,
  authenticated writes, and a dedicated signer for each write service.
- The orchestrator never creates or broadcasts a Bitcoin transaction. An
  operator or custody system pays the exact requested address and amount; only
  then can the service verify and settle it.

The custody balance deliberately counts only safe, confirmed UTXOs at
`BITCOIN_CUSTODY_ADDRESS`. Wallet coin selection must return change to that
same controlled address or the reserve report will decrease accordingly.

## Run locally (demo/testnet)

```bash
cd services
cp .env.example .env          # fill RPC + deployed contract addresses
npm install
npm test
npm run typecheck
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

Services read addresses from env (`.env`), populated from the deployment
manifest. The committed Sepolia manifest is marked `legacy` and is incompatible
with the one-BTC pilot ABI; deploy a new stack before running these services
against a public chain.

## Write endpoints

Every write/operator endpoint requires `Authorization: Bearer
<WRITE_API_KEY>`.

- `POST /screen` publishes an explicit screening verdict.
- `POST /deposit` accepts `to`, `btcTxid`, `vout`, and
  `screeningEvidenceURI`. In Bitcoin Core mode, the amount is derived from the
  confirmed custody output and cannot be supplied by the caller.
- `GET /redemptions/pending` lists indexed, actionable redemptions.
- `POST /redemptions/:id/settle` accepts a Bitcoin `btcTxid`, verifies the
  exact confirmed outbound wallet payment, and records settlement on-chain.
