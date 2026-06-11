#!/usr/bin/env bash
# Build and push dunfeyhotel.com to the VPS (Coolify box, Hetzner hel1).
# The container `dunfeyhotel` (nginx:1.27-alpine, coolify network, Traefik
# labels for dunfeyhotel.com / www / dunfey.reality2713.com) serves
# /data/sites/dunfeyhotel/dist read-only; deploy = rsync.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="root@89.167.18.137"
KEY="$HOME/.ssh/coolify_realitycheck_key"
DEST="/data/sites/dunfeyhotel/dist/"

if [[ "${1:-}" != "--no-build" ]]; then
  npm run etl:fetch
  npm run etl:normalize
  npm run build
fi

rsync -az --delete -e "ssh -i $KEY" dist/ "$HOST:$DEST"
echo "deployed → https://dunfeyhotel.com"
