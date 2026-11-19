/**
 * Live jar totals through the OFFICIAL Monobank personal API (https://api.monobank.ua/docs/).
 *
 * The organizer creates a personal token at api.monobank.ua and connects it to a campaign.
 *  - GET  /personal/client-info lists their jars with balances (max once per 60 s per token).
 *    Finding the campaign's jar there also proves the jar belongs to the token owner.
 *  - POST /personal/webhook registers our URL. Monobank first sends a GET that must get 200,
 *    then POSTs {type:"StatementItem", data:{account, statementItem}} on every balance change,
 *    expecting 200 within 5 s (retries after 60 s and 600 s, then disables the webhook).
 *
 * "Raised" is the sum of incoming payments, not the jar balance, because the balance drops
 * when the organizer withdraws money to buy things. Webhook top-ups are counted once per
 * statement id; the cron poll only ever raises the total to at least the current balance,
 * which catches events missed while the webhook was down.
 *
 * Tokens are encrypted at rest with MONO_TOKEN_KEY (AES-GCM) and never returned to clients.
 */
import { and, eq, inArray, isNotNull, lt, or, isNull } from "drizzle-orm";
import type { DB } from "../db/client";
import { totalRaised } from "./discovery";
import { campaigns, monobankConnections, monobankEvents, type Campaign, type MonobankConnection } from "../db/schema";
import type { Env } from "../env";
import { newId, randomToken } from "./util";

const API = "https://api.monobank.ua";
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;
/** Campaign statuses whose total keeps moving. */
const LIVE_STATUSES = ["draft", "pending", "active", "goal_reached"] as const;

export class MonoError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

// ------------------------------------------------------------------ parsing

export type MonoJar = { id: string; jarId: string; title: string; balance: number };

/** "jar/z6PK8H4hU" or "z6PK8H4hU" → "z6PK8H4hU" (the id in send.monobank.ua/jar/<id> links). */
export function sendIdToJarId(sendId: string): string {
  return sendId.replace(/^\/?jar\//, "");
}

export function parseClientInfo(data: unknown): { name: string; webHookUrl: string; jars: MonoJar[] } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const jars = Array.isArray(d.jars) ? d.jars : [];
  return {
    name: typeof d.name === "string" ? d.name : "",
    webHookUrl: typeof d.webHookUrl === "string" ? d.webHookUrl : "",
    jars: jars.flatMap((j) => {
      if (!j || typeof j !== "object") return [];
      const r = j as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.sendId !== "string" || typeof r.balance !== "number") return [];
      return [{ id: r.id, jarId: sendIdToJarId(r.sendId), title: typeof r.title === "string" ? r.title : "", balance: Math.max(0, Math.floor(r.balance / 100)) }];
    }),
  };
}

export type MonoEvent = { account: string; id: string; amount: number; balance: number; time: number };

/** Webhook body → event with whole-hryvnia amounts. null for anything that isn't a statement item. */
export function parseWebhookEvent(data: unknown): MonoEvent | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { type?: unknown; data?: { account?: unknown; statementItem?: Record<string, unknown> } };
  const item = d.data?.statementItem;
  if (d.type !== "StatementItem" || typeof d.data?.account !== "string" || !item) return null;
  if (typeof item.id !== "string" || typeof item.amount !== "number" || typeof item.balance !== "number" || typeof item.time !== "number") return null;
  return { account: d.data.account, id: item.id, amount: Math.trunc(item.amount / 100), balance: Math.max(0, Math.floor(item.balance / 100)), time: item.time * 1000 };
}

// ------------------------------------------------------------------ API client

async function call(token: string, path: string, init: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(API + path, { ...init, headers: { "X-Token": token, "content-type": "application/json", ...init.headers }, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new MonoError("Monobank зараз не відповідає. Спробуйте за хвилину.", 502);
  }
  if (res.status === 401 || res.status === 403) throw new MonoError("Monobank не прийняв токен. Перевірте, що скопіювали його повністю, або створіть новий.", 400);
  if (res.status === 429) throw new MonoError("Monobank дозволяє цей запит раз на хвилину. Спробуйте ще раз за 60 секунд.", 429);
  if (!res.ok) throw new MonoError(`Monobank повернув помилку (${res.status}). Спробуйте пізніше.`, 502);
  return res;
}

export async function monoClientInfo(token: string) {
  const info = parseClientInfo(await (await call(token, "/personal/client-info")).json().catch(() => null));
  if (!info) throw new MonoError("Неочікувана відповідь від Monobank.", 502);
  return info;
}

export async function monoSetWebhook(token: string, webHookUrl: string) {
  await call(token, "/personal/webhook", { method: "POST", body: JSON.stringify({ webHookUrl }) });
}

// ------------------------------------------------------------------ token encryption

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
// Local development only. Production refuses to run without a real key.
const DEV_KEY = "dm9sdW50ZWVyaHViLWxvY2FsLWRldi1rZXktMzJieXQ=";

async function aesKey(env: Env) {
  const raw = env.MONO_TOKEN_KEY || (env.ENVIRONMENT === "production" ? "" : DEV_KEY);
  if (!raw) throw new MonoError("Підключення Monobank ще не налаштоване на сервері.", 503);
  const bytes = unb64(raw);
  if (bytes.length !== 32) throw new MonoError("Підключення Monobank налаштоване неправильно.", 503);
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(env: Env, token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(env), new TextEncoder().encode(token)));
  return `${b64(iv)}.${b64(ct)}`;
}

export async function decryptToken(env: Env, enc: string) {
  const [iv, ct] = enc.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aesKey(env), unb64(ct));
  return new TextDecoder().decode(pt);
}

// ------------------------------------------------------------------ totals

/** Sets a new total for a campaign and flips it to goal_reached when the goal is met. */
async function setRaised(db: DB, camp: Campaign, amount: number) {
  const now = Date.now();
  const patch: Partial<Campaign> = { raisedAmount: amount, raisedUpdatedAt: now, raisedSource: "jar", updatedAt: now };
  if (camp.status === "active" && camp.goalAmount > 0 && totalRaised({ ...camp, raisedAmount: amount }) >= camp.goalAmount) {
    patch.status = "goal_reached";
    patch.goalReachedAt = now;
  }
  await db.update(campaigns).set(patch).where(eq(campaigns.id, camp.id));
  return { ...camp, ...patch };
}

async function linkedCampaigns(db: DB, connectionId: string, account?: string) {
  return db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.monoConnectionId, connectionId),
        inArray(campaigns.status, [...LIVE_STATUSES]),
        account ? eq(campaigns.monoJarAccount, account) : isNotNull(campaigns.monoJarAccount),
      ),
    );
}

// ------------------------------------------------------------------ connect / disconnect

export type ConnectionStatus = {
  connected: boolean;
  clientName?: string;
  webhookActive?: boolean;
  lastEventAt?: number | null;
  lastSyncAt?: number | null;
  lastError?: string | null;
};

export function connectionStatus(camp: Campaign, conn: MonobankConnection | null | undefined): ConnectionStatus {
  if (!conn || camp.monoConnectionId !== conn.id || !camp.monoJarAccount) return { connected: false };
  return { connected: true, clientName: conn.clientName, webhookActive: conn.webhookActive, lastEventAt: conn.lastEventAt, lastSyncAt: conn.lastSyncAt, lastError: conn.lastError };
}

export async function connectCampaign(db: DB, env: Env, opts: { userId: string; camp: Campaign; token: string; origin: string }) {
  const token = opts.token.trim();
  if (!TOKEN_RE.test(token)) throw new MonoError("Це не схоже на токен Monobank. Скопіюйте його з api.monobank.ua повністю.");
  if (!opts.camp.jarId) throw new MonoError("Спершу додайте до збору посилання на банку Monobank.");
  if (opts.camp.isDemo) throw new MonoError("Демо-збори не можна підключити до Monobank.");

  const info = await monoClientInfo(token);
  const jar = info.jars.find((j) => j.jarId === opts.camp.jarId);
  if (!jar) throw new MonoError("У цьому акаунті Monobank немає банки цього збору. Токен треба створити в тому акаунті, якому належить банка.");

  const now = Date.now();
  const tokenEnc = await encryptToken(env, token);
  let [conn] = await db.select().from(monobankConnections).where(eq(monobankConnections.userId, opts.userId)).limit(1);
  if (conn) {
    await db.update(monobankConnections).set({ tokenEnc, clientName: info.name, lastSyncAt: now, lastError: null, updatedAt: now }).where(eq(monobankConnections.id, conn.id));
  } else {
    const secret = randomToken(24);
    conn = { id: newId("mc_"), userId: opts.userId, tokenEnc, webhookSecret: secret, clientName: info.name, webhookUrl: null, webhookActive: false, lastSyncAt: now, lastEventAt: null, lastError: null, createdAt: now, updatedAt: now };
    await db.insert(monobankConnections).values(conn);
  }

  await db.update(campaigns).set({ monoConnectionId: conn.id, monoJarAccount: jar.id }).where(eq(campaigns.id, opts.camp.id));
  // Start from the current balance; past withdrawals before connecting can't be seen.
  await setRaised(db, { ...opts.camp, monoConnectionId: conn.id, monoJarAccount: jar.id }, Math.max(opts.camp.raisedAmount, jar.balance));

  // Register the webhook. Not fatal: the cron poll keeps totals fresh if this fails.
  const webhookUrl = `${opts.origin}/api/monobank/webhook/${conn.webhookSecret}`;
  let webhookActive = false;
  let lastError: string | null = null;
  try {
    await monoSetWebhook(token, webhookUrl);
    webhookActive = true;
  } catch (e) {
    lastError = e instanceof MonoError ? e.message : "Не вдалося встановити вебхук.";
  }
  await db.update(monobankConnections).set({ webhookUrl, webhookActive, lastError, updatedAt: Date.now() }).where(eq(monobankConnections.id, conn.id));
  return { jarTitle: jar.title, balance: jar.balance, webhookActive, previousWebhook: info.webHookUrl && info.webHookUrl !== webhookUrl ? info.webHookUrl : null };
}

export async function disconnectCampaign(db: DB, env: Env, camp: Campaign) {
  const connId = camp.monoConnectionId;
  await db.update(campaigns).set({ monoConnectionId: null, monoJarAccount: null, raisedSource: "organizer", updatedAt: Date.now() }).where(eq(campaigns.id, camp.id));
  if (!connId) return;
  const others = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.monoConnectionId, connId)).limit(1);
  if (others.length) return;
  // Last campaign on this token: forget the token and switch our webhook off (best effort).
  const [conn] = await db.select().from(monobankConnections).where(eq(monobankConnections.id, connId)).limit(1);
  if (!conn) return;
  try {
    await monoSetWebhook(await decryptToken(env, conn.tokenEnc), "");
  } catch {
    /* token may already be revoked */
  }
  await db.delete(monobankConnections).where(eq(monobankConnections.id, connId));
}

// ------------------------------------------------------------------ webhook + poll

/** Applies one webhook event. Returns false only for an unknown connection secret. */
export async function handleWebhook(db: DB, secret: string, body: unknown): Promise<boolean> {
  const [conn] = await db.select().from(monobankConnections).where(eq(monobankConnections.webhookSecret, secret)).limit(1);
  if (!conn) return false;
  await db.update(monobankConnections).set({ lastEventAt: Date.now(), webhookActive: true, lastError: null }).where(eq(monobankConnections.id, conn.id));
  const ev = parseWebhookEvent(body);
  if (!ev) return true;
  const linked = await linkedCampaigns(db, conn.id, ev.account);
  if (!linked.length) return true; // a card or another jar of the same person: ignore, store nothing

  let added = 0;
  if (ev.amount > 0) {
    const ins = await db
      .insert(monobankEvents)
      .values({ id: ev.id, connectionId: conn.id, account: ev.account, amount: ev.amount, time: ev.time })
      .onConflictDoNothing()
      .returning({ id: monobankEvents.id });
    if (ins.length) added = ev.amount;
  }
  for (const camp of linked) {
    const next = Math.max(camp.raisedAmount + added, ev.balance);
    if (next !== camp.raisedAmount || camp.raisedSource !== "jar") await setRaised(db, camp, next);
  }
  return true;
}

/** Cron fallback: refresh connections that are due (respecting Monobank's 60 s limit) and re-arm a dropped webhook. */
export async function pollConnections(db: DB, env: Env, { limit = 20 } = {}) {
  const now = Date.now();
  const conns = await db
    .select()
    .from(monobankConnections)
    .where(
      or(
        isNull(monobankConnections.lastSyncAt),
        // Webhook down: every run. Webhook healthy: a safety net every 15 minutes.
        and(eq(monobankConnections.webhookActive, false), lt(monobankConnections.lastSyncAt, now - 61_000)),
        lt(monobankConnections.lastSyncAt, now - 15 * 60_000),
      ),
    )
    .limit(limit);
  let synced = 0;
  for (const conn of conns) {
    const linked = await linkedCampaigns(db, conn.id);
    if (!linked.length) continue;
    try {
      const token = await decryptToken(env, conn.tokenEnc);
      const info = await monoClientInfo(token);
      for (const camp of linked) {
        const jar = info.jars.find((j) => j.id === camp.monoJarAccount);
        if (jar && (jar.balance > camp.raisedAmount || camp.raisedSource !== "jar")) await setRaised(db, camp, Math.max(camp.raisedAmount, jar.balance));
      }
      let webhookActive = conn.webhookActive;
      // Monobank switches the webhook off after 3 failed deliveries; re-arm it only if nothing else replaced it.
      if (conn.webhookUrl && !info.webHookUrl) {
        try {
          await monoSetWebhook(token, conn.webhookUrl);
          webhookActive = true;
        } catch {
          webhookActive = false;
        }
      } else if (conn.webhookUrl && info.webHookUrl !== conn.webhookUrl) {
        webhookActive = false; // the organizer pointed the webhook elsewhere; keep polling instead
      }
      await db.update(monobankConnections).set({ lastSyncAt: Date.now(), webhookActive, lastError: null }).where(eq(monobankConnections.id, conn.id));
      synced++;
    } catch (e) {
      await db
        .update(monobankConnections)
        .set({ lastSyncAt: Date.now(), lastError: e instanceof MonoError ? e.message : "Не вдалося оновити дані з Monobank." })
        .where(eq(monobankConnections.id, conn.id));
    }
  }
  return { checked: conns.length, synced };
}
