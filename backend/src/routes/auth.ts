import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import type { AppEnv } from "../env";
import { createSession, destroySession, hashPassword, rateLimit, requireUser, verifyPassword } from "../lib/auth";
import { privateUser } from "../lib/serialize";
import { newId, randomToken } from "../lib/util";
import { body } from "../lib/validate";

const DEFAULT_GOOGLE_CLIENT_ID = "994822121085-m28q8e8mlvb1vudambms6ejlr3934l5o.apps.googleusercontent.com";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Ім'я надто коротке").max(80),
  email: z.string().trim().toLowerCase().email("Некоректний email").max(160),
  password: z.string().min(8, "Пароль має містити щонайменше 8 символів").max(200),
  ref: z.string().trim().max(40).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некоректний email"),
  password: z.string().min(1).max(200),
});

const googleAuthSchema = z
  .object({
    id_token: z.string().trim().optional(),
    credential: z.string().trim().optional(),
    idToken: z.string().trim().optional(),
    token: z.string().trim().optional(),
    ref: z.string().trim().max(40).optional(),
  })
  .refine((data) => !!(data.id_token || data.credential || data.idToken || data.token), {
    message: "Потрібно передати id_token або credential",
  });

export const authRoutes = new Hono<AppEnv>()
  .post("/register", async (c) => {
    const input = await body(c, registerSchema);
    const db = getDb(c.env.DB);
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    if (!(await rateLimit(db, `register:${ip}`, 10, 60 * 60 * 1000))) return c.json({ error: "Забагато спроб. Спробуйте пізніше." }, 429);

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing[0]) return c.json({ error: "Акаунт з таким email вже існує." }, 409);

    let referredBy: string | null = null;
    if (input.ref) {
      const r = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, input.ref)).limit(1);
      referredBy = r[0]?.id ?? null;
    }
    const admins = (c.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const id = newId("u_");
    await db.insert(users).values({
      id,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      role: admins.includes(input.email) ? "admin" : "user",
      referralCode: randomToken(6).replace(/[-_]/g, "x").slice(0, 8),
      referredBy,
      createdAt: Date.now(),
    });
    await createSession(c, id);
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return c.json({ user: privateUser(u) }, 201);
  })
  .post("/login", async (c) => {
    const input = await body(c, loginSchema);
    const db = getDb(c.env.DB);
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    const okIp = await rateLimit(db, `login-ip:${ip}`, 30, 15 * 60 * 1000);
    const okEmail = await rateLimit(db, `login:${input.email}`, 8, 15 * 60 * 1000);
    if (!okIp || !okEmail) return c.json({ error: "Забагато спроб входу. Зачекайте 15 хвилин." }, 429);

    const [u] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const valid = await verifyPassword(input.password, u?.passwordHash ?? null);
    if (!u || !valid) return c.json({ error: "Невірний email або пароль." }, 401);
    if (u.isBlocked) return c.json({ error: "Акаунт заблоковано модератором." }, 403);
    await createSession(c, u.id);
    return c.json({ user: privateUser(u) });
  })
  .post("/google", async (c) => {
    const input = await body(c, googleAuthSchema);
    const token = input.id_token || input.credential || input.idToken || input.token;
    if (!token) return c.json({ error: "Потрібно передати id_token або credential." }, 400);

    const db = getDb(c.env.DB);
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    const okIp = await rateLimit(db, `login-ip:${ip}`, 30, 15 * 60 * 1000);
    if (!okIp) return c.json({ error: "Забагато спроб входу. Зачекайте 15 хвилин." }, 429);

    const clientId = c.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
    let payload;
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error("Google token verification failed:", err);
      return c.json({ error: "Недійсний Google токен авторизації." }, 401);
    }

    if (!payload || !payload.email) {
      return c.json({ error: "Не вдалося отримати email з Google токена." }, 400);
    }

    const email = payload.email.trim().toLowerCase();

    let [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (u) {
      if (u.isBlocked) return c.json({ error: "Акаунт заблоковано модератором." }, 403);
    } else {
      let referredBy: string | null = null;
      if (input.ref) {
        const r = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, input.ref)).limit(1);
        referredBy = r[0]?.id ?? null;
      }
      const admins = (c.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const id = newId("u_");
      const name = (payload.name?.trim() || email.split("@")[0] || "Користувач").slice(0, 80);

      await db.insert(users).values({
        id,
        email,
        passwordHash: null,
        name,
        role: admins.includes(email) ? "admin" : "user",
        referralCode: randomToken(6).replace(/[-_]/g, "x").slice(0, 8),
        referredBy,
        createdAt: Date.now(),
      });

      const [created] = await db.select().from(users).where(eq(users.id, id));
      u = created;
    }

    await createSession(c, u.id);
    return c.json({ user: privateUser(u) });
  })
  .post("/logout", async (c) => {
    await destroySession(c);
    return c.json({ ok: true });
  })
  .get("/me", (c) => {
    const u = c.get("user");
    return c.json({ user: u ? privateUser(u) : null });
  })
  .post("/password", async (c) => {
    const u = requireUser(c);
    const input = await body(c, z.object({ current: z.string().min(1), next: z.string().min(8, "Мінімум 8 символів").max(200) }));
    if (!(await verifyPassword(input.current, u.passwordHash))) return c.json({ error: "Поточний пароль невірний." }, 400);
    await getDb(c.env.DB).update(users).set({ passwordHash: await hashPassword(input.next) }).where(eq(users.id, u.id));
    return c.json({ ok: true });
  });
