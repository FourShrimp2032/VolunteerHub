"use client";

import { LogOut, Plus, Trophy, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CampaignGrid, EmptyState } from "@/components/campaign";
import { ChallengeCard, Leaderboard } from "@/components/impact";
import { Badge, Button, ButtonLink, Card, Dialog, Field, Input, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { KINDS } from "@/lib/communities";
import { plural } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { CampaignCard, Challenge, Community } from "@/lib/types";
import { usePathParam } from "@/lib/use-path-param";

type Resp = {
  community: Community; isMember: boolean; canManage: boolean;
  leaderboard: { userId: string; name: string; xp: number }[];
  challenges: Challenge[]; campaigns: CampaignCard[];
};

const METRICS = [
  { value: "shares_verified", label: "Поширені перевірені збори" },
  { value: "follows_new", label: "Підписки на нові збори" },
  { value: "referrals", label: "Нові відвідувачі за посиланнями" },
  { value: "referrals_new", label: "Відвідувачі для нових зборів" },
];

export default function CommunityPage() {
  const slug = usePathParam();
  const [d, setD] = React.useState<Resp | null>(null);
  const [err, setErr] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [create, setCreate] = React.useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const load = React.useCallback(() => {
    if (slug) api<Resp>(`/communities/${encodeURIComponent(slug)}`).then(setD).catch(() => setErr(true));
  }, [slug]);
  React.useEffect(() => {
    load();
  }, [load, user?.id]);

  if (err) return <div className="container-page py-20"><EmptyState title="Спільноту не знайдено" action={<ButtonLink href="/communities">Усі спільноти</ButtonLink>} /></div>;
  if (!d) return <div className="container-page pt-10"><Skeleton className="h-40 rounded-3xl" /></div>;
  const K = KINDS[d.community.kind] ?? KINDS.volunteer_team;

  const act = async (path: string, ok: string) => {
    if (!user) return router.push(`/login?next=/communities/${slug}`);
    setBusy(path);
    try {
      const r = await api<{ xp?: number }>(path, { method: "POST" });
      toast({ kind: r.xp ? "xp" : "success", title: r.xp ? `+${r.xp} Impact XP` : ok });
      load();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container-page pt-8 sm:pt-12">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent"><K.icon className="size-7" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="outline">{K.label}</Badge>
                {d.community.isDemo && <Badge tone="dark">Демо</Badge>}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{d.community.name}</h1>
              <p className="text-sm text-fg-muted">{d.community.members} {plural(d.community.members, "учасник", "учасники", "учасників")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {d.canManage && <Button variant="secondary" onClick={() => setCreate(true)}><Plus /> Челендж</Button>}
            {d.isMember ? (
              <Button variant="ghost" onClick={() => act(`/communities/${slug}/leave`, "Ви вийшли зі спільноти")} loading={busy?.endsWith("leave")}><LogOut /> Вийти</Button>
            ) : (
              <Button onClick={() => act(`/communities/${slug}/join`, "Ви приєдналися")} loading={busy?.endsWith("join")}><UserPlus /> Приєднатися</Button>
            )}
          </div>
        </div>
        {d.community.description && <p className="mt-6 max-w-3xl leading-relaxed text-fg-muted">{d.community.description}</p>}
      </Card>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-10">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Trophy className="size-5 text-gold" /> Челенджі спільноти</h2>
            {d.challenges.length === 0 ? (
              <EmptyState title="Челенджів поки немає" description={d.canManage ? "Створіть перший, наприклад «Поширимо 20 перевірених зборів за тиждень»." : "Власник спільноти може створити челендж."} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {d.challenges.map((ch) => (
                  <ChallengeCard key={ch.id} ch={ch} onJoin={d.isMember && ch.endsAt > Date.now() ? () => act(`/challenges/${ch.id}/join`, "Ви долучилися") : undefined} busy={busy === `/challenges/${ch.id}/join`} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-4 text-xl font-bold">Збори учасників</h2>
            <CampaignGrid items={d.campaigns} empty={<EmptyState title="Учасники ще не створювали зборів" />} />
          </section>
        </div>
        <aside>
          <Card className="p-5 lg:sticky lg:top-24">
            <p className="font-semibold">Рейтинг учасників</p>
            <p className="mb-4 mt-1 text-xs text-fg-subtle">Impact XP за поточний місяць. Лише участь, не суми донатів.</p>
            <Leaderboard rows={d.leaderboard.map((r) => ({ id: r.userId, name: r.name, xp: r.xp }))} highlightId={user?.id} />
          </Card>
        </aside>
      </div>
      {slug && <CreateChallenge slug={slug} open={create} onClose={() => setCreate(false)} onDone={load} />}
    </div>
  );
}

function CreateChallenge({ slug, open, onClose, onDone }: { slug: string; open: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = React.useState({ title: "", description: "", metric: "shares_verified", target: "20", days: "14" });
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Новий челендж"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button
            loading={busy}
            disabled={f.title.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/communities/${slug}/challenges`, { method: "POST", json: { ...f, target: Number(f.target), days: Number(f.days) } });
                toast({ kind: "success", title: "Челендж створено" });
                onClose();
                onDone();
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
        <Field label="Назва"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Тиждень амбасадорів" /></Field>
        <Field label="Опис"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-20" /></Field>
        <Field label="Що рахуємо">
          <Select value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value })}>
            {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ціль (командна)"><Input inputMode="numeric" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Тривалість, днів"><Input inputMode="numeric" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value.replace(/\D/g, "") })} /></Field>
        </div>
      </div>
    </Dialog>
  );
}
