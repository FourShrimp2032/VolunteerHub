"use client";

import { Award, Bell, Bookmark, CheckCircle2, Compass, Eye, Share2, Sparkles, Trophy, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CampaignGrid, EmptyState } from "@/components/campaign";
import { DashboardShell } from "@/components/dashboard-shell";
import { AchievementGrid, ChallengeCard, LevelCard, MissionList, StatTile } from "@/components/impact";
import { Badge, ButtonLink, Card, Segmented, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Achievement, CampaignCard, Challenge, Community, Level, Mission } from "@/lib/types";

type Dash = {
  level: Level;
  impact: { followed: number; saved: number; shared: number; referred: number; completedFollowed: number; achievements: number; xp: number };
  followed: CampaignCard[];
  saved: CampaignCard[];
  recentUpdates: { id: string; kind: string; title: string; body: string; createdAt: number; campaignTitle: string; campaignSlug: string }[];
  achievements: Achievement[];
  missions: Mission[];
  xpHistory: { id: string; label: string; xp: number; createdAt: number }[];
  communities: Community[];
  challenges: Challenge[];
};

export default function SupporterDashboard() {
  return (
    <DashboardShell title="Мій вплив" description="Збори, за якими ви стежите, ваш прогрес і досягнення.">
      {(user) => <Body userName={user.name} />}
    </DashboardShell>
  );
}

function Body({ userName }: { userName: string }) {
  const [d, setD] = React.useState<Dash | null>(null);
  const [tab, setTab] = React.useState<"followed" | "saved">("followed");
  React.useEffect(() => {
    api<Dash>("/me/dashboard").then(setD).catch(() => null);
  }, []);
  if (!d)
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );

  return (
    <div className="grid gap-10">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <LevelCard level={d.level} />
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold"><Compass className="size-4 text-accent" /> Місії тижня</p>
            <Badge tone="gold">+30 XP кожна</Badge>
          </div>
          <MissionList missions={d.missions} />
        </Card>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold">Особистий вплив</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatTile icon={<UserPlus />} value={d.impact.followed} label="Стежу за зборами" />
          <StatTile icon={<Share2 />} value={d.impact.shared} label="Поширено зборів" />
          <StatTile icon={<Eye />} value={d.impact.referred} label="Приведено відвідувачів" hint="За вашими посиланнями" />
          <StatTile icon={<CheckCircle2 />} value={d.impact.completedFollowed} label="Завершених зборів" hint="Серед тих, за якими стежите" />
          <StatTile icon={<Award />} value={d.impact.achievements} label="Досягнень" />
          <StatTile icon={<Sparkles />} value={d.impact.xp} label="Impact XP" />
        </div>
        <p className="mt-3 text-xs text-fg-subtle">
          Ми не показуємо суми ваших донатів. Volunteerhub не має надійних даних про транзакції, бо кошти йдуть напряму на банки організаторів.
        </p>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Мої збори</h2>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "followed", label: `Стежу · ${d.followed.length}` },
              { value: "saved", label: `Збережені · ${d.saved.length}` },
            ]}
          />
        </div>
        <CampaignGrid
          items={tab === "followed" ? d.followed : d.saved}
          empty={
            <EmptyState
              icon={tab === "followed" ? <UserPlus /> : <Bookmark />}
              title={tab === "followed" ? "Ви ще ні за ким не стежите" : "Немає збережених зборів"}
              description="Знайдіть збір, який відгукується, і натисніть «Стежити», щоб отримувати оновлення."
              action={<ButtonLink href="/explore?sort=attention">Збори, яким потрібна увага</ButtonLink>}
            />
          }
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <p className="mb-4 flex items-center gap-2 font-semibold"><Bell className="size-4 text-accent" /> Останні оновлення</p>
          {d.recentUpdates.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">Тут з'являться новини та звіти зборів, за якими ви стежите.</p>
          ) : (
            <ul className="divide-y divide-border">
              {d.recentUpdates.map((u) => (
                <li key={u.id} className="py-3.5 first:pt-0 last:pb-0">
                  <Link href={`/campaigns/${u.campaignSlug}`} className="group block">
                    <p className="flex items-center gap-2 text-xs text-fg-subtle">
                      {u.kind === "final_report" ? <Badge tone="success">Фінальний звіт</Badge> : u.kind === "purchase" ? <Badge tone="accent">Закупівля</Badge> : null}
                      <span className="truncate">{u.campaignTitle}</span> · {timeAgo(u.createdAt)}
                    </p>
                    <p className="mt-1 font-medium group-hover:text-accent">{u.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{u.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <p className="mb-4 flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-gold" /> Історія XP</p>
          {d.xpHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">Підпишіться на збір або поділіться ним, щоб отримати перші XP.</p>
          ) : (
            <ul className="grid gap-2.5">
              {d.xpHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{h.label}</span>
                    <span className="text-xs text-fg-subtle">{timeAgo(h.createdAt)}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-gold-fg">+{h.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Trophy className="size-5 text-gold" /> Колекція досягнень</h2>
        <AchievementGrid items={d.achievements} />
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="size-5 text-accent" /> Спільноти та челенджі</h2>
          <ButtonLink href="/communities" variant="secondary" size="sm">Усі спільноти</ButtonLink>
        </div>
        {d.communities.length === 0 && d.challenges.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={`${userName.split(" ")[0]}, долучайтеся до спільноти`}
            description="Університети, компанії й волонтерські команди разом допомагають новим зборам знайти підтримку."
            action={<ButtonLink href="/communities">Знайти спільноту</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {d.communities.map((c) => (
              <Link key={c.id} href={`/communities/${c.slug}`} className="rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-border-strong">
                <p className="font-semibold">{c.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{c.description}</p>
              </Link>
            ))}
            {d.challenges.map((ch) => (
              <ChallengeCard key={ch.id} ch={ch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
