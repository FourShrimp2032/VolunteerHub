/**
 * Helping jars (допоміжні банки).
 *
 * A verified organization publishes a main fundraiser with a stock image (the template).
 * Anyone can then open their own Monobank jar for it in three steps; the browser places the
 * helper's photo and «МОЯ ЦІЛЬ: N ГРН» onto the template exactly as the organization set it
 * up, so every helper's post looks alike. Helper jars are read token-less (lib/monobank-public)
 * and their sum is credited to the main fundraiser.
 */
import { and, eq, inArray, isNull, lt, ne, or, sql, sum } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../db/client";
import { campaigns, helperJars, type Campaign, type HelperJar } from "../db/schema";
import { totalRaised } from "./discovery";
import { awardXp, evaluateProgress } from "./gamification";
import { fetchPublicJar, PUBLIC_POLL_MS } from "./monobank-public";

/** Fonts the renderer can load (all have Cyrillic on Google Fonts). Keep in sync with the frontend. */
export const TEMPLATE_FONTS = [
  "Unbounded",
  "Montserrat",
  "Rubik",
  "Manrope",
  "Oswald",
  "Golos Text",
  "Russo One",
  "Exo 2",
  "Roboto Condensed",
  "Playfair Display",
  "Comfortaa",
  "Days One",
] as const;

const frac = z.number().min(0).max(1);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Колір має бути у форматі #RRGGBB");

/** Positions are fractions of the template's width/height, so any image size works. */
export const templateConfigSchema = z.object({
  photo: z.object({
    x: frac,
    y: frac,
    w: z.number().min(0.05).max(1),
    h: z.number().min(0.05).max(1),
    /** Corner radius as a fraction of the slot's shorter side. */
    radius: z.number().min(0).max(0.5).default(0),
    /** under: the template has a transparent window and is drawn on top of the photo. */
    layer: z.enum(["over", "under"]).default("over"),
  }),
  goal: z.object({
    x: frac,
    y: frac,
    align: z.enum(["left", "center", "right"]).default("left"),
    /** Cap height of the text as a fraction of the template width. */
    size: z.number().min(0.015).max(0.25),
    font: z.enum(TEMPLATE_FONTS).default("Unbounded"),
    weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800), z.literal(900)]).default(800),
    color: hex.default("#111111"),
    /** inline: «МОЯ ЦІЛЬ: 3 500 ГРН». stacked: label above a bigger number. */
    layout: z.enum(["inline", "stacked"]).default("inline"),
    uppercase: z.boolean().default(true),
    currency: z.enum(["ГРН", "грн", "₴", ""]).default("ГРН"),
  }),
});
export type TemplateConfig = z.infer<typeof templateConfigSchema>;

export function parseTemplateConfig(raw: string | null): TemplateConfig | null {
  if (!raw) return null;
  try {
    const r = templateConfigSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export const DEFAULT_CAPTION =
  "Я відкрив(ла) допоміжну банку для збору «{title}» від {org}. Моя ціль: {goal} ₴, загальна ціль збору: {total} ₴.\n\nКожна гривня важлива! Задонатити: {jar}\nПро збір: {link}";

export function renderCaption(template: string, v: Record<"title" | "org" | "goal" | "total" | "jar" | "link" | "name", string>) {
  return (template.trim() || DEFAULT_CAPTION).replace(/\{(title|org|goal|total|jar|link|name)\}/g, (_, k: keyof typeof v) => v[k]);
}

/** Helper jars are accepted on published, non-demo fundraisers that are still collecting. */
export function acceptsHelpers(c: Pick<Campaign, "status" | "isDemo">) {
  return !c.isDemo && (c.status === "active" || c.status === "goal_reached");
}

/** Re-sums a fundraiser's visible helper jars into the cached columns, and marks the goal reached if the total got there. */
export async function recomputeHelpers(db: DB, campaignId: string) {
  const [agg] = await db
    .select({ total: sum(helperJars.raisedAmount), n: sql<number>`count(*)` })
    .from(helperJars)
    .where(and(eq(helperJars.campaignId, campaignId), ne(helperJars.status, "hidden")));
  const helpersRaised = Number(agg?.total ?? 0);
  const helpersCount = Number(agg?.n ?? 0);
  const [camp] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!camp) return;
  const patch: Partial<Campaign> = { helpersRaised, helpersCount };
  if (camp.status === "active" && camp.goalAmount > 0 && totalRaised({ ...camp, helpersRaised }) >= camp.goalAmount) {
    patch.status = "goal_reached";
    patch.goalReachedAt = Date.now();
  }
  await db.update(campaigns).set(patch).where(eq(campaigns.id, campaignId));
}

/** Reads one helper jar's public balance; the total only ever goes up (withdrawals lower the balance). */
export async function pollHelperJar(db: DB, h: HelperJar): Promise<HelperJar> {
  if (h.status === "hidden") return h;
  const jar = await fetchPublicJar(h.jarId);
  if (!jar) return h;
  const now = Date.now();
  const amount = Math.max(h.raisedAmount, jar.balance);
  const patch: Partial<HelperJar> = { raisedAmount: amount, raisedUpdatedAt: now, raisedSource: "jar_public" };
  if (amount !== h.raisedAmount) patch.updatedAt = now;
  const reached = !h.goalReachedAt && h.goalAmount > 0 && amount >= h.goalAmount;
  if (reached) patch.goalReachedAt = now;
  await db.update(helperJars).set(patch).where(eq(helperJars.id, h.id));
  if (amount !== h.raisedAmount) await recomputeHelpers(db, h.campaignId);
  if (reached) {
    await awardXp(db, h.userId, "helper_goal", h.id);
    await evaluateProgress(db, h.userId);
  }
  return { ...h, ...patch };
}

/** Cron: helper jars due for a read, oldest first. */
export async function pollHelperJars(db: DB, { limit = 40 } = {}) {
  const cutoff = Date.now() - PUBLIC_POLL_MS + 30_000;
  const live = db.select({ id: campaigns.id }).from(campaigns).where(inArray(campaigns.status, ["active", "goal_reached"]));
  const due = await db
    .select()
    .from(helperJars)
    .where(and(eq(helperJars.status, "active"), inArray(helperJars.campaignId, live), or(isNull(helperJars.raisedUpdatedAt), lt(helperJars.raisedUpdatedAt, cutoff))))
    .orderBy(helperJars.raisedUpdatedAt)
    .limit(limit);
  let changed = 0;
  for (const h of due) if ((await pollHelperJar(db, h)).raisedAmount !== h.raisedAmount) changed++;
  return { due: due.length, changed };
}
