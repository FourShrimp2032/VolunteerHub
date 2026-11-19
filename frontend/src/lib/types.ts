export type Level = {
  level: number; key: string; name: string; nameUk: string; minXp: number; xp: number; progress: number;
  next: { level: number; name: string; nameUk: string; minXp: number; xpNeeded: number } | null;
};

export type Me = {
  id: string; name: string; email: string; bio: string; city: string; avatarUrl: string | null; role: "user" | "admin";
  identityVerified: boolean; isDemo: boolean; plan: string; createdAt: number; level: Level; interests: string[]; referralCode: string; xp: number;
  isOrganization: boolean; orgName: string | null; orgKind: string | null; orgWebsite: string | null; orgCode: string | null;
};

export type Verification = { identityReviewed: boolean; purposeReviewed: boolean; destinationVerified: boolean; reportSubmitted: boolean };

export type CampaignCard = {
  id: string; slug: string; title: string; summary: string; category: string; city: string; coverUrl: string | null;
  goalAmount: number; raisedAmount: number; raisedUpdatedAt: number | null; raisedSource: "organizer_reported" | "monobank_jar" | "monobank_public"; progress: number;
  deadline: number | null; urgent: boolean; status: string; isDemo: boolean; publishedAt: number | null; createdAt: number;
  viewCount: number; followers: number; verification: Verification; reasons?: string[];
  /** raisedAmount = mainRaised (organization's jar) + helpersRaised, unless helpersInTotal is false. */
  mainRaised: number; helpersRaised: number; helpersCount: number; helpersInTotal: boolean; acceptsHelpers: boolean;
  organizer: { id: string; name: string; avatarUrl: string | null; identityVerified: boolean; isOrganization?: boolean; isDemo: boolean } | null;
};

export type TemplateConfig = {
  photo: { x: number; y: number; w: number; h: number; radius: number; layer: "over" | "under" };
  goal: {
    x: number; y: number; align: "left" | "center" | "right"; size: number; font: string; weight: 400 | 500 | 600 | 700 | 800 | 900;
    color: string; layout: "inline" | "stacked"; uppercase: boolean; currency: "ГРН" | "грн" | "₴" | "";
  };
};

/** What's needed to draw a helper's share image. url/config null: the built-in default template. */
export type HelperTemplate = { url: string | null; fileId?: string | null; config: TemplateConfig | null; captionTemplate: string; title: string; orgName: string; totalGoal: number };

export type PhotoCrop = { x: number; y: number; zoom: number };

export type Helper = {
  id: string; campaignId: string; displayName: string; goalAmount: number; raisedAmount: number; raisedUpdatedAt: number | null;
  raisedSource: "monobank_public" | "pending"; progress: number; goalReached: boolean; photoUrl: string | null; photoCrop: PhotoCrop;
  shareImageUrl: string | null; jarUrl: string; status: "active" | "hidden" | "closed"; createdAt: number;
  user: { id: string; level: Level } | null; donateClicks?: number; viewCount?: number;
};

export type CampaignUpdate = { id: string; kind: "update" | "purchase" | "final_report"; title: string; body: string; spentAmount: number | null; createdAt: number; files: { id: string; url: string; name: string; mime: string }[] };

export type CampaignDetail = CampaignCard & {
  description: string; jarUrl: string | null; hasJar: boolean; rejectionReason: string | null; donateClicks?: number;
  budget: { label: string; amount: number }[];
  attachments: { id: string; title: string; url: string; mime: string; size: number }[];
  updates: CampaignUpdate[];
  timeline: { key: string; label: string; at: number | null }[];
  template: HelperTemplate; helpers: Helper[];
};

export type PublicUser = { id: string; name: string; bio: string; city: string; avatarUrl: string | null; identityVerified: boolean; isOrganization?: boolean; orgKind?: string | null; orgWebsite?: string | null; isDemo: boolean; plan: string; createdAt: number; level: Level };

export type Achievement = { code: string; title: string; en: string; description: string; icon: string; tier: "bronze" | "silver" | "gold"; earnedAt?: number | null };

export type Mission = { key: string; title: string; description: string; target: number; value: number; done: boolean; xp: number; week: string };

export type Challenge = {
  id: string; communityId: string | null; title: string; description: string; metric: string; metricLabel?: string; target: number; startsAt: number; endsAt: number;
  value: number; participants: number; progress: number; joined?: boolean;
};

export type Community = { id: string; slug: string; name: string; kind: string; description: string; members: number; monthXp?: number; isMember?: boolean; isDemo: boolean; createdAt: number };
