#!/usr/bin/env bash
# One-time local setup: install dependencies, create the local SQLite (D1) database and load demo data.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend" && npm install && npm run db:migrate:local && npm run db:seed:local
cd "$ROOT/frontend" && npm install
echo "✓ Ready. Start the API:  (cd backend && npm run dev)   and the UI:  (cd frontend && npm run dev)"
