/** Helping jars (допоміжні банки): see lib/helpers.ts. */
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getDb, type DB } from "../db/client";
import { campaigns, files, helperJars, users, type Campaign, type HelperJar, type User } from "../db/schema";
import type { AppEnv } from "../env";
import { rateLimit, requireUser } from "../lib/auth";
import { DAY } from "../lib/constants";
import { totalRaised } from "../lib/discovery";
import { awardXp, evaluateProgress, levelForXp } from "../lib/gamification";
import { acceptsHelpers, parseTemplateConfig, pollHelperJar, recomputeHelpers, renderCaption } from "../lib/helpers";
import { parseJarUrl } from "../lib/monobank";
import { PUBLIC_VIEW_STALE_MS } from "../lib/monobank-public";
import { fileUrl } from "../lib/serialize";
import { newId } from "../lib/util";
import { body } from "../lib/validate";

const cropSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), zoom: z.number().min(1).max(4) });

const createSchema = z.object({
  campaignId: z.string().max(40),
  displayName: z.string().trim().min(2, "Вкажіть ім'я (від 2 символів)").max(60),
  goalAmount: z.number({ message: "Вкажіть ціль" }).int().min(100, "Ціль від 100 ₴").max(100_000_000),
  photoFileId: z.string().max(40, "Завантажте фото"),
  photoCrop: cropSchema.default({ x: 0.5, y: 0.5, zoom: 1 }),
  jarUrl: z.string().trim().min(1, "Вставте посилання на банку").max(300),
});

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  goalAmount: z.number().int().min(100).max(100_000_000).optional(),
  photoFileId: z.string().max(40).optional(),
  photoCrop: cropSchema.optional(),
  shareFileId: z.string().max(40).nullable().optional(),
});

/** Public shape of a helper jar. */
export function helperOut(h: HelperJar, u?: Pick<User, "id" | "xp" | "isDemo"> | null) {
  return {
    id: h.id,
    campaignId: h.campaignId,
    displayName: h.displayName,
    goalAmount: h.goalAmount,
    raisedAmount: h.raisedAmount,
    raisedUpdatedAt: h.raisedUpdatedAt,
    raisedSource: h.raisedSource === "jar_public" ? ("monobank_public" as const) : ("pending" as const),
    progress: h.goalAmount > 0 ? Math.min(1, h.raisedAmount / h.goalAmount) : 0,
    goalReached: !!h.goalReachedAt,
    photoUrl: fileUrl(h.photoFileId),
    photoCrop: safeCrop(h.photoCrop),
    shareImageUrl: fileUrl(h.shareFileId),
    jarUrl: h.jarUrl,
    status: h.status,
    createdAt: h.createdAt,
    user: u ? { id: u.id, level: levelForXp(u.xp) } : null,
  };
}

function safeCrop(raw: string) {
  try {
    const r = cropSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : { x: 0.5, y: 0.5, zoom: 1 };
  } catch {
    return { x: 0.5, y: 0.5, zoom: 1 };
  }
}

/** What the browser needs to draw the share image and caption for a fundraiser. */
export function templateOut(c: Campaign, org: User | null) {
  return {
    url: fileUrl(c.templateFileId),
    fileId: c.templateFileId,
    config: parseTemplateConfig(c.templateConfig),
    captionTemplate: c.captionTemplate,
    title: c.title,
    orgName: org ? org.orgName || org.name : "",
    totalGoal: c.goalAmount,
  };
}

async function assertOwnImage(db: DB, fileId: string, userId: string) {
  const [f] = await db.select({ ownerId: files.ownerId, visibility: files.visibility, mime: files.mime }).from(files).where(eq(files.id, fileId)).limit(1);
  if (!f || f.ownerId !== userId || f.visibility !== "public" || !f.mime.startsWith("image/")) throw new HTTPException(400, { message: "Завантажте фото ще раз." });
}

async function loadHelper(db: DB, id: string) {
  const [h] = await db.select().from(helperJars).where(eq(helperJars.id, id)).limit(1);
  if (!h) throw new HTTPException(404, { message: "Банку не знайдено." });
  return h;
}

async function ownHelper(c: Context<AppEnv>, id: string) {
  const user = requireUser(c);
  const db = getDb(c.env.DB);
  const h = await loadHelper(db, id);
  if (h.userId !== user.id && user.role !== "admin") throw new HTTPException(403, { message: "Це не ваша банка." });
  return { user, db, helper: h };
}

/** A jar can back only one thing: not a fundraiser's own jar and not another open helper jar. */
async function assertJarFree(db: DB, jarId: string, exceptHelperId?: string) {
  const [main] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.jarId, jarId)).limit(1);
  if (main) throw new HTTPException(400, { message: "Ця банка вже використовується як основна банка збору. Створіть окрему банку." });
  const [other] = await db
    .select({ id: helperJars.id })
    .from(helperJars)
    .where(and(eq(helperJars.jarId, jarId), ne(helperJars.status, "closed"), exceptHelperId ? ne(helperJars.id, exceptHelperId) : undefined))
    .limit(1);
  if (other) throw new HTTPException(400, { message: "Ця банка вже прив'язана до іншої допоміжної банки. Створіть нову банку в Monobank." });
}

function maybeRefresh(c: Context<AppEnv>, db: DB, h: HelperJar) {
  if (h.status !== "active") return;
  if (h.raisedUpdatedAt && Date.now() - h.raisedUpdatedAt < PUBLIC_VIEW_STALE_MS) return;
  try {
    c.executionCtx.waitUntil(pollHelperJar(db, h));
  } catch {
    /* no execution context (tests) */
  }
}

export const helperRoutes = new Hono<AppEnv>()
  // Public list for a fundraiser, biggest first. The organization (and admins) also see hidden ones.
  .get("/", async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const campaignId = c.req.query("campaign") ?? "";
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!camp) return c.json({ error: "Збір не знайдено." }, 404);
    const manager = !!user && (user.id === camp.organizerId || user.role === "admin");
    const rows = await db
      .select({ h: helperJars, u: { id: users.id, xp: users.xp, isDemo: users.isDemo } })
      .from(helperJars)
      .innerJoin(users, eq(users.id, helperJars.userId))
      .where(and(eq(helperJars.campaignId, camp.id), manager && c.req.query("all") === "1" ? undefined : eq(helperJars.status, "active")))
      .orderBy(desc(helperJars.raisedAmount), desc(helperJars.createdAt))
      .limit(manager ? 500 : 60);
    return c.json({ items: rows.map(({ h, u }) => ({ ...helperOut(h, u), donateClicks: manager ? h.donateClicks : undefined, viewCount: manager ? h.viewCount : undefined })) });
  })

  .get("/mine", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const rows = await db
      .select({ h: helperJars, c: { id: campaigns.id, slug: campaigns.slug, title: campaigns.title, status: campaigns.status } })
      .from(helperJars)
      .innerJoin(campaigns, eq(campaigns.id, helperJars.campaignId))
      .where(eq(helperJars.userId, user.id))
      .orderBy(desc(helperJars.createdAt));
    return c.json({ items: rows.map(({ h, c: camp }) => ({ ...helperOut(h), campaign: camp, donateClicks: h.donateClicks, viewCount: h.viewCount })) });
  })

  .post("/", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const input = await body(c, createSchema);
    if (!(await rateLimit(db, `helper:${user.id}`, 10, DAY))) return c.json({ error: "Забагато нових банок за добу." }, 429);
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
    if (!camp) return c.json({ error: "Збір не знайдено." }, 404);
    if (!acceptsHelpers(camp)) return c.json({ error: camp.isDemo ? "Це демо-збір: допоміжні банки для нього не відкриваються." : "Цей збір уже не приймає нові допоміжні банки." }, 400);
    if (camp.organizerId === user.id) return c.json({ error: "Ви організатор цього збору: донати й так надходять на вашу банку." }, 400);
    const [existing] = await db.select().from(helperJars).where(and(eq(helperJars.userId, user.id), eq(helperJars.campaignId, camp.id))).limit(1);
    if (existing && existing.status !== "closed") return c.json({ error: "У вас уже є допоміжна банка для цього збору.", helperId: existing.id }, 409);
    const jar = parseJarUrl(input.jarUrl);
    if (!jar.ok) return c.json({ error: jar.error }, 400);
    await assertJarFree(db, jar.jarId, existing?.id);
    await assertOwnImage(db, input.photoFileId, user.id);

    const now = Date.now();
    const values = {
      displayName: input.displayName,
      goalAmount: input.goalAmount,
      photoFileId: input.photoFileId,
      photoCrop: JSON.stringify(input.photoCrop),
      jarUrl: jar.url,
      jarId: jar.jarId,
      shareFileId: null,
      // Reopening with the same jar keeps what it already raised; a new jar starts from zero.
      raisedAmount: existing && existing.jarId === jar.jarId ? existing.raisedAmount : 0,
      raisedUpdatedAt: null,
      raisedSource: "organizer",
      goalReachedAt: existing && existing.jarId === jar.jarId ? existing.goalReachedAt : null,
      status: "active",
      updatedAt: now,
    };
    let id: string;
    if (existing) {
      id = existing.id; // reopening a closed jar keeps its id (and its shared links)
      await db.update(helperJars).set(values).where(eq(helperJars.id, id));
    } else {
      id = newId("h_");
      await db.insert(helperJars).values({ id, campaignId: camp.id, userId: user.id, createdAt: now, ...values });
    }
    let h = await loadHelper(db, id);
    h = await pollHelperJar(db, h); // first read right away, so the total starts correct
    await recomputeHelpers(db, camp.id);
    const xp = await awardXp(db, user.id, "helper_created", camp.id);
    const { newAchievements } = await evaluateProgress(db, user.id);
    return c.json({ helper: helperOut(h), xp, newAchievements }, 201);
  })

  .get("/:id", async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const h = await loadHelper(db, c.req.param("id"));
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, h.campaignId)).limit(1);
    if (!camp) return c.json({ error: "Банку не знайдено." }, 404);
    const isOwner = !!user && user.id === h.userId;
    const manager = !!user && (user.id === camp.organizerId || user.role === "admin");
    if (h.status !== "active" && !isOwner && !manager) return c.json({ error: "Банку закрито." }, 404);
    maybeRefresh(c, db, h);
    const [org] = await db.select().from(users).where(eq(users.id, camp.organizerId)).limit(1);
    const [u] = await db.select({ id: users.id, xp: users.xp, isDemo: users.isDemo }).from(users).where(eq(users.id, h.userId)).limit(1);
    const origin = new URL(c.req.url).origin;
    const link = `${origin}/campaigns/${camp.slug}?jar=${h.id}`;
    return c.json({
      helper: helperOut(h, u ?? null),
      campaign: { id: camp.id, slug: camp.slug, title: camp.title, goalAmount: camp.goalAmount, raisedAmount: totalRaised(camp), status: camp.status, isDemo: camp.isDemo },
      template: templateOut(camp, org ?? null),
      share: {
        link,
        caption: renderCaption(camp.captionTemplate, {
          title: camp.title,
          org: org ? org.orgName || org.name : "",
          goal: h.goalAmount.toLocaleString("uk-UA"),
          total: camp.goalAmount.toLocaleString("uk-UA"),
          jar: h.jarUrl,
          link,
          name: h.displayName,
        }),
      },
      viewer: { isOwner, isManager: manager },
    });
  })

  .patch("/:id", async (c) => {
    const { db, user, helper } = await ownHelper(c, c.req.param("id"));
    if (helper.status === "hidden") return c.json({ error: "Банку приховала організація." }, 400);
    const input = await body(c, patchSchema);
    const patch: Partial<HelperJar> = { updatedAt: Date.now() };
    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (input.goalAmount !== undefined) {
      patch.goalAmount = input.goalAmount;
      if (helper.raisedAmount < input.goalAmount) patch.goalReachedAt = null;
    }
    if (input.photoFileId !== undefined) {
      await assertOwnImage(db, input.photoFileId, helper.userId);
      patch.photoFileId = input.photoFileId;
    }
    if (input.photoCrop !== undefined) patch.photoCrop = JSON.stringify(input.photoCrop);
    if (input.shareFileId !== undefined) {
      if (input.shareFileId) await assertOwnImage(db, input.shareFileId, user.id);
      patch.shareFileId = input.shareFileId;
    }
    await db.update(helperJars).set(patch).where(eq(helperJars.id, helper.id));
    return c.json({ helper: helperOut({ ...helper, ...patch }) });
  })

  // The helper closes their jar: it disappears from the fundraiser, and its money stops counting.
  .delete("/:id", async (c) => {
    const { db, helper } = await ownHelper(c, c.req.param("id"));
    await db.update(helperJars).set({ status: "closed", updatedAt: Date.now() }).where(eq(helperJars.id, helper.id));
    await recomputeHelpers(db, helper.campaignId);
    return c.json({ ok: true });
  })

  // The organization (or a moderator) hides a helper jar it doesn't recognise.
  .post("/:id/visibility", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    const h = await loadHelper(db, c.req.param("id"));
    const [camp] = await db.select({ organizerId: campaigns.organizerId }).from(campaigns).where(eq(campaigns.id, h.campaignId)).limit(1);
    if (!camp || (camp.organizerId !== user.id && user.role !== "admin")) return c.json({ error: "Приховувати банки може лише організація збору." }, 403);
    const input = await body(c, z.object({ hidden: z.boolean() }));
    if (h.status === "closed") return c.json({ error: "Банку закрив її власник." }, 400);
    await db.update(helperJars).set({ status: input.hidden ? "hidden" : "active", updatedAt: Date.now() }).where(eq(helperJars.id, h.id));
    await recomputeHelpers(db, h.campaignId);
    return c.json({ ok: true });
  })

  .post("/:id/view", async (c) => {
    const db = getDb(c.env.DB);
    const h = await loadHelper(db, c.req.param("id"));
    const user = c.get("user");
    if (h.status === "active" && user?.id !== h.userId) await db.update(helperJars).set({ viewCount: sql`${helperJars.viewCount} + 1` }).where(eq(helperJars.id, h.id));
    return c.json({ ok: true });
  })

  .get("/:id/donate", async (c) => {
    const db = getDb(c.env.DB);
    const h = await loadHelper(db, c.req.param("id"));
    const jar = parseJarUrl(h.jarUrl); // re-validate: never an open redirect
    if (h.status !== "active" || !jar.ok) return c.json({ error: "Банка недоступна." }, 404);
    await db.update(helperJars).set({ donateClicks: sql`${helperJars.donateClicks} + 1` }).where(eq(helperJars.id, h.id));
    c.header("Referrer-Policy", "no-referrer");
    return c.redirect(jar.url, 302);
  });

/** Used by the campaign detail endpoint: the biggest helper jars for the page. */
export async function topHelpers(db: DB, campaignId: string, limit = 12) {
  const rows = await db
    .select({ h: helperJars, u: { id: users.id, xp: users.xp, isDemo: users.isDemo } })
    .from(helperJars)
    .innerJoin(users, eq(users.id, helperJars.userId))
    .where(and(eq(helperJars.campaignId, campaignId), eq(helperJars.status, "active")))
    .orderBy(desc(helperJars.raisedAmount), desc(helperJars.createdAt))
    .limit(limit);
  return rows.map(({ h, u }) => helperOut(h, u));
}

export async function helperForCampaign(db: DB, campaignId: string, helperId: string) {
  const [h] = await db
    .select()
    .from(helperJars)
    .where(and(eq(helperJars.id, helperId), eq(helperJars.campaignId, campaignId), inArray(helperJars.status, ["active"])))
    .limit(1);
  return h ?? null;
}
