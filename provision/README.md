# Provisioning — deploy Hakky services to a server

One command turns a fresh **Ubuntu 24.04** box (e.g. Hetzner CPX22) into a running
Hakky node: Docker + the API + Caddy (auto-HTTPS).

## Deploy

SSH into the server (or use the Hetzner **Console**) as root, then:

```bash
curl -fsSL https://raw.githubusercontent.com/antihakkysack/hakky-protocol/main/provision/setup.sh | bash
```

That installs Docker, clones the repo to `/opt/hakky`, writes `services/.env`
(Sepolia testnet defaults), and launches the stack. The read API comes up on
`http://<server-ip>:8080`.

## HTTPS at api.hakky.xyz

Add one DNS record at your registrar:

| Type | Name | Value |
| --- | --- | --- |
| A | `api` | `<server-ip>` |

Caddy provisions a Let's Encrypt certificate automatically once it resolves —
then `https://api.hakky.xyz/proof-of-reserves` is live.

## Update / redeploy

Re-run the same one-liner (it pulls latest and rebuilds), or:

```bash
cd /opt/hakky && git pull && cd provision && docker compose up -d --build
```

## Configure contract addresses

After deploying the contracts to Sepolia, edit `/opt/hakky/services/.env` and set
the `ADDR_*` values, then `docker compose up -d` in `provision/` to pick them up.
`/proof-of-reserves` and `/attestation/:address` return `503 not configured`
until then; `/health` works immediately.

## What's running

```
Caddy (:80/:443, auto-HTTPS)  ──▶  api (:8080, read-only)  ──▶  Sepolia RPC
                                   postgres (internal, audit log)
```
