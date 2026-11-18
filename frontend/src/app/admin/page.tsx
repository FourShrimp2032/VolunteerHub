"use client";

import { Ban, Check, ExternalLink, FileText, Flag, Landmark, Search, ShieldCheck, UserCog, Users, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { CampaignCover, EmptyState } from "@/components/campaign";
import { DashboardShell } from "@/components/dashboard-shell";
import { Alert, Badge, Button, Card, Dialog, Field, Input, Segmented, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { categoryOf } from "@/lib/categories";
import { date, money, timeAgo } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { CampaignCard, Me } from "@/lib/types";

type Tab = "campaigns" | "verifications" | "reports" | "users";

export default function AdminPage() {
  return (
    <DashboardShell admin title="Адмін-панель" description="Модерація зборів, перевірка організаторів і скарги.">
      {(me) => <Body me={me} />}
    </DashboardShell>
  );
}

function Body({ me }: { me: Me }) {
  const [tab, setTab] = React.useState<Tab>("campaigns");
  const [ov, setOv] = React.useState<{ pending: number; verifications: number; reports: number; users: number } | null>(null);
  const refresh = React.useCallback(() => api<typeof ov>("/admin/overview").then(setOv).catch(() => null), []);
  React.useEffect(() => {
    refresh();
  }, [refresh]);
  return (
    <div className="grid gap-6">
      <Segmented
        value={tab}
        onChange={setTab}
        className="max-w-full overflow-x-auto"
        options={[
          { value: "campaigns", label: <>Збори {ov?.pending ? <Count n={ov.pending} /> : null}</> },
          { value: "verifications", label: <>Верифікація {ov?.verifications ? <Count n={ov.verifications} /> : null}</> },
          { value: "reports", label: <>Скарги {ov?.reports ? <Count n={ov.reports} /> : null}</> },
          { value: "users", label: "Користувачі" },
        ]}
      />
      {tab === "campaigns" && <Campaigns onChange={refresh} />}
      {tab === "verifications" && <Verifications onChange={refresh} />}
      {tab === "reports" && <Reports onChange={refresh} />}
      {tab === "users" && <UsersTab me={me} />}
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-danger px-1.5 py-px text-[11px] text-white">{n}</span>;
}

type PendingCampaign = CampaignCard & { description: string; jarUrl: string | null; submittedAt: number | null };

function Campaigns({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = React.useState("pending");
  const [items, setItems] = React.useState<PendingCampaign[] | null>(null);
  const [reject, setReject] = React.useState<PendingCampaign | null>(null);
  const [reason, setReason] = React.useState("");
  const [jarChecked, setJarChecked] = React.useState<Record<string, boolean>>({});
  const toast = useToast();
  const load = React.useCallback(() => {
    setItems(null);
    api<{ items: PendingCampaign[] }>(`/admin/campaigns?status=${status}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [status]);
  React.useEffect(() => {
    load();
  }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast({ kind: "success", title: ok });
      load();
      onChange();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  };
  return (
    <div className="grid gap-4">
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "pending", label: "На модерації" },
          { value: "active", label: "Активні" },
          { value: "rejected", label: "Відхилені" },
        ]}
      />
      {!items ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : !items.length ? (
        <EmptyState icon={<Check />} title="Черга порожня" />
      ) : (
        items.map((c) => (
          <Card key={c.id} className="grid gap-5 p-5 md:grid-cols-[180px_1fr]">
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
              <CampaignCover campaign={c} iconSize={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                <Badge tone="outline">{categoryOf(c.category).label}</Badge>
                {c.isDemo && <Badge tone="dark">Демо</Badge>}
                {c.submittedAt && <span>надіслано {timeAgo(c.submittedAt)}</span>}
                <span>· організатор <Link className="underline" href={`/organizers/${c.organizer?.id}`}>{c.organizer?.name}</Link>{c.organizer?.identityVerified && " ✓"}</span>
              </div>
              <Link href={`/campaigns/${c.slug}`} className="mt-2 block text-lg font-semibold hover:text-accent">{c.title}</Link>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-fg-muted">{c.description}</p>
              <p className="mt-2 text-sm">Ціль: <b>{money(c.goalAmount)}</b></p>
              {c.jarUrl ? (
                <a href={c.jarUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                  <Landmark className="size-4" /> {c.jarUrl.replace("https://", "")} <ExternalLink className="size-3" />
                </a>
              ) : (
                <p className="mt-2 text-sm text-fg-subtle">Банку не підключено</p>
              )}
              {status === "pending" && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1 accent-[var(--color-accent)]" checked={!!jarChecked[c.id]} onChange={(e) => setJarChecked({ ...jarChecked, [c.id]: e.target.checked })} disabled={!c.jarUrl} />
                    <span>Я відкрив(-ла) банку й звірив(-ла) її з організатором<br /><span className="text-xs text-fg-subtle">Додасть позначку «Банку перевірено»</span></span>
                  </label>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setReject(c); setReason(""); }}><X /> Відхилити</Button>
                    <Button size="sm" onClick={() => run(() => api(`/admin/campaigns/${c.id}/approve`, { method: "POST", json: { destinationVerified: !!jarChecked[c.id] } }), "Збір опубліковано")}>
                      <Check /> Схвалити
                    </Button>
                  </div>
                </div>
              )}
              {status === "active" && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button size="sm" variant="secondary" disabled={!c.jarUrl} onClick={() => run(() => api(`/admin/campaigns/${c.id}/destination`, { method: "POST", json: { verified: !c.verification.destinationVerified } }), "Оновлено")}>
                    <Landmark /> {c.verification.destinationVerified ? "Зняти «Банку перевірено»" : "Позначити банку перевіреною"}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
      <Dialog
        open={!!reject}
        onClose={() => setReject(null)}
        title="Відхилити збір"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReject(null)}>Скасувати</Button>
            <Button variant="danger" disabled={reason.trim().length < 5} onClick={() => reject && run(() => api(`/admin/campaigns/${reject.id}/reject`, { method: "POST", json: { reason } }), "Збір відхилено").then(() => setReject(null))}>
              Відхилити
            </Button>
          </>
        }
      >
        <Field label="Причина (побачить організатор)">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Наприклад: додайте рахунок від постачальника та уточніть, кому передаєте допомогу." />
        </Field>
      </Dialog>
    </div>
  );
}

type VReq = { id: string; userId: string; name: string; email: string; note: string; fileUrl: string | null; createdAt: number };

function Verifications({ onChange }: { onChange: () => void }) {
  const [items, setItems] = React.useState<VReq[] | null>(null);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const toast = useToast();
  const load = React.useCallback(() => api<{ items: VReq[] }>("/admin/verifications").then((r) => setItems(r.items)).catch(() => setItems([])), []);
  React.useEffect(() => {
    load();
  }, [load]);
  const decide = async (id: string, decision: "approved" | "rejected") => {
    try {
      await api(`/admin/verifications/${id}`, { method: "POST", json: { decision, note: notes[id] ?? "" } });
      toast({ kind: "success", title: decision === "approved" ? "Особу підтверджено" : "Запит відхилено" });
      load();
      onChange();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  };
  if (!items) return <Skeleton className="h-40 rounded-2xl" />;
  if (!items.length) return <EmptyState icon={<ShieldCheck />} title="Немає запитів на верифікацію" />;
  return (
    <div className="grid gap-3">
      <Alert icon={<ShieldCheck />}>Документи приватні: відкривати їх можуть лише адміністратори. Не завантажуйте їх на сторонні сервіси.</Alert>
      {items.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{r.name} <span className="font-normal text-fg-muted">· {r.email}</span></p>
            <span className="text-xs text-fg-subtle">{date(r.createdAt)}</span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">{r.note}</p>
          {r.fileUrl && (
            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-subtle">
              <FileText className="size-4" /> Відкрити документ
            </a>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Коментар (необов'язково)" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} className="h-9 text-sm" />
            <Button size="sm" variant="secondary" onClick={() => decide(r.id, "rejected")}><X /> Відхилити</Button>
            <Button size="sm" onClick={() => decide(r.id, "approved")}><Check /> Підтвердити особу</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

type Report = { id: string; campaignId: string; title: string; slug: string; reason: string; details: string; createdAt: number; campaignStatus: string };
const REASONS: Record<string, string> = { fraud: "Шахрайство", misleading: "Оманлива інформація", duplicate: "Дублікат", inappropriate: "Неприйнятний вміст", other: "Інше" };

function Reports({ onChange }: { onChange: () => void }) {
  const [items, setItems] = React.useState<Report[] | null>(null);
  const toast = useToast();
  const load = React.useCallback(() => api<{ items: Report[] }>("/admin/reports").then((r) => setItems(r.items)).catch(() => setItems([])), []);
  React.useEffect(() => {
    load();
  }, [load]);
  const act = async (id: string, action: "dismiss" | "unpublish") => {
    try {
      await api(`/admin/reports/${id}`, { method: "POST", json: { action } });
      toast({ kind: "success", title: action === "dismiss" ? "Скаргу відхилено" : "Збір знято з публікації" });
      load();
      onChange();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  };
  if (!items) return <Skeleton className="h-40 rounded-2xl" />;
  if (!items.length) return <EmptyState icon={<Flag />} title="Відкритих скарг немає" />;
  return (
    <div className="grid gap-3">
      {items.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="danger">{REASONS[r.reason] ?? r.reason}</Badge>
            <span className="text-xs text-fg-subtle">{timeAgo(r.createdAt)}</span>
          </div>
          <Link href={`/campaigns/${r.slug}`} className="mt-2 block font-semibold hover:text-accent">{r.title}</Link>
          {r.details && <p className="mt-1 text-sm text-fg-muted">{r.details}</p>}
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => act(r.id, "dismiss")}>Безпідставна</Button>
            <Button size="sm" variant="danger" onClick={() => act(r.id, "unpublish")}><Ban /> Зняти збір</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

type U = Me & { isBlocked: boolean };

function UsersTab({ me }: { me: Me }) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<U[] | null>(null);
  const [edit, setEdit] = React.useState<U | null>(null);
  const toast = useToast();
  const load = React.useCallback((query = "") => api<{ items: U[] }>(`/admin/users?q=${encodeURIComponent(query)}`).then((r) => setItems(r.items)).catch(() => setItems([])), []);
  React.useEffect(() => {
    load();
  }, [load]);
  const update = async (id: string, patch: Record<string, unknown>) => {
    try {
      await api(`/admin/users/${id}`, { method: "POST", json: patch });
      toast({ kind: "success", title: "Збережено" });
      setEdit(null);
      load(q);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  };
  return (
    <div className="grid gap-4">
      <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="flex max-w-md gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email або ім'я" className="h-10" />
        <Button type="submit" variant="secondary"><Search /></Button>
      </form>
      {!items ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Користувач</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">XP</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name} {u.isDemo && <Badge tone="dark">Демо</Badge>}</p>
                    <p className="text-xs text-fg-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{u.role === "admin" ? <Badge tone="accent">Адмін</Badge> : "Користувач"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.identityVerified && <Badge tone="success">Особу перевірено</Badge>}
                      {u.isBlocked && <Badge tone="danger">Заблоковано</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.xp}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEdit(u)} disabled={u.id === me.id}><UserCog /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p className="p-6 text-center text-sm text-fg-muted"><Users className="mx-auto mb-2 size-5" />Нікого не знайдено</p>}
        </Card>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit ? `Керування: ${edit.name}` : ""}>
        {edit && (
          <div className="grid gap-2">
            <Button variant="secondary" onClick={() => update(edit.id, { role: edit.role === "admin" ? "user" : "admin" })}>
              {edit.role === "admin" ? "Зняти права адміністратора" : "Зробити адміністратором"}
            </Button>
            <Button variant={edit.isBlocked ? "secondary" : "danger"} onClick={() => update(edit.id, { isBlocked: !edit.isBlocked })}>
              {edit.isBlocked ? "Розблокувати" : "Заблокувати"}
            </Button>
            {edit.identityVerified && (
              <Button variant="ghost" onClick={() => update(edit.id, { identityVerified: false })}>Відкликати позначку «Особу перевірено»</Button>
            )}
            <p className="mt-2 text-xs text-fg-subtle">Позначку «Особу перевірено» можна надати лише через розгляд запиту з документом.</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
