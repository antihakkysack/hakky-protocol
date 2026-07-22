#!/usr/bin/env bash
#
# Hakky Protocol — one-shot server provisioner (Ubuntu 24.04).
# Installs Docker, pulls the repo, and launches the stack (Postgres + API + Caddy).
# Idempotent: safe to re-run to update.
#
#   curl -fsSL https://raw.githubusercontent.com/antihakkysack/hakky-protocol/main/provision/setup.sh | bash
#
set -euo pipefail

REPO="https://github.com/antihakkysack/hakky-protocol.git"
DIR="/opt/hakky"

log() { echo -e "\n\033[1;36m[hakky]\033[0m $*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

log "Installing prerequisites…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git ufw

log "Configuring firewall (ssh, http, https, api)…"
ufw allow 22/tcp   || true
ufw allow 80/tcp   || true
ufw allow 443/tcp  || true
ufw allow 8080/tcp || true
yes | ufw enable    || true

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

log "Fetching the repo into ${DIR}…"
if [ -d "${DIR}/.git" ]; then
  git -C "${DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO}" "${DIR}"
fi

log "Writing config (services/.env)…"
cd "${DIR}/services"
if [ ! -f .env ]; then
  cp .env.example .env
  log "Created services/.env from the example (Sepolia testnet, read-only API)."
  log "Fill in ADDR_* contract addresses after deploying the contracts to Sepolia."
fi

log "Building and launching the stack…"
cd "${DIR}/provision"
docker compose up -d --build

log "Waiting for the API to come up…"
for i in $(seq 1 20); do
  if curl -fsS http://localhost:8080/health >/dev/null 2>&1; then break; fi
  sleep 3
done

echo
log "Status:"
docker compose ps
echo
log "Health check:"
curl -fsS http://localhost:8080/health || log "API not healthy yet — check: (cd ${DIR}/provision && docker compose logs api)"
echo
log "Done. The API is on http://<server-ip>:8080"
log "For HTTPS at api.hakky.xyz, point a DNS A record at this server; Caddy handles the cert."
