/**
 * Volunteerhub API — a Hono application running on Cloudflare Workers.
 *
 * All API endpoints live under /api. In production the same Worker also serves
 * the statically exported Next.js frontend (see infra/cloudflare/wrangler.toml),
 * so the browser talks to the API on the same origin with an HttpOnly cookie.
 */
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./env";
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
  .use("*", secureHeaders({ crossOriginResourcePolicy: "same-origin" }))
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
  // Also covers Next.js RSC payloads, e.g. /campaigns/<slug>/__next._tree.txt
  if (parts.length >= 2 && DYNAMIC_PREFIXES.includes(parts[0]) && parts[1] !== "_") {
    url.pathname = ["", parts[0], "_", ...parts.slice(2)].join("/");
    const res = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
    return new Response(res.body, res);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
export type ApiType = typeof api;
