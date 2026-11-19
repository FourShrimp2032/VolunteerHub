/**
 * Best-effort jar totals WITHOUT an organizer token.
 *
 * The public jar page (send.monobank.ua/jar/<id>) loads its balance from an unauthenticated
 * endpoint. We read it the same way, a few times an hour per campaign, identifying ourselves
 * honestly in the User-Agent. It is undocumented, so any failure just keeps the last amount.
 * Campaigns connected through the official personal API (lib/monobank-live.ts) are skipped:
 * their webhook is faster and exact.
 *
 * Only the balance is visible here, and it drops when the organizer withdraws money, so the
 * total is only ever raised: raised = max(previous, balance).
 */
import { and, eq, inArray, isNotNull, isNull, lt, ne, or } from "drizzle-orm";
import type { DB } from "../db/client";
import { campaigns, type Campaign } from "../db/schema";

const HANDLER = "https://send.monobank.ua/api/handler";
const USER_AGENT = "VolunteerHub-jar-sync/1.0 (+https://volunteerhub.ivan-antonenko.workers.dev/transparency)";
const JAR_ID_RE = /^[A-Za-z0-9]{6,16}$/;
const POLL_STATUSES = ["active", "goal_reached"] as const;
/** How often one campaign's jar is read (cron) and how stale a page view may be before a refresh. */
export const PUBLIC_POLL_MS = 5 * 60_000;
export const PUBLIC_VIEW_STALE_MS = 2 * 60_000;

/** Response of the public handler → balance in whole hryvnias. null if the shape is unexpected. */
export function parsePublicJar(data: unknown): { balance: number; status: string } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.clientType !== "jar" || typeof d.jarAmount !== "number" || !Number.isFinite(d.jarAmount) || d.jarAmount < 0) return null;
  return { balance: Math.floor(d.jarAmount / 100), status: typeof d.jarStatus === "string" ? d.jarStatus : "UNKNOWN" };
}

export async function fetchPublicJar(jarId: string) {
  if (!JAR_ID_RE.test(jarId)) return null;
  try {
    const res = await fetch(HANDLER, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "user-agent": USER_AGENT },
      body: JSON.stringify({ c: "hello", clientId: jarId, Pc: crypto.randomUUID() }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return null;
    return parsePublicJar(await res.json());
  } catch {
    return null;
  }
}

/** Token-less polling applies to published, non-demo campaigns with a jar that aren't connected via the personal API. */
export function canPollPublic(c: Pick<Campaign, "jarId" | "isDemo" | "status" | "monoConnectionId">) {
  return !!c.jarId && !c.isDemo && !c.monoConnectionId && (POLL_STATUSES as readonly string[]).includes(c.status);
}

/** Reads one jar and raises the campaign's total if the balance is higher. Returns the (possibly) updated campaign. */
export async function pollPublicJar(db: DB, camp: Campaign): Promise<Campaign> {
  if (!canPollPublic(camp)) return camp;
  const jar = await fetchPublicJar(camp.jarId!);
  if (!jar) return camp;
  const now = Date.now();
  const amount = Math.max(camp.raisedAmount, jar.balance);
  const patch: Partial<Campaign> = { raisedAmount: amount, raisedUpdatedAt: now, raisedSource: "jar_public" };
  if (amount !== camp.raisedAmount) patch.updatedAt = now;
  if (camp.status === "active" && camp.goalAmount > 0 && amount >= camp.goalAmount) {
    patch.status = "goal_reached";
    patch.goalReachedAt = now;
  }
  await db.update(campaigns).set(patch).where(eq(campaigns.id, camp.id));
  return { ...camp, ...patch };
}

/** Cron: read the jars that are due, oldest first, one at a time (gentle on Monobank). */
export async function pollPublicJars(db: DB, { limit = 30 } = {}) {
  const cutoff = Date.now() - PUBLIC_POLL_MS + 30_000; // a little slack so a 5-minute cron doesn't skip every other run
  const due = await db
    .select()
    .from(campaigns)
    .where(
      and(
        isNotNull(campaigns.jarId),
        eq(campaigns.isDemo, false),
        isNull(campaigns.monoConnectionId),
        inArray(campaigns.status, [...POLL_STATUSES]),
        or(isNull(campaigns.raisedUpdatedAt), lt(campaigns.raisedUpdatedAt, cutoff), ne(campaigns.raisedSource, "jar_public")),
      ),
    )
    .orderBy(campaigns.raisedUpdatedAt)
    .limit(limit);
  let read = 0;
  for (const camp of due) {
    const next = await pollPublicJar(db, camp);
    if (next.raisedSource === "jar_public" && next.raisedUpdatedAt !== camp.raisedUpdatedAt) read++;
  }
  return { due: due.length, read };
}
