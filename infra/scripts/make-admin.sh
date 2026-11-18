#!/usr/bin/env bash
# Grants the admin role to an existing account.
#   Local:      bash infra/scripts/make-admin.sh you@example.com
#   Production: bash infra/scripts/make-admin.sh you@example.com --remote
set -euo pipefail
EMAIL="${1:?Usage: make-admin.sh <email> [--remote]}"
MODE="${2:---local}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
case "$EMAIL" in *\'*) echo "invalid email"; exit 1;; esac
if [ "$MODE" = "--remote" ]; then CONFIG="$ROOT/infra/cloudflare/wrangler.toml"; else CONFIG="$ROOT/backend/wrangler.toml"; fi
cd "$ROOT/backend"
npx wrangler d1 execute DB "$MODE" --config "$CONFIG" --command "UPDATE users SET role = 'admin' WHERE email = lower('$EMAIL')"
echo "Done. Sign out and back in to see the admin panel."
