"use client";

import { Briefcase, Plus, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { EmptyState, SectionHeader } from "@/components/campaign";
import { ChallengeCard, Leaderboard } from "@/components/impact";
import { Badge, Button, Card, Dialog, Field, Input, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { KINDS } from "@/lib/communities";
import { num, plural } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { Challenge, Community } from "@/lib/types";
import { RiseWords } from "@/components/motion";


type Resp = { items: Community[]; leaderboard: { id: string; slug: string; name: string; kind: string; members: number; monthXp: number }[]; challenges: Challenge[] };

export default function CommunitiesPage() {
  const [d, setD] = React.useState<Resp | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const load = React.useCallback(() => api<Resp>("/communities").then(setD).catch(() => null), []);
  React.useEffect(() => {
    load();
  }, [load, user?.id]);

  const join = async (ch: Challenge) => {
    if (!user) return router.push("/login?next=/communities");
    setBusy(ch.id);
    try {
      const r = await api<{ xp: number }>(`/challenges/${ch.id}/join`, { method: "POST" });
      toast({ kind: r.xp ? "xp" : "success", title: r.xp ? `+${r.xp} Impact XP` : "Ви долучилися до челенджу" });
      load();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container-page pt-8 sm:pt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <RiseWords as="h1" text="Спільноти та челенджі" className="text-balance text-[clamp(40px,6.2vw,92px)] font-medium leading-[0.98] tracking-[-0.05em]" />
          <p className="mt-3 text-fg-muted">Університети, студентські організації, компанії та волонтерські команди разом допомагають новим зборам знайти підтримку. Рейтинги рахують участь, а не гроші.</p>
        </div>
        <Button onClick={() => (user ? setOpen(true) : router.push("/login?next=/communities"))}><Plus /> Створити спільноту</Button>
      </div>

      <section className="mt-12">
        <SectionHeader eyebrow="Для всіх" title="Челенджі платформи" />
        {!d ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>
        ) : d.challenges.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {d.challenges.map((ch) => (
              <ChallengeCard key={ch.id} ch={ch} onJoin={() => join(ch)} busy={busy === ch.id} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Trophy />} title="Активних челенджів немає" />
        )}
      </section>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-5 text-xl font-bold">Спільноти</h2>
          {!d ? (
            <Skeleton className="h-60 rounded-2xl" />
          ) : d.items.length === 0 ? (
            <EmptyState icon={<Users />} title="Спільнот ще немає" description="Створіть першу для свого університету чи команди." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {d.items.map((c) => {
                const K = KINDS[c.kind] ?? KINDS.volunteer_team;
                return (
                  <Link key={c.id} href={`/communities/${c.slug}`} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><K.icon className="size-5" /></span>
                      <div className="flex gap-1.5">
                        {c.isDemo && <Badge tone="dark">Демо</Badge>}
                        {c.isMember && <Badge tone="success">Ви учасник</Badge>}
                      </div>
                    </div>
                    <p className="mt-4 font-semibold group-hover:text-accent">{c.name}</p>
                    <p className="mt-1 text-xs text-fg-subtle">{K.label}</p>
                    {c.description && <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{c.description}</p>}
                    <p className="mt-auto pt-4 text-[13px] text-fg-muted">{c.members} {plural(c.members, "учасник", "учасники", "учасників")} · {num(c.monthXp ?? 0)} XP цього місяця</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <aside>
          <Card className="p-5 lg:sticky lg:top-24">
            <p className="flex items-center gap-2 font-semibold"><Trophy className="size-4.5 text-gold" /> Реєстр спільнот</p>
            <p className="mb-4 mt-1 text-xs text-fg-subtle">Impact XP учасників за поточний місяць: підписки, поширення, нові відвідувачі, челенджі. Сума донатів не враховується.</p>
            <Leaderboard rows={(d?.leaderboard ?? []).map((r) => ({ id: r.id, name: r.name, xp: r.monthXp, sub: `${r.members} ${plural(r.members, "учасник", "учасники", "учасників")}`, href: `/communities/${r.slug}` }))} />
          </Card>
        </aside>
      </div>
      <CreateDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = React.useState({ name: "", kind: "university", description: "" });
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Нова спільнота"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button
            loading={busy}
            disabled={f.name.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ slug: string }>("/communities", { method: "POST", json: f });
                toast({ kind: "xp", title: "Спільноту створено", description: "+25 Impact XP" });
                router.push(`/communities/${r.slug}`);
              } catch (e) {
                toast({ kind: "error", title: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            Створити
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Назва">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Студенти ЛНУ" maxLength={80} />
        </Field>
        <Field label="Тип">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {Object.entries(KINDS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Опис" hint="Необов'язково">
          <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={600} />
        </Field>
        <p className="flex items-center gap-2 text-xs text-fg-subtle"><Briefcase className="size-3.5" /> Компаніям: корпоративні простори з аналітикою з'являться в тарифі Corporate.</p>
      </div>
    </Dialog>
  );
}
