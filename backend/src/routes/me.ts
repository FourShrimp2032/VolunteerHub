import { and, count, countDistinct, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/client";
import {
  campaignUpdates,
  campaigns,
  challengeParticipants,
  challenges,
  communities,
  communityMembers,
  files,
  follows,
  referralVisits,
  saves,
  shares,
  userAchievements,
  users,
  verificationRequests,
  xpEvents,
} from "../db/schema";
import type { AppEnv } from "../env";
import { requireUser } from "../lib/auth";
import { CATEGORY_SLUGS } from "../lib/constants";
import { ACHIEVEMENTS, XP_RULES, awardXp, challengeProgress, computeMissions, evaluateProgress, levelForXp } from "../lib/gamification";
import { campaignCards, privateUser } from "../lib/serialize";
import { newId } from "../lib/util";
import { body } from "../lib/validate";
import { totalRaised } from "../lib/discovery";

export const meRoutes = new Hono<AppEnv>()
  .patch("/", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const input = await body(
      c,
      z.object({
        name: z.string().trim().min(2, "Ім'я надто коротке").max(80).optional(),
        bio: z.string().trim().max(600).optional(),
        city: z.string().trim().max(80).optional(),
        interests: z.array(z.enum(CATEGORY_SLUGS)).max(8).optional(),
        avatarFileId: z.string().max(40).nullable().optional(),
      }),
    );
    if (input.avatarFileId) {
      const [f] = await db.select({ o: files.ownerId, v: files.visibility, m: files.mime }).from(files).where(eq(files.id, input.avatarFileId));
      if (!f || f.o !== user.id || f.v !== "public" || !f.m.startsWith("image/")) return c.json({ error: "Некоректне зображення." }, 400);
    }
    await db
      .update(users)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.interests !== undefined && { interests: JSON.stringify(input.interests) }),
        ...(input.avatarFileId !== undefined && { avatarFileId: input.avatarFileId }),
      })
      .where(eq(users.id, user.id));
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (u.bio.length >= 20 && u.city && JSON.parse(u.interests).length > 0) await awardXp(db, u.id, "profile_complete", "profile");
    const [fresh] = await db.select().from(users).where(eq(users.id, user.id));
    return c.json({ user: privateUser(fresh) });
  })

  // ------------------------------------------------------- supporter dashboard
  .get("/dashboard", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    await evaluateProgress(db, user.id);
    const [me] = await db.select().from(users).where(eq(users.id, user.id));

    const followedIds = (await db.select({ id: follows.campaignId }).from(follows).where(eq(follows.userId, user.id)).orderBy(desc(follows.createdAt))).map((r) => r.id);
    const savedIds = (await db.select({ id: saves.campaignId }).from(saves).where(eq(saves.userId, user.id)).orderBy(desc(saves.createdAt))).map((r) => r.id);
    const loadCards = async (ids: string[]) => {
      if (!ids.length) return [];
      const rows = await db.select().from(campaigns).where(inArray(campaigns.id, ids.slice(0, 80)));
      const cards = await campaignCards(db, rows);
      const order = new Map(ids.map((id, i) => [id, i]));
      return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    };
    const followed = await loadCards(followedIds);
    const saved = await loadCards(savedIds);

    const recentUpdates = followedIds.length
      ? await db
          .select({ id: campaignUpdates.id, kind: campaignUpdates.kind, title: campaignUpdates.title, body: campaignUpdates.body, createdAt: campaignUpdates.createdAt, campaignTitle: campaigns.title, campaignSlug: campaigns.slug })
          .from(campaignUpdates)
          .innerJoin(campaigns, eq(campaigns.id, campaignUpdates.campaignId))
          .where(inArray(campaignUpdates.campaignId, followedIds.slice(0, 80)))
          .orderBy(desc(campaignUpdates.createdAt))
          .limit(10)
      : [];

    const [{ n: sharedCampaigns }] = await db.select({ n: countDistinct(shares.campaignId) }).from(shares).where(eq(shares.userId, user.id));
    const [{ n: referred }] = await db.select({ n: count() }).from(referralVisits).where(eq(referralVisits.referrerId, user.id));
    const completedFollowed = followed.filter((f) => f.status === "completed").length;
    const earned = await db.select().from(userAchievements).where(eq(userAchievements.userId, user.id));
    const earnedMap = new Map(earned.map((e) => [e.code, e.earnedAt]));
    const history = await db.select().from(xpEvents).where(eq(xpEvents.userId, user.id)).orderBy(desc(xpEvents.createdAt)).limit(15);

    const memberships = await db
      .select({ c: communities })
      .from(communityMembers)
      .innerJoin(communities, eq(communities.id, communityMembers.communityId))
      .where(eq(communityMembers.userId, user.id));
    const myChallenges = await db
      .select({ ch: challenges })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challenges.id, challengeParticipants.challengeId))
      .where(eq(challengeParticipants.userId, user.id));
    const challengesOut = [];
    for (const { ch } of myChallenges) challengesOut.push({ ...ch, ...(await challengeProgress(db, ch)) });

    return c.json({
      user: privateUser(me),
      level: levelForXp(me.xp),
      impact: {
        followed: followedIds.length,
        saved: savedIds.length,
        shared: sharedCampaigns,
        referred,
        completedFollowed,
        achievements: earned.length,
        xp: me.xp,
      },
      followed,
      saved,
      recentUpdates,
      achievements: ACHIEVEMENTS.map((a) => ({ ...a, earnedAt: earnedMap.get(a.code) ?? null })),
      missions: await computeMissions(db, user.id),
      xpHistory: history.map((h) => ({ ...h, label: XP_RULES[h.action as keyof typeof XP_RULES]?.label ?? h.action })),
      communities: memberships.map((m) => m.c),
      challenges: challengesOut,
    });
  })

  // ------------------------------------------------------- organizer dashboard
  .get("/campaigns", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const rows = await db.select().from(campaigns).where(eq(campaigns.organizerId, user.id)).orderBy(desc(campaigns.updatedAt));
    const cards = await campaignCards(db, rows);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ids = rows.map((r) => r.id);
    const [{ n: sharesN }] = ids.length ? await db.select({ n: count() }).from(shares).where(inArray(shares.campaignId, ids.slice(0, 90))) : [{ n: 0 }];
    const [{ n: updatesN }] = ids.length ? await db.select({ n: count() }).from(campaignUpdates).where(inArray(campaignUpdates.campaignId, ids.slice(0, 90))) : [{ n: 0 }];
    return c.json({
      items: cards.map((card) => ({ ...card, rejectionReason: byId.get(card.id)?.rejectionReason ?? null, donateClicks: byId.get(card.id)?.donateClicks ?? 0, jarConnected: !!byId.get(card.id)?.jarUrl })),
      totals: {
        campaigns: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        views: rows.reduce((s, r) => s + r.viewCount, 0),
        followers: cards.reduce((s, x) => s + x.followers, 0),
        reportedRaised: rows.reduce((s, r) => s + totalRaised(r), 0),
        donateClicks: rows.reduce((s, r) => s + r.donateClicks, 0),
        shares: sharesN,
        updates: updatesN,
      },
    });
  })

  // ----------------------------------------------------- identity verification
  .get("/verification", async (c) => {
    const user = requireUser(c);
    const rows = await getDb(c.env.DB).select().from(verificationRequests).where(eq(verificationRequests.userId, user.id)).orderBy(desc(verificationRequests.createdAt));
    return c.json({
      verified: !!user.identityVerifiedAt,
      organization: user.orgVerifiedAt ? { name: user.orgName, kind: user.orgKind, code: user.orgCode, website: user.orgWebsite, verifiedAt: user.orgVerifiedAt } : null,
      requests: rows.map((r) => ({ ...r, details: JSON.parse(r.details || "{}"), fileUrl: r.fileId ? `/api/files/${r.fileId}` : null })),
    });
  })
  .post("/verification", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ note: z.string().trim().min(20, "Розкажіть про себе щонайменше 20 символами").max(2000), fileId: z.string().max(40) }));
    const [f] = await db.select({ o: files.ownerId, v: files.visibility }).from(files).where(eq(files.id, input.fileId));
    if (!f || f.o !== user.id || f.v !== "private") return c.json({ error: "Завантажте документ для перевірки." }, 400);
    const [pending] = await db
      .select({ n: count() })
      .from(verificationRequests)
      .where(and(eq(verificationRequests.userId, user.id), eq(verificationRequests.status, "pending")));
    if (pending.n > 0) return c.json({ error: "У вас вже є запит на розгляді." }, 400);
    await db.insert(verificationRequests).values({ id: newId("v_"), userId: user.id, note: input.note, fileId: input.fileId, createdAt: Date.now() });
    return c.json({ ok: true }, 201);
  })
  // Organization application: once approved, the account can publish main fundraisers.
  .post("/organization", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    if (user.orgVerifiedAt) return c.json({ error: "Організацію вже перевірено." }, 400);
    const input = await body(
      c,
      z.object({
        name: z.string().trim().min(2, "Вкажіть назву організації").max(120),
        kind: z.enum(["charity_fund", "ngo", "military_unit", "initiative", "other"], { message: "Оберіть тип організації" }),
        code: z.string().trim().max(20).regex(/^\d{0,20}$/, "Код ЄДРПОУ складається з цифр").default(""),
        website: z.string().trim().max(200).default(""),
        note: z.string().trim().min(20, "Опишіть діяльність організації щонайменше 20 символами").max(2000),
        fileId: z.string().max(40, "Завантажте документ"),
      }),
    );
    const [f] = await db.select({ o: files.ownerId, v: files.visibility }).from(files).where(eq(files.id, input.fileId));
    if (!f || f.o !== user.id || f.v !== "private") return c.json({ error: "Завантажте документ для перевірки." }, 400);
    const [pending] = await db
      .select({ n: count() })
      .from(verificationRequests)
      .where(and(eq(verificationRequests.userId, user.id), eq(verificationRequests.status, "pending")));
    if (pending.n > 0) return c.json({ error: "У вас вже є запит на розгляді." }, 400);
    const { note, fileId, ...details } = input;
    await db.insert(verificationRequests).values({ id: newId("v_"), userId: user.id, kind: "organization", details: JSON.stringify(details), note, fileId, createdAt: Date.now() });
    return c.json({ ok: true }, 201);
  })
  .get("/organizer-summary", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const [{ n }] = await db.select({ n: count() }).from(campaigns).where(and(eq(campaigns.organizerId, user.id), isNotNull(campaigns.publishedAt)));
    return c.json({ published: n });
  });
