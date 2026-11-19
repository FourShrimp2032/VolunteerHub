"use client";

/**
 * Open a helping jar in three steps: name & goal → photo → Monobank jar link,
 * then share the generated image. /help?c=<fundraiser slug> to create, /help?id=<helper> to share again.
 */
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, ImagePlus, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { EmptyState } from "@/components/campaign";
import { HelperShare } from "@/components/helper";
import { Alert, Badge, Button, ButtonLink, Card, Field, Input, Skeleton } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { CROP_DEFAULT, loadImage, renderHelperImage } from "@/lib/helper-image";
import { useToast } from "@/lib/toast";
import type { CampaignDetail, Helper, HelperTemplate, PhotoCrop } from "@/lib/types";

type HelperResp = {
  helper: Helper;
  campaign: { id: string; slug: string; title: string; goalAmount: number; raisedAmount: number; status: string; isDemo: boolean };
  template: HelperTemplate;
  share: { link: string; caption: string };
  viewer: { isOwner: boolean; isManager: boolean };
};

export default function Page() {
  return (
    <React.Suspense fallback={<Shell><Skeleton className="h-96 rounded-3xl" /></Shell>}>
      <Inner />
    </React.Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="container-page max-w-5xl pt-8 pb-10 sm:pt-12">{children}</div>;
}

function Inner() {
  const sp = useSearchParams();
  const { user } = useRequireAuth();
  const id = sp.get("id");
  const c = sp.get("c");
  if (!user) return <Shell><Skeleton className="h-96 rounded-3xl" /></Shell>;
  if (id) return <ShareExisting id={id} />;
  if (c) return <Create slug={c} />;
  return (
    <Shell>
      <EmptyState title="Оберіть збір" description="Допоміжну банку відкривають для одного з перевірених зборів організацій." action={<ButtonLink href="/explore">До зборів</ButtonLink>} />
    </Shell>
  );
}

function ShareExisting({ id }: { id: string }) {
  const [d, setD] = React.useState<HelperResp | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => api<HelperResp>(`/helpers/${id}`).then(setD).catch((e) => setErr((e as Error).message)), [id]);
  React.useEffect(() => {
    load();
  }, [load]);
  if (err) return <Shell><EmptyState title="Банку не знайдено" description={err} action={<ButtonLink href="/dashboard">До кабінету</ButtonLink>} /></Shell>;
  if (!d) return <Shell><Skeleton className="h-96 rounded-3xl" /></Shell>;
  return (
    <Shell>
      <Link href={`/campaigns/${d.campaign.slug}`} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {d.campaign.title}</Link>
      <h1 className="mt-4 text-[clamp(30px,4vw,48px)] font-medium leading-[1.05] tracking-[-0.04em]">Поширте свою банку</h1>
      <p className="mt-2 max-w-2xl text-fg-muted">Зображення вже у стилі збору. Опублікуйте його в Stories і додайте стікер з посиланням на банку.</p>
      <Card className="mt-8 p-5 sm:p-7">
        <HelperShare helper={d.helper} template={d.template} share={d.share} />
      </Card>
    </Shell>
  );
}

const STEPS = ["Ім'я та ціль", "Фото", "Банка Monobank"] as const;
const SUGGESTED = [1000, 2000, 3500, 5000, 10_000];

function Create({ slug }: { slug: string }) {
  const { user } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const [camp, setCamp] = React.useState<CampaignDetail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState(user?.name ?? "");
  const [goal, setGoal] = React.useState<number>(3500);
  const [photo, setPhoto] = React.useState<{ id: string; url: string; img: HTMLImageElement } | null>(null);
  const [crop, setCrop] = React.useState<PhotoCrop>(CROP_DEFAULT);
  const [uploading, setUploading] = React.useState(false);
  const [jar, setJar] = React.useState("");
  const [jarErr, setJarErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [existing, setExisting] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api<{ campaign: CampaignDetail }>(`/campaigns/${encodeURIComponent(slug)}`)
      .then((r) => setCamp(r.campaign))
      .catch((e) => setErr((e as Error).message));
  }, [slug]);

  if (err) return <Shell><EmptyState title="Збір не знайдено" description={err} action={<ButtonLink href="/explore">До зборів</ButtonLink>} /></Shell>;
  if (!camp) return <Shell><Skeleton className="h-96 rounded-3xl" /></Shell>;

  const maxGoal = Math.max(100, camp.goalAmount || 100_000_000);
  const goalOk = goal >= 100 && goal <= maxGoal;
  const nameOk = name.trim().length >= 2;
  const isOrganizer = user?.id === camp.organizer?.id;

  const onPhoto = async (f: File) => {
    setUploading(true);
    try {
      const up = await uploadFile(f, "image");
      const img = await loadImage(up.url);
      setPhoto({ id: up.id, url: up.url, img });
      setCrop(CROP_DEFAULT);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setJarErr(null);
    try {
      const r = await api<{ helper: Helper; xp: number }>("/helpers", {
        method: "POST",
        json: { campaignId: camp.id, displayName: name.trim(), goalAmount: goal, photoFileId: photo!.id, photoCrop: crop, jarUrl: jar.trim() },
      });
      if (r.xp) toast({ kind: "xp", title: `+${r.xp} Impact XP`, description: "Допоміжну банку відкрито!" });
      router.replace(`/help?id=${r.helper.id}`);
    } catch (e) {
      const er = e as Error & { data?: { helperId?: string } };
      if (er.data?.helperId) setExisting(er.data.helperId);
      setJarErr(er.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <Link href={`/campaigns/${camp.slug}`} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {camp.title}</Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="outline"><ShieldCheck /> {camp.organizer?.name ?? "Організація"}</Badge>
        <Badge tone="outline">Загальна ціль {money(camp.goalAmount)}</Badge>
      </div>
      <h1 className="mt-4 text-[clamp(30px,4vw,48px)] font-medium leading-[1.05] tracking-[-0.04em]">Відкрийте допоміжну банку</h1>
      <p className="mt-2 max-w-2xl text-fg-muted">Три кроки, і у вас буде готове зображення для Stories у стилі цього збору. Кожна гривня з вашої банки зараховується вам і збору.</p>

      {!camp.acceptsHelpers || isOrganizer ? (
        <Alert tone="warning" icon={<Info />} className="mt-8">
          {isOrganizer
            ? "Ви організатор цього збору: донати й так надходять на вашу банку. Поділіться посиланням на збір, щоб помічники відкривали свої банки."
            : camp.isDemo
              ? "Це демо-збір: допоміжні банки для нього не відкриваються. Оберіть справжній збір від перевіреної організації."
              : "Цей збір уже не приймає нові допоміжні банки."}{" "}
          <Link href="/explore" className="underline">Перевірені збори →</Link>
        </Alert>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-5 sm:p-7">
            <ol className="mb-7 grid grid-cols-3 gap-2" aria-label="Кроки">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button type="button" onClick={() => i < step && setStep(i)} className={cn("w-full text-left", i < step ? "cursor-pointer" : "cursor-default")} aria-current={i === step ? "step" : undefined}>
                    <span className={cn("block h-1 rounded-full transition-colors duration-500", i <= step ? "bg-accent" : "bg-muted")} />
                    <span className={cn("mono mt-2 block text-[11px] uppercase tracking-[0.06em]", i === step ? "text-fg" : "text-fg-subtle")}>
                      {String(i + 1).padStart(2, "0")} · {s}
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            {step === 0 && (
              <form
                className="grid gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (nameOk && goalOk) setStep(1);
                }}
              >
                <Field label="Ваше ім'я" hint="так його побачать донори">
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="Олена Коваль" />
                </Field>
                <Field label="Моя ціль, ₴" error={goal > maxGoal ? `Не більше загальної цілі збору (${money(maxGoal)})` : goal < 100 ? "Від 100 ₴" : null}>
                  <Input inputMode="numeric" value={goal ? String(goal) : ""} onChange={(e) => setGoal(Number(e.target.value.replace(/\D/g, "")) || 0)} placeholder="3500" />
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {SUGGESTED.filter((n) => n <= maxGoal).map((n) => (
                      <button key={n} type="button" onClick={() => setGoal(n)} className={cn("rounded-full border px-3 py-1.5 text-[13px] transition-colors", goal === n ? "border-ink bg-ink text-bg" : "border-border text-fg-muted hover:text-fg")}>
                        {n.toLocaleString("uk-UA")} ₴
                      </button>
                    ))}
                  </div>
                </Field>
                <div><Button type="submit" disabled={!nameOk || !goalOk}>Далі <ArrowRight /></Button></div>
              </form>
            )}

            {step === 1 && (
              <div className="grid gap-5">
                <p className="text-sm text-fg-muted">Фото, де добре видно обличчя. Ми розмістимо його у шаблоні організації. Перетягніть фото в попередньому перегляді, щоб вибрати кадр.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={photo ? "secondary" : "primary"} loading={uploading} onClick={() => fileRef.current?.click()}>
                    <ImagePlus /> {photo ? "Інше фото" : "Завантажити фото"}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) onPhoto(f);
                    }}
                  />
                </div>
                {photo && (
                  <Field label="Масштаб">
                    <input type="range" min={1} max={3} step={0.01} value={crop.zoom} onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))} className="w-full max-w-xs accent-[var(--color-accent)]" aria-label="Масштаб фото" />
                  </Field>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setStep(0)}><ArrowLeft /> Назад</Button>
                  <Button type="button" disabled={!photo} onClick={() => setStep(2)}>Далі <ArrowRight /></Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5">
                <div className="rounded-2xl border border-border bg-subtle p-4 sm:p-5">
                  <p className="font-medium">Ще немає банки? Створіть її за хвилину</p>
                  <ol className="mt-3 grid gap-2 text-sm text-fg-muted">
                    <li><span className="mono mr-2 text-accent">01</span>У застосунку Monobank: «Банка» → «Створити банку».</li>
                    <li className="flex flex-wrap items-center gap-x-2">
                      <span><span className="mono mr-2 text-accent">02</span>Назва й ціль:</span>
                      <CopyChip text={`${camp.title.slice(0, 40)} · ${name.trim()}`.slice(0, 60)} />
                      <CopyChip text={String(goal)} label={`${goal.toLocaleString("uk-UA")} ₴`} />
                    </li>
                    <li><span className="mono mr-2 text-accent">03</span>«Поділитися» → «Скопіювати посилання» і вставте його нижче.</li>
                  </ol>
                  <a href="https://monobank.ua/banka" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                    Відкрити Monobank «Банка» <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <Field label="Посилання на вашу банку" error={jarErr}>
                  <Input value={jar} onChange={(e) => (setJar(e.target.value), setJarErr(null))} placeholder="https://send.monobank.ua/jar/…" inputMode="url" autoComplete="off" spellCheck={false} />
                </Field>
                {existing && <ButtonLink href={`/help?id=${existing}`} variant="secondary" size="sm" className="w-fit">Відкрити мою банку</ButtonLink>}
                <p className="text-xs leading-relaxed text-fg-subtle">Створіть окрему банку саме для цього збору: ми рахуємо все, що на неї надійде. Сума оновлюється автоматично кожні кілька хвилин.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}><ArrowLeft /> Назад</Button>
                  <Button type="button" loading={busy} disabled={!jar.trim()} onClick={submit}><Check /> Створити й поділитися</Button>
                </div>
              </div>
            )}
          </Card>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <LivePreview template={camp.template} photo={photo?.img ?? null} crop={crop} onCrop={setCrop} goal={goal || 0} draggable={step === 1 && !!photo} />
            <p className="mt-2 text-center text-xs text-fg-subtle">Так виглядатиме ваше зображення</p>
          </div>
        </div>
      )}
    </Shell>
  );
}

function CopyChip({ text, label }: { text: string; label?: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-[13px] text-fg"
    >
      <span className="truncate">{label ?? text}</span>
      {ok ? <Check className="size-3.5 shrink-0 text-success" /> : <Copy className="size-3.5 shrink-0 text-fg-subtle" />}
    </button>
  );
}

/** Live preview; while choosing the photo, dragging it moves the crop. */
function LivePreview({ template, photo, crop, onCrop, goal, draggable }: { template: HelperTemplate; photo: HTMLImageElement | null; crop: PhotoCrop; onCrop: (c: PhotoCrop) => void; goal: number; draggable: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = React.useState("9 / 16");
  React.useEffect(() => {
    if (!ref.current) return;
    renderHelperImage({ template, photo, crop, goal, maxSide: 960 }, ref.current)
      .then((r) => setRatio(`${r.layout.width} / ${r.layout.height}`))
      .catch(() => null);
  }, [template, photo, crop, goal]);

  const onDown = (e: React.PointerEvent) => {
    if (!draggable || !photo) return;
    e.preventDefault();
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, crop };
    const move = (ev: PointerEvent) => {
      // Dragging right shows more of the photo's left side, like moving a photo under a window.
      const k = 1 / crop.zoom;
      onCrop({ ...start.crop, x: Math.min(1, Math.max(0, start.crop.x - ((ev.clientX - start.x) / box.width) * k)), y: Math.min(1, Math.max(0, start.crop.y - ((ev.clientY - start.y) / box.height) * k)) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-subtle shadow-card", draggable && "cursor-grab touch-none active:cursor-grabbing")} style={{ aspectRatio: ratio }} onPointerDown={onDown}>
      <canvas ref={ref} className="block size-full" />
    </div>
  );
}
