"use client";

import { BadgeCheck, Clock, Eye, FileCheck2, Flame, Landmark, ScanSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Avatar } from "@/components/avatar";
import { Badge, Progress, Skeleton } from "@/components/ui/primitives";
import { categoryOf, STATUS_LABELS } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { daysLeft, money, pct, plural } from "@/lib/format";
import type { CampaignCard as Card, Verification } from "@/lib/types";

/** Cover image, or a bold generated cover per category when none was uploaded. */
export function CampaignCover({ campaign, className, iconSize = 34 }: { campaign: Pick<Card, "coverUrl" | "category" | "title" | "id">; className?: string; iconSize?: number }) {
  const cat = categoryOf(campaign.category);
  const Icon = cat.icon;
  if (campaign.coverUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={campaign.coverUrl} alt="" className={cn("h-full w-full object-cover", className)} loading="lazy" />;
  const seed = campaign.id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const h = cat.hue;
  const big = iconSize * 5.2;
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 100% at ${15 + (seed % 60)}% 0%, oklch(0.985 0.012 ${h}) 0%, transparent 65%), linear-gradient(160deg, oklch(0.955 0.025 ${h}), oklch(0.925 0.04 ${h}))`,
      }}
      aria-hidden
    >
      <div className="bg-dots absolute inset-0 opacity-[0.16] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" style={{ color: `oklch(0.45 0.06 ${h})` }} />
      <Icon
        className="absolute"
        strokeWidth={0.9}
        style={{ width: big, height: big, right: -big * 0.12, bottom: -big * 0.24, color: `oklch(0.5 0.09 ${h})`, opacity: 0.22, transform: `rotate(${(seed % 20) - 10}deg)` }}
      />
      <span
        className="absolute bottom-3 left-3 grid place-items-center rounded-lg bg-white p-2 shadow-[0_1px_2px_oklch(0.2_0.02_260/0.08),0_0_0_1px_oklch(0.2_0.02_260/0.06)]"
        style={{ color: `oklch(0.45 0.12 ${h})` }}
      >
        <Icon style={{ width: iconSize * 0.58, height: iconSize * 0.58 }} strokeWidth={1.8} />
      </span>
    </div>
  );
}

const CHECKS: { key: keyof Verification; label: string; short: string; icon: React.ElementType; hint: string }[] = [
  { key: "identityReviewed", label: "Особу організатора перевірено", short: "Особу перевірено", icon: BadgeCheck, hint: "Модератор переглянув документи організатора." },
  { key: "purposeReviewed", label: "Мету збору перевірено", short: "Мету перевірено", icon: ScanSearch, hint: "Модератор переглянув опис і мету збору перед публікацією." },
  { key: "destinationVerified", label: "Банку перевірено", short: "Банку перевірено", icon: Landmark, hint: "Модератор відкрив банку Monobank та звірив її з організатором." },
  { key: "reportSubmitted", label: "Звіт про витрати опубліковано", short: "Є звіт", icon: FileCheck2, hint: "Організатор опублікував фінальний звіт." },
];

/** Shows ONLY the checks that actually happened. */
export function VerificationBadges({ v, compact }: { v: Verification; compact?: boolean }) {
  const done = CHECKS.filter((c) => v[c.key]);
  if (!done.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {done.map((c) => (
        <Badge key={c.key} tone="success" title={c.hint}>
          <c.icon /> {compact ? c.short : c.label}
        </Badge>
      ))}
    </div>
  );
}

/** Full checklist (done & not yet) for the detail page — honest about what wasn't checked. */
export function VerificationChecklist({ v }: { v: Verification }) {
  return (
    <ul className="grid gap-2.5">
      {CHECKS.map((c) => (
        <li key={c.key} className="flex items-start gap-3">
          <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", v[c.key] ? "bg-success-soft text-success" : "bg-muted text-fg-subtle")}>
            <c.icon className="size-3.5" />
          </span>
          <div>
            <p className={cn("text-sm", v[c.key] ? "font-medium text-fg" : "text-fg-muted")}>{c.label}</p>
            <p className="text-xs text-fg-subtle">{v[c.key] ? c.hint : "Ще не перевірено"}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CampaignCard({ c, className }: { c: Card; className?: string }) {
  const cat = categoryOf(c.category);
  const left = daysLeft(c.deadline);
  const status = STATUS_LABELS[c.status];
  const checked = c.verification.purposeReviewed || c.verification.destinationVerified;
  return (
    <Link
      href={`/campaigns/${c.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-muted">
        <CampaignCover campaign={c} className="transition duration-500 ease-out group-hover:scale-[1.025]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {c.urgent && c.status === "active" && (
            <Badge tone="danger" className="border-transparent bg-danger text-white shadow-sm">
              <Flame /> Терміново
            </Badge>
          )}
          {c.status !== "active" && status && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        {c.isDemo && (
          <Badge tone="outline" className="absolute right-3 top-3 border-border bg-white/90 text-fg-muted backdrop-blur">
            Демо
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-fg-subtle">
          <span className="inline-flex items-center gap-1" style={{ color: `oklch(0.45 0.11 ${cat.hue})` }}>
            <cat.icon className="size-3.5" /> {cat.short}
          </span>
          {checked && (
            <span className="inline-flex items-center gap-1 text-success">
              <ShieldCheck className="size-3.5" /> Перевірено
            </span>
          )}
          {c.reasons && c.reasons.length > 0 && <span className="text-accent">{c.reasons[0]}</span>}
        </p>
        <h3 className="line-clamp-2 text-[16px] font-bold leading-snug text-fg transition-colors group-hover:text-accent">{c.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-fg-muted">{c.summary}</p>
        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="font-heading text-[17px] font-bold tabular-nums tracking-[-0.02em]">
              {money(c.raisedAmount)}
              <span className="ml-1.5 text-[12px] font-normal text-fg-subtle">з {money(c.goalAmount)}</span>
            </span>
            <span className={cn("text-[13px] font-semibold tabular-nums", c.progress >= 1 ? "text-success" : "text-accent")}>{pct(c.progress)}</span>
          </div>
          <Progress value={c.progress} tone={c.progress >= 1 ? "success" : "accent"} label={`Зібрано ${pct(c.progress)}`} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3.5 text-[12px] text-fg-subtle">
          {c.organizer ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={c.organizer.name} src={c.organizer.avatarUrl} size={22} />
              <span className="truncate text-[13px] text-fg-muted">{c.organizer.name}</span>
              {c.organizer.identityVerified && <BadgeCheck className="size-4 shrink-0 text-accent" aria-label="Особу перевірено" />}
            </span>
          ) : (
            <span />
          )}
          <span className="flex shrink-0 items-center gap-2.5">
            {left !== null && left >= 0 && c.status === "active" && (
              <span className={cn("inline-flex items-center gap-1", left <= 3 && "font-medium text-danger")}>
                <Clock className="size-3.5" /> {left} {plural(left, "день", "дні", "днів")}
              </span>
            )}
            <span className="inline-flex items-center gap-1" title="Перегляди">
              <Eye className="size-3.5" /> {c.viewCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-6 h-2 w-full" />
      </div>
    </div>
  );
}

export function CampaignGrid({ items, loading, empty, cols = 3 }: { items?: Card[] | null; loading?: boolean; empty?: React.ReactNode; cols?: 3 | 4 }) {
  const grid = cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  if (loading || !items)
    return (
      <div className={cn("grid gap-5", grid)}>
        {Array.from({ length: cols === 4 ? 4 : 3 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  if (!items.length) return <>{empty}</>;
  return (
    <div className={cn("grid gap-5", grid)}>
      {items.map((c, i) => (
        <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <CampaignCard c={c} className="h-full" />
        </div>
      ))}
    </div>
  );
}

/** Horizontal scroller for homepage rows on mobile, grid on desktop. */
export function CampaignRow({ items, loading }: { items?: Card[] | null; loading?: boolean }) {
  if (loading || !items)
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {items.slice(0, 4).map((c) => (
        <CampaignCard key={c.id} c={c} className="w-[84%] shrink-0 snap-start sm:w-auto" />
      ))}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2.5 text-[13px] font-semibold text-accent">{eyebrow}</p>
        )}
        <h2 className="text-balance text-[26px] leading-[1.15] sm:text-[32px]">{title}</h2>
        {description && <p className="mt-3 text-[15.5px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-11 place-items-center rounded-xl border border-border bg-subtle text-fg-muted [&_svg]:size-5">{icon}</div>}
      <p className="font-heading text-[16px] font-bold">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
