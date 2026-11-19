/**
 * Fair discovery — a transparent, rule-based ranking.
 *
 * Volunteerhub deliberately does NOT rank by popularity or money raised alone.
 * The score rewards: freshness, low exposure (few unique views so far), verified
 * information, urgency, closeness to the goal and the viewer's interests.
 * Nothing here can be bought: plan / subscription is never an input.
 */
import type { Campaign } from "../db/schema";
import { DAY } from "./constants";

export type RankInput = Pick<
  Campaign,
  "id" | "category" | "goalAmount" | "raisedAmount" | "publishedAt" | "viewCount" | "deadline" | "urgent" | "purposeReviewedAt" | "destinationVerifiedAt" | "status"
> & { organizerVerified: boolean };

export type RankContext = { now: number; interests: string[]; followedIds?: Set<string> };

type Raised = { goalAmount: number; raisedAmount: number; helpersRaised?: number; helpersInTotal?: boolean };

/** The organization's own jar plus its helping jars (unless helpers transfer into the main jar). */
export function totalRaised(c: Raised) {
  return c.raisedAmount + (c.helpersInTotal === false ? 0 : (c.helpersRaised ?? 0));
}

export function progressOf(c: Raised) {
  return c.goalAmount > 0 ? Math.min(1, totalRaised(c) / c.goalAmount) : 0;
}

export function scoreCampaign(c: RankInput, ctx: RankContext) {
  const ageDays = c.publishedAt ? (ctx.now - c.publishedAt) / DAY : 999;
  const freshness = Math.max(0, 1 - ageDays / 21); // 1 → 0 over three weeks
  const exposure = 1 / (1 + c.viewCount / 60); // fewer views → higher boost
  const trust = (c.purposeReviewedAt ? 0.4 : 0) + (c.destinationVerifiedAt ? 0.3 : 0) + (c.organizerVerified ? 0.3 : 0);
  const daysLeft = c.deadline ? (c.deadline - ctx.now) / DAY : null;
  const urgency = c.urgent ? 1 : daysLeft !== null && daysLeft >= 0 ? Math.max(0, 1 - daysLeft / 14) : 0;
  const p = progressOf(c);
  const nearGoal = p >= 0.6 && p < 1 ? p : 0;
  const interest = ctx.interests.includes(c.category) ? 1 : 0;

  const score = 1.2 * freshness + 1.5 * exposure + 1.0 * trust + 1.0 * urgency + 0.8 * nearGoal + 1.2 * interest;
  const reasons: string[] = [];
  if (freshness > 0.6) reasons.push("Новий збір");
  if (exposure > 0.6) reasons.push("Мало переглядів");
  if (urgency > 0.5) reasons.push("Терміново");
  if (nearGoal) reasons.push("Близько до цілі");
  if (interest) reasons.push("Ваша категорія");
  return { score, reasons };
}

export function isOpen(c: { status: string }) {
  return c.status === "active";
}

/** Deterministic daily shuffle so featured slots rotate fairly instead of always showing the same campaigns. */
export function dailyRotation<T extends { id: string }>(items: T[], now: number): T[] {
  const day = Math.floor(now / DAY);
  const h = (s: string) => {
    let x = day * 2654435761;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 2246822519) >>> 0;
    return x;
  };
  return [...items].sort((a, b) => h(a.id) - h(b.id));
}

export function buildSections<T extends RankInput>(all: T[], ctx: RankContext) {
  const open = all.filter(isOpen);
  const scored = open.map((c) => ({ c, ...scoreCampaign(c, ctx) }));

  const fresh = [...open].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  const attention = open
    .filter((c) => c.viewCount < 150 && progressOf(c) < 0.5)
    .sort((a, b) => a.viewCount - b.viewCount || (a.publishedAt ?? 0) - (b.publishedAt ?? 0));
  const almost = open.filter((c) => progressOf(c) >= 0.7 && progressOf(c) < 1).sort((a, b) => progressOf(b) - progressOf(a));
  const recommended = scored
    .filter((s) => !ctx.followedIds?.has(s.c.id))
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s.c, reasons: s.reasons }));
  // Featured: campaigns with reviewed purpose, rotated daily — not "most funded".
  const featuredPool = open.filter((c) => c.purposeReviewedAt);
  const featured = dailyRotation(featuredPool.length >= 3 ? featuredPool : open, ctx.now);

  return {
    featured: featured.slice(0, 3),
    fresh: fresh.slice(0, 8),
    attention: attention.slice(0, 8),
    almost: almost.slice(0, 8),
    recommended: recommended.slice(0, 8),
  };
}
