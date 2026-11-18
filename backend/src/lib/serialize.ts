import { eq, inArray } from "drizzle-orm";
import type { DB } from "../db/client";
import { campaignUpdates, campaigns, follows, users, type Campaign, type User } from "../db/schema";
import { progressOf } from "./discovery";
import { levelForXp } from "./gamification";

export const fileUrl = (id: string | null | undefined) => (id ? `/api/files/${id}` : null);

export function publicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    bio: u.bio,
    city: u.city,
    avatarUrl: fileUrl(u.avatarFileId),
    identityVerified: !!u.identityVerifiedAt,
    isDemo: u.isDemo,
    plan: u.plan,
    createdAt: u.createdAt,
    level: levelForXp(u.xp),
  };
}

export function privateUser(u: User) {
  return {
    ...publicUser(u),
    email: u.email,
    role: u.role,
    interests: JSON.parse(u.interests || "[]") as string[],
    referralCode: u.referralCode,
    xp: u.xp,
  };
}

/** Loads organizer + aggregate data for a list of campaigns and returns card-ready objects. */
export async function campaignCards(db: DB, rows: Campaign[]) {
  if (rows.length === 0) return [];
  const orgIds = [...new Set(rows.map((r) => r.organizerId))];
  const ids = rows.map((r) => r.id);
  const orgs = new Map<string, User>();
  for (let i = 0; i < orgIds.length; i += 80) {
    for (const u of await db.select().from(users).where(inArray(users.id, orgIds.slice(i, i + 80)))) orgs.set(u.id, u);
  }
  const reportSet = new Set<string>();
  const followerCount = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    for (const r of await db.select({ id: campaignUpdates.campaignId, kind: campaignUpdates.kind }).from(campaignUpdates).where(inArray(campaignUpdates.campaignId, chunk)))
      if (r.kind === "final_report") reportSet.add(r.id);
    for (const r of await db.select({ id: follows.campaignId }).from(follows).where(inArray(follows.campaignId, chunk)))
      followerCount.set(r.id, (followerCount.get(r.id) ?? 0) + 1);
  }
  return rows.map((c) => {
    const org = orgs.get(c.organizerId);
    return toCard(c, org ?? null, { hasFinalReport: reportSet.has(c.id), followers: followerCount.get(c.id) ?? 0 });
  });
}

export function verificationOf(c: Campaign, org: User | null, hasFinalReport: boolean) {
  return {
    identityReviewed: !!org?.identityVerifiedAt,
    purposeReviewed: !!c.purposeReviewedAt,
    destinationVerified: !!c.destinationVerifiedAt,
    reportSubmitted: hasFinalReport,
  };
}

export function toCard(c: Campaign, org: User | null, extra: { hasFinalReport: boolean; followers: number }) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    category: c.category,
    city: c.city,
    coverUrl: fileUrl(c.coverFileId),
    goalAmount: c.goalAmount,
    raisedAmount: c.raisedAmount,
    raisedUpdatedAt: c.raisedUpdatedAt,
    /** Amounts are always organizer-reported: there is no official Monobank balance API. */
    raisedSource: "organizer_reported" as const,
    progress: progressOf(c),
    deadline: c.deadline,
    urgent: c.urgent,
    status: c.status,
    isDemo: c.isDemo,
    publishedAt: c.publishedAt,
    createdAt: c.createdAt,
    viewCount: c.viewCount,
    followers: extra.followers,
    verification: verificationOf(c, org, extra.hasFinalReport),
    organizer: org ? { id: org.id, name: org.name, avatarUrl: fileUrl(org.avatarFileId), identityVerified: !!org.identityVerifiedAt, isDemo: org.isDemo } : null,
  };
}

export async function loadCampaignBySlugOrId(db: DB, key: string) {
  const bySlug = await db.select().from(campaigns).where(eq(campaigns.slug, key)).limit(1);
  if (bySlug[0]) return bySlug[0];
  const byId = await db.select().from(campaigns).where(eq(campaigns.id, key)).limit(1);
  return byId[0] ?? null;
}
