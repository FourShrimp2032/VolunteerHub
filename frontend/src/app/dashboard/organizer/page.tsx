"use client";

import { ArrowUpRight, Eye, FileText, HandCoins, MousePointerClick, Plus, Settings2, Share2, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CampaignCover, EmptyState } from "@/components/campaign";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatTile } from "@/components/impact";
import { Alert, Badge, ButtonLink, Card, Progress, Segmented, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/categories";
import { money, num, pct, timeAgo } from "@/lib/format";
import type { CampaignCard } from "@/lib/types";

type Item = CampaignCard & { rejectionReason: string | null; donateClicks: number; jarConnected: boolean };
type Resp = { items: Item[]; totals: { campaigns: number; active: number; views: number; followers: number; reportedRaised: number; donateClicks: number; shares: number; updates: number } };

export default function OrganizerDashboard() {
  return (
    <DashboardShell
      title="Мої збори"
      description="Керуйте зборами, публікуйте оновлення та звіти."
      actions={<ButtonLink href="/dashboard/campaigns/new"><Plus /> Створити збір</ButtonLink>}
    >
      {() => <Body />}
    </DashboardShell>
  );
}

function Body() {
  const [d, setD] = React.useState<Resp | null>(null);
  const [filter, setFilter] = React.useState<"all" | "active" | "drafts" | "done">("all");
  React.useEffect(() => {
    api<Resp>("/me/campaigns").then(setD).catch(() => null);
  }, []);
  if (!d) return <Skeleton className="h-64 rounded-2xl" />;
  if (!d.items.length)
    return (
      <EmptyState
        icon={<Plus />}
        title="У вас ще немає зборів"
        description="Створіть перший збір за кілька хвилин. Знадобиться опис, ціль і посилання на вашу банку Monobank."
        action={<ButtonLink href="/dashboard/campaigns/new">Створити збір</ButtonLink>}
      />
    );

  const list = d.items.filter((x) =>
    filter === "all" ? true : filter === "active" ? ["active", "goal_reached", "pending"].includes(x.status) : filter === "drafts" ? ["draft", "rejected"].includes(x.status) : x.status === "completed",
  );

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={<FileText />} value={d.totals.campaigns} label="Зборів" hint={`${d.totals.active} активних`} />
        <StatTile icon={<Eye />} value={num(d.totals.views)} label="Унікальних переглядів" />
        <StatTile icon={<Users />} value={num(d.totals.followers)} label="Підписників" />
        <StatTile icon={<Share2 />} value={num(d.totals.shares)} label="Поширень" />
        <StatTile icon={<MousePointerClick />} value={num(d.totals.donateClicks)} label="Переходів до банки" />
        <StatTile icon={<HandCoins />} value={money(d.totals.reportedRaised)} label="Зібрано (за вашими даними)" />
      </div>

      <div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Усі" },
            { value: "active", label: "Активні" },
            { value: "drafts", label: "Чернетки" },
            { value: "done", label: "Завершені" },
          ]}
        />
        <div className="mt-5 grid gap-3">
          {list.map((c) => {
            const s = STATUS_LABELS[c.status];
            return (
              <Card key={c.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-32">
                  <CampaignCover campaign={c} iconSize={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {s && <Badge tone={s.tone}>{s.label}</Badge>}
                    {!c.jarConnected && <Badge tone="warning">Банку не підключено</Badge>}
                    <span className="text-xs text-fg-subtle">оновлено {timeAgo(c.publishedAt ?? c.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 truncate font-semibold">{c.title}</p>
                  {c.status === "rejected" && c.rejectionReason && <Alert tone="danger" className="mt-2 py-2 text-[13px]">Причина: {c.rejectionReason}</Alert>}
                  <div className="mt-2.5 flex items-center gap-3">
                    <Progress value={c.progress} size="sm" className="max-w-xs" />
                    <span className="shrink-0 text-xs text-fg-muted tabular-nums">{money(c.raisedAmount)} · {pct(c.progress)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs text-fg-muted sm:flex-col sm:items-end sm:gap-1">
                  <span className="inline-flex items-center gap-1"><Eye className="size-3.5" /> {c.viewCount}</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {c.followers}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ButtonLink href={`/dashboard/campaigns/manage?id=${c.id}`} variant="secondary" size="sm"><Settings2 /> Керувати</ButtonLink>
                  <Link href={`/campaigns/${c.slug}`} className="grid size-8 place-items-center rounded-xl border border-border text-fg-muted hover:text-fg" aria-label="Відкрити сторінку збору">
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </Card>
            );
          })}
          {!list.length && <p className="py-10 text-center text-sm text-fg-muted">У цьому розділі поки порожньо.</p>}
        </div>
      </div>
    </div>
  );
}
