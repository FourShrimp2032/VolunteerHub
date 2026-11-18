"use client";

import { ArrowUpRight, CheckCircle2, Eye, FileText, Flag, HandCoins, ImagePlus, Info, MousePointerClick, Pencil, Send, Share2, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState } from "@/components/campaign";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatTile } from "@/components/impact";
import { Alert, Badge, Button, ButtonLink, Card, Dialog, Field, Input, Progress, Segmented, Skeleton, Textarea } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/categories";
import { date, money, num, pct, shortDate, timeAgo } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { CampaignDetail } from "@/lib/types";

type Stats = { totals: { views: number; followers: number; saves: number; shares: number; referredVisitors: number; donateClicks: number; progress: number }; days: { day: string; views: number }[] };

function Inner() {
  const id = useSearchParams().get("id");
  return (
    <DashboardShell title="Керування збором">
      {() => (id ? <Manage id={id} /> : <EmptyState title="Збір не обрано" action={<ButtonLink href="/dashboard/organizer">Мої збори</ButtonLink>} />)}
    </DashboardShell>
  );
}

export default function Page() {
  return (
    <React.Suspense>
      <Inner />
    </React.Suspense>
  );
}

function Manage({ id }: { id: string }) {
  const [c, setC] = React.useState<CampaignDetail | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const toast = useToast();
  const router = useRouter();
  const load = React.useCallback(async () => {
    try {
      const r = await api<{ campaign: CampaignDetail }>(`/campaigns/${id}`);
      setC(r.campaign);
      api<Stats>(`/campaigns/${id}/stats`).then(setStats).catch(() => null);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  }, [id, toast]);
  React.useEffect(() => {
    load();
  }, [load]);

  if (!c) return <Skeleton className="h-72 rounded-2xl" />;
  const s = STATUS_LABELS[c.status];
  const live = ["active", "goal_reached", "completed"].includes(c.status);

  const action = async (path: string, ok: string) => {
    try {
      await api(`/campaigns/${c.id}/${path}`, { method: "POST" });
      toast({ kind: "success", title: ok });
      load();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  };

  return (
    <div className="grid gap-8">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {s && <Badge tone={s.tone}>{s.label}</Badge>}
            {c.verification.purposeReviewed && <Badge tone="success">Мету перевірено</Badge>}
            {c.verification.destinationVerified && <Badge tone="success">Банку перевірено</Badge>}
          </div>
          <p className="mt-2 truncate text-lg font-semibold">{c.title}</p>
          <p className="text-sm text-fg-muted">Створено {date(c.createdAt)}{c.publishedAt ? ` · опубліковано ${date(c.publishedAt)}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status !== "completed" && (
            <ButtonLink href={`/dashboard/campaigns/new?id=${c.id}`} variant="secondary" size="sm"><Pencil /> Редагувати</ButtonLink>
          )}
          <ButtonLink href={`/campaigns/${c.slug}`} variant="secondary" size="sm"><ArrowUpRight /> Сторінка збору</ButtonLink>
          {["draft", "rejected"].includes(c.status) && (
            <Button size="sm" onClick={() => action("submit", "Надіслано на модерацію")}><Send /> На модерацію</Button>
          )}
          {["draft", "rejected"].includes(c.status) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await api(`/campaigns/${c.id}`, { method: "DELETE" });
                  toast({ kind: "success", title: "Чернетку видалено" });
                  router.push("/dashboard/organizer");
                } catch (e) {
                  toast({ kind: "error", title: (e as Error).message });
                }
              }}
            >
              <Trash2 /> Видалити
            </Button>
          )}
        </div>
      </Card>

      {c.status === "rejected" && c.rejectionReason && <Alert tone="danger" icon={<Info />}>Модератор відхилив збір: {c.rejectionReason}. Виправте його й надішліть знову.</Alert>}
      {c.status === "pending" && <Alert tone="warning" icon={<Info />}>Збір на модерації. Зазвичай перевірка триває до доби.</Alert>}
      {c.status === "draft" && <Alert icon={<Info />}>Це чернетка. Заповніть усі кроки й надішліть збір на модерацію.</Alert>}

      {live && stats && (
        <section>
          <h2 className="mb-4 text-lg font-medium">Статистика</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatTile icon={<Eye />} value={num(stats.totals.views)} label="Переглядів" hint="Унікальних за день" />
            <StatTile icon={<Users />} value={stats.totals.followers} label="Підписників" />
            <StatTile icon={<Share2 />} value={stats.totals.shares} label="Поширень" />
            <StatTile icon={<Users />} value={stats.totals.referredVisitors} label="Приведено поширеннями" />
            <StatTile icon={<MousePointerClick />} value={stats.totals.donateClicks} label="Переходів до банки" />
            <StatTile icon={<HandCoins />} value={pct(stats.totals.progress)} label="Прогрес" />
          </div>
          <Card className="mt-3 p-5">
            <p className="mb-4 text-sm font-medium">Перегляди за 30 днів</p>
            <ViewsChart days={stats.days} />
          </Card>
        </section>
      )}

      {["active", "goal_reached"].includes(c.status) && <ProgressForm c={c} onDone={load} />}
      {live && <UpdateForm c={c} onDone={load} />}

      {live && c.status !== "completed" && (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Завершити збір</p>
            <p className="text-sm text-fg-muted">Кнопка донату зникне. Не забудьте опублікувати фінальний звіт. Він також автоматично завершить збір.</p>
          </div>
          <Button variant="secondary" onClick={() => action("complete", "Збір завершено")}><Flag /> Завершити</Button>
        </Card>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium">Опубліковані оновлення</h2>
        {c.updates.length === 0 ? (
          <p className="text-sm text-fg-muted">Поки немає оновлень.</p>
        ) : (
          <ul className="grid gap-2">
            {c.updates.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
                <Badge tone={u.kind === "final_report" ? "success" : u.kind === "purchase" ? "accent" : "neutral"}>
                  {u.kind === "final_report" ? "Фінальний звіт" : u.kind === "purchase" ? "Закупівля" : "Оновлення"}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.title}</span>
                <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ViewsChart({ days }: { days: Stats["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.views));
  return (
    <div>
      <div className="flex h-32 items-end gap-[3px]">
        {days.map((d) => (
          <div key={d.day} className="group relative flex-1">
            <div className="w-full rounded-t-[3px] bg-accent/80 transition group-hover:bg-accent" style={{ height: `${Math.max(2, (d.views / max) * 128)}px` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-1.5 py-0.5 text-[11px] text-white group-hover:block">
              {d.views} · {shortDate(new Date(d.day).getTime())}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-fg-subtle">
        <span>{shortDate(new Date(days[0]?.day).getTime())}</span>
        <span>сьогодні</span>
      </div>
    </div>
  );
}

function ProgressForm({ c, onDone }: { c: CampaignDetail; onDone: () => void }) {
  const [v, setV] = React.useState(String(c.raisedAmount || ""));
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const amount = Number(v) || 0;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end">
        <div className="flex-1">
          <p className="font-semibold">Оновити зібрану суму</p>
          <p className="mt-1 text-sm text-fg-muted">
            Monobank не надає офіційного API для балансу банки, тому вкажіть суму вручну. Донори бачитимуть її з позначкою «за даними організатора».
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Progress value={c.goalAmount ? amount / c.goalAmount : 0} className="max-w-sm" />
            <span className="shrink-0 text-sm text-fg-muted">{money(amount)} з {money(c.goalAmount)}</span>
          </div>
          {c.raisedUpdatedAt && <p className="mt-2 text-xs text-fg-subtle">Востаннє оновлено {timeAgo(c.raisedUpdatedAt)}</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const r = await api<{ status: string }>(`/campaigns/${c.id}/progress`, { method: "POST", json: { raisedAmount: amount } });
              toast({ kind: "success", title: r.status === "goal_reached" ? "Ціль досягнуто! 🎉" : "Суму оновлено" });
              onDone();
            } catch (er) {
              toast({ kind: "error", title: (er as Error).message });
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} className="w-40" aria-label="Зібрана сума" />
          <Button type="submit" loading={busy}>Зберегти</Button>
        </form>
      </div>
    </Card>
  );
}

function UpdateForm({ c, onDone }: { c: CampaignDetail; onDone: () => void }) {
  const [kind, setKind] = React.useState<"update" | "purchase" | "final_report">("update");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [spent, setSpent] = React.useState("");
  const [files, setFiles] = React.useState<{ id: string; name: string; url: string; mime: string }[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const toast = useToast();
  const ref = React.useRef<HTMLInputElement>(null);

  const publish = async () => {
    setBusy(true);
    try {
      await api(`/campaigns/${c.id}/updates`, { method: "POST", json: { kind, title, body, spentAmount: spent ? Number(spent) : null, fileIds: files.map((f) => f.id) } });
      toast({ kind: "success", title: kind === "final_report" ? "Фінальний звіт опубліковано" : "Оновлення опубліковано", description: "Підписники побачать його у своєму кабінеті." });
      setTitle("");
      setBody("");
      setSpent("");
      setFiles([]);
      setConfirm(false);
      onDone();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <p className="font-semibold">Опублікувати оновлення чи звіт</p>
      <p className="mt-1 text-sm text-fg-muted">Чеки, фото закупівель і фінальний звіт формують таймлайн прозорості збору.</p>
      <div className="mt-5 grid gap-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "update", label: "Оновлення" },
            { value: "purchase", label: "Закупівля" },
            { value: "final_report", label: "Фінальний звіт" },
          ]}
        />
        <Field label="Заголовок">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder={kind === "final_report" ? "Фінальний звіт: на що пішли кошти" : "Що нового?"} />
        </Field>
        <Field label="Текст">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Розкажіть, що зроблено, що купили, хто отримав допомогу…" />
        </Field>
        {kind !== "update" && (
          <Field label="Витрачено, ₴" hint="Необов'язково">
            <Input inputMode="numeric" value={spent} onChange={(e) => setSpent(e.target.value.replace(/\D/g, ""))} className="max-w-48" />
          </Field>
        )}
        <div>
          <p className="mb-2 text-sm font-medium">Чеки та фото</p>
          <div className="flex flex-wrap gap-2">
            {files.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-2 rounded-lg border border-border py-1.5 pl-2.5 pr-1.5 text-xs">
                {f.mime.startsWith("image/") ? <ImagePlus className="size-3.5" /> : <FileText className="size-3.5" />} <span className="max-w-40 truncate">{f.name}</span>
                <button onClick={() => setFiles(files.filter((x) => x.id !== f.id))} aria-label="Прибрати" className="rounded p-0.5 hover:bg-muted"><X className="size-3.5" /></button>
              </span>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()} loading={uploading} disabled={files.length >= 10}>
              <ImagePlus /> Додати файл
            </Button>
            <input
              ref={ref}
              type="file"
              hidden
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setUploading(true);
                try {
                  const r = await uploadFile(f, f.type.startsWith("image/") ? "image" : "document");
                  setFiles((s) => [...s, r]);
                } catch (er) {
                  toast({ kind: "error", title: (er as Error).message });
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => (kind === "final_report" ? setConfirm(true) : publish())} loading={busy} disabled={title.trim().length < 3 || body.trim().length < 10}>
            <CheckCircle2 /> Опублікувати
          </Button>
        </div>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Опублікувати фінальний звіт?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Скасувати</Button>
            <Button onClick={publish} loading={busy}>Опублікувати й завершити</Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">Збір отримає статус «Завершено» та позначку «Звіт опубліковано». Кнопка донату зникне.</p>
      </Dialog>
      <p className="mt-4 text-xs text-fg-subtle">
        <Link href="/transparency" className="underline">Як скласти хороший звіт</Link>
      </p>
    </Card>
  );
}
