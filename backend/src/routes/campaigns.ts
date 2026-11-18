import { and, asc, count, desc, eq, gte, inArray, like, or, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getDb, type DB } from "../db/client";
import {
  budgetItems,
  campaignAttachments,
  campaignUpdates,
  campaignViews,
  campaigns,
  contentReports,
  files,
  follows,
  referralVisits,
  saves,
  shares,
  users,
  type Campaign,
  type User,
} from "../db/schema";
import type { AppEnv } from "../env";
import { rateLimit, requireUser } from "../lib/auth";
import { CATEGORY_SLUGS, DAY, PUBLIC_STATUSES } from "../lib/constants";
import { buildSections, progressOf } from "../lib/discovery";
import { awardXp, evaluateProgress } from "../lib/gamification";
import { parseJarUrl } from "../lib/monobank";
import { campaignCards, fileUrl, loadCampaignBySlugOrId, publicUser, toCard, verificationOf } from "../lib/serialize";
import { dayKey, newId, parseJsonArray, sha256Hex, slugify } from "../lib/util";
import { body } from "../lib/validate";

const budgetSchema = z.array(z.object({ label: z.string().trim().min(1, "Вкажіть назву статті бюджету").max(120), amount: z.number().int().min(0).max(1_000_000_000) })).max(30);

const draftSchema = z.object({
  title: z.string().trim().min(5, "Назва має містити щонайменше 5 символів").max(120),
  summary: z.string().trim().max(240).optional(),
  description: z.string().trim().max(20_000).optional(),
  category: z.enum(CATEGORY_SLUGS, { message: "Оберіть категорію" }).optional(),
  city: z.string().trim().max(80).optional(),
  coverFileId: z.string().max(40).nullable().optional(),
  goalAmount: z.number().int().min(0).max(1_000_000_000).optional(),
  deadline: z.number().int().nullable().optional(),
  urgent: z.boolean().optional(),
  jarUrl: z.string().trim().max(300).nullable().optional(),
  budget: budgetSchema.optional(),
});

const EDITABLE_STATUSES = new Set(["draft", "rejected", "pending", "active", "goal_reached"]);

async function visitorHash(c: Context<AppEnv>) {
  const ip = c.req.header("cf-connecting-ip") ?? "local";
  const ua = c.req.header("user-agent") ?? "";
  return sha256Hex(`${c.env.VISITOR_SALT ?? "vh-dev-salt"}|${ip}|${ua}`);
}

function canView(c: Campaign, user: User | null) {
  if ((PUBLIC_STATUSES as readonly string[]).includes(c.status)) return true;
  return !!user && (user.id === c.organizerId || user.role === "admin");
}

async function ownCampaign(c: Context<AppEnv>, id: string) {
  const user = requireUser(c);
  const db = getDb(c.env.DB);
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!row) throw new HTTPException(404, { message: "Збір не знайдено." });
  if (row.organizerId !== user.id && user.role !== "admin") throw new HTTPException(403, { message: "Це не ваш збір." });
  return { user, db, campaign: row };
}

async function uniqueSlug(db: DB, title: string) {
  const base = slugify(title);
  for (let i = 0; i < 20; i++) {
    const s = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const [hit] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, s)).limit(1);
    if (!hit) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function assertOwnFile(db: DB, fileId: string, userId: string, visibility = "public") {
  const [f] = await db.select({ id: files.id, ownerId: files.ownerId, visibility: files.visibility }).from(files).where(eq(files.id, fileId)).limit(1);
  if (!f || f.ownerId !== userId || f.visibility !== visibility) throw new HTTPException(400, { message: "Файл не знайдено." });
}

async function applyDraft(db: DB, user: User, id: string, input: z.infer<typeof draftSchema>, current: Campaign | null) {
  const patch: Partial<Campaign> = { updatedAt: Date.now() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.city !== undefined) patch.city = input.city;
  if (input.goalAmount !== undefined) patch.goalAmount = input.goalAmount;
  if (input.urgent !== undefined) patch.urgent = input.urgent;
  if (input.deadline !== undefined) {
    if (input.deadline !== null && input.deadline < Date.now() - DAY) throw new HTTPException(400, { message: "Дедлайн не може бути в минулому." });
    patch.deadline = input.deadline;
  }
  if (input.coverFileId !== undefined) {
    if (input.coverFileId) await assertOwnFile(db, input.coverFileId, current?.organizerId ?? user.id);
    patch.coverFileId = input.coverFileId;
  }
  if (input.jarUrl !== undefined) {
    if (input.jarUrl) {
      const jar = parseJarUrl(input.jarUrl);
      if (!jar.ok) throw new HTTPException(400, { message: jar.error });
      if (current?.jarUrl !== jar.url) patch.destinationVerifiedAt = null; // a changed destination must be re-verified
      patch.jarUrl = jar.url;
      patch.jarId = jar.jarId;
    } else {
      patch.jarUrl = null;
      patch.jarId = null;
      patch.destinationVerifiedAt = null;
    }
  }
  await db.update(campaigns).set(patch).where(eq(campaigns.id, id));
  if (input.budget) {
    await db.delete(budgetItems).where(eq(budgetItems.campaignId, id));
    if (input.budget.length)
      await db.insert(budgetItems).values(input.budget.map((b, i) => ({ id: newId("b_"), campaignId: id, label: b.label, amount: b.amount, position: i })));
  }
}

function timelineOf(c: Campaign, updates: { kind: string; createdAt: number }[]) {
  const firstOf = (k: string) => updates.filter((u) => u.kind === k).sort((a, b) => a.createdAt - b.createdAt)[0]?.createdAt ?? null;
  return [
    { key: "created", label: "Збір створено", at: c.createdAt },
    { key: "started", label: "Збір розпочато", at: c.publishedAt },
    { key: "goal_reached", label: "Ціль досягнуто", at: c.goalReachedAt },
    { key: "purchase", label: "Закупівлю здійснено", at: firstOf("purchase") },
    { key: "final_report", label: "Фінальний звіт опубліковано", at: firstOf("final_report") },
  ];
}

export async function publicCampaigns(db: DB) {
  return db
    .select()
    .from(campaigns)
    .where(inArray(campaigns.status, [...PUBLIC_STATUSES]))
    .orderBy(desc(campaigns.publishedAt))
    .limit(500);
}

export const campaignRoutes = new Hono<AppEnv>()
  // ------------------------------------------------------------------ listing
  .get("/", async (c) => {
    const db = getDb(c.env.DB);
    const q = (c.req.query("q") ?? "").trim().slice(0, 80);
    const category = c.req.query("category");
    const status = c.req.query("status") ?? "open";
    const sort = c.req.query("sort") ?? "recommended";
    const verified = c.req.query("verified") === "1";
    const urgent = c.req.query("urgent") === "1";
    const city = (c.req.query("city") ?? "").trim();
    const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
    const perPage = 12;

    const conds = [];
    if (status === "open") conds.push(eq(campaigns.status, "active"));
    else if (status === "funded") conds.push(eq(campaigns.status, "goal_reached"));
    else if (status === "completed") conds.push(eq(campaigns.status, "completed"));
    else conds.push(inArray(campaigns.status, [...PUBLIC_STATUSES]));
    if (category && CATEGORY_SLUGS.includes(category)) conds.push(eq(campaigns.category, category));
    if (urgent) conds.push(eq(campaigns.urgent, true));
    if (city) conds.push(like(campaigns.city, `%${city}%`));
    if (q) {
      const pat = `%${q}%`;
      conds.push(or(like(campaigns.title, pat), like(campaigns.summary, pat), like(campaigns.description, pat), like(campaigns.city, pat)));
    }
    let rows = await db.select().from(campaigns).where(and(...conds)).limit(500);
    let cards = await campaignCards(db, rows);
    if (verified) cards = cards.filter((x) => x.verification.purposeReviewed && x.verification.destinationVerified);

    const now = Date.now();
    const user = c.get("user");
    const interests = user ? parseJsonArray(user.interests) : [];
    const { scoreCampaign } = await import("../lib/discovery");
    const scoreOf = (x: (typeof cards)[number]) =>
      scoreCampaign({ ...x, purposeReviewedAt: x.verification.purposeReviewed ? 1 : null, destinationVerifiedAt: x.verification.destinationVerified ? 1 : null, organizerVerified: x.verification.identityReviewed }, { now, interests }).score;
    const sorters: Record<string, (a: (typeof cards)[number], b: (typeof cards)[number]) => number> = {
      recommended: (a, b) => scoreOf(b) - scoreOf(a),
      new: (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0),
      almost: (a, b) => b.progress - a.progress,
      attention: (a, b) => a.viewCount - b.viewCount,
      deadline: (a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity),
      goal_asc: (a, b) => a.goalAmount - b.goalAmount,
    };
    cards.sort(sorters[sort] ?? sorters.recommended);
    const total = cards.length;
    rows = [];
    return c.json({ items: cards.slice((page - 1) * perPage, page * perPage), total, page, pages: Math.max(1, Math.ceil(total / perPage)) });
  })

  // ---------------------------------------------------------------- home feed
  .get("/home", async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const rows = await publicCampaigns(db);
    const cards = await campaignCards(db, rows);
    const byId = new Map(cards.map((x) => [x.id, x]));
    const followedIds = user
      ? new Set((await db.select({ id: follows.campaignId }).from(follows).where(eq(follows.userId, user.id))).map((r) => r.id))
      : new Set<string>();
    let interests = user ? parseJsonArray(user.interests) : [];
    if (user && interests.length === 0 && followedIds.size) {
      interests = [...new Set(cards.filter((x) => followedIds.has(x.id)).map((x) => x.category))];
    }
    const orgVerified = new Map(cards.map((x) => [x.id, x.verification.identityReviewed]));
    const sections = buildSections(
      rows.map((r) => ({ ...r, organizerVerified: orgVerified.get(r.id) ?? false })),
      { now: Date.now(), interests, followedIds },
    );
    const pick = (list: { id: string }[]) => list.map((x) => byId.get(x.id)).filter(Boolean);
    const recommended = sections.recommended.map((x) => ({ ...byId.get(x.id)!, reasons: x.reasons }));

    const [{ n: completed }] = await db.select({ n: count() }).from(campaigns).where(eq(campaigns.status, "completed"));
    const [{ n: reports }] = await db.select({ n: count() }).from(campaignUpdates).where(eq(campaignUpdates.kind, "final_report"));
    const [{ n: supporters }] = await db.select({ n: count() }).from(users);
    const categoryCounts: Record<string, number> = {};
    for (const x of cards) if (x.status === "active") categoryCounts[x.category] = (categoryCounts[x.category] ?? 0) + 1;

    return c.json({
      featured: pick(sections.featured),
      fresh: pick(sections.fresh),
      attention: pick(sections.attention),
      almost: pick(sections.almost),
      recommended,
      personalized: !!user && interests.length > 0,
      categoryCounts,
      stats: {
        active: cards.filter((x) => x.status === "active").length,
        completed,
        finalReports: reports,
        members: supporters,
        organizers: new Set(cards.map((x) => x.organizer?.id)).size,
      },
    });
  })

  // ------------------------------------------------------------------- detail
  .get("/:key", async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const camp = await loadCampaignBySlugOrId(db, c.req.param("key"));
    if (!camp || !canView(camp, user)) return c.json({ error: "Збір не знайдено." }, 404);
    const [org] = await db.select().from(users).where(eq(users.id, camp.organizerId));
    const updates = await db.select().from(campaignUpdates).where(eq(campaignUpdates.campaignId, camp.id)).orderBy(desc(campaignUpdates.createdAt));
    const budget = await db.select().from(budgetItems).where(eq(budgetItems.campaignId, camp.id)).orderBy(asc(budgetItems.position));
    const attachments = await db
      .select({ id: campaignAttachments.id, title: campaignAttachments.title, fileId: campaignAttachments.fileId, mime: files.mime, size: files.size, createdAt: campaignAttachments.createdAt })
      .from(campaignAttachments)
      .innerJoin(files, eq(files.id, campaignAttachments.fileId))
      .where(eq(campaignAttachments.campaignId, camp.id));
    const [{ n: followers }] = await db.select({ n: count() }).from(follows).where(eq(follows.campaignId, camp.id));
    const hasFinal = updates.some((u) => u.kind === "final_report");
    let viewer = { followed: false, saved: false, isOwner: false, isAdmin: false, referralCode: null as string | null };
    if (user) {
      const [f] = await db.select().from(follows).where(and(eq(follows.userId, user.id), eq(follows.campaignId, camp.id)));
      const [s] = await db.select().from(saves).where(and(eq(saves.userId, user.id), eq(saves.campaignId, camp.id)));
      viewer = { followed: !!f, saved: !!s, isOwner: user.id === camp.organizerId, isAdmin: user.role === "admin", referralCode: user.referralCode };
    }
    const orgCampaigns = await db
      .select({ n: count() })
      .from(campaigns)
      .where(and(eq(campaigns.organizerId, camp.organizerId), inArray(campaigns.status, [...PUBLIC_STATUSES])));
    const fileIds = [...new Set(updates.flatMap((u) => parseJsonArray(u.fileIds)))];
    const fileMeta = fileIds.length
      ? await db.select({ id: files.id, name: files.name, mime: files.mime }).from(files).where(inArray(files.id, fileIds.slice(0, 90)))
      : [];
    const fm = new Map(fileMeta.map((f) => [f.id, f]));
    return c.json({
      campaign: {
        ...toCard(camp, org ?? null, { hasFinalReport: hasFinal, followers }),
        description: camp.description,
        jarUrl: camp.jarUrl,
        hasJar: !!camp.jarUrl,
        rejectionReason: viewer.isOwner || viewer.isAdmin ? camp.rejectionReason : null,
        donateClicks: viewer.isOwner || viewer.isAdmin ? camp.donateClicks : undefined,
        budget: budget.map((b) => ({ label: b.label, amount: b.amount })),
        attachments: attachments.map((a) => ({ ...a, url: fileUrl(a.fileId) })),
        updates: updates.map((u) => ({
          id: u.id,
          kind: u.kind,
          title: u.title,
          body: u.body,
          spentAmount: u.spentAmount,
          createdAt: u.createdAt,
          files: parseJsonArray(u.fileIds).map((id) => ({ id, url: fileUrl(id), name: fm.get(id)?.name ?? "Файл", mime: fm.get(id)?.mime ?? "" })),
        })),
        timeline: timelineOf(camp, updates),
        verification: verificationOf(camp, org ?? null, hasFinal),
      },
      organizer: org ? { ...publicUser(org), campaignsCount: orgCampaigns[0].n } : null,
      viewer,
    });
  })

  // --------------------------------------------------- views, referrals, donate
  .post("/:id/view", async (c) => {
    const db = getDb(c.env.DB);
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, c.req.param("id"))).limit(1);
    if (!camp || !(PUBLIC_STATUSES as readonly string[]).includes(camp.status)) return c.json({ ok: false }, 404);
    const raw = (await c.req.json().catch(() => ({}))) as { ref?: unknown };
    const ref = typeof raw.ref === "string" ? raw.ref.slice(0, 20) : null;
    const user = c.get("user");
    const vh = await visitorHash(c);
    let referrer: string | null = null;
    if (ref) {
      const [r] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, ref)).limit(1);
      if (r && r.id !== user?.id && r.id !== camp.organizerId) referrer = r.id;
    }
    const ins = await db
      .insert(campaignViews)
      .values({ campaignId: camp.id, visitorHash: vh, day: dayKey(Date.now()), referrerId: referrer })
      .onConflictDoNothing()
      .returning();
    if (ins.length && !(user && user.id === camp.organizerId)) {
      await db.update(campaigns).set({ viewCount: sql`${campaigns.viewCount} + 1` }).where(eq(campaigns.id, camp.id));
    }
    if (referrer) {
      const r = await db.insert(referralVisits).values({ referrerId: referrer, campaignId: camp.id, visitorHash: vh, createdAt: Date.now() }).onConflictDoNothing().returning();
      if (r.length) {
        await awardXp(db, referrer, "referral_visit", `${camp.id}:${vh.slice(0, 16)}`);
        await evaluateProgress(db, referrer);
      }
    }
    return c.json({ ok: true });
  })
  .get("/:id/donate", async (c) => {
    const db = getDb(c.env.DB);
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, c.req.param("id"))).limit(1);
    if (!camp || !camp.jarUrl || !(PUBLIC_STATUSES as readonly string[]).includes(camp.status)) return c.json({ error: "Посилання на донат недоступне." }, 404);
    const jar = parseJarUrl(camp.jarUrl); // re-validate before redirecting: never an open redirect
    if (!jar.ok) return c.json({ error: "Посилання на донат недоступне." }, 404);
    await db.update(campaigns).set({ donateClicks: sql`${campaigns.donateClicks} + 1` }).where(eq(campaigns.id, camp.id));
    c.header("Referrer-Policy", "no-referrer");
    return c.redirect(jar.url, 302);
  })

  // ---------------------------------------------------- follow / save / share
  .post("/:id/follow", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, c.req.param("id"))).limit(1);
    if (!camp || !(PUBLIC_STATUSES as readonly string[]).includes(camp.status)) return c.json({ error: "Збір не знайдено." }, 404);
    await db.insert(follows).values({ userId: user.id, campaignId: camp.id, createdAt: Date.now() }).onConflictDoNothing();
    let xp = 0;
    if (camp.organizerId !== user.id) {
      xp += await awardXp(db, user.id, "follow", camp.id);
      if (camp.publishedAt && Date.now() - camp.publishedAt < 3 * DAY) xp += await awardXp(db, user.id, "follow_early", camp.id);
    }
    const { newAchievements } = await evaluateProgress(db, user.id);
    return c.json({ followed: true, xp, newAchievements });
  })
  .delete("/:id/follow", async (c) => {
    const user = requireUser(c);
    await getDb(c.env.DB).delete(follows).where(and(eq(follows.userId, user.id), eq(follows.campaignId, c.req.param("id"))));
    return c.json({ followed: false });
  })
  .post("/:id/save", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const [camp] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, c.req.param("id"))).limit(1);
    if (!camp) return c.json({ error: "Збір не знайдено." }, 404);
    await db.insert(saves).values({ userId: user.id, campaignId: camp.id, createdAt: Date.now() }).onConflictDoNothing();
    return c.json({ saved: true });
  })
  .delete("/:id/save", async (c) => {
    const user = requireUser(c);
    await getDb(c.env.DB).delete(saves).where(and(eq(saves.userId, user.id), eq(saves.campaignId, c.req.param("id"))));
    return c.json({ saved: false });
  })
  .post("/:id/share", async (c) => {
    const user = c.get("user");
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ channel: z.enum(["copy", "telegram", "facebook", "x", "viber", "whatsapp", "native"]) }));
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, c.req.param("id"))).limit(1);
    if (!camp || !(PUBLIC_STATUSES as readonly string[]).includes(camp.status)) return c.json({ error: "Збір не знайдено." }, 404);
    if (!user) return c.json({ ok: true, xp: 0 });
    if (!(await rateLimit(db, `share:${user.id}`, 60, 60 * 60 * 1000))) return c.json({ ok: true, xp: 0 });
    await db.insert(shares).values({ id: newId("sh_"), userId: user.id, campaignId: camp.id, channel: input.channel, createdAt: Date.now() });
    let xp = 0;
    if (camp.organizerId !== user.id) xp = await awardXp(db, user.id, camp.purposeReviewedAt ? "share_verified" : "share", camp.id);
    const { newAchievements } = await evaluateProgress(db, user.id);
    return c.json({ ok: true, xp, newAchievements });
  })
  .post("/:id/report", async (c) => {
    const user = c.get("user");
    const db = getDb(c.env.DB);
    const input = await body(
      c,
      z.object({
        reason: z.enum(["fraud", "misleading", "duplicate", "inappropriate", "other"], { message: "Оберіть причину" }),
        details: z.string().trim().max(2000).default(""),
      }),
    );
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    if (!(await rateLimit(db, `report:${user?.id ?? ip}`, 10, DAY))) return c.json({ error: "Забагато скарг. Спробуйте завтра." }, 429);
    const [camp] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, c.req.param("id"))).limit(1);
    if (!camp) return c.json({ error: "Збір не знайдено." }, 404);
    await db.insert(contentReports).values({ id: newId("r_"), campaignId: camp.id, reporterId: user?.id ?? null, reason: input.reason, details: input.details, createdAt: Date.now() });
    return c.json({ ok: true }, 201);
  })

  // --------------------------------------------------------- organizer: CRUD
  .post("/", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const input = await body(c, draftSchema);
    if (!(await rateLimit(db, `create:${user.id}`, 20, DAY))) return c.json({ error: "Забагато нових зборів за добу." }, 429);
    const id = newId("c_");
    await db.insert(campaigns).values({
      id,
      slug: await uniqueSlug(db, input.title),
      organizerId: user.id,
      title: input.title,
      category: input.category ?? "humanitarian",
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await applyDraft(db, user, id, input, null);
    const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return c.json({ id, slug: row.slug }, 201);
  })
  .get("/:id/edit", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    const budget = await db.select().from(budgetItems).where(eq(budgetItems.campaignId, campaign.id)).orderBy(asc(budgetItems.position));
    const attachments = await db
      .select({ id: campaignAttachments.id, title: campaignAttachments.title, fileId: campaignAttachments.fileId, mime: files.mime, size: files.size })
      .from(campaignAttachments)
      .innerJoin(files, eq(files.id, campaignAttachments.fileId))
      .where(eq(campaignAttachments.campaignId, campaign.id));
    return c.json({
      campaign: {
        ...campaign,
        coverUrl: fileUrl(campaign.coverFileId),
        budget: budget.map((b) => ({ label: b.label, amount: b.amount })),
        attachments: attachments.map((a) => ({ ...a, url: fileUrl(a.fileId) })),
      },
    });
  })
  .patch("/:id", async (c) => {
    const { db, user, campaign } = await ownCampaign(c, c.req.param("id"));
    if (!EDITABLE_STATUSES.has(campaign.status)) return c.json({ error: "Завершений збір не можна редагувати." }, 400);
    const input = await body(c, draftSchema.partial());
    await applyDraft(db, user, campaign.id, input as z.infer<typeof draftSchema>, campaign);
    // Editing a rejected campaign returns it to draft.
    if (campaign.status === "rejected") await db.update(campaigns).set({ status: "draft" }).where(eq(campaigns.id, campaign.id));
    return c.json({ ok: true });
  })
  .delete("/:id", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    if (!["draft", "rejected"].includes(campaign.status)) return c.json({ error: "Видаляти можна лише чернетки." }, 400);
    await db.delete(budgetItems).where(eq(budgetItems.campaignId, campaign.id));
    await db.delete(campaignAttachments).where(eq(campaignAttachments.campaignId, campaign.id));
    await db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    return c.json({ ok: true });
  })
  .post("/:id/submit", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    if (!["draft", "rejected"].includes(campaign.status)) return c.json({ error: "Збір вже надіслано на перевірку." }, 400);
    const missing: string[] = [];
    if (campaign.title.length < 5) missing.push("назва");
    if (campaign.description.length < 80) missing.push("опис (мінімум 80 символів)");
    if (!campaign.goalAmount || campaign.goalAmount < 100) missing.push("ціль збору (від 100 ₴)");
    if (!campaign.jarUrl) missing.push("посилання на банку Monobank");
    if (missing.length) return c.json({ error: `Заповніть: ${missing.join(", ")}.` }, 400);
    await db.update(campaigns).set({ status: "pending", submittedAt: Date.now(), rejectionReason: null, updatedAt: Date.now() }).where(eq(campaigns.id, campaign.id));
    return c.json({ ok: true, status: "pending" });
  })
  .post("/:id/progress", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    if (!["active", "goal_reached"].includes(campaign.status)) return c.json({ error: "Прогрес можна оновлювати лише для активного збору." }, 400);
    const input = await body(c, z.object({ raisedAmount: z.number().int().min(0).max(1_000_000_000) }));
    const patch: Partial<Campaign> = { raisedAmount: input.raisedAmount, raisedUpdatedAt: Date.now(), updatedAt: Date.now() };
    if (campaign.goalAmount > 0 && input.raisedAmount >= campaign.goalAmount && campaign.status === "active") {
      patch.status = "goal_reached";
      patch.goalReachedAt = Date.now();
    }
    await db.update(campaigns).set(patch).where(eq(campaigns.id, campaign.id));
    return c.json({ ok: true, status: patch.status ?? campaign.status });
  })
  .post("/:id/complete", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    if (!["active", "goal_reached"].includes(campaign.status)) return c.json({ error: "Цей збір не можна завершити." }, 400);
    await db.update(campaigns).set({ status: "completed", completedAt: Date.now(), updatedAt: Date.now() }).where(eq(campaigns.id, campaign.id));
    return c.json({ ok: true });
  })
  .post("/:id/updates", async (c) => {
    const { db, user, campaign } = await ownCampaign(c, c.req.param("id"));
    if (!["active", "goal_reached", "completed"].includes(campaign.status)) return c.json({ error: "Оновлення доступні після публікації збору." }, 400);
    const input = await body(
      c,
      z.object({
        kind: z.enum(["update", "purchase", "final_report"]),
        title: z.string().trim().min(3, "Додайте заголовок").max(140),
        body: z.string().trim().min(10, "Опишіть оновлення детальніше").max(10_000),
        spentAmount: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
        fileIds: z.array(z.string().max(40)).max(10).default([]),
      }),
    );
    for (const f of input.fileIds) await assertOwnFile(db, f, campaign.organizerId);
    const id = newId("up_");
    await db.insert(campaignUpdates).values({
      id,
      campaignId: campaign.id,
      authorId: user.id,
      kind: input.kind,
      title: input.title,
      body: input.body,
      spentAmount: input.spentAmount ?? null,
      fileIds: JSON.stringify(input.fileIds),
      createdAt: Date.now(),
    });
    if (input.kind === "final_report") {
      await awardXp(db, campaign.organizerId, "final_report", campaign.id);
      if (campaign.status !== "completed")
        await db.update(campaigns).set({ status: "completed", completedAt: Date.now() }).where(eq(campaigns.id, campaign.id));
    } else {
      await awardXp(db, campaign.organizerId, "campaign_update", id);
    }
    await evaluateProgress(db, campaign.organizerId);
    return c.json({ id }, 201);
  })
  .post("/:id/attachments", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    const input = await body(c, z.object({ fileId: z.string().max(40), title: z.string().trim().min(1, "Додайте назву документа").max(140) }));
    await assertOwnFile(db, input.fileId, campaign.organizerId);
    const [{ n }] = await db.select({ n: count() }).from(campaignAttachments).where(eq(campaignAttachments.campaignId, campaign.id));
    if (n >= 15) return c.json({ error: "Максимум 15 документів." }, 400);
    const id = newId("at_");
    await db.insert(campaignAttachments).values({ id, campaignId: campaign.id, fileId: input.fileId, title: input.title, createdAt: Date.now() });
    return c.json({ id }, 201);
  })
  .delete("/:id/attachments/:aid", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    await db.delete(campaignAttachments).where(and(eq(campaignAttachments.id, c.req.param("aid")), eq(campaignAttachments.campaignId, campaign.id)));
    return c.json({ ok: true });
  })
  .get("/:id/stats", async (c) => {
    const { db, campaign } = await ownCampaign(c, c.req.param("id"));
    const since = Date.now() - 30 * DAY;
    const views = await db
      .select({ day: campaignViews.day, n: count() })
      .from(campaignViews)
      .where(and(eq(campaignViews.campaignId, campaign.id), gte(campaignViews.day, dayKey(since))))
      .groupBy(campaignViews.day);
    const [{ n: followers }] = await db.select({ n: count() }).from(follows).where(eq(follows.campaignId, campaign.id));
    const [{ n: savesN }] = await db.select({ n: count() }).from(saves).where(eq(saves.campaignId, campaign.id));
    const [{ n: sharesN }] = await db.select({ n: count() }).from(shares).where(eq(shares.campaignId, campaign.id));
    const [{ n: referred }] = await db.select({ n: count() }).from(referralVisits).where(eq(referralVisits.campaignId, campaign.id));
    const days: { day: string; views: number }[] = [];
    const vm = new Map(views.map((v) => [v.day, v.n]));
    for (let i = 29; i >= 0; i--) {
      const d = dayKey(Date.now() - i * DAY);
      days.push({ day: d, views: vm.get(d) ?? 0 });
    }
    return c.json({
      totals: { views: campaign.viewCount, followers, saves: savesN, shares: sharesN, referredVisitors: referred, donateClicks: campaign.donateClicks, progress: progressOf(campaign) },
      days,
    });
  });
