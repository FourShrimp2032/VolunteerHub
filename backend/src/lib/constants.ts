export const CATEGORIES = [
  { slug: "army", label: "Підтримка військових" },
  { slug: "medicine", label: "Медицина" },
  { slug: "rebuild", label: "Відбудова" },
  { slug: "humanitarian", label: "Гуманітарна допомога" },
  { slug: "children", label: "Діти та освіта" },
  { slug: "animals", label: "Тварини" },
  { slug: "veterans", label: "Ветерани та реабілітація" },
  { slug: "community", label: "Громади" },
] as const;

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export const CAMPAIGN_STATUSES = ["draft", "pending", "active", "goal_reached", "completed", "rejected"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Statuses visible to the public. */
export const PUBLIC_STATUSES = ["active", "goal_reached", "completed"] as const;

export const COMMUNITY_KINDS = ["university", "student_org", "company", "volunteer_team"] as const;

export const DAY = 24 * 60 * 60 * 1000;
