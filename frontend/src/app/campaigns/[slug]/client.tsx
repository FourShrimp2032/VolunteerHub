"use client";

import {
  ArrowUpRight, Bookmark, BookmarkCheck, CalendarClock, Check, Copy, ExternalLink, FileText, Flag, Flame, Info, MapPin, Pencil, Receipt, Send, Share2, ShoppingCart, Sparkles, UserPlus, UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Avatar } from "@/components/avatar";
import { CampaignCover, EmptyState, VerificationBadges, VerificationChecklist } from "@/components/campaign";
import { Alert, Badge, Button, ButtonLink, Card, Dialog, Field, Progress, Select, Skeleton, Textarea, buttonVariants } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { categoryOf, STATUS_LABELS } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { date, daysLeft, money, pct, plural, timeAgo } from "@/lib/format";
import { useToast } from "@/lib/toast";
import type { CampaignDetail, PublicUser } from "@/lib/types";
import { usePathParam } from "@/lib/use-path-param";

type Resp = {
  campaign: CampaignDetail;
  organizer: (PublicUser & { campaignsCount: number }) | null;
  viewer: { followed: boolean; saved: boolean; isOwner: boolean; isAdmin: boolean; referralCode: string | null };
};

export default function CampaignPage() {
  const slug = usePathParam();
  const [data, setData] = React.useState<Resp | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();

  const load = React.useCallback(async () => {
    if (!slug) return;
    try {
      setData(await api<Resp>(`/campaigns/${encodeURIComponent(slug)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug]);

  React.useEffect(() => {
    load();
  }, [load, user?.id]);

  // Record a unique view (and credit the referrer, if the link had ?ref=).
  const viewed = React.useRef(false);
  React.useEffect(() => {
    if (!data || viewed.current) return;
    viewed.current = true;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      try {
        localStorage.setItem("vh_ref", ref.slice(0, 20));
      } catch {
        /* storage unavailable */
      }
    }
    api(`/campaigns/${data.campaign.id}/view`, { method: "POST", json: { ref } }).catch(() => null);
  }, [data]);

  if (error)
    return (
      <div className="container-page py-20">
        <EmptyState title="Збір не знайдено" description="Можливо, його ще не опубліковано або посилання неправильне." action={<ButtonLink href="/explore">До каталогу</ButtonLink>} />
      </div>
    );
  if (!data) return <DetailSkeleton />;

  const { campaign: c, organizer, viewer } = data;
  const cat = categoryOf(c.category);
  const status = STATUS_LABELS[c.status];

  return (
    <div className="container-page pt-6 sm:pt-10">
      {(viewer.isOwner || viewer.isAdmin) && c.status !== "active" && (
        <Alert tone={c.status === "rejected" ? "danger" : "warning"} icon={<Info />} className="mb-6">
          {c.status === "draft" && "Це чернетка. Її бачите лише ви."}
          {c.status === "pending" && "Збір на модерації. Після схвалення він з'явиться в каталозі."}
          {c.status === "rejected" && <>Збір відхилено{c.rejectionReason ? `: ${c.rejectionReason}` : "."} Відредагуйте його й надішліть знову.</>}
          {["goal_reached", "completed"].includes(c.status) && `Статус: ${status?.label}.`}
        </Alert>
      )}
      {c.isDemo && (
        <Alert tone="neutral" icon={<Info />} className="mb-6">
          <b className="text-fg">Демо-збір.</b> Це вигаданий приклад для демонстрації платформи. Банку не підключено, не надсилайте кошти.
        </Alert>
      )}

      <nav className="mb-5 flex items-center gap-2 text-[13px] text-fg-subtle">
        <Link href="/explore" className="hover:text-fg">Збори</Link>
        <span>/</span>
        <Link href={`/explore?category=${c.category}`} className="hover:text-fg">{cat.label}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="outline"><cat.icon /> {cat.label}</Badge>
            {status && c.status !== "active" && <Badge tone={status.tone}>{status.label}</Badge>}
            {c.urgent && c.status === "active" && <Badge tone="danger"><Flame /> Терміново</Badge>}
            {c.city && <Badge tone="outline"><MapPin /> {c.city}</Badge>}
            {c.isDemo && <Badge tone="dark">Демо</Badge>}
          </div>
          <h1 className="mt-5 animate-[fade-up_0.9s_var(--ease)_both] text-balance text-[clamp(32px,4.6vw,64px)] font-medium leading-[1.02] tracking-[-0.045em]">{c.title}</h1>
          {c.summary && <p className="mt-3 text-[17px] leading-relaxed text-fg-muted">{c.summary}</p>}
          <div className="mt-4"><VerificationBadges v={c.verification} /></div>

          <div className="mt-6 aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-muted">
            <CampaignCover campaign={c} iconSize={56} />
          </div>

          <div className="mt-6 lg:hidden">
            <DonatePanel data={data} reload={load} />
          </div>

          <Section title="Про збір">
            <div className="space-y-4 text-[15.5px] leading-[1.75] text-fg/90">
              {c.description.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </Section>

          {c.budget.length > 0 && (
            <Section title="Бюджет">
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {c.budget.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[15px]">
                      <span className="text-fg-muted">{b.label}</span>
                      <span className="shrink-0 font-medium tabular-nums">{money(b.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between bg-subtle px-5 py-3.5 text-[15px] font-semibold">
                  <span>Разом</span>
                  <span className="tabular-nums">{money(c.budget.reduce((s, b) => s + b.amount, 0))}</span>
                </div>
              </Card>
            </Section>
          )}

          <Section title="Шлях збору">
            <Timeline items={c.timeline} />
          </Section>

          <Section title="Оновлення та звіти" count={c.updates.length}>
            {c.updates.length === 0 ? (
              <EmptyState icon={<FileText />} title="Оновлень ще немає" description="Організатор публікуватиме тут новини, чеки та фінальний звіт." />
            ) : (
              <ol className="relative grid gap-4">
                {c.updates.map((u) => (
                  <UpdateItem key={u.id} u={u} />
                ))}
              </ol>
            )}
          </Section>

          {c.attachments.length > 0 && (
            <Section title="Документи">
              <div className="grid gap-2 sm:grid-cols-2">
                {c.attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-card transition hover:border-border-strong">
                    <span className="grid size-10 place-items-center rounded-lg bg-subtle"><FileText className="size-5 text-fg-muted" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="text-xs text-fg-subtle">{a.mime === "application/pdf" ? "PDF" : "Зображення"} · {(a.size / 1024).toFixed(0)} КБ</span>
                    </span>
                    <ArrowUpRight className="size-4 text-fg-subtle" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          <div className="mt-12 flex justify-center border-t border-border pt-6">
            <ReportButton campaignId={c.id} />
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 grid gap-5">
            <DonatePanel data={data} reload={load} />
            {organizer && <OrganizerCard o={organizer} />}
            <Card className="p-5">
              <p className="mb-4 text-sm font-semibold">Перевірки</p>
              <VerificationChecklist v={c.verification} />
              <Link href="/transparency" className="mt-4 inline-block text-[13px] text-accent hover:underline">Як ми перевіряємо →</Link>
            </Card>
          </div>
        </aside>
        <div className="grid gap-5 lg:hidden">
          {organizer && <OrganizerCard o={organizer} />}
          <Card className="p-5">
            <p className="mb-4 text-sm font-semibold">Перевірки</p>
            <VerificationChecklist v={c.verification} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-bold tracking-tight">
        {title}
        {count !== undefined && count > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-fg-muted">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function DonatePanel({ data, reload }: { data: Resp; reload: () => void }) {
  const { campaign: c, viewer } = data;
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const left = daysLeft(c.deadline);
  const isPublic = ["active", "goal_reached", "completed"].includes(c.status);

  const requireLogin = () => {
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  };
  const toggle = async (kind: "follow" | "save") => {
    if (!user) return requireLogin();
    setBusy(kind);
    try {
      const on = kind === "follow" ? viewer.followed : viewer.saved;
      const r = await api<{ xp?: number; newAchievements?: string[] }>(`/campaigns/${c.id}/${kind}`, { method: on ? "DELETE" : "POST" });
      if (!on && r.xp) toast({ kind: "xp", title: `+${r.xp} Impact XP`, description: kind === "follow" ? "Ви підписалися на оновлення збору." : undefined });
      else if (!on) toast({ kind: "success", title: kind === "follow" ? "Ви підписані на оновлення" : "Збережено" });
      if (r.newAchievements?.length) toast({ kind: "xp", title: "Нове досягнення!", description: "Перегляньте колекцію в кабінеті." });
      reload();
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-heading text-[30px] font-extrabold tabular-nums tracking-[-0.035em]">{money(c.raisedAmount)}</p>
        <p className="text-sm text-fg-muted">{pct(c.progress)}</p>
      </div>
      <p className="mt-0.5 text-sm text-fg-muted">зібрано з {money(c.goalAmount)}</p>
      <Progress value={c.progress} tone={c.progress >= 1 ? "success" : "accent"} size="lg" className="mt-4" />
      <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-fg-subtle">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          Сума за даними організатора{c.raisedUpdatedAt ? `, оновлено ${timeAgo(c.raisedUpdatedAt)}` : ""}. Volunteerhub не має доступу до балансу банки.
        </span>
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat v={c.followers} l={plural(c.followers, "підписник", "підписники", "підписників")} />
        <Stat v={c.viewCount} l="переглядів" />
        <Stat v={left !== null && left >= 0 ? left : "—"} l={left !== null && left >= 0 ? plural(left, "день", "дні", "днів") : "без дедлайну"} />
      </div>

      <div className="mt-5 grid gap-2">
        {c.hasJar && isPublic && c.status !== "completed" ? (
          <a href={`/api/campaigns/${c.id}/donate`} target="_blank" rel="noopener noreferrer nofollow" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Підтримати через Monobank <ExternalLink />
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong bg-subtle px-4 py-3 text-center text-sm text-fg-muted">
            {c.status === "completed" ? "Збір завершено. Дякуємо всім, хто допоміг!" : c.isDemo ? "Демо-збір: банку не підключено." : !isPublic ? "Кнопка донату з'явиться після публікації." : "Організатор ще не підключив банку."}
          </div>
        )}
        {c.hasJar && isPublic && c.status !== "completed" && (
          <p className="text-center text-[11.5px] text-fg-subtle">Відкриється офіційна сторінка send.monobank.ua. Кошти йдуть напряму організатору.</p>
        )}
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button variant={viewer.followed ? "soft" : "secondary"} onClick={() => toggle("follow")} loading={busy === "follow"} disabled={!isPublic}>
            {viewer.followed ? <UserCheck /> : <UserPlus />} {viewer.followed ? "Ви стежите" : "Стежити"}
          </Button>
          <Button variant={viewer.saved ? "soft" : "secondary"} onClick={() => toggle("save")} loading={busy === "save"}>
            {viewer.saved ? <BookmarkCheck /> : <Bookmark />} {viewer.saved ? "Збережено" : "Зберегти"}
          </Button>
        </div>
        {isPublic && <SharePanel c={c} referralCode={viewer.referralCode} />}
        {(viewer.isOwner || viewer.isAdmin) && (
          <ButtonLink href={`/dashboard/campaigns/manage?id=${c.id}`} variant="secondary" className="mt-1">
            <Pencil /> Керувати збором
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

function Stat({ v, l }: { v: React.ReactNode; l: string }) {
  return (
    <div className="rounded-lg border border-border bg-subtle px-2 py-2.5">
      <p className="font-heading text-[17px] font-bold tabular-nums tracking-tight">{v}</p>
      <p className="truncate text-[11px] text-fg-subtle">{l}</p>
    </div>
  );
}

function SharePanel({ c, referralCode }: { c: CampaignDetail; referralCode: string | null }) {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/campaigns/${c.slug}${referralCode ? `?ref=${referralCode}` : ""}` : "";
  const text = `${c.title} — підтримайте збір на Volunteerhub`;
  const track = async (channel: string) => {
    try {
      const r = await api<{ xp: number }>(`/campaigns/${c.id}/share`, { method: "POST", json: { channel } });
      if (r.xp) toast({ kind: "xp", title: `+${r.xp} Impact XP`, description: "Дякуємо, що поширюєте!" });
    } catch {
      /* sharing should never fail visibly */
    }
  };
  const links = [
    { k: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { k: "viber", label: "Viber", href: `viber://forward?text=${encodeURIComponent(`${text} ${url}`)}` },
    { k: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { k: "x", label: "X", href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  ];
  return (
    <div className="mt-2 rounded-xl border border-border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium"><Share2 className="size-3.5" /> Поділитися</p>
      <div className="flex items-center gap-2">
        <input readOnly value={url} className="h-9 min-w-0 flex-1 truncate rounded-lg border border-border bg-subtle px-2.5 text-xs text-fg-muted" aria-label="Посилання" onFocus={(e) => e.target.select()} />
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard?.writeText(url).catch(() => null);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
            track("copy");
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Скопійовано" : "Копіювати"}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a key={l.k} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => track(l.k)} className="rounded-lg border border-border px-2.5 py-1 text-xs text-fg-muted transition hover:border-border-strong hover:text-fg">
            {l.label}
          </a>
        ))}
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={() => navigator.share({ title: c.title, text, url }).then(() => track("native")).catch(() => null)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-fg-muted hover:text-fg"
          >
            <Send className="size-3" /> Інше
          </button>
        )}
      </div>
      {referralCode && <p className="mt-2 text-[11px] text-fg-subtle">Посилання містить ваш реферальний код. Нові відвідувачі приносять вам Impact XP.</p>}
    </div>
  );
}

function OrganizerCard({ o }: { o: PublicUser & { campaignsCount: number } }) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold">Організатор</p>
      <Link href={`/organizers/${o.id}`} className="group flex items-center gap-3">
        <Avatar name={o.name} src={o.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold group-hover:text-accent">{o.name}</p>
          <p className="text-[13px] text-fg-muted">
            {o.campaignsCount} {plural(o.campaignsCount, "збір", "збори", "зборів")}
            {o.city && ` · ${o.city}`}
          </p>
        </div>
      </Link>
      {o.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">{o.bio}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.identityVerified ? <Badge tone="success"><Check /> Особу перевірено</Badge> : <Badge tone="outline">Особу ще не перевірено</Badge>}
        <Badge tone="gold"><Sparkles /> {o.level.nameUk}</Badge>
      </div>
    </Card>
  );
}

function Timeline({ items }: { items: CampaignDetail["timeline"] }) {
  const lastDone = items.reduce((acc, it, i) => (it.at ? i : acc), -1);
  return (
    <ol className="grid gap-0 sm:grid-cols-5">
      {items.map((it, i) => (
        <li key={it.key} className="relative flex gap-3 pb-5 sm:block sm:pb-0 sm:pr-3">
          <div className="flex flex-col items-center sm:flex-row">
            <span className={cn("z-10 grid size-7 shrink-0 place-items-center rounded-full border-2", it.at ? "border-success bg-success text-white" : "border-border-strong bg-surface text-fg-subtle")}>
              {it.at ? <Check className="size-3.5" /> : <span className="text-[11px] font-semibold">{i + 1}</span>}
            </span>
            {i < items.length - 1 && <span className={cn("w-0.5 flex-1 sm:h-0.5 sm:w-auto", i < lastDone ? "bg-success" : "bg-border")} />}
          </div>
          <div className="sm:mt-3">
            <p className={cn("text-sm font-medium", !it.at && "text-fg-muted")}>{it.label}</p>
            <p className="text-xs text-fg-subtle">{it.at ? date(it.at) : "Очікується"}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const UPDATE_KIND = {
  update: { label: "Оновлення", icon: CalendarClock, tone: "neutral" as const },
  purchase: { label: "Закупівля", icon: ShoppingCart, tone: "accent" as const },
  final_report: { label: "Фінальний звіт", icon: Receipt, tone: "success" as const },
};

function UpdateItem({ u }: { u: CampaignDetail["updates"][number] }) {
  const k = UPDATE_KIND[u.kind] ?? UPDATE_KIND.update;
  return (
    <li>
      <Card className={cn("p-5", u.kind === "final_report" && "border-success/30 bg-success-soft/30")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={k.tone}><k.icon /> {k.label}</Badge>
          <span className="text-xs text-fg-subtle">{date(u.createdAt)}</span>
          {u.spentAmount ? <span className="ml-auto text-sm font-medium tabular-nums">Витрачено {money(u.spentAmount)}</span> : null}
        </div>
        <p className="mt-3 font-semibold">{u.title}</p>
        <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-fg-muted">{u.body}</p>
        {u.files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {u.files.map((f) =>
              f.mime.startsWith("image/") ? (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="block size-20 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                </a>
              ) : (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-fg-muted hover:text-fg">
                  <FileText className="size-4" /> {f.name}
                </a>
              ),
            )}
          </div>
        )}
      </Card>
    </li>
  );
}

function ReportButton({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("misleading");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const submit = async () => {
    setBusy(true);
    try {
      await api(`/campaigns/${campaignId}/report`, { method: "POST", json: { reason, details } });
      toast({ kind: "success", title: "Скаргу надіслано", description: "Модератори розглянуть її найближчим часом." });
      setOpen(false);
      setDetails("");
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle hover:text-danger">
        <Flag className="size-3.5" /> Поскаржитися на збір
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Поскаржитися на збір"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Скасувати</Button>
            <Button variant="danger" onClick={submit} loading={busy}>Надіслати</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Причина">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="fraud">Підозра на шахрайство</option>
              <option value="misleading">Неправдива або оманлива інформація</option>
              <option value="duplicate">Дублікат іншого збору</option>
              <option value="inappropriate">Неприйнятний вміст</option>
              <option value="other">Інше</option>
            </Select>
          </Field>
          <Field label="Деталі" hint="Необов'язково">
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Що саме не так? Посилання, факти…" maxLength={2000} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="container-page grid gap-10 pt-10 lg:grid-cols-[1fr_380px]">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-10 w-4/5" />
        <Skeleton className="mt-3 h-5 w-3/5" />
        <Skeleton className="mt-6 aspect-[16/9] w-full rounded-3xl" />
      </div>
      <Skeleton className="hidden h-96 rounded-2xl lg:block" />
    </div>
  );
}
