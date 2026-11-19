# Volunteerhub

**Volunteerhub** is a Ukrainian platform that connects fundraisers (volunteers and organizers) with people who want to support them. Supporters can discover campaigns, check them, and see what happened to the money afterwards.

> Mission: make every important fundraiser visible, trustworthy and accessible, regardless of who started it.

🌐 **Live prototype:** https://volunteerhub.ivan-antonenko.workers.dev (see [Deployed prototype](#12-deployed-prototype))

---

## 1. What Volunteerhub is

A modern web app (UI in Ukrainian) where:

- **organizers** publish campaigns, connect their own **Monobank Jar**, post updates and spending reports;
- **supporters** browse, search, follow and share campaigns, earn **Impact XP** for participation and join community challenges;
- **moderators** review campaigns, verify organizers and handle reports.

**Volunteerhub is not a payment processor.** Donations never pass through the platform. The "Donate" button redirects to the organizer's official `send.monobank.ua/jar/…` page.

## 2. The problem it solves

| Problem | What Volunteerhub does |
|---|---|
| **Discovery.** Campaigns are scattered across Telegram, Instagram and Facebook. | One catalog with search, categories, filters and sorting. |
| **Inequality.** Volunteers without an audience get no visibility. | **Fair discovery**: a rule-based ranking that boosts new, low-exposure, verified and urgent campaigns, plus homepage rows "Нові збори", "Потребують уваги", "Майже зібрано" and "Рекомендовано для вас". |
| **Transparency.** Donors don't know how money was spent. | Verification badges shown **only when a check actually happened**, a transparency timeline, budgets, documents, updates and final reports. |

## 3. Main features

- **Public site:** landing page, catalog (search, 8 categories, verified/urgent/status/city filters, 6 sort modes), campaign pages, organizer profiles, communities, pricing, corporate page, transparency page, and a separate "support the platform" page.
- **Auth:** email + password registration, login and logout. Server-side sessions in an HttpOnly cookie, profile management, password change, protected dashboard routes, and roles (user/admin).
- **Campaign wizard (5 steps):** about → goal and budget → Monobank Jar → documents → preview and submit. Drafts are saved on every step.
- **Campaign lifecycle:** `draft → pending → active → goal_reached → completed`, plus `rejected`.
- **Monobank Jar:** strict URL validation (host must be `send.monobank.ua`, path `/jar/<id>`), normalized storage and a safe server-side redirect. Organizers can connect the jar through the **official Monobank personal API** (their own read-only token from api.monobank.ua): we register a webhook, count each incoming payment once, and label the amount "Наживо з банки Monobank". A cron poll is the fallback if the webhook stops. Unconnected campaigns show **organizer-reported** amounts, labelled as such.
- **Organizer dashboard:** my campaigns, stats (unique views per day, followers, shares, referred visitors, clicks to the jar), progress updates, updates/purchases/final reports with receipts, attachments.
- **Supporter dashboard:** followed and saved campaigns, recent updates, personal impact stats, level, XP history, weekly missions, achievements, communities and challenges.
- **Trust:** identity verification via a **private** document upload (owner and admins only), purpose review on approval, jar verification by a moderator, and a "report submitted" badge. Content reports.
- **Gamification:** Impact XP with a unique ledger, so the same action can't be farmed. Five levels (Explorer → Impact Leader), 8 achievements, weekly missions, community and platform challenges, and monthly leaderboards based on participation, never money.
- **Admin dashboard:** moderation queue (approve/reject with reason), jar verification, identity verification requests, reported campaigns, user management (roles, blocking).
- **Monetization structure:** Free / Pro (799 ₴, experimental) / Corporate plans. A `users.plan` column exists for future gating. Billing is intentionally **not** implemented. Plans never affect ranking or badges.
- **Demo data:** 12 fictional campaigns, 5 organizers and 3 communities, all marked **«Демо»**. Demo organizers can't sign in, demo campaigns have no jar and carry no verification badges.

## 4. Technology stack

| Layer | Technology |
|---|---|
| Frontend | **Next.js 16** (App Router, static export), **React 19**, **TypeScript**, **Tailwind CSS 4**, shadcn/ui-style components (in-repo, CVA + tailwind-merge), **Lucide** icons, Inter + Manrope (Cyrillic) |
| Backend | **Hono** (TypeScript) on **Cloudflare Workers**, **Zod** validation, **Drizzle ORM** |
| Database | **Cloudflare D1** (managed SQLite) with Drizzle migrations |
| File storage | Inline in D1 for the MVP (small size limits). Switches to **Cloudflare R2** (S3-compatible) as soon as an `UPLOADS` bucket is bound |
| Auth | Email + password (PBKDF2-SHA256, 100k iterations), random session tokens (only their SHA-256 is stored), HttpOnly + Secure + SameSite=Lax cookie, Origin check against CSRF, rate limiting |
| Hosting | One Cloudflare Worker serves both the API (`/api/*`) and the static frontend, with HTTPS on `*.workers.dev` |
| CI/CD | GitHub Actions: typecheck, unit tests, build, D1 migrations, deploy |

**Why this stack?** The brief preferred PostgreSQL, Render/Railway and Vercel. The project already had a Cloudflare account connected, which gives free managed hosting, HTTPS and a persistent database without extra providers. D1 is SQLite, so the schema in `backend/src/db/schema.ts` uses Drizzle's SQLite dialect. Moving to PostgreSQL later means switching Drizzle's dialect and connecting through Cloudflare Hyperdrive. The route code doesn't change.

## 5. Repository structure

```
volunteerhub/
├── backend/                 # API application (Hono + Drizzle, Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts         # app entry: middleware, /api routes, static frontend serving
│   │   ├── env.ts           # bindings & env var types
│   │   ├── db/schema.ts     # database models
│   │   ├── lib/             # auth, monobank, discovery, gamification, storage, plans…
│   │   └── routes/          # auth, me, campaigns, files, community, admin
│   ├── migrations/          # SQL migrations (generated by drizzle-kit)
│   ├── seed/build-seed.ts   # fictional demo data generator
│   ├── test/                # unit tests (vitest)
│   └── wrangler.toml        # LOCAL dev config (API only)
├── frontend/                # Next.js application
│   └── src/
│       ├── app/             # pages: /, /explore, /campaigns/[slug], /dashboard/*, /admin, …
│       ├── components/      # design system (ui/primitives.tsx) & product components
│       └── lib/             # API client, auth context, formatting, types
├── infra/
│   ├── cloudflare/wrangler.toml   # PRODUCTION deployment config (API + frontend)
│   ├── docker/                    # Dockerfiles for local development
│   ├── docker-compose.yml         # local stack: UI :3000 + API :8787
│   ├── scripts/                   # setup-local.sh, deploy.sh, make-admin.sh
│   └── .env.example               # all environment variables, documented
├── docs/user-feedback-report.md   # user testing kit & report template
├── .github/workflows/deploy.yml   # CI & deploy
└── README.md
```

## 6. Prerequisites

- **Node.js 22+** and npm 10+
- Git
- *(optional)* Docker Desktop, if you prefer running everything in containers
- *(for deployment only)* a Cloudflare account. The free plan is enough.

You do **not** need a database server: locally, Wrangler runs D1 as a SQLite file in `backend/.wrangler/`.

## 7. Environment variables

All variables are documented in [`infra/.env.example`](infra/.env.example).

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `ENVIRONMENT` | backend | no | `production` forces Secure cookies |
| `ALLOWED_ORIGINS` | backend | dev only | Extra origins allowed to send POST/PATCH (the Next dev server, `http://localhost:3000`) |
| `VISITOR_SALT` | backend secret | recommended | Random string used to hash IP + user agent for unique-view counting. No raw IPs are stored |
| `ADMIN_EMAILS` | backend secret | optional | Comma-separated emails that get the admin role when they register |
| `MONO_TOKEN_KEY` | backend secret | production | base64 of 32 random bytes (`openssl rand -base64 32`). Encrypts organizers' Monobank personal tokens for live jar totals. Changing it means organizers must reconnect |
| `PLATFORM_SUPPORT_JAR_URL` | backend var | optional | A **separate** Monobank jar for supporting the platform itself |
| `API_URL` | frontend (dev) | no | Where `next dev` proxies `/api` (default `http://localhost:8787`) |
| `CLOUDFLARE_API_TOKEN` | deploy | for deploy | Token with *Workers Scripts: Edit* and *D1: Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | deploy | for deploy | Your Cloudflare account ID |

Local backend values go in `backend/.dev.vars` (copy `backend/.dev.vars.example`). `backend/wrangler.toml` already sets the dev defaults, so this file is optional.

## 8. How to start the project locally

```bash
git clone https://github.com/FourShrimp2032/VolunteerHub.git
cd VolunteerHub
bash infra/scripts/setup-local.sh      # installs deps, creates the local DB, loads demo data
```

Then, in two terminals:

```bash
cd backend && npm run dev              # API → http://localhost:8787/api/health
cd frontend && npm run dev             # UI  → http://localhost:3000
```

Open http://localhost:3000, click **Увійти → Зареєструватися**, and create an account.

**With Docker instead:**

```bash
docker compose -f infra/docker-compose.yml up --build
# UI → http://localhost:3000, API → http://localhost:8787
```

## 9. Running the frontend and backend

| Command | Directory | What it does |
|---|---|---|
| `npm run dev` | `backend/` | Runs the API on the local Workers runtime (port 8787) |
| `npm test` | `backend/` | Unit tests (Monobank validation, levels, fair discovery, upload sniffing) |
| `npm run typecheck` | `backend/`, `frontend/` | TypeScript checks |
| `npm run dev` | `frontend/` | Next.js dev server (port 3000), proxies `/api` to the backend |
| `npm run build` | `frontend/` | Static production build in `frontend/out/` |

**Run the production setup locally** (API + built frontend in one Worker, like on Cloudflare):

```bash
cd frontend && npm run build && cd ../backend
npx wrangler d1 migrations apply DB --local --config ../infra/cloudflare/wrangler.toml
npx wrangler dev --config ../infra/cloudflare/wrangler.toml   # → http://localhost:8787
```

**Become an admin locally:** register, then run `bash infra/scripts/make-admin.sh you@example.com` and sign in again.

## 10. Database setup

- Schema: [`backend/src/db/schema.ts`](backend/src/db/schema.ts) (Drizzle ORM).
- After changing the schema: `cd backend && npm run db:generate` creates a new SQL file in `backend/migrations/`.
- Apply migrations locally: `npm run db:migrate:local`. In production they're applied automatically by the deploy script (`wrangler d1 migrations apply DB --remote`).
- Demo data: `npm run db:seed:local`. In production, demo data is loaded once, only if the database has no demo campaigns yet.
- Reset the local DB: delete `backend/.wrangler/` and run `setup-local.sh` again.

## 11. Deployment

Production is **one Cloudflare Worker** (`infra/cloudflare/wrangler.toml`) that serves the API under `/api` and the statically exported Next.js app. Data lives in the D1 database `volunteerhub-db`.

**Automatic (GitHub Actions):** every push to `main` runs `.github/workflows/deploy.yml`: typecheck → tests → build → migrate → deploy → live smoke test. Pushes to other branches and pull requests only run typecheck, tests and build; *Actions → CI & Deploy → Run workflow* can deploy a branch by hand. Only one deploy runs at a time. Add these repository secrets under *Settings → Secrets and variables → Actions*:

- `CLOUDFLARE_API_TOKEN`: create it in Cloudflare → *My Profile → API Tokens* from the **Edit Cloudflare Workers** template, and add **Account → D1 → Edit**
- `CLOUDFLARE_ACCOUNT_ID`
- optional: `VISITOR_SALT`, `ADMIN_EMAILS`, `MONO_TOKEN_KEY`

**Manual:**

```bash
cd frontend && npm ci && npm run build && cd ../backend && npm ci && cd ..
export CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=…
bash infra/scripts/deploy.sh
```

**Deploying to your own account:** create a D1 database (`npx wrangler d1 create volunteerhub-db`) and put its ID in `infra/cloudflare/wrangler.toml`.

**Optional R2 uploads:** enable R2 in the Cloudflare dashboard, create the bucket `volunteerhub-uploads` and uncomment the `[[r2_buckets]]` block. New uploads then go to R2 automatically.

## 12. Deployed prototype

- **URL:** https://volunteerhub.ivan-antonenko.workers.dev
- **Health check:** `/api/health` (shows that the database is connected)
- The live deployment is checked after every deploy by the `smoke-test` job in GitHub Actions (`infra/e2e/smoke.cjs`): it registers, creates a campaign through the wizard, approves it as admin, follows it as another user, logs out, then deletes its test data.
- Register a new account to try the organizer and supporter flows. Campaigns you create appear publicly after an admin approves them in `/admin`.

## What is not connected yet (by design)

| Feature | Status |
|---|---|
| Automatic Monobank balance sync | Works per organizer through their personal API token and webhook. Monobank recommends its corporate (provider) API for services that process client data on their own servers; moving to it needs an agreement with Monobank. |
| Subscription billing (Pro/Corporate) | Plan structure and pricing page only. |
| Platform support jar | Shown on `/support` once `PLATFORM_SUPPORT_JAR_URL` is set. Until then the page says it isn't connected. |
| Email notifications | "Updates" are shown in the supporter dashboard. No emails are sent yet. |
| Corporate workspaces | Communities of type "Компанія" already exist. The data model (`communities`, `community_members`, `challenges`) is ready to be extended into paid workspaces. |
| R2 storage | Optional. Uploads are stored in D1 with size limits until R2 is enabled. |

## Security notes

- Passwords hashed with PBKDF2-SHA256. Session tokens are stored only as SHA-256 hashes.
- HttpOnly, Secure, SameSite=Lax cookies, an Origin check on state-changing requests, and rate limits on login, registration, uploads, reports and shares.
- All input validated with Zod. Uploads checked by magic bytes (JPEG/PNG/WebP/PDF only) and size-limited. Files are served with `nosniff` and a sandboxing CSP.
- Verification documents are stored as **private** files, readable only by their owner and admins. They are separate from public campaign attachments.
- Donation redirects re-validate the jar URL server-side, so they can't become an open redirect. Outbound links use `noopener noreferrer`.
- Secrets live only in Worker secrets and GitHub Actions secrets, never in the repository.

## User feedback

The testing kit and report template are in [`docs/user-feedback-report.md`](docs/user-feedback-report.md). No user testing has been done yet.
