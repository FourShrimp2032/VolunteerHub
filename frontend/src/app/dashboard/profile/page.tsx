"use client";

import { BadgeCheck, Camera, Clock, Copy, KeyRound, Lock, ShieldCheck, Upload, XCircle } from "lucide-react";
import * as React from "react";
import { Avatar } from "@/components/avatar";
import { DashboardShell } from "@/components/dashboard-shell";
import { Alert, Badge, Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { date } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { Me } from "@/lib/types";

export default function ProfilePage() {
  return <DashboardShell title="Профіль" description="Публічний профіль, інтереси для рекомендацій і перевірка особи.">{(u) => <Body user={u} />}</DashboardShell>;
}

function Body({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = React.useState({ name: user.name, bio: user.bio, city: user.city, interests: user.interests, avatarFileId: undefined as string | null | undefined, avatarUrl: user.avatarUrl });
  const [busy, setBusy] = React.useState(false);
  const [up, setUp] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ user: Me }>("/me", { method: "PATCH", json: { name: f.name, bio: f.bio, city: f.city, interests: f.interests, ...(f.avatarFileId !== undefined && { avatarFileId: f.avatarFileId }) } });
      setUser(r.user);
      toast({ kind: "success", title: "Профіль збережено" });
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const refLink = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${user.referralCode}` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card className="p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={f.name} src={f.avatarUrl} size={72} />
            <button onClick={() => ref.current?.click()} className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-border bg-surface shadow-card hover:bg-subtle" aria-label="Змінити фото">
              <Camera className="size-4" />
            </button>
            <input
              ref={ref}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUp(true);
                try {
                  const r = await uploadFile(file, "image");
                  setF((s) => ({ ...s, avatarFileId: r.id, avatarUrl: r.url }));
                } catch (er) {
                  toast({ kind: "error", title: (er as Error).message });
                } finally {
                  setUp(false);
                }
              }}
            />
          </div>
          <div>
            <p className="font-semibold">{user.email}</p>
            <p className="text-sm text-fg-muted">{up ? "Завантаження фото…" : `З нами з ${date(user.createdAt)}`}</p>
          </div>
        </div>
        <div className="mt-7 grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ім'я">
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
            </Field>
            <Field label="Місто">
              <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={80} placeholder="Київ" />
            </Field>
          </div>
          <Field label="Про себе" hint="Видно на публічному профілі">
            <Textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={600} placeholder="Чим ви займаєтесь, кому допомагаєте…" />
          </Field>
          <Field label="Інтереси" hint="Для «Рекомендовано для вас»">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = f.interests.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setF({ ...f, interests: on ? f.interests.filter((x) => x !== c.slug) : [...f.interests, c.slug] })}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition", on ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted hover:text-fg")}
                  >
                    <c.icon className="size-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <p className="text-xs text-fg-subtle">Заповніть «Про себе» (20+ символів), місто та інтереси й отримайте +20 Impact XP.</p>
          <div className="flex justify-end">
            <Button onClick={save} loading={busy}>Зберегти</Button>
          </div>
        </div>
      </Card>

      <div className="grid content-start gap-6">
        <VerificationCard verified={user.identityVerified} />
        <Card className="p-5">
          <p className="font-semibold">Реферальне посилання</p>
          <p className="mt-1 text-sm text-fg-muted">Ділитесь зборами з кабінету. Посилання вже містить ваш код, і нові відвідувачі приносять вам XP.</p>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={refLink} className="h-9 text-xs" onFocus={(e) => e.target.select()} />
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(refLink).then(() => toast({ kind: "success", title: "Скопійовано" }))}>
              <Copy />
            </Button>
          </div>
        </Card>
        <PasswordCard />
      </div>
    </div>
  );
}

type VReq = { id: string; status: "pending" | "approved" | "rejected"; note: string; reviewNote: string | null; createdAt: number; fileUrl: string | null };

function VerificationCard({ verified }: { verified: boolean }) {
  const [data, setData] = React.useState<{ verified: boolean; requests: VReq[] } | null>(null);
  const [note, setNote] = React.useState("");
  const [file, setFile] = React.useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const ref = React.useRef<HTMLInputElement>(null);
  const load = React.useCallback(() => api<{ verified: boolean; requests: VReq[] }>("/me/verification").then(setData).catch(() => null), []);
  React.useEffect(() => {
    load();
  }, [load]);
  const pending = data?.requests.find((r) => r.status === "pending");
  const lastRejected = data?.requests.find((r) => r.status === "rejected");

  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4.5 text-accent" /> Перевірка особи</p>
      {verified ? (
        <Alert tone="success" className="mt-3" icon={<BadgeCheck />}>Особу перевірено. Біля вашого імені відображається позначка.</Alert>
      ) : pending ? (
        <Alert tone="warning" className="mt-3" icon={<Clock />}>Запит від {date(pending.createdAt)} на розгляді.</Alert>
      ) : (
        <>
          <p className="mt-1 text-sm text-fg-muted">Завантажте документ, що підтверджує особу або статус волонтера/організації. Файл бачать лише модератори, він ніколи не публікується.</p>
          {lastRejected && <Alert tone="danger" className="mt-3" icon={<XCircle />}>Попередній запит відхилено{lastRejected.reviewNote ? `: ${lastRejected.reviewNote}` : "."}</Alert>}
          <div className="mt-4 grid gap-3">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Хто ви, яку діяльність ведете, посилання на соцмережі…" className="min-h-24 text-sm" />
            <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}>
              <Upload /> {file ? file.name : "Обрати документ (PDF або фото)"}
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
                try {
                  const r = await uploadFile(f, "verification");
                  setFile({ id: r.id, name: r.name });
                } catch (er) {
                  toast({ kind: "error", title: (er as Error).message });
                }
              }}
            />
            <p className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle"><Lock className="size-3" /> Приватне сховище, доступ лише для вас і модераторів.</p>
            <Button
              size="sm"
              loading={busy}
              disabled={!file || note.trim().length < 20}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/me/verification", { method: "POST", json: { note, fileId: file!.id } });
                  toast({ kind: "success", title: "Запит надіслано" });
                  setNote("");
                  setFile(null);
                  load();
                } catch (er) {
                  toast({ kind: "error", title: (er as Error).message });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Надіслати на перевірку
            </Button>
          </div>
        </>
      )}
      {data && data.requests.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-fg-muted">Історія запитів</p>
          <ul className="grid gap-1.5">
            {data.requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-fg-muted">{date(r.createdAt)}</span>
                <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>
                  {r.status === "approved" ? "Схвалено" : r.status === "rejected" ? "Відхилено" : "На розгляді"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function PasswordCard() {
  const [cur, setCur] = React.useState("");
  const [nxt, setNxt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 font-semibold"><KeyRound className="size-4.5" /> Змінити пароль</p>
      <form
        className="mt-3 grid gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/auth/password", { method: "POST", json: { current: cur, next: nxt } });
            toast({ kind: "success", title: "Пароль змінено" });
            setCur("");
            setNxt("");
          } catch (er) {
            toast({ kind: "error", title: (er as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input type="password" autoComplete="current-password" placeholder="Поточний пароль" value={cur} onChange={(e) => setCur(e.target.value)} className="h-10" />
        <Input type="password" autoComplete="new-password" placeholder="Новий пароль (8+ символів)" minLength={8} value={nxt} onChange={(e) => setNxt(e.target.value)} className="h-10" />
        <Button type="submit" variant="secondary" size="sm" loading={busy} disabled={!cur || nxt.length < 8}>Оновити пароль</Button>
      </form>
    </Card>
  );
}
