/**
 * Volunteerhub API — a Hono application running on Cloudflare Workers.
 *
 * All API endpoints live under /api. In production the same Worker also serves
 * the statically exported Next.js frontend (see infra/cloudflare/wrangler.toml),
 * so the browser talks to the API on the same origin with an HttpOnly cookie.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { getDb } from "./db/client";
import type { AppEnv, Env } from "./env";
import { handleWebhook, pollConnections } from "./lib/monobank-live";
import { originGuard, sessionMiddleware } from "./lib/auth";
import { CATEGORIES } from "./lib/constants";
import { ACHIEVEMENTS, LEVELS, XP_RULES } from "./lib/gamification";
import { parseJarUrl } from "./lib/monobank";
import { PLANS } from "./lib/plans";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { campaignRoutes } from "./routes/campaigns";
import { challengeRoutes, communityRoutes, organizerRoutes } from "./routes/community";
import { fileRoutes } from "./routes/files";
import { meRoutes } from "./routes/me";

const api = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    const self = new URL(c.req.url).origin;
    const allowed = new Set([
      self,
      "http://localhost:3000",
      "http://localhost:5173",
      ...(c.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    ]);
    return cors({
      origin: (origin) => (allowed.has(origin) ? origin : null),
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })(c, next);
  })
  .use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }))
  .use("*", originGuard)
  .use("*", sessionMiddleware)
  .use("*", async (c, next) => {
    await next();
    if (!c.res.headers.has("Cache-Control")) c.res.headers.set("Cache-Control", "no-store");
  })
  .get("/health", async (c) => {
    const r = await c.env.DB.prepare("select count(*) as n from users").first<{ n: number }>();
    return c.json({ ok: true, db: "connected", users: r?.n ?? 0, time: new Date().toISOString() });
  })
  .get("/meta", (c) => {
    const support = c.env.PLATFORM_SUPPORT_JAR_URL ? parseJarUrl(c.env.PLATFORM_SUPPORT_JAR_URL) : null;
    return c.json({
      categories: CATEGORIES,
      levels: LEVELS,
      achievements: ACHIEVEMENTS,
      xpRules: XP_RULES,
      plans: PLANS,
      platformSupportUrl: support && support.ok ? support.url : null,
    });
  })
  .post("/jar/validate", async (c) => {
    const { url } = (await c.req.json().catch(() => ({}))) as { url?: string };
    const r = parseJarUrl(String(url ?? ""));
    return c.json(r, r.ok ? 200 : 400);
  })
  .route("/auth", authRoutes)
  .route("/me", meRoutes)
  .route("/campaigns", campaignRoutes)
  .route("/files", fileRoutes)
  .route("/organizers", organizerRoutes)
  .route("/communities", communityRoutes)
  .route("/challenges", challengeRoutes)
  .route("/admin", adminRoutes)
  // Monobank webhook (see lib/monobank-live.ts). GET is Monobank's URL check and must answer 200.
  .get("/monobank/webhook/:secret", (c) => c.text("ok"))
  .post("/monobank/webhook/:secret", async (c) => {
    const payload = await c.req.json().catch(() => null);
    const known = await handleWebhook(getDb(c.env.DB), c.req.param("secret"), payload);
    return known ? c.text("ok") : c.text("unknown", 404);
  })
  .notFound((c) => c.json({ error: "Не знайдено." }, 404));

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Внутрішня помилка сервера." }, 500);
});

app.route("/api", api);

/**
 * Static frontend. Dynamic pages are exported once with a "_" placeholder
 * (e.g. /campaigns/_) and read the real slug from the URL in the browser.
 */
const DYNAMIC_PREFIXES = ["campaigns", "organizers", "communities"];

app.all("*", async (c) => {
  if (!c.env.ASSETS) return c.text("Frontend is served by `next dev` in local development (http://localhost:3000).", 404);
  const url = new URL(c.req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // `/communities/__next._tree.txt` etc. belong to the static index page, not to a slug.
  if (parts.length >= 2 && DYNAMIC_PREFIXES.includes(parts[0]) && parts[1] !== "_" && !parts[1].startsWith("__next.")) {
    // Client-side navigation asks for RSC payloads (/campaigns/<slug>/__next._tree.txt?_rsc=…).
    // The exported payload belongs to the "_" placeholder, and its params don't match the real
    // URL, so the router hangs or renders a blank page. Answering 404 makes Next.js fall back
    // to a full page load, which serves the placeholder HTML below and always works.
    const isRsc = url.searchParams.has("_rsc") || c.req.header("rsc") === "1" || parts.length > 2 || parts[1].endsWith(".txt");
    if (isRsc) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    url.pathname = ["", parts[0], "_"].join("/");
    const res = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
    return new Response(res.body, res);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  /** Cron (see infra/cloudflare/wrangler.toml): fallback poll of connected Monobank jars. */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(pollConnections(getDb(env.DB), env).then((r) => console.log("monobank poll", r)));
  },
};
export type ApiType = typeof api;
