import { and, count, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getDb } from "../db/client";
import { campaigns, challengeParticipants, challenges, communities, communityMembers, users, xpEvents } from "../db/schema";
import type { AppEnv } from "../env";
import { rateLimit, requireUser } from "../lib/auth";
import { COMMUNITY_KINDS, DAY, PUBLIC_STATUSES } from "../lib/constants";
import { CHALLENGE_METRICS, awardXp, challengeProgress, evaluateProgress, memberLeaderboard, monthStart } from "../lib/gamification";
import { campaignCards, publicUser } from "../lib/serialize";
import { newId, slugify } from "../lib/util";
import { body } from "../lib/validate";

const metricKeys = Object.keys(CHALLENGE_METRICS) as [string, ...string[]];

async function withProgress(db: ReturnType<typeof getDb>, list: (typeof challenges.$inferSelect)[], userId?: string) {
  const joined = userId
    ? new Set((await db.select({ id: challengeParticipants.challengeId }).from(challengeParticipants).where(eq(challengeParticipants.userId, userId))).map((r) => r.id))
    : new Set<string>();
  const out = [];
  for (const ch of list) out.push({ ...ch, ...(await challengeProgress(db, ch)), joined: joined.has(ch.id), metricLabel: CHALLENGE_METRICS[ch.metric as keyof typeof CHALLENGE_METRICS] ?? ch.metric });
  return out;
}

export const organizerRoutes = new Hono<AppEnv>().get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const [u] = await db.select().from(users).where(eq(users.id, c.req.param("id"))).limit(1);
  if (!u || u.isBlocked) return c.json({ error: "Профіль не знайдено." }, 404);
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.organizerId, u.id), inArray(campaigns.status, [...PUBLIC_STATUSES])))
    .orderBy(desc(campaigns.publishedAt));
  const cards = await campaignCards(db, rows);
  return c.json({
    organizer: publicUser(u),
    campaigns: cards,
    stats: {
      campaigns: cards.length,
      active: cards.filter((x) => x.status === "active").length,
      completed: cards.filter((x) => x.status === "completed").length,
      reports: cards.filter((x) => x.verification.reportSubmitted).length,
      followers: cards.reduce((s, x) => s + x.followers, 0),
    },
  });
});

export const communityRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const list = await db.select().from(communities).orderBy(desc(communities.createdAt)).limit(100);
    const counts = await db.select({ id: communityMembers.communityId, n: count() }).from(communityMembers).groupBy(communityMembers.communityId);
    const cm = new Map(counts.map((r) => [r.id, r.n]));
    const mine = user
      ? new Set((await db.select({ id: communityMembers.communityId }).from(communityMembers).where(eq(communityMembers.userId, user.id))).map((r) => r.id))
      : new Set<string>();

    // Community leaderboard: participation XP of members this month (never money).
    const since = monthStart();
    const lb = await db
      .select({ id: communityMembers.communityId, xp: sql<number>`coalesce(sum(${xpEvents.xp}), 0)` })
      .from(communityMembers)
      .leftJoin(xpEvents, and(eq(xpEvents.userId, communityMembers.userId), gte(xpEvents.createdAt, since)))
      .groupBy(communityMembers.communityId);
    const lbm = new Map(lb.map((r) => [r.id, Number(r.xp)]));

    const now = Date.now();
    const global = await db
      .select()
      .from(challenges)
      .where(and(isNull(challenges.communityId), lt(challenges.startsAt, now), gte(challenges.endsAt, now)));

    return c.json({
      items: list.map((x) => ({ ...x, members: cm.get(x.id) ?? 0, monthXp: lbm.get(x.id) ?? 0, isMember: mine.has(x.id) })),
      leaderboard: list
        .map((x) => ({ id: x.id, slug: x.slug, name: x.name, kind: x.kind, members: cm.get(x.id) ?? 0, monthXp: lbm.get(x.id) ?? 0, isDemo: x.isDemo }))
        .sort((a, b) => b.monthXp - a.monthXp)
        .slice(0, 10),
      challenges: await withProgress(db, global, user?.id),
    });
  })
  .post("/", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const input = await body(
      c,
      z.object({
        name: z.string().trim().min(3, "Назва надто коротка").max(80),
        kind: z.enum(COMMUNITY_KINDS, { message: "Оберіть тип спільноти" }),
        description: z.string().trim().max(600).default(""),
      }),
    );
    if (!(await rateLimit(db, `community:${user.id}`, 3, DAY))) return c.json({ error: "Забагато нових спільнот за добу." }, 429);
    let slug = slugify(input.name);
    const [hit] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, slug));
    if (hit) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const id = newId("cm_");
    await db.insert(communities).values({ id, slug, name: input.name, kind: input.kind, description: input.description, createdBy: user.id, createdAt: Date.now() });
    await db.insert(communityMembers).values({ communityId: id, userId: user.id, role: "owner", joinedAt: Date.now() });
    await awardXp(db, user.id, "join_community", id);
    return c.json({ id, slug }, 201);
  })
  .get("/:slug", async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const [com] = await db.select().from(communities).where(eq(communities.slug, c.req.param("slug"))).limit(1);
    if (!com) return c.json({ error: "Спільноту не знайдено." }, 404);
    const members = await db
      .select({ userId: communityMembers.userId, role: communityMembers.role, joinedAt: communityMembers.joinedAt, name: users.name, xp: users.xp, isDemo: users.isDemo })
      .from(communityMembers)
      .innerJoin(users, eq(users.id, communityMembers.userId))
      .where(eq(communityMembers.communityId, com.id));
    const memberIds = members.map((m) => m.userId);
    const list = await db.select().from(challenges).where(eq(challenges.communityId, com.id)).orderBy(desc(challenges.endsAt));
    const me = members.find((m) => m.userId === user?.id);
    // Campaigns organised by members — a starting point for company workspaces later.
    const memberCampaigns = memberIds.length
      ? await db.select().from(campaigns).where(and(inArray(campaigns.organizerId, memberIds.slice(0, 90)), inArray(campaigns.status, [...PUBLIC_STATUSES]))).limit(6)
      : [];
    return c.json({
      community: { ...com, members: members.length },
      isMember: !!me,
      canManage: !!user && (me?.role === "owner" || user.role === "admin"),
      leaderboard: await memberLeaderboard(db, memberIds.slice(0, 90), monthStart()),
      challenges: await withProgress(db, list, user?.id),
      campaigns: await campaignCards(db, memberCampaigns),
    });
  })
  .post("/:slug/join", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const [com] = await db.select().from(communities).where(eq(communities.slug, c.req.param("slug"))).limit(1);
    if (!com) return c.json({ error: "Спільноту не знайдено." }, 404);
    await db.insert(communityMembers).values({ communityId: com.id, userId: user.id, joinedAt: Date.now() }).onConflictDoNothing();
    const xp = await awardXp(db, user.id, "join_community", com.id);
    const { newAchievements } = await evaluateProgress(db, user.id);
    return c.json({ ok: true, xp, newAchievements });
  })
  .post("/:slug/leave", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const [com] = await db.select().from(communities).where(eq(communities.slug, c.req.param("slug"))).limit(1);
    if (!com) return c.json({ error: "Спільноту не знайдено." }, 404);
    await db.delete(communityMembers).where(and(eq(communityMembers.communityId, com.id), eq(communityMembers.userId, user.id)));
    return c.json({ ok: true });
  })
  .post("/:slug/challenges", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const [com] = await db.select().from(communities).where(eq(communities.slug, c.req.param("slug"))).limit(1);
    if (!com) return c.json({ error: "Спільноту не знайдено." }, 404);
    const [m] = await db.select().from(communityMembers).where(and(eq(communityMembers.communityId, com.id), eq(communityMembers.userId, user.id)));
    if (m?.role !== "owner" && user.role !== "admin") throw new HTTPException(403, { message: "Створювати челенджі може лише власник спільноти." });
    const input = await body(
      c,
      z.object({
        title: z.string().trim().min(5, "Назва надто коротка").max(120),
        description: z.string().trim().max(600).default(""),
        metric: z.enum(metricKeys),
        target: z.number().int().min(1).max(100_000),
        days: z.number().int().min(1).max(90),
      }),
    );
    const id = newId("ch_");
    const now = Date.now();
    await db.insert(challenges).values({ id, communityId: com.id, title: input.title, description: input.description, metric: input.metric, target: input.target, startsAt: now, endsAt: now + input.days * DAY, createdAt: now });
    await db.insert(challengeParticipants).values({ challengeId: id, userId: user.id, joinedAt: now }).onConflictDoNothing();
    return c.json({ id }, 201);
  });

export const challengeRoutes = new Hono<AppEnv>().post("/:id/join", async (c) => {
  const user = requireUser(c);
  const db = getDb(c.env.DB);
  const [ch] = await db.select().from(challenges).where(eq(challenges.id, c.req.param("id"))).limit(1);
  if (!ch || ch.endsAt < Date.now()) return c.json({ error: "Челендж не знайдено або він завершився." }, 404);
  if (ch.communityId) {
    const [m] = await db.select().from(communityMembers).where(and(eq(communityMembers.communityId, ch.communityId), eq(communityMembers.userId, user.id)));
    if (!m) return c.json({ error: "Спершу приєднайтеся до спільноти." }, 400);
  }
  await db.insert(challengeParticipants).values({ challengeId: ch.id, userId: user.id, joinedAt: Date.now() }).onConflictDoNothing();
  const xp = await awardXp(db, user.id, "join_challenge", ch.id);
  const { newAchievements } = await evaluateProgress(db, user.id);
  return c.json({ ok: true, xp, newAchievements });
});



