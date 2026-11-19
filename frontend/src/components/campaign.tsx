"use client";

import { BadgeCheck, Clock, Eye, FileCheck2, Flame, Landmark, ScanSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Avatar } from "@/components/avatar";
import { RiseWords } from "@/components/motion";
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
        background: `radial-gradient(120% 100% at ${15 + (seed % 60)}% 0%, oklch(0.97 0.012 ${h}) 0%, transparent 65%), linear-gradient(160deg, oklch(0.935 0.018 ${h}), oklch(0.9 0.028 ${h}))`,
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
        className="absolute bottom-3.5 left-3.5 grid place-items-center rounded-full bg-surface p-2.5"
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
    <Link href={`/campaigns/${c.slug}`} className={cn("group flex flex-col", className)}>
      <div data-tilt data-cursor="Відкрити" className="tilt relative aspect-[4/3] overflow-hidden bg-muted">
        <div className="absolute inset-0 transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]">
          <CampaignCover campaign={c} />
        </div>
        <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1.5">
          {c.urgent && c.status === "active" && (
            <Badge tone="danger" className="border-transparent bg-signal text-white">
              <Flame /> Терміново
            </Badge>
          )}
          {c.status !== "active" && status && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        {c.isDemo && (
          <Badge tone="outline" className="mono absolute right-3.5 top-3.5 border-transparent bg-surface/90 text-[11px] text-fg-muted backdrop-blur">
            Демо
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="mono mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] uppercase tracking-[0.06em] text-fg-subtle">
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <cat.icon className="size-3.5" /> {cat.short}
          </span>
          {checked && (
            <span className="inline-flex items-center gap-1 text-success">
              <ShieldCheck className="size-3.5" /> Перевірено
            </span>
          )}
          {c.reasons && c.reasons.length > 0 && <span className="normal-case tracking-normal text-accent">{c.reasons[0]}</span>}
        </p>
        <h3 className="line-clamp-2 text-[19px] font-medium leading-[1.2] tracking-[-0.025em] text-fg">
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]">{c.title}</span>
        </h3>
        <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-fg-muted">{c.summary}</p>
        <div className="mt-auto pt-5">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <span className="text-[17px] font-medium tabular-nums tracking-[-0.02em]">
              {money(c.raisedAmount)}
              <span className="mono ml-1.5 text-[11.5px] font-normal text-fg-subtle">/ {money(c.goalAmount)}</span>
            </span>
            <span className={cn("mono text-[12.5px] tabular-nums", c.progress >= 1 ? "text-success" : "text-accent")}>{pct(c.progress)}</span>
          </div>
          <Progress value={c.progress} tone={c.progress >= 1 ? "success" : "accent"} size="sm" label={`Зібрано ${pct(c.progress)}`} />
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
          <span className="mono flex shrink-0 items-center gap-3 text-[11.5px]">
            {left !== null && left >= 0 && c.status === "active" && (
              <span className={cn("inline-flex items-center gap-1", left <= 3 && "text-danger")}>
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
    <div>
      <Skeleton className="aspect-[4/3] rounded-[14px]" />
      <div className="space-y-3 pt-5">
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
      <div className={cn("grid gap-x-6 gap-y-12", grid)}>
        {Array.from({ length: cols === 4 ? 4 : 3 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  if (!items.length) return <>{empty}</>;
  return (
    <div className={cn("grid gap-x-6 gap-y-14", grid)}>
      {items.map((c, i) => (
        <div key={c.id} className="reveal" style={{ ["--d" as string]: `${(i % (cols === 4 ? 4 : 3)) * 90}ms` }}>
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {items.slice(0, 4).map((c, i) => (
        <div key={c.id} className="w-[82%] shrink-0 snap-start animate-[fade-up_0.8s_var(--ease)_both] sm:w-auto" style={{ animationDelay: `${i * 70}ms` }}>
          <CampaignCard c={c} className="h-full" />
        </div>
      ))}
    </div>
  );
}

/** Editorial section head: rising-word title, mono index on the right, a hairline that draws itself. */
export function SectionHeader({ eyebrow, title, description, action, index }: { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; index?: string }) {
  return (
    <div className="mb-10 sm:mb-14">
      <div className="flex flex-col gap-5 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <p className="reveal mono mb-4 text-[12px] uppercase tracking-[0.08em] text-fg-subtle">{eyebrow}</p>}
          {typeof title === "string" ? (
            <RiseWords text={title} className="text-balance text-[clamp(30px,4.4vw,56px)] leading-[1.02] tracking-[-0.04em]" />
          ) : (
            <h2 className="reveal text-balance text-[clamp(30px,4.4vw,56px)] leading-[1.02] tracking-[-0.04em]">{title}</h2>
          )}
          {description && <p className="reveal mt-5 max-w-xl text-[16px] leading-relaxed text-fg-muted" style={{ ["--d" as string]: "150ms" }}>{description}</p>}
        </div>
        <div className="reveal flex shrink-0 items-center gap-5" style={{ ["--d" as string]: "200ms" }}>
          {action}
          {index && <span className="mono hidden text-[13px] text-fg-subtle sm:inline">({index})</span>}
        </div>
      </div>
      <div className="reveal-line h-px bg-border" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex animate-[fade-up_0.8s_var(--ease)_both] flex-col items-center rounded-3xl border border-dashed border-border-strong px-6 py-16 text-center">
      {icon && <div className="mb-5 grid size-12 place-items-center rounded-full border border-border bg-surface text-fg-muted [&_svg]:size-5">{icon}</div>}
      <p className="text-[20px] font-medium tracking-[-0.03em]">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
