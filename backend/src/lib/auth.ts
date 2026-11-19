/**
 * Email + password authentication with server-side sessions.
 *
 * - Passwords: PBKDF2-SHA256 (100k iterations, 16-byte salt) via WebCrypto.
 * - Sessions: random 32-byte token in an HttpOnly, Secure, SameSite=Lax cookie.
 *   Only the SHA-256 of the token is stored in the database.
 */
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { DB } from "../db/client";
import { getDb } from "../db/client";
import { loginAttempts, sessions, users, type User } from "../db/schema";
import type { AppEnv } from "../env";
import { DAY } from "./constants";
import { randomToken, sha256Hex } from "./util";

export const SESSION_COOKIE = "vh_session";
const SESSION_TTL = 30 * DAY;
const ITERATIONS = 100_000;

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iter, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltB64 || !hashB64) return false;
  const hash = new Uint8Array(await pbkdf2(password, unb64(saltB64), Number(iter)));
  const expected = unb64(hashB64);
  if (hash.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ expected[i];
  return diff === 0;
}

function isSecure(c: Context<AppEnv>) {
  return c.env.ENVIRONMENT === "production" || new URL(c.req.url).protocol === "https:";
}

export async function createSession(c: Context<AppEnv>, userId: string) {
  const db = getDb(c.env.DB);
  const token = randomToken();
  const now = Date.now();
  await db.insert(sessions).values({ id: await sha256Hex(token), userId, expiresAt: now + SESSION_TTL, createdAt: now });
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL / 1000,
  });
}

export async function destroySession(c: Context<AppEnv>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await getDb(c.env.DB).delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: isSecure(c) });
}

/** Loads the current user (if any) into c.var.user. */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("user", null);
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const db = getDb(c.env.DB);
    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, await sha256Hex(token)), gt(sessions.expiresAt, Date.now())))
      .limit(1);
    if (rows[0] && !rows[0].user.isBlocked) c.set("user", rows[0].user);
  }
  await next();
};

export function requireUser(c: Context<AppEnv>): User {
  const u = c.get("user");
  if (!u) throw new HTTPException(401, { message: "Потрібно увійти в акаунт." });
  return u;
}

export function requireAdmin(c: Context<AppEnv>): User {
  const u = requireUser(c);
  if (u.role !== "admin") throw new HTTPException(403, { message: "Доступ лише для адміністраторів." });
  return u;
}

/**
 * CSRF protection for cookie-authenticated requests: state-changing requests
 * must come from our own origin (or an explicitly allowed dev origin).
 */
export const originGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    const self = new URL(c.req.url).origin;
    const allowed = new Set([
      self,
      "http://localhost:3000",
      "http://localhost:5173",
      ...(c.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    ]);
    if (origin && !allowed.has(origin)) throw new HTTPException(403, { message: "Запит з недозволеного джерела." });
  }
  await next();
};

/** Fixed-window rate limit stored in D1. Returns false when the limit is exceeded. */
export async function rateLimit(db: DB, key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const rows = await db
    .insert(loginAttempts)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [loginAttempts.key, loginAttempts.windowStart], set: { count: sql`${loginAttempts.count} + 1` } })
    .returning({ count: loginAttempts.count });
  return (rows[0]?.count ?? 1) <= limit;
}
