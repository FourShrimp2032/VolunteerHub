"use client";

import { CalendarCheck, Check, FileCheck, Flag, Lock, Megaphone, Sparkles, Sunrise, Target, Trophy, Users, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Avatar } from "@/components/avatar";
import { Badge, Button, Card, Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { date, num, plural } from "@/lib/format";
import type { Achievement, Challenge, Level, Mission } from "@/lib/types";

const LEVEL_NAMES = ["Дослідник", "Прихильник", "Амбасадор змін", "Будівничий спільноти", "Лідер впливу"];
const LEVEL_EN = ["Explorer", "Supporter", "Advocate", "Community Builder", "Impact Leader"];

export function LevelRing({ level, size = 112 }: { level: Level; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#gold)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - level.progress)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.14 85)" />
            <stop offset="100%" stopColor="oklch(0.7 0.16 60)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">Рівень</p>
          <p className="font-display text-3xl font-extrabold leading-none">{level.level}</p>
        </div>
      </div>
    </div>
  );
}

export function LevelCard({ level }: { level: Level }) {
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,oklch(0.85_0.12_85/0.35),transparent)]" />
      <div className="relative flex items-center gap-5">
        <LevelRing level={level} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-gold-fg"><Sparkles className="size-3.5" /> Impact XP</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight">{level.nameUk}</p>
          <p className="text-sm text-fg-muted">{level.name} · {num(level.xp)} XP</p>
          {level.next ? (
            <>
              <Progress value={level.progress} tone="gold" className="mt-3" />
              <p className="mt-1.5 text-xs text-fg-subtle">
                Ще {num(level.next.xpNeeded)} XP до рівня «{level.next.nameUk}»
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm font-medium text-gold-fg">Найвищий рівень досягнуто</p>
          )}
        </div>
      </div>
      <div className="relative mt-6 grid grid-cols-5 gap-1.5">
        {LEVEL_NAMES.map((n, i) => (
          <div key={n} title={`${n} (${LEVEL_EN[i]})`}>
            <div className={cn("h-1.5 rounded-full", i + 1 <= level.level ? "bg-gold" : "bg-muted")} />
            <p className={cn("mt-1.5 hidden truncate text-[11px] sm:block", i + 1 === level.level ? "font-medium text-fg" : "text-fg-subtle")}>{n}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, sunrise: Sunrise, megaphone: Megaphone, users: Users, "calendar-check": CalendarCheck, trophy: Trophy, flag: Flag, "file-check": FileCheck,
};

const TIER = {
  bronze: { ring: "from-[oklch(0.82_0.08_55)] to-[oklch(0.66_0.1_45)]", label: "Бронза" },
  silver: { ring: "from-[oklch(0.9_0.01_260)] to-[oklch(0.7_0.02_260)]", label: "Срібло" },
  gold: { ring: "from-[oklch(0.88_0.13_90)] to-[oklch(0.72_0.16_65)]", label: "Золото" },
};

export function AchievementGrid({ items }: { items: Achievement[] }) {
  const earned = items.filter((a) => a.earnedAt).length;
  return (
    <div>
      <p className="mb-4 text-sm text-fg-muted">
        Отримано {earned} з {items.length}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((a) => {
          const Icon = ICONS[a.icon] ?? Sparkles;
          const got = !!a.earnedAt;
          return (
            <div
              key={a.code}
              className={cn(
                "group relative flex flex-col items-center rounded-2xl border p-4 text-center transition",
                got ? "border-border bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-lift" : "border-dashed border-border-strong bg-subtle/50",
              )}
            >
              <div className={cn("grid size-14 place-items-center rounded-full bg-gradient-to-br p-[2px]", got ? TIER[a.tier].ring : "from-muted to-muted")}>
                <div className={cn("grid size-full place-items-center rounded-full", got ? "bg-surface" : "bg-subtle")}>
                  {got ? <Icon className="size-6 text-fg" strokeWidth={1.7} /> : <Lock className="size-5 text-fg-subtle" />}
                </div>
              </div>
              <p className={cn("mt-3 text-[13.5px] font-semibold leading-tight", !got && "text-fg-muted")}>{a.title}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-fg-subtle">{a.description}</p>
              <p className="mt-2 text-[11px] text-fg-subtle">{got ? `${TIER[a.tier].label} · ${date(a.earnedAt)}` : TIER[a.tier].label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MissionList({ missions }: { missions: Mission[] }) {
  return (
    <div className="grid gap-2.5">
      {missions.map((m) => (
        <div key={m.key} className={cn("flex items-center gap-4 rounded-xl border p-3.5", m.done ? "border-success/25 bg-success-soft/40" : "border-border bg-surface")}>
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", m.done ? "bg-success text-white" : "bg-muted text-fg-muted")}>
            {m.done ? <Check className="size-4" /> : <Target className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{m.title}</p>
            <p className="text-xs text-fg-subtle">{m.description}</p>
            <Progress value={m.value / m.target} tone={m.done ? "success" : "gold"} size="sm" className="mt-2" />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{m.value}/{m.target}</p>
            <p className="text-[11px] text-gold-fg">+{m.xp} XP</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChallengeCard({ ch, onJoin, busy }: { ch: Challenge; onJoin?: () => void; busy?: boolean }) {
  const daysLeft = Math.max(0, Math.ceil((ch.endsAt - Date.now()) / 86_400_000));
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-gold-soft"><Trophy className="size-5 text-gold-fg" /></span>
        <Badge tone="outline">{daysLeft} {plural(daysLeft, "день", "дні", "днів")}</Badge>
      </div>
      <p className="mt-4 font-semibold leading-snug">{ch.title}</p>
      {ch.description && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{ch.description}</p>}
      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold tabular-nums">{num(ch.value)} / {num(ch.target)}</span>
          <span className="text-xs text-fg-subtle">{ch.participants} {plural(ch.participants, "учасник", "учасники", "учасників")}</span>
        </div>
        <Progress value={ch.progress} tone="gold" />
        {ch.metricLabel && <p className="mt-2 text-[11.5px] text-fg-subtle">Метрика: {ch.metricLabel}</p>}
        {onJoin && (
          <Button className="mt-4 w-full" variant={ch.joined ? "soft" : "secondary"} onClick={onJoin} disabled={ch.joined} loading={busy}>
            {ch.joined ? <><Check /> Ви берете участь</> : "Долучитися"}
          </Button>
        )}
      </div>
    </Card>
  );
}

export function Leaderboard({ rows, unit = "XP цього місяця", highlightId }: { rows: { id: string; name: string; xp: number; sub?: string; href?: string }[]; unit?: string; highlightId?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-fg-muted">Поки що порожньо. Станьте першими!</p>;
  const max = Math.max(1, ...rows.map((r) => r.xp));
  return (
    <ol className="grid gap-1">
      {rows.map((r, i) => (
        <li key={r.id} className={cn("flex items-center gap-3 rounded-xl px-2 py-2.5", r.id === highlightId && "bg-accent-soft")}>
          <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", i === 0 ? "bg-gold text-white" : i === 1 ? "bg-[oklch(0.82_0.01_260)] text-white" : i === 2 ? "bg-[oklch(0.72_0.08_50)] text-white" : "bg-muted text-fg-muted")}>
            {i + 1}
          </span>
          <Avatar name={r.name} size={30} />
          <div className="min-w-0 flex-1">
            {r.href ? <a href={r.href} className="block truncate text-sm font-medium hover:text-accent">{r.name}</a> : <p className="truncate text-sm font-medium">{r.name}</p>}
            <div className="mt-1 h-1 rounded-full bg-muted">
              <div className="h-full rounded-full bg-gold/80" style={{ width: `${(r.xp / max) * 100}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{num(r.xp)}</p>
            <p className="text-[10.5px] text-fg-subtle">{r.sub ?? unit}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StatTile({ icon, value, label, hint }: { icon: React.ReactNode; value: React.ReactNode; label: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-fg-muted [&_svg]:size-4">{icon}<span className="text-[13px]">{label}</span></div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-fg-subtle">{hint}</p>}
    </Card>
  );
}
