import { and, count, desc, eq, like, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db/client";
import { campaigns, contentReports, sessions, users, verificationRequests } from "../db/schema";
import type { AppEnv } from "../env";
import { requireAdmin } from "../lib/auth";
import { awardXp, evaluateProgress } from "../lib/gamification";
import { campaignCards, privateUser } from "../lib/serialize";
import { body } from "../lib/validate";

export const adminRoutes = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    requireAdmin(c);
    await next();
  })
  .get("/overview", async (c) => {
    const db = getDb(c.env.DB);
    const [{ n: pending }] = await db.select({ n: count() }).from(campaigns).where(eq(campaigns.status, "pending"));
    const [{ n: verifs }] = await db.select({ n: count() }).from(verificationRequests).where(eq(verificationRequests.status, "pending"));
    const [{ n: reports }] = await db.select({ n: count() }).from(contentReports).where(eq(contentReports.status, "open"));
    const [{ n: usersN }] = await db.select({ n: count() }).from(users);
    return c.json({ pending, verifications: verifs, reports, users: usersN });
  })
  .get("/campaigns", async (c) => {
    const db = getDb(c.env.DB);
    const status = c.req.query("status") ?? "pending";
    const rows = await db.select().from(campaigns).where(eq(campaigns.status, status)).orderBy(desc(campaigns.submittedAt)).limit(100);
    const cards = await campaignCards(db, rows);
    const byId = new Map(rows.map((r) => [r.id, r]));
    return c.json({
      items: cards.map((x) => ({ ...x, description: byId.get(x.id)?.description ?? "", jarUrl: byId.get(x.id)?.jarUrl ?? null, submittedAt: byId.get(x.id)?.submittedAt ?? null })),
    });
  })
  .post("/campaigns/:id/approve", async (c) => {
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ destinationVerified: z.boolean().default(false) }));
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, c.req.param("id")));
    if (!camp) return c.json({ error: "Збір не знайдено." }, 404);
    if (camp.status !== "pending") return c.json({ error: "Збір не очікує модерації." }, 400);
    const now = Date.now();
    await db
      .update(campaigns)
      .set({
        status: camp.goalAmount > 0 && camp.raisedAmount >= camp.goalAmount ? "goal_reached" : "active",
        purposeReviewedAt: now,
        destinationVerifiedAt: input.destinationVerified ? now : null,
        publishedAt: camp.publishedAt ?? now,
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(campaigns.id, camp.id));
    await awardXp(db, camp.organizerId, "campaign_published", camp.id);
    await evaluateProgress(db, camp.organizerId);
    return c.json({ ok: true });
  })
  .post("/campaigns/:id/reject", async (c) => {
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ reason: z.string().trim().min(5, "Вкажіть причину відхилення").max(1000) }));
    const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, c.req.param("id")));
    if (!camp) return c.json({ error: "Збір не знайдено." }, 404);
    await db.update(campaigns).set({ status: "rejected", rejectionReason: input.reason, updatedAt: Date.now() }).where(eq(campaigns.id, camp.id));
    return c.json({ ok: true });
  })
  .post("/campaigns/:id/destination", async (c) => {
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ verified: z.boolean() }));
    await db.update(campaigns).set({ destinationVerifiedAt: input.verified ? Date.now() : null }).where(eq(campaigns.id, c.req.param("id")));
    return c.json({ ok: true });
  })
  .get("/verifications", async (c) => {
    const db = getDb(c.env.DB);
    const rows = await db
      .select({ r: verificationRequests, name: users.name, email: users.email })
      .from(verificationRequests)
      .innerJoin(users, eq(users.id, verificationRequests.userId))
      .where(eq(verificationRequests.status, c.req.query("status") ?? "pending"))
      .orderBy(desc(verificationRequests.createdAt))
      .limit(100);
    return c.json({ items: rows.map(({ r, name, email }) => ({ ...r, name, email, fileUrl: r.fileId ? `/api/files/${r.fileId}` : null })) });
  })
  .post("/verifications/:id", async (c) => {
    const admin = requireAdmin(c);
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).default("") }));
    const [r] = await db.select().from(verificationRequests).where(eq(verificationRequests.id, c.req.param("id")));
    if (!r || r.status !== "pending") return c.json({ error: "Запит не знайдено." }, 404);
    await db
      .update(verificationRequests)
      .set({ status: input.decision, reviewNote: input.note, reviewerId: admin.id, reviewedAt: Date.now() })
      .where(eq(verificationRequests.id, r.id));
    if (input.decision === "approved") await db.update(users).set({ identityVerifiedAt: Date.now() }).where(eq(users.id, r.userId));
    return c.json({ ok: true });
  })
  .get("/reports", async (c) => {
    const db = getDb(c.env.DB);
    const rows = await db
      .select({ r: contentReports, title: campaigns.title, slug: campaigns.slug, campaignStatus: campaigns.status })
      .from(contentReports)
      .innerJoin(campaigns, eq(campaigns.id, contentReports.campaignId))
      .where(eq(contentReports.status, c.req.query("status") ?? "open"))
      .orderBy(desc(contentReports.createdAt))
      .limit(100);
    return c.json({ items: rows.map(({ r, ...rest }) => ({ ...r, ...rest })) });
  })
  .post("/reports/:id", async (c) => {
    const admin = requireAdmin(c);
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ action: z.enum(["dismiss", "unpublish"]), reason: z.string().trim().max(1000).default("") }));
    const [r] = await db.select().from(contentReports).where(eq(contentReports.id, c.req.param("id")));
    if (!r) return c.json({ error: "Скаргу не знайдено." }, 404);
    if (input.action === "unpublish") {
      await db
        .update(campaigns)
        .set({ status: "rejected", rejectionReason: input.reason || "Знято з публікації після розгляду скарги." })
        .where(eq(campaigns.id, r.campaignId));
    }
    await db
      .update(contentReports)
      .set({ status: input.action === "dismiss" ? "dismissed" : "resolved", resolvedBy: admin.id })
      .where(and(eq(contentReports.campaignId, r.campaignId), eq(contentReports.status, "open")));
    return c.json({ ok: true });
  })
  .get("/users", async (c) => {
    const db = getDb(c.env.DB);
    const q = (c.req.query("q") ?? "").trim();
    const rows = await db
      .select()
      .from(users)
      .where(q ? or(like(users.email, `%${q}%`), like(users.name, `%${q}%`)) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(100);
    return c.json({ items: rows.map((u) => ({ ...privateUser(u), isBlocked: u.isBlocked })) });
  })
  .post("/users/:id", async (c) => {
    const admin = requireAdmin(c);
    const db = getDb(c.env.DB);
    const input = await body(c, z.object({ role: z.enum(["user", "admin"]).optional(), isBlocked: z.boolean().optional(), identityVerified: z.boolean().optional() }));
    const id = c.req.param("id");
    if (id === admin.id && (input.role === "user" || input.isBlocked)) return c.json({ error: "Не можна змінити власну роль чи заблокувати себе." }, 400);
    await db
      .update(users)
      .set({
        ...(input.role && { role: input.role }),
        ...(input.isBlocked !== undefined && { isBlocked: input.isBlocked }),
        ...(input.identityVerified === false && { identityVerifiedAt: null }),
      })
      .where(eq(users.id, id));
    if (input.isBlocked) await db.delete(sessions).where(eq(sessions.userId, id));
    return c.json({ ok: true });
  });
