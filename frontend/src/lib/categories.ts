import { Baby, HeartPulse, Home, Package, PawPrint, Shield, Users, Accessibility, type LucideIcon } from "lucide-react";

export type Category = { slug: string; label: string; short: string; icon: LucideIcon; hue: number };

/** Mirrors backend/src/lib/constants.ts. */
export const CATEGORIES: Category[] = [
  { slug: "army", label: "Підтримка військових", short: "Військовим", icon: Shield, hue: 145 },
  { slug: "medicine", label: "Медицина", short: "Медицина", icon: HeartPulse, hue: 15 },
  { slug: "rebuild", label: "Відбудова", short: "Відбудова", icon: Home, hue: 55 },
  { slug: "humanitarian", label: "Гуманітарна допомога", short: "Гуманітарка", icon: Package, hue: 230 },
  { slug: "children", label: "Діти та освіта", short: "Діти", icon: Baby, hue: 300 },
  { slug: "animals", label: "Тварини", short: "Тварини", icon: PawPrint, hue: 85 },
  { slug: "veterans", label: "Ветерани та реабілітація", short: "Ветерани", icon: Accessibility, hue: 263 },
  { slug: "community", label: "Громади", short: "Громади", icon: Users, hue: 190 },
];

export const categoryOf = (slug: string) => CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[3];

export const STATUS_LABELS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "dark" }> = {
  draft: { label: "Чернетка", tone: "neutral" },
  pending: { label: "На модерації", tone: "warning" },
  active: { label: "Активний", tone: "accent" },
  goal_reached: { label: "Ціль досягнуто", tone: "success" },
  completed: { label: "Завершено", tone: "dark" },
  rejected: { label: "Відхилено", tone: "danger" },
};
