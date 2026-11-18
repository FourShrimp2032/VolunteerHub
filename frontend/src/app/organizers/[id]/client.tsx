"use client";

import { BadgeCheck, CalendarDays, FileCheck2, MapPin, Sparkles, Users } from "lucide-react";
import * as React from "react";
import { Avatar } from "@/components/avatar";
import { CampaignGrid, EmptyState } from "@/components/campaign";
import { Badge, ButtonLink, Card, Progress, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import type { CampaignCard, PublicUser } from "@/lib/types";
import { usePathParam } from "@/lib/use-path-param";

type Resp = { organizer: PublicUser; campaigns: CampaignCard[]; stats: { campaigns: number; active: number; completed: number; reports: number; followers: number } };

export default function OrganizerPage() {
  const id = usePathParam();
  const [d, setD] = React.useState<Resp | null>(null);
  const [err, setErr] = React.useState(false);
  React.useEffect(() => {
    if (id) api<Resp>(`/organizers/${encodeURIComponent(id)}`).then(setD).catch(() => setErr(true));
  }, [id]);
  if (err) return <div className="container-page py-20"><EmptyState title="Профіль не знайдено" action={<ButtonLink href="/explore">До зборів</ButtonLink>} /></div>;
  if (!d) return <div className="container-page pt-10"><Skeleton className="h-48 rounded-3xl" /></div>;
  const o = d.organizer;
  return (
    <div className="container-page pt-8 sm:pt-12">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-border bg-subtle"><div className="h-full bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)]" /></div>
        <div className="relative flex flex-col gap-6 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-5">
            <Avatar name={o.name} src={o.avatarUrl} size={96} className="ring-4 ring-surface" />
            <div className="min-w-0 pb-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {o.name} {o.identityVerified && <BadgeCheck className="size-6 text-accent" aria-label="Особу перевірено" />}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
                {o.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {o.city}</span>}
                <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> З {date(o.createdAt)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.identityVerified ? <Badge tone="success"><BadgeCheck /> Особу перевірено</Badge> : <Badge tone="outline">Особу ще не перевірено</Badge>}
            {o.isDemo && <Badge tone="dark">Демо-профіль</Badge>}
          </div>
        </div>
        {o.bio && <p className="relative mt-6 max-w-2xl leading-relaxed text-fg-muted">{o.bio}</p>}
        <div className="relative mt-7 grid gap-3 sm:grid-cols-4">
          <Mini v={d.stats.campaigns} l="публічних зборів" />
          <Mini v={d.stats.completed} l="завершено" />
          <Mini v={d.stats.reports} l="фінальних звітів" icon={<FileCheck2 className="size-4 text-success" />} />
          <div className="rounded-2xl border border-border bg-subtle p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-gold-fg"><Sparkles className="size-3.5" /> {o.level.nameUk}</p>
            <Progress value={o.level.progress} tone="gold" size="sm" className="mt-2.5" />
            <p className="mt-1.5 text-xs text-fg-subtle">{o.level.xp} Impact XP</p>
          </div>
        </div>
      </Card>
      <section className="mt-12">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><Users className="size-5" /> Збори організатора</h2>
        <CampaignGrid items={d.campaigns} empty={<EmptyState title="Публічних зборів поки немає" />} />
      </section>
    </div>
  );
}

function Mini({ v, l, icon }: { v: number; l: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-subtle p-4">
      <p className="flex items-center gap-2 font-heading text-2xl font-extrabold tracking-tight">{v} {icon}</p>
      <p className="text-[13px] text-fg-muted">{l}</p>
    </div>
  );
}
