export type Level = {
  level: number; key: string; name: string; nameUk: string; minXp: number; xp: number; progress: number;
  next: { level: number; name: string; nameUk: string; minXp: number; xpNeeded: number } | null;
};

export type Me = {
  id: string; name: string; email: string; bio: string; city: string; avatarUrl: string | null; role: "user" | "admin";
  identityVerified: boolean; isDemo: boolean; plan: string; createdAt: number; level: Level; interests: string[]; referralCode: string; xp: number;
};

export type Verification = { identityReviewed: boolean; purposeReviewed: boolean; destinationVerified: boolean; reportSubmitted: boolean };

export type CampaignCard = {
  id: string; slug: string; title: string; summary: string; category: string; city: string; coverUrl: string | null;
  goalAmount: number; raisedAmount: number; raisedUpdatedAt: number | null; raisedSource: "organizer_reported" | "monobank_jar"; progress: number;
  deadline: number | null; urgent: boolean; status: string; isDemo: boolean; publishedAt: number | null; createdAt: number;
  viewCount: number; followers: number; verification: Verification; reasons?: string[];
  organizer: { id: string; name: string; avatarUrl: string | null; identityVerified: boolean; isDemo: boolean } | null;
};

export type CampaignUpdate = { id: string; kind: "update" | "purchase" | "final_report"; title: string; body: string; spentAmount: number | null; createdAt: number; files: { id: string; url: string; name: string; mime: string }[] };

export type CampaignDetail = CampaignCard & {
  description: string; jarUrl: string | null; hasJar: boolean; rejectionReason: string | null; donateClicks?: number;
  budget: { label: string; amount: number }[];
  attachments: { id: string; title: string; url: string; mime: string; size: number }[];
  updates: CampaignUpdate[];
  timeline: { key: string; label: string; at: number | null }[];
};

export type PublicUser = { id: string; name: string; bio: string; city: string; avatarUrl: string | null; identityVerified: boolean; isDemo: boolean; plan: string; createdAt: number; level: Level };

export type Achievement = { code: string; title: string; en: string; description: string; icon: string; tier: "bronze" | "silver" | "gold"; earnedAt?: number | null };

export type Mission = { key: string; title: string; description: string; target: number; value: number; done: boolean; xp: number; week: string };

export type Challenge = {
  id: string; communityId: string | null; title: string; description: string; metric: string; metricLabel?: string; target: number; startsAt: number; endsAt: number;
  value: number; participants: number; progress: number; joined?: boolean;
};

export type Community = { id: string; slug: string; name: string; kind: string; description: string; members: number; monthXp?: number; isMember?: boolean; isDemo: boolean; createdAt: number };
