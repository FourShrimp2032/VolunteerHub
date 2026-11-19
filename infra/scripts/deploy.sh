#!/usr/bin/env bash
# Deploys Volunteerhub (API + static frontend) to Cloudflare Workers.
# Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID. Optional: VISITOR_SALT, ADMIN_EMAILS, MONO_TOKEN_KEY.
# Expects frontend/out to exist (run `npm run build` in frontend/ first) and backend deps installed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="$ROOT/infra/cloudflare/wrangler.toml"
WRANGLER="$ROOT/backend/node_modules/.bin/wrangler"

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
[ -d "$ROOT/frontend/out" ] || { echo "frontend/out is missing — build the frontend first"; exit 1; }

echo "→ Applying database migrations"
"$WRANGLER" d1 migrations apply DB --remote --config "$CONFIG"

echo "→ Seeding demo data (only into an empty database)"
COUNT=$("$WRANGLER" d1 execute DB --remote --config "$CONFIG" --json --command "SELECT count(*) AS n FROM campaigns WHERE is_demo = 1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[0].results[0].n)}catch{console.log(-1)}})')
if [ "$COUNT" = "0" ]; then
  (cd "$ROOT/backend" && npx tsx seed/build-seed.ts > seed/demo.sql)
  "$WRANGLER" d1 execute DB --remote --config "$CONFIG" --file "$ROOT/backend/seed/demo.sql"
else
  echo "  demo data present ($COUNT campaigns) — skipping"
fi

echo "→ Deploying Worker"
"$WRANGLER" deploy --config "$CONFIG"

SECRETS=$(mktemp)
node -e 'const o={};for(const k of ["VISITOR_SALT","ADMIN_EMAILS","MONO_TOKEN_KEY"]) if(process.env[k]) o[k]=process.env[k]; console.log(JSON.stringify(o))' > "$SECRETS"
if [ "$(cat "$SECRETS")" != "{}" ]; then
  echo "→ Updating Worker secrets"
  "$WRANGLER" secret bulk "$SECRETS" --config "$CONFIG"
fi
rm -f "$SECRETS"
echo "✓ Deployed"
