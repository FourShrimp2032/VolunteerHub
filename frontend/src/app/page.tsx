"use client";

import { ArrowRight, BadgeCheck, CheckCircle2, Compass, Eye, FileCheck2, Flag, HandHeart, Heart, Landmark, Megaphone, Plus, ScanSearch, Search, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CampaignCard, CampaignCardSkeleton, CampaignGrid, CampaignRow, SectionHeader } from "@/components/campaign";
import { Button, ButtonLink, Card, Progress } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";
import type { CampaignCard as CardT } from "@/lib/types";

type Home = {
  featured: CardT[]; fresh: CardT[]; attention: CardT[]; almost: CardT[]; recommended: CardT[]; personalized: boolean;
  categoryCounts: Record<string, number>;
  stats: { active: number; completed: number; finalReports: number; members: number; organizers: number };
};

export default function HomePage() {
  const [data, setData] = React.useState<Home | null>(null);
  const { user } = useAuth();
  React.useEffect(() => {
    api<Home>("/campaigns/home").then(setData).catch(() => setData(null));
  }, [user?.id]);

  return (
    <>
      <Hero data={data} />
      <Categories counts={data?.categoryCounts} />

      <section className="container-page mt-20 sm:mt-24">
        <SectionHeader
          eyebrow="Обрані збори"
          title="Щодня — нові збори на першому місці"
          description="Ці слоти ротуються щодня. Ми не ставимо вгору тих, хто вже зібрав найбільше."
          action={<ButtonLink href="/explore" variant="secondary" size="sm">Усі збори <ArrowRight /></ButtonLink>}
        />
        <CampaignGrid items={data?.featured} loading={!data} />
      </section>

      <Collections data={data} signedIn={!!user} />

      <HowItWorks />
      <Trust />
      <Impact stats={data?.stats} />
      <FinalCta />
    </>
  );
}

function Hero({ data }: { data: Home | null }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const sample = data?.almost[0] ?? data?.featured[0] ?? null;
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(70%_60%_at_30%_0%,black,transparent)]" />
      <div className="container-page relative grid items-center gap-14 pb-14 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pb-20 lg:pt-20">
        <div className="min-w-0 animate-fade-up">
          <Link href="/transparency" className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-[13px] text-fg-muted transition hover:border-border-strong hover:text-fg">
            <span className="shrink-0 rounded-full bg-sun px-2 py-0.5 text-[12px] font-semibold text-sun-fg">0% комісії</span>
            <span className="truncate">Донати йдуть напряму на банки організаторів</span>
            <ArrowRight className="size-3.5 shrink-0" />
          </Link>
          <h1 className="mt-7 text-balance text-[34px] font-medium leading-[1.08] tracking-[-0.04em] sm:text-[52px] lg:text-[58px]">
            Кожен важливий збір має бути <span className="marker whitespace-nowrap">помітним</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-[16.5px] leading-relaxed text-fg-muted sm:text-lg">
            Збори з Telegram, Instagram і чатів в одному місці. Знайдіть, перевірте й побачте звіт про результат, навіть якщо в організатора немає тисяч підписників.
          </p>
          <form
            className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border-strong bg-surface p-1.5 shadow-lift transition focus-within:border-accent focus-within:shadow-ring"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          >
            <Search className="ml-2.5 size-5 shrink-0 text-fg-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Дрон, генератор, Харків…" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle" aria-label="Пошук зборів" />
            <Button type="submit" size="lg" className="h-11 shrink-0 rounded-xl px-4 sm:px-5">
              <span className="hidden sm:inline">Знайти збір</span>
              <ArrowRight className="sm:hidden" />
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/dashboard/campaigns/new" variant="link" className="text-[15px] font-semibold text-fg no-underline hover:text-accent">
              <Plus /> Створити збір
            </ButtonLink>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Безкоштовно</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Без посередників</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Модерація</span>
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-md animate-fade-up [animation-delay:120ms] lg:max-w-[420px]">
          <div className="absolute -right-6 -top-6 hidden size-40 rounded-[2rem] bg-sun sm:block" aria-hidden />
          <div className="absolute -bottom-6 -left-6 hidden size-32 rounded-[2rem] bg-accent/90 sm:block" aria-hidden />
          <div className="relative">
            {sample ? <CampaignCard c={sample} className="shadow-lift" /> : <CampaignCardSkeleton />}
            <div className="absolute -left-10 top-10 hidden w-52 -rotate-3 rounded-2xl border border-border bg-surface p-3.5 shadow-lift sm:block lg:-left-16">
              <p className="flex items-center gap-2 text-[12px] font-medium text-fg-muted"><Sparkles className="size-3.5 text-gold" /> Impact XP</p>
              <p className="mt-1 font-heading text-[15px] font-bold">Прихильник · 240 XP</p>
              <Progress value={0.7} tone="gold" size="sm" className="mt-2" />
              <p className="mt-1.5 text-[11px] text-fg-subtle">60 XP до «Амбасадора змін»</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories({ counts }: { counts?: Record<string, number> }) {
  return (
    <section className="container-page">
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/explore?category=${c.slug}`}
            className="group flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-surface py-2.5 pl-2.5 pr-4 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift sm:p-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl transition group-hover:scale-105" style={{ background: `oklch(0.9 0.07 ${c.hue})`, color: `oklch(0.38 0.11 ${c.hue})` }}>
              <c.icon className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">{c.label}</span>
              <span className="text-xs text-fg-subtle">{counts ? `${counts[c.slug] ?? 0} активних` : " "}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

type TabKey = "fresh" | "attention" | "almost" | "recommended";

function Collections({ data, signedIn }: { data: Home | null; signedIn: boolean }) {
  const tabs: { key: TabKey; label: string; icon: React.ElementType; description: string; href: string }[] = [
    { key: "attention", label: "Потребують уваги", icon: Eye, description: "Збори, які ще мало хто бачив. Один перегляд і поширення тут важать найбільше.", href: "/explore?sort=attention" },
    { key: "fresh", label: "Нові", icon: Sparkles, description: "Щойно опубліковані. Перші години найважливіші для нового збору.", href: "/explore?sort=new" },
    { key: "almost", label: "Майже зібрано", icon: Flag, description: "Фінішна пряма: залишилось зовсім трохи до цілі.", href: "/explore?sort=almost" },
    {
      key: "recommended",
      label: "Для вас",
      icon: Heart,
      description: data?.personalized
        ? "Враховуємо ваші категорії, новизну, терміновість і збори з малою аудиторією."
        : signedIn
          ? "Збалансований підбір. Оберіть категорії у профілі, і він стане персональним."
          : "Збалансований підбір. Увійдіть і оберіть категорії, щоб отримати персональні рекомендації.",
      href: "/explore",
    },
  ];
  const [tab, setTab] = React.useState<TabKey>("attention");
  const current = tabs.find((t) => t.key === tab)!;
  return (
    <section className="mt-20 border-y border-border bg-surface py-16 sm:mt-24 sm:py-20">
      <div className="container-page">
        <SectionHeader eyebrow="Чесне просування" title="Підбірки, де видно не лише найгучніших" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  tab === t.key ? "border-ink bg-ink text-white" : "border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
          <ButtonLink href={current.href} variant="ghost" size="sm" className="self-start md:self-auto">
            Дивитися всі <ArrowRight />
          </ButtonLink>
        </div>
        <p className="mb-6 mt-4 max-w-2xl text-[15px] leading-relaxed text-fg-muted">{current.description}</p>
        <CampaignRow key={tab} items={data?.[tab]} loading={!data} />
        {data && data[tab].length === 0 && <p className="text-sm text-fg-subtle">У цій підбірці поки порожньо.</p>}
      </div>
    </section>
  );
}

function HowItWorks() {
  const donor = [
    { icon: Compass, title: "Знайдіть збір", text: "Пошук, категорії та підбірки, що піднімають нові збори і збори з малою аудиторією." },
    { icon: ScanSearch, title: "Перевірте", text: "Позначки перевірок, бюджет, документи й історія звітів організатора." },
    { icon: HandHeart, title: "Підтримайте напряму", text: "Кнопка веде на офіційну банку Monobank. Ми не торкаємося ваших грошей." },
  ];
  const org = [
    { icon: Megaphone, title: "Створіть збір за 5 кроків", text: "Опис, ціль, бюджет, банка Monobank і документи." },
    { icon: BadgeCheck, title: "Пройдіть модерацію", text: "Перевірені збори отримують позначки довіри. Їх неможливо купити." },
    { icon: FileCheck2, title: "Звітуйте", text: "Публікуйте оновлення, чеки й фінальний звіт. Донори бачать результат." },
  ];
  return (
    <section className="container-page mt-24">
      <SectionHeader eyebrow="Як це працює" title="Простий шлях для обох сторін" />
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { title: "Для донорів", items: donor, tone: "bg-accent text-white" },
          { title: "Для організаторів", items: org, tone: "bg-sun text-ink" },
        ].map((col) => (
          <Card key={col.title} className="p-6 sm:p-8">
            <span className={cn("inline-flex rounded-full px-3 py-1 text-[13px] font-semibold", col.tone)}>{col.title}</span>
            <ol className="mt-7 grid gap-7">
              {col.items.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[auto_1fr] gap-4">
                  <span className="font-display text-[28px] font-semibold leading-none text-border-strong tabular-nums">0{i + 1}</span>
                  <div>
                    <p className="flex items-center gap-2 font-heading text-[16.5px] font-bold">
                      <s.icon className="size-[18px] text-fg-muted" strokeWidth={1.8} /> {s.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Trust() {
  const badges = [
    { icon: BadgeCheck, t: "Особу перевірено", d: "Модератор переглянув приватні документи організатора. Вони ніколи не публікуються." },
    { icon: ScanSearch, t: "Мету перевірено", d: "Кожен збір проходить модерацію перед публікацією." },
    { icon: Landmark, t: "Банку перевірено", d: "Модератор відкрив банку Monobank і звірив її з організатором." },
    { icon: FileCheck2, t: "Звіт опубліковано", d: "Організатор показав, на що пішли кошти: чеки, фото, підсумок." },
  ];
  return (
    <section className="relative mt-24 overflow-hidden bg-ink py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/40 blur-3xl" />
      <div className="container-page relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60"><span className="h-2 w-2 rounded-full bg-sun" /> Довіра та прозорість</p>
          <h2 className="mt-3 text-balance text-[28px] leading-tight sm:text-[36px]">Позначка з'являється лише тоді, коли перевірка справді відбулася.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/65">
            Ми не продаємо бейджі й не ховаємо, чого ще не перевірили. Кожен збір має таймлайн від створення до фінального звіту. Суми зібраного завжди позначені як дані організатора, бо в Monobank немає офіційного API для балансу банки.
          </p>
          <ButtonLink href="/transparency" variant="secondary" className="mt-7 border-white/15 bg-white/10 text-white hover:bg-white/15">
            Як ми перевіряємо <ArrowRight />
          </ButtonLink>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {badges.map((b) => (
            <div key={b.t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10"><b.icon className="size-5 text-sun" /></span>
              <p className="mt-4 font-heading font-bold">{b.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{b.d}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:col-span-2">
            <p className="text-sm font-medium text-white/70">Таймлайн збору</p>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px] text-white/60 sm:text-xs">
              {["Створено", "Розпочато", "Ціль досягнуто", "Закупівля", "Фінальний звіт"].map((s, i) => (
                <div key={s}>
                  <div className={`mx-auto mb-2 h-1 rounded-full ${i < 4 ? "bg-sun" : "bg-white/20"}`} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Impact({ stats }: { stats?: Home["stats"] }) {
  const items = [
    { v: stats?.active, l: "активних зборів" },
    { v: stats?.organizers, l: "організаторів" },
    { v: stats?.finalReports, l: "фінальних звітів" },
    { v: stats?.members, l: "учасників спільноти" },
  ];
  return (
    <section className="container-page mt-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeader
            eyebrow="Спільнота"
            title="Внесок — це не лише гроші"
            description="Impact XP нараховуються за участь: підписки, поширення перевірених зборів, нових відвідувачів і командні челенджі. Сума донату на рівень не впливає."
          />
          <div className="grid grid-cols-2 gap-3">
            {items.map((s) => (
              <Card key={s.l} className="p-5">
                <p className="font-display text-[34px] font-semibold tabular-nums tracking-tight">{s.v === undefined ? "—" : num(s.v)}</p>
                <p className="mt-1 text-sm text-fg-muted">{s.l}</p>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs text-fg-subtle">Живі дані платформи, разом із демо-зборами.</p>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-6">
            <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-gold" /> Челендж місяця</p>
            <p className="mt-3 font-heading text-xl font-bold">Перші 100 відвідувачів для 10 нових зборів</p>
            <Progress value={0.34} tone="gold" className="mt-4" />
            <p className="mt-2 text-xs text-fg-muted">Приклад інтерфейсу. Реальний прогрес дивіться на сторінці спільнот.</p>
          </div>
          <div className="grid grid-cols-5 divide-x divide-border text-center">
            {["Дослідник", "Прихильник", "Амбасадор", "Будівничий", "Лідер"].map((l, i) => (
              <div key={l} className="px-1 py-4">
                <span className={`mx-auto grid size-8 place-items-center rounded-full text-xs font-bold ${i < 2 ? "bg-gold-soft text-gold-fg" : "bg-muted text-fg-subtle"}`}>{i + 1}</span>
                <p className="mt-2 truncate text-[11px] text-fg-muted sm:text-xs">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border bg-subtle p-4">
            <span className="flex items-center gap-2 text-sm text-fg-muted"><Users className="size-4" /> Університети, компанії, волонтерські команди</span>
            <ButtonLink href="/communities" size="sm" variant="secondary">Спільноти</ButtonLink>
          </div>
        </Card>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page mt-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-sun p-8 text-ink sm:p-14">
        <div className="bg-hatch pointer-events-none absolute inset-0 text-ink opacity-[0.05]" />
        <HandHeart className="pointer-events-none absolute -bottom-10 -right-6 size-64 text-ink/10" strokeWidth={1} />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink/60">Безкоштовно для волонтерів</p>
            <h2 className="mt-3 text-balance text-[28px] leading-tight sm:text-[38px]">Ваш збір заслуговує, щоб його побачили.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink/75">Підключіть свою банку Monobank. Нові збори з малою аудиторією отримують додаткову видимість.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/dashboard/campaigns/new" size="lg" variant="dark"><Plus /> Створити збір</ButtonLink>
            <ButtonLink href="/explore" size="lg" variant="secondary" className="border-ink/15 bg-white/70 hover:bg-white">Знайти збір</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
