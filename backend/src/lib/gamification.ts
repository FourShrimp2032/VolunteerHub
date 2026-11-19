/**
 * Volunteerhub Impact — XP, levels, achievements, weekly missions and challenges.
 *
 * Principles:
 *  - XP rewards participation (following, sharing, referring visitors, communities),
 *    never the amount donated. Volunteerhub has no reliable donation data anyway.
 *  - Every award is keyed by (user, action, refKey) and stored with a unique index,
 *    so repeating an action can never be farmed.
 */
import { and, count, countDistinct, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { DB } from "../db/client";
import {
  campaigns,
  challengeParticipants,
  challenges,
  communityMembers,
  follows,
  referralVisits,
  shares,
  userAchievements,
  users,
  xpEvents,
  campaignUpdates,
} from "../db/schema";
import { DAY } from "./constants";
import { isoWeekKey, newId, startOfIsoWeek } from "./util";

export const LEVELS = [
  { level: 1, key: "explorer", name: "Cossack", nameUk: "Козак", minXp: 0 },
  { level: 2, key: "supporter", name: "Kharakternyk", nameUk: "Характерник", minXp: 100 },
  { level: 3, key: "advocate", name: "Buhailo", nameUk: "Бугайло", minXp: 300 },
  { level: 4, key: "community_builder", name: "Otaman", nameUk: "Отаман", minXp: 700 },
  { level: 5, key: "impact_leader", name: "Hetman", nameUk: "Гетьман", minXp: 1500 },
] as const;

export function levelForXp(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  const next = LEVELS.find((l) => l.minXp > xp) ?? null;
  const span = next ? next.minXp - current.minXp : 1;
  const progress = next ? Math.min(1, (xp - current.minXp) / span) : 1;
  return { ...current, xp, next: next ? { ...next, xpNeeded: next.minXp - xp } : null, progress };
}

/** XP table. `daily` caps how many awards of this action count per day. */
export const XP_RULES = {
  follow: { xp: 10, label: "Підписка на збір" },
  follow_early: { xp: 15, label: "Рання підтримка нового збору" },
  share: { xp: 5, label: "Поширення збору" },
  share_verified: { xp: 15, label: "Поширення перевіреного збору" },
  referral_visit: { xp: 20, label: "Новий відвідувач за вашим посиланням", daily: 10 },
  join_community: { xp: 25, label: "Приєднання до спільноти" },
  join_challenge: { xp: 10, label: "Участь у челенджі" },
  challenge_complete: { xp: 100, label: "Челендж виконано" },
  mission_complete: { xp: 30, label: "Тижнева місія" },
  campaign_published: { xp: 50, label: "Збір опубліковано" },
  campaign_update: { xp: 10, label: "Оновлення для донорів", daily: 3 },
  final_report: { xp: 80, label: "Фінальний звіт" },
  profile_complete: { xp: 20, label: "Профіль заповнено" },
} as const;
export type XpAction = keyof typeof XP_RULES;

export async function awardXp(db: DB, userId: string, action: XpAction, refKey: string): Promise<number> {
  const rule = XP_RULES[action];
  if ("daily" in rule && rule.daily) {
    const since = Date.now() - DAY;
    const [{ n }] = await db
      .select({ n: count() })
      .from(xpEvents)
      .where(and(eq(xpEvents.userId, userId), eq(xpEvents.action, action), gte(xpEvents.createdAt, since)));
    if (n >= rule.daily) return 0;
  }
  const inserted = await db
    .insert(xpEvents)
    .values({ id: newId("xp_"), userId, action, refKey, xp: rule.xp, createdAt: Date.now() })
    .onConflictDoNothing()
    .returning({ id: xpEvents.id });
  if (inserted.length === 0) return 0;
  await db.update(users).set({ xp: sql`${users.xp} + ${rule.xp}` }).where(eq(users.id, userId));
  return rule.xp;
}

// ---------------------------------------------------------------- achievements

export const ACHIEVEMENTS = [
  { code: "first_impact", title: "Перша шабля", en: "First Sabre", description: "Перша підписка або поширення збору.", icon: "sparkles", tier: "bronze" },
  { code: "early_supporter", title: "Перший на коні", en: "First in the Saddle", description: "Підтримали збір у перші 72 години після публікації.", icon: "sunrise", tier: "bronze" },
  { code: "ambassador", title: "Кобзар", en: "Kobzar", description: "3 поширені збори привели нових відвідувачів.", icon: "megaphone", tier: "silver" },
  { code: "community_builder", title: "Січовий побратим", en: "Sich Brother", description: "Учасник спільноти та її челенджу.", icon: "users", tier: "silver" },
  { code: "consistent_supporter", title: "Вірний побратим", en: "Loyal Comrade", description: "Активність протягом 4 різних тижнів.", icon: "calendar-check", tier: "gold" },
  { code: "impact_champion", title: "Лицар Запорозький", en: "Zaporozhian Knight", description: "Набрали 1000 Impact XP.", icon: "trophy", tier: "gold" },
  { code: "first_campaign", title: "Перший похід", en: "First Campaign", description: "Ваш збір пройшов модерацію та опублікований.", icon: "flag", tier: "bronze" },
  { code: "transparent", title: "Чесний писар", en: "Honest Scribe", description: "Опублікували фінальний звіт про витрати.", icon: "file-check", tier: "gold" },
] as const;

async function grant(db: DB, userId: string, code: string): Promise<boolean> {
  const r = await db.insert(userAchievements).values({ userId, code, earnedAt: Date.now() }).onConflictDoNothing().returning();
  return r.length > 0;
}

/** Re-evaluates achievements, weekly missions and challenge completion for a user. */
export async function evaluateProgress(db: DB, userId: string): Promise<{ newAchievements: string[] }> {
  const newAchievements: string[] = [];
  const have = new Set((await db.select({ code: userAchievements.code }).from(userAchievements).where(eq(userAchievements.userId, userId))).map((r) => r.code));
  const check = async (code: string, cond: () => Promise<boolean>) => {
    if (have.has(code)) return;
    if (await cond()) if (await grant(db, userId, code)) newAchievements.push(code);
  };

  await check("first_impact", async () => {
    const [r] = await db.select({ n: count() }).from(xpEvents).where(and(eq(xpEvents.userId, userId), inArray(xpEvents.action, ["follow", "follow_early", "share", "share_verified"])));
    return r.n > 0;
  });
  await check("early_supporter", async () => {
    const [r] = await db.select({ n: count() }).from(xpEvents).where(and(eq(xpEvents.userId, userId), eq(xpEvents.action, "follow_early")));
    return r.n > 0;
  });
  await check("ambassador", async () => {
    const [r] = await db.select({ n: countDistinct(referralVisits.campaignId) }).from(referralVisits).where(eq(referralVisits.referrerId, userId));
    return r.n >= 3;
  });
  await check("community_builder", async () => {
    const [m] = await db.select({ n: count() }).from(communityMembers).where(eq(communityMembers.userId, userId));
    const [c] = await db.select({ n: count() }).from(challengeParticipants).where(eq(challengeParticipants.userId, userId));
    return m.n > 0 && c.n > 0;
  });
  await check("consistent_supporter", async () => {
    const rows = await db.select({ t: xpEvents.createdAt }).from(xpEvents).where(eq(xpEvents.userId, userId));
    return new Set(rows.map((r) => isoWeekKey(r.t))).size >= 4;
  });
  await check("first_campaign", async () => {
    const [r] = await db.select({ n: count() }).from(campaigns).where(and(eq(campaigns.organizerId, userId), isNotNull(campaigns.publishedAt)));
    return r.n > 0;
  });
  await check("transparent", async () => {
    const [r] = await db.select({ n: count() }).from(campaignUpdates).where(and(eq(campaignUpdates.authorId, userId), eq(campaignUpdates.kind, "final_report")));
    return r.n > 0;
  });

  // Weekly missions
  const missions = await computeMissions(db, userId);
  for (const m of missions) if (m.done) await awardXp(db, userId, "mission_complete", `${m.key}:${m.week}`);

  // Challenges the user joined
  const joined = await db
    .select({ c: challenges })
    .from(challengeParticipants)
    .innerJoin(challenges, eq(challenges.id, challengeParticipants.challengeId))
    .where(eq(challengeParticipants.userId, userId));
  for (const { c } of joined) {
    const p = await challengeProgress(db, c);
    if (p.value >= c.target) await awardXp(db, userId, "challenge_complete", c.id);
  }

  // Champion is checked last so XP from missions/challenges counts.
  await check("impact_champion", async () => {
    const [u] = await db.select({ xp: users.xp }).from(users).where(eq(users.id, userId));
    return (u?.xp ?? 0) >= 1000;
  });

  return { newAchievements };
}

// ------------------------------------------------------------- weekly missions

export async function computeMissions(db: DB, userId: string) {
  const weekStart = startOfIsoWeek(Date.now());
  const week = isoWeekKey(Date.now());
  const newCutoff = (t: number) => t - 14 * DAY;

  const followRows = await db
    .select({ followedAt: follows.createdAt, publishedAt: campaigns.publishedAt, views: campaigns.viewCount })
    .from(follows)
    .innerJoin(campaigns, eq(campaigns.id, follows.campaignId))
    .where(and(eq(follows.userId, userId), gte(follows.createdAt, weekStart)));
  const followNew = followRows.filter((r) => r.publishedAt && r.publishedAt >= newCutoff(r.followedAt)).length;
  const lowExposure = followRows.filter((r) => r.views < 100).length;

  const shareRows = await db
    .selectDistinct({ id: shares.campaignId })
    .from(shares)
    .innerJoin(campaigns, eq(campaigns.id, shares.campaignId))
    .where(and(eq(shares.userId, userId), gte(shares.createdAt, weekStart), isNotNull(campaigns.purposeReviewedAt)));

  const list = [
    { key: "follow_new", title: "Підпишіться на 2 нові збори", description: "Збори, опубліковані за останні 14 днів.", target: 2, value: followNew },
    { key: "share_verified", title: "Поширте 2 перевірені збори", description: "Скопіюйте посилання або поділіться в соцмережах.", target: 2, value: shareRows.length },
    { key: "low_exposure", title: "Помітьте збір, який мало хто бачив", description: "Підпишіться на збір із розділу «Потребують уваги».", target: 1, value: lowExposure },
  ];
  return list.map((m) => ({ ...m, week, value: Math.min(m.value, m.target), done: m.value >= m.target, xp: XP_RULES.mission_complete.xp }));
}

// ------------------------------------------------------------------ challenges

export const CHALLENGE_METRICS = {
  shares_verified: "Поширені перевірені збори",
  follows_new: "Підписки на нові збори",
  referrals: "Нові відвідувачі за реферальними посиланнями",
  referrals_new: "Відвідувачі для нових зборів (до 30 днів)",
} as const;
export type ChallengeMetric = keyof typeof CHALLENGE_METRICS;

type ChallengeRow = typeof challenges.$inferSelect;

/** Metric value for a set of users within the challenge window. */
async function metricFor(db: DB, metric: string, userIds: string[], from: number, to: number): Promise<number> {
  if (userIds.length === 0) return 0;
  switch (metric) {
    case "shares_verified": {
      const r = await db
        .selectDistinct({ u: shares.userId, c: shares.campaignId })
        .from(shares)
        .innerJoin(campaigns, eq(campaigns.id, shares.campaignId))
        .where(and(inArray(shares.userId, userIds), gte(shares.createdAt, from), lt(shares.createdAt, to), isNotNull(campaigns.purposeReviewedAt)));
      return r.length;
    }
    case "follows_new": {
      const r = await db
        .select({ f: follows.createdAt, p: campaigns.publishedAt })
        .from(follows)
        .innerJoin(campaigns, eq(campaigns.id, follows.campaignId))
        .where(and(inArray(follows.userId, userIds), gte(follows.createdAt, from), lt(follows.createdAt, to)));
      return r.filter((x) => x.p && x.f - x.p <= 14 * DAY).length;
    }
    case "referrals": {
      const [r] = await db
        .select({ n: count() })
        .from(referralVisits)
        .where(and(inArray(referralVisits.referrerId, userIds), gte(referralVisits.createdAt, from), lt(referralVisits.createdAt, to)));
      return r.n;
    }
    case "referrals_new": {
      const r = await db
        .select({ v: referralVisits.createdAt, p: campaigns.publishedAt })
        .from(referralVisits)
        .innerJoin(campaigns, eq(campaigns.id, referralVisits.campaignId))
        .where(and(inArray(referralVisits.referrerId, userIds), gte(referralVisits.createdAt, from), lt(referralVisits.createdAt, to)));
      return r.filter((x) => x.p && x.v - x.p <= 30 * DAY).length;
    }
    default:
      return 0;
  }
}

/** Team progress = all participants (and, for community challenges, only its members). */
export async function challengeProgress(db: DB, c: ChallengeRow) {
  const parts = await db.select({ u: challengeParticipants.userId }).from(challengeParticipants).where(eq(challengeParticipants.challengeId, c.id));
  let ids = parts.map((p) => p.u);
  if (c.communityId) {
    const members = new Set(
      (await db.select({ u: communityMembers.userId }).from(communityMembers).where(eq(communityMembers.communityId, c.communityId))).map((m) => m.u),
    );
    ids = ids.filter((id) => members.has(id));
  }
  const value = await metricFor(db, c.metric, ids, c.startsAt, c.endsAt);
  return { value, participants: ids.length, target: c.target, progress: c.target ? Math.min(1, value / c.target) : 0 };
}

/** Monthly leaderboard of members, based on participation XP only. */
export async function memberLeaderboard(db: DB, userIds: string[], since: number) {
  if (userIds.length === 0) return [];
  const rows = await db
    .select({ userId: xpEvents.userId, xp: sql<number>`sum(${xpEvents.xp})`, name: users.name, isDemo: users.isDemo })
    .from(xpEvents)
    .innerJoin(users, eq(users.id, xpEvents.userId))
    .where(and(inArray(xpEvents.userId, userIds), gte(xpEvents.createdAt, since)))
    .groupBy(xpEvents.userId)
    .orderBy(sql`sum(${xpEvents.xp}) desc`)
    .limit(20);
  return rows.map((r) => ({ ...r, xp: Number(r.xp) }));
}

export function monthStart(ts = Date.now()) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
