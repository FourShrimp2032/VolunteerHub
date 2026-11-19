"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, ExternalLink, FileText, ImagePlus, Landmark, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CampaignCard } from "@/components/campaign";
import { Alert, Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { TemplateConfig } from "@/lib/types";
import { TemplateEditor } from "@/components/template-editor";

type Draft = {
  title: string; summary: string; description: string; category: string; city: string; coverFileId: string | null; coverUrl: string | null;
  goalAmount: string; deadline: string; urgent: boolean; budget: { label: string; amount: string }[]; jarUrl: string;
};
type Attachment = { id: string; title: string; url: string; mime: string; size: number };

const EMPTY: Draft = { title: "", summary: "", description: "", category: "", city: "", coverFileId: null, coverUrl: null, goalAmount: "", deadline: "", urgent: false, budget: [{ label: "", amount: "" }], jarUrl: "" };

const STEPS = ["Про збір", "Ціль і бюджет", "Банка Monobank", "Документи", "Шаблон для помічників", "Перегляд"];
const JAR_RE = /^(https?:\/\/)?send\.monobank\.ua\/jar\/[A-Za-z0-9]{6,16}\/?(\?.*)?$/i;

export function CampaignWizard({ editId }: { editId?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState<Draft>(EMPTY);
  const [id, setId] = React.useState<string | null>(editId ?? null);
  const [slug, setSlug] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("draft");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [loaded, setLoaded] = React.useState(!editId);
  const [tpl, setTpl] = React.useState<{ url: string | null; fileId: string | null; config: TemplateConfig | null; captionTemplate: string; helpersInTotal: boolean }>({
    url: null, fileId: null, config: null, captionTemplate: "", helpersInTotal: true,
  });

  React.useEffect(() => {
    if (!editId) return;
    api<{ campaign: Record<string, unknown> & { budget: { label: string; amount: number }[]; attachments: Attachment[] } }>(`/campaigns/${editId}/edit`)
      .then(({ campaign: c }) => {
        setD({
          title: String(c.title ?? ""),
          summary: String(c.summary ?? ""),
          description: String(c.description ?? ""),
          category: String(c.category ?? ""),
          city: String(c.city ?? ""),
          coverFileId: (c.coverFileId as string) ?? null,
          coverUrl: (c.coverUrl as string) ?? null,
          goalAmount: c.goalAmount ? String(c.goalAmount) : "",
          deadline: c.deadline ? new Date(c.deadline as number).toISOString().slice(0, 10) : "",
          urgent: !!c.urgent,
          budget: c.budget.length ? c.budget.map((b) => ({ label: b.label, amount: String(b.amount) })) : [{ label: "", amount: "" }],
          jarUrl: String(c.jarUrl ?? ""),
        });
        setTpl({
          url: (c.templateUrl as string) ?? null,
          fileId: (c.templateFileId as string) ?? null,
          config: (c.templateConfig as TemplateConfig) ?? null,
          captionTemplate: String(c.captionTemplate ?? ""),
          helpersInTotal: c.helpersInTotal !== false,
        });
        setSlug(String(c.slug));
        setStatus(String(c.status));
        setAttachments(c.attachments);
        setLoaded(true);
      })
      .catch((e) => {
        toast({ kind: "error", title: (e as Error).message });
        router.replace("/dashboard/organizer");
      });
  }, [editId, router, toast]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (d.title.trim().length < 5) e.title = "Мінімум 5 символів";
      if (!d.category) e.category = "Оберіть категорію";
      if (d.description.trim().length < 80) e.description = `Опишіть детальніше: ще ${80 - d.description.trim().length} символів`;
    }
    if (s === 1) {
      const g = Number(d.goalAmount);
      if (!g || g < 100) e.goalAmount = "Ціль від 100 ₴";
      if (d.deadline && new Date(d.deadline).getTime() < Date.now() - 86_400_000) e.deadline = "Дата в минулому";
      d.budget.forEach((b, i) => {
        if ((b.label && !b.amount) || (!b.label && b.amount)) e[`budget${i}`] = "Заповніть назву і суму";
      });
    }
    if (s === 2) {
      if (!d.jarUrl.trim()) e.jarUrl = "Вставте посилання на банку";
      else if (!JAR_RE.test(d.jarUrl.trim())) e.jarUrl = "Посилання має виглядати як https://send.monobank.ua/jar/XXXXXXXXXX";
    }
    setErrors(e);
    return Object.values(e).every((x) => !x);
  };

  const payload = () => ({
    title: d.title.trim(),
    summary: d.summary.trim(),
    description: d.description.trim(),
    category: d.category || undefined,
    city: d.city.trim(),
    coverFileId: d.coverFileId,
    goalAmount: Number(d.goalAmount) || 0,
    deadline: d.deadline ? new Date(`${d.deadline}T23:59:00`).getTime() : null,
    urgent: d.urgent,
    jarUrl: d.jarUrl.trim() || null,
    budget: d.budget.filter((b) => b.label.trim() && b.amount).map((b) => ({ label: b.label.trim(), amount: Number(b.amount) || 0 })),
  });

  const save = async () => {
    if (!id) {
      const r = await api<{ id: string; slug: string }>("/campaigns", { method: "POST", json: payload() });
      setId(r.id);
      setSlug(r.slug);
      return r.id;
    }
    await api(`/campaigns/${id}`, { method: "PATCH", json: payload() });
    return id;
  };

  const next = async () => {
    if (!validate(step)) return;
    setBusy(true);
    try {
      await save();
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const cid = await save();
      if (status === "draft" || status === "rejected") await api(`/campaigns/${cid}/submit`, { method: "POST" });
      toast({ kind: "success", title: status === "draft" || status === "rejected" ? "Збір надіслано на модерацію" : "Зміни збережено", description: "Ми повідомимо, щойно модератор його перегляне." });
      router.push(`/dashboard/campaigns/manage?id=${cid}`);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      if (d.title.trim().length < 5) {
        setErrors({ title: "Мінімум 5 символів" });
        setStep(0);
        return;
      }
      const cid = await save();
      toast({ kind: "success", title: "Чернетку збережено" });
      router.push(`/dashboard/campaigns/manage?id=${cid}`);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin text-fg-subtle" /></div>;

  const budgetSum = d.budget.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const goal = Number(d.goalAmount) || 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

      <Card className="mt-6 p-5 sm:p-8">
        {step === 0 && (
          <div className="grid gap-5">
            <Head title="Розкажіть про збір" text="Чітка назва й чесний опис допомагають людям довіритися. Модератор перевірить мету перед публікацією." />
            <Field label="Назва збору" error={errors.title} hint={`${d.title.length}/120`}>
              <Input value={d.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="Наприклад: Генератор для районної лікарні" />
            </Field>
            <Field label="Категорія" error={errors.category}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => set("category", c.slug)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-[13px] transition",
                      d.category === c.slug ? "border-accent bg-accent-soft text-fg shadow-ring" : "border-border bg-surface text-fg-muted hover:border-border-strong",
                    )}
                  >
                    <c.icon className="size-4.5" style={{ color: `oklch(0.5 0.13 ${c.hue})` }} />
                    <span className="font-medium leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Короткий підсумок" hint="Видно в картці збору">
              <Input value={d.summary} maxLength={240} onChange={(e) => set("summary", e.target.value)} placeholder="Одне речення: що потрібно і для кого" />
            </Field>
            <Field label="Детальний опис" error={errors.description} hint={`${d.description.length} символів`}>
              <Textarea value={d.description} onChange={(e) => set("description", e.target.value)} className="min-h-48" placeholder={"Для кого збір і навіщо?\nЩо саме купуєте і чому саме це?\nЯк звітуватимете?"} />
            </Field>
            <Field label="Місто або область" hint="Необов'язково">
              <Input value={d.city} maxLength={80} onChange={(e) => set("city", e.target.value)} placeholder="Харків" />
            </Field>
            <CoverUpload url={d.coverUrl} onChange={(fid, url) => setD((s) => ({ ...s, coverFileId: fid, coverUrl: url }))} />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5">
            <Head title="Ціль і бюджет" text="Розпишіть бюджет. Донори довіряють зборам, де зрозуміло, на що підуть кошти." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ціль збору, ₴" error={errors.goalAmount}>
                <Input inputMode="numeric" value={d.goalAmount} onChange={(e) => set("goalAmount", e.target.value.replace(/\D/g, ""))} placeholder="150000" />
              </Field>
              <Field label="Дедлайн" hint="Необов'язково" error={errors.deadline}>
                <Input type="date" value={d.deadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set("deadline", e.target.value)} />
              </Field>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5">
              <input type="checkbox" checked={d.urgent} onChange={(e) => set("urgent", e.target.checked)} className="mt-1 size-4 accent-[var(--color-accent)]" />
              <span>
                <span className="block text-sm font-medium">Терміновий збір</span>
                <span className="text-xs text-fg-muted">Позначайте, лише якщо допомога потрібна протягом кількох днів. Модератор може зняти позначку.</span>
              </span>
            </label>
            <div>
              <p className="mb-2 text-sm font-medium">Бюджет</p>
              <div className="grid gap-2">
                {d.budget.map((b, i) => (
                  <div key={i}>
                    <div className="flex gap-2">
                      <Input value={b.label} onChange={(e) => set("budget", d.budget.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Стаття витрат" className="flex-1" />
                      <Input inputMode="numeric" value={b.amount} onChange={(e) => set("budget", d.budget.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/\D/g, "") } : x)))} placeholder="₴" className="w-32" />
                      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => set("budget", d.budget.length > 1 ? d.budget.filter((_, j) => j !== i) : [{ label: "", amount: "" }])} aria-label="Видалити рядок">
                        <Trash2 />
                      </Button>
                    </div>
                    {errors[`budget${i}`] && <p className="mt-1 text-[13px] text-danger">{errors[`budget${i}`]}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => set("budget", [...d.budget, { label: "", amount: "" }])} disabled={d.budget.length >= 30}>
                  <Plus /> Додати рядок
                </Button>
                {budgetSum > 0 && (
                  <p className={cn("text-sm", goal && budgetSum !== goal ? "text-[oklch(0.5_0.13_60)]" : "text-fg-muted")}>
                    Разом {money(budgetSum)}
                    {goal > 0 && budgetSum !== goal && ` · не збігається з ціллю (${money(goal)})`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && <JarStep value={d.jarUrl} error={errors.jarUrl} onChange={(v) => set("jarUrl", v)} />}

        {step === 3 && id && <DocsStep campaignId={id} attachments={attachments} setAttachments={setAttachments} />}

        {step === 4 && id && (
          <div className="grid gap-6">
            <Head title="Шаблон для допоміжних банок" text="Будь-хто зможе відкрити допоміжну банку для вашого збору за 3 кроки й отримати готове зображення для Stories у вашому стилі. Можна налаштувати й пізніше." />
            <TemplateEditor
              key={tpl.fileId ?? "none"}
              compact
              campaignId={id}
              title={d.title}
              orgName={user?.orgName || user?.name || ""}
              totalGoal={goal}
              initial={tpl}
              onSaved={() => api<{ campaign: Record<string, unknown> }>(`/campaigns/${id}/edit`).then(({ campaign: c }) => setTpl({ url: (c.templateUrl as string) ?? null, fileId: (c.templateFileId as string) ?? null, config: (c.templateConfig as TemplateConfig) ?? null, captionTemplate: String(c.captionTemplate ?? ""), helpersInTotal: c.helpersInTotal !== false })).catch(() => null)}
            />
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-6">
            <Head title="Перегляд і надсилання" text="Так збір виглядатиме в каталозі. Після модерації він стане публічним." />
            <div className="grid gap-6 sm:grid-cols-[300px_1fr]">
              <div className="pointer-events-none">
                <CampaignCard
                  c={{
                    id: id ?? "preview", slug: slug ?? "", title: d.title, summary: d.summary || d.description.slice(0, 140), category: d.category || "humanitarian", city: d.city, coverUrl: d.coverUrl,
                    goalAmount: goal, raisedAmount: 0, mainRaised: 0, helpersRaised: 0, helpersCount: 0, helpersInTotal: true, acceptsHelpers: false, raisedUpdatedAt: null, raisedSource: "organizer_reported", progress: 0, deadline: d.deadline ? new Date(d.deadline).getTime() : null, urgent: d.urgent,
                    status: "active", isDemo: false, publishedAt: Date.now(), createdAt: Date.now(), viewCount: 0, followers: 0,
                    verification: { identityReviewed: !!user?.identityVerified, purposeReviewed: false, destinationVerified: false, reportSubmitted: false },
                    organizer: user ? { id: user.id, name: user.orgName || user.name, avatarUrl: user.avatarUrl, identityVerified: user.identityVerified, isDemo: false } : null,
                  }}
                />
              </div>
              <ul className="grid content-start gap-3 text-sm">
                <Check2 ok={d.title.length >= 5} text="Назва та категорія" />
                <Check2 ok={d.description.length >= 80} text="Детальний опис" />
                <Check2 ok={goal >= 100} text={`Ціль: ${goal ? money(goal) : "не вказано"}`} />
                <Check2 ok={d.budget.some((b) => b.label && b.amount)} text="Бюджет розписано" optional />
                <Check2 ok={JAR_RE.test(d.jarUrl)} text="Банку Monobank підключено" />
                <Check2 ok={attachments.length > 0} text={`Документи: ${attachments.length}`} optional />
                <Check2 ok={!!d.coverUrl} text="Обкладинка" optional />
                {!user?.identityVerified && (
                  <Alert tone="accent" className="mt-2">
                    Пройдіть перевірку особи в профілі. Тоді біля вашого імені з'явиться позначка «Особу перевірено».
                  </Alert>
                )}
              </ul>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              <ArrowLeft /> Назад
            </Button>
          )}
          {(id || d.title.length >= 5) && (
            <Button variant="ghost" onClick={saveDraft} disabled={busy}>
              Зберегти чернетку
            </Button>
          )}
        </div>
        {step < STEPS.length - 1 ? (
          <Button size="lg" onClick={next} loading={busy}>
            Далі <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" onClick={submit} loading={busy}>
            {status === "draft" || status === "rejected" ? "Надіслати на модерацію" : "Зберегти зміни"} <Check />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => onJump(i)}
            className={cn("flex min-w-0 items-center gap-2", i < step ? "cursor-pointer" : "cursor-default")}
            aria-current={i === step ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition",
                i < step ? "bg-accent-soft text-accent ring-1 ring-accent-border" : i === step ? "bg-accent text-white shadow-ring" : "border border-border bg-surface text-fg-subtle",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("hidden truncate text-[13px] md:block", i === step ? "font-medium text-fg" : "text-fg-muted")}>{s}</span>
          </button>
          {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-accent" : "bg-border")} />}
        </li>
      ))}
    </ol>
  );
}

function Head({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-fg-muted">{text}</p>
    </div>
  );
}

function Check2({ ok, text, optional }: { ok: boolean; text: string; optional?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      {ok ? <CheckCircle2 className="size-4.5 text-success" /> : optional ? <span className="size-4.5 rounded-full border-2 border-border-strong" /> : <CircleAlert className="size-4.5 text-danger" />}
      <span className={ok ? "" : "text-fg-muted"}>{text}</span>
      {optional && !ok && <span className="text-xs text-fg-subtle">необов'язково</span>}
    </li>
  );
}

function CoverUpload({ url, onChange }: { url: string | null; onChange: (fileId: string | null, url: string | null) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <Field label="Обкладинка" hint="JPG, PNG або WebP" error={err}>
      {url ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Обкладинка" className="h-full w-full object-cover" />
          <Button type="button" variant="secondary" size="sm" className="absolute right-3 top-3" onClick={() => onChange(null, null)}>
            <X /> Прибрати
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-subtle text-sm text-fg-muted transition hover:border-accent hover:text-fg"
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          {busy ? "Завантаження…" : "Додати фото. Без нього покажемо стильну обкладинку категорії"}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setErr(null);
          setBusy(true);
          try {
            const r = await uploadFile(f, "image");
            onChange(r.id, r.url);
          } catch (er) {
            setErr((er as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Field>
  );
}

function JarStep({ value, error, onChange }: { value: string; error?: string; onChange: (v: string) => void }) {
  const [check, setCheck] = React.useState<{ ok: boolean; url?: string; error?: string } | null>(null);
  React.useEffect(() => {
    setCheck(null);
    if (!value.trim()) return;
    const t = setTimeout(() => {
      api<{ ok: boolean; url?: string }>("/jar/validate", { method: "POST", json: { url: value } })
        .then(setCheck)
        .catch((e) => setCheck({ ok: false, error: (e as Error).message }));
    }, 400);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="grid gap-5">
      <Head title="Підключіть банку Monobank" text="Донати йдуть напряму на вашу банку. Volunteerhub не приймає й не зберігає кошти." />
      <Field label="Посилання на банку" error={error}>
        <div className="relative">
          <Landmark className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://send.monobank.ua/jar/2ABCdEfGhJ" className="pl-10" inputMode="url" autoComplete="off" />
        </div>
      </Field>
      {check?.ok && check.url && (
        <Alert tone="success" icon={<CheckCircle2 />}>
          Формат правильний. Донори перейдуть на{" "}
          <a href={check.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline">
            {check.url.replace("https://", "")} <ExternalLink className="size-3" />
          </a>
          . Відкрийте посилання й переконайтеся, що це ваша банка.
        </Alert>
      )}
      {check && !check.ok && value.trim() && <Alert tone="danger" icon={<CircleAlert />}>{check.error ?? "Некоректне посилання."}</Alert>}
      <div className="rounded-xl bg-subtle p-4 text-sm leading-relaxed text-fg-muted">
        <p className="font-medium text-fg">Де взяти посилання?</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Відкрийте застосунок monobank → «Накопичення» → «Банки».</li>
          <li>Оберіть банку збору й натисніть «Поділитися посиланням».</li>
          <li>Скопіюйте посилання виду send.monobank.ua/jar/… і вставте сюди.</li>
        </ol>
        <p className="mt-3 text-xs">
          Після публікації зібрана сума оновлюватиметься з банки автоматично кожні кілька хвилин. Підключіть офіційний API Monobank у кабінеті, щоб донати з'являлися миттєво.
          Модератор може окремо перевірити банку, тоді збір отримає позначку «Банку перевірено».
        </p>
      </div>
    </div>
  );
}

function DocsStep({ campaignId, attachments, setAttachments }: { campaignId: string; attachments: Attachment[]; setAttachments: (a: Attachment[]) => void }) {
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  const reload = async () => {
    const r = await api<{ campaign: { attachments: Attachment[] } }>(`/campaigns/${campaignId}/edit`);
    setAttachments(r.campaign.attachments);
  };
  return (
    <div className="grid gap-5">
      <Head title="Підтверджувальні документи" text="Рахунки, листи-запити, фото. Усе необов'язково, але підвищує довіру. Ці файли будуть публічними." />
      <Alert tone="warning" icon={<CircleAlert />}>
        Не завантажуйте сюди паспорт чи інші особисті документи. Для перевірки особи є окрема приватна форма в профілі.
      </Alert>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва документа, напр. «Рахунок від постачальника»" className="flex-1" />
        <Button type="button" variant="secondary" onClick={() => (title.trim() ? ref.current?.click() : setErr("Спершу вкажіть назву документа"))} loading={busy}>
          <Upload /> Завантажити
        </Button>
        <input
          ref={ref}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setErr(null);
            setBusy(true);
            try {
              const up = await uploadFile(f, "document");
              await api(`/campaigns/${campaignId}/attachments`, { method: "POST", json: { fileId: up.id, title: title.trim() } });
              setTitle("");
              await reload();
            } catch (er) {
              setErr((er as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      {err && <p className="text-[13px] text-danger">{err}</p>}
      <p className="text-xs text-fg-subtle">PDF або зображення, до 1,8 МБ.</p>
      {attachments.length > 0 ? (
        <ul className="grid gap-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <FileText className="size-5 text-fg-muted" />
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">{a.title}</a>
              <Badge tone="outline">{a.mime === "application/pdf" ? "PDF" : "Фото"}</Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Видалити"
                onClick={async () => {
                  await api(`/campaigns/${campaignId}/attachments/${a.id}`, { method: "DELETE" });
                  await reload();
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border-strong py-8 text-center text-sm text-fg-muted">Документів поки немає</p>
      )}
    </div>
  );
}


