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
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(60%_70%_at_50%_0%,black,transparent)]" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[440px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.53_0.2_262/0.14),transparent)]" aria-hidden />
      <div className="container-page relative grid items-center gap-14 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-24 lg:pt-24">
        <div className="min-w-0 animate-fade-up">
          <Link href="/transparency" className="group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-[13px] text-fg-muted shadow-card transition hover:border-border-strong hover:text-fg">
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">0% комісії</span>
            <span className="truncate">Донати йдуть напряму на банки організаторів</span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <h1 className="mt-7 text-balance text-[36px] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-[54px] lg:text-[60px]">
            Кожен важливий збір має бути <span className="text-gradient">помітним</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-[16.5px] leading-relaxed text-fg-muted sm:text-[18px]">
            Збори з Telegram, Instagram і чатів в одному місці. Знайдіть, перевірте й побачте звіт про результат, навіть якщо в організатора немає тисяч підписників.
          </p>
          <form
            className="mt-9 flex max-w-xl items-center gap-2 rounded-xl border border-border-strong bg-surface p-1.5 shadow-lift transition focus-within:border-accent focus-within:shadow-ring"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          >
            <Search className="ml-2.5 size-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Дрон, генератор, Харків…" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle" aria-label="Пошук зборів" />
            <Button type="submit" size="lg" className="h-11 shrink-0 px-4 sm:px-5" aria-label="Знайти збір">
              <span className="hidden sm:inline">Знайти збір</span>
              <ArrowRight className="sm:hidden" />
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/dashboard/campaigns/new" variant="secondary">
              <Plus /> Створити збір
            </ButtonLink>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-accent" aria-hidden /> Безкоштовно</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-accent" aria-hidden /> Без посередників</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-accent" aria-hidden /> Модерація</span>
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-md animate-fade-up [animation-delay:120ms] lg:max-w-[420px]">
          <div className="absolute -inset-4 hidden rounded-[1.75rem] border border-border bg-surface/60 shadow-card sm:block" aria-hidden />
          <div className="relative">
            {sample ? <CampaignCard c={sample} className="shadow-pop" /> : <CampaignCardSkeleton />}
            <div className="absolute -left-12 top-12 hidden w-56 rounded-xl border border-border bg-surface/95 p-3.5 shadow-pop backdrop-blur sm:block lg:-left-20">
              <p className="flex items-center gap-2 text-[12px] font-medium text-fg-muted"><Sparkles className="size-3.5 text-gold" aria-hidden /> Impact XP</p>
              <p className="mt-1 font-heading text-[15px] font-bold tracking-tight">Прихильник · 240 XP</p>
              <Progress value={0.7} tone="gold" size="sm" className="mt-2.5" label="Прогрес рівня" />
              <p className="mt-1.5 text-[11.5px] text-fg-subtle">60 XP до «Амбасадора змін»</p>
            </div>
            <div className="absolute -bottom-5 -right-6 hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium shadow-pop sm:inline-flex lg:-right-10">
              <span className="grid size-5 place-items-center rounded-full bg-success-soft text-success"><BadgeCheck className="size-3.5" aria-hidden /></span>
              Банку перевірено
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories({ counts }: { counts?: Record<string, number> }) {
  return (
    <section className="container-page mt-12 sm:mt-14">
      <p className="mb-4 text-[13px] font-medium text-fg-subtle">Категорії</p>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/explore?category=${c.slug}`}
            className="group flex min-h-14 shrink-0 items-center gap-3 rounded-xl border border-border bg-surface py-2.5 pl-2.5 pr-4 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-lift sm:p-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border" style={{ background: `oklch(0.97 0.02 ${c.hue})`, borderColor: `oklch(0.91 0.035 ${c.hue})`, color: `oklch(0.47 0.11 ${c.hue})` }}>
              <c.icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{c.label}</span>
              <span className="text-xs tabular-nums text-fg-subtle">{counts ? `${counts[c.slug] ?? 0} активних` : " "}</span>
            </span>
            <ArrowRight className="hidden size-4 shrink-0 -translate-x-1 text-fg-subtle opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 sm:block" aria-hidden />
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
    <section className="mt-24 border-y border-border bg-surface py-16 sm:mt-28 sm:py-24">
      <div className="container-page">
        <SectionHeader eyebrow="Чесне просування" title="Підбірки, де видно не лише найгучніших" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:rounded-lg md:border md:border-border md:bg-muted/60 md:p-0.5" role="tablist" aria-label="Підбірки">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3.5 text-[13.5px] font-medium transition md:min-h-9",
                  tab === t.key ? "border-border bg-surface text-fg shadow-card md:border-transparent md:shadow-[0_1px_2px_oklch(0.2_0.02_260/0.08),0_0_0_1px_oklch(0.2_0.02_260/0.06)]" : "border-border bg-surface text-fg-muted hover:text-fg md:border-transparent md:bg-transparent",
                )}
              >
                <t.icon className="size-4" aria-hidden /> {t.label}
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
    <section className="container-page mt-24 sm:mt-28">
      <SectionHeader eyebrow="Як це працює" title="Простий шлях для обох сторін" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "Для донорів", items: donor, href: "/explore", cta: "Знайти збір" },
          { title: "Для організаторів", items: org, href: "/dashboard/campaigns/new", cta: "Створити збір" },
        ].map((col) => (
          <Card key={col.title} className="flex flex-col p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px]">{col.title}</h3>
              <Link href={col.href} className="inline-flex items-center gap-1 text-[13.5px] font-medium text-accent hover:underline underline-offset-4">
                {col.cta} <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <ol className="relative mt-7 grid gap-6">
              <span className="absolute bottom-4 left-[17px] top-4 w-px bg-border" aria-hidden />
              {col.items.map((s, i) => (
                <li key={s.title} className="relative grid grid-cols-[auto_1fr] gap-4">
                  <span className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-card">
                    <s.icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                  </span>
                  <div className="pt-1">
                    <p className="font-heading text-[15.5px] font-bold tracking-tight">
                      <span className="mr-2 text-fg-subtle tabular-nums">0{i + 1}</span>
                      {s.title}
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
  const steps = ["Створено", "Розпочато", "Ціль досягнуто", "Закупівля", "Фінальний звіт"];
  return (
    <section className="container-page mt-24 sm:mt-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(60%_80%_at_0%_0%,black,transparent)]" aria-hidden />
        <div className="relative grid gap-12 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div>
            <p className="text-[13px] font-semibold text-accent">Довіра та прозорість</p>
            <h2 className="mt-3 text-balance text-[28px] leading-[1.15] sm:text-[36px]">Позначка з'являється лише тоді, коли перевірка справді відбулася.</h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-fg-muted">
              Ми не продаємо бейджі й не ховаємо, чого ще не перевірили. Кожен збір має таймлайн від створення до фінального звіту. Суми зібраного завжди позначені як дані організатора, бо в Monobank немає офіційного API для балансу банки.
            </p>
            <ButtonLink href="/transparency" variant="secondary" className="mt-8">
              Як ми перевіряємо <ArrowRight />
            </ButtonLink>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {badges.map((b) => (
              <div key={b.t} className="rounded-xl border border-border bg-subtle/70 p-5">
                <span className="grid size-9 place-items-center rounded-lg border border-[oklch(0.88_0.06_158)] bg-success-soft text-success"><b.icon className="size-[18px]" aria-hidden /></span>
                <p className="mt-4 font-heading text-[15px] font-bold tracking-tight">{b.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{b.d}</p>
              </div>
            ))}
            <div className="rounded-xl border border-border bg-surface p-5 sm:col-span-2">
              <p className="text-[13px] font-medium text-fg-muted">Таймлайн збору</p>
              <ol className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px] text-fg-muted sm:text-xs">
                {steps.map((st, i) => (
                  <li key={st}>
                    <div className={cn("mx-auto mb-2 h-1 rounded-full", i < 4 ? "bg-accent" : "bg-muted")} />
                    <span className={cn(i < 4 ? "text-fg" : "text-fg-subtle")}>{st}</span>
                  </li>
                ))}
              </ol>
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
  const levels = ["Дослідник", "Прихильник", "Амбасадор", "Будівничий", "Лідер"];
  return (
    <section className="container-page mt-24 sm:mt-28">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <SectionHeader
            eyebrow="Спільнота"
            title="Внесок — це не лише гроші"
            description="Impact XP нараховуються за участь: підписки, поширення перевірених зборів, нових відвідувачів і командні челенджі. Сума донату на рівень не впливає."
          />
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-border shadow-card [&>div]:bg-surface" style={{ gap: 1 }}>
            {items.map((s) => (
              <div key={s.l} className="flex flex-col-reverse p-5 sm:p-6">
                <dt className="mt-0.5 text-sm text-fg-muted">{s.l}</dt>
                <dd className="font-heading text-[32px] font-extrabold tabular-nums tracking-[-0.04em]">{s.v === undefined ? "—" : num(s.v)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fg-subtle">Живі дані платформи, разом із демо-зборами.</p>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-6">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg-muted"><Trophy className="size-4 text-gold" aria-hidden /> Челендж місяця</p>
            <p className="mt-3 font-heading text-[19px] font-bold tracking-tight">Перші 100 відвідувачів для 10 нових зборів</p>
            <Progress value={0.34} tone="gold" className="mt-4" label="Прогрес челенджу" />
            <p className="mt-2 text-xs text-fg-subtle">Приклад інтерфейсу. Реальний прогрес дивіться на сторінці спільнот.</p>
          </div>
          <ol className="grid grid-cols-5 divide-x divide-border text-center">
            {levels.map((l, i) => (
              <li key={l} className="px-1 py-4">
                <span className={cn("mx-auto grid size-8 place-items-center rounded-full border text-xs font-bold tabular-nums", i < 2 ? "border-[oklch(0.9_0.07_80)] bg-gold-soft text-gold-fg" : "border-border bg-subtle text-fg-subtle")}>{i + 1}</span>
                <p className="mt-2 truncate text-[11px] text-fg-muted sm:text-xs">{l}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col items-start justify-between gap-3 border-t border-border bg-subtle p-4 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 text-sm text-fg-muted"><Users className="size-4 shrink-0" aria-hidden /> Університети, компанії, волонтерські команди</span>
            <ButtonLink href="/communities" size="sm" variant="secondary">Спільноти <ArrowRight /></ButtonLink>
          </div>
        </Card>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page mt-24 sm:mt-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-14 text-center shadow-card sm:px-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(50%_80%_at_50%_100%,black,transparent)]" aria-hidden />
        <div className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.53_0.2_262/0.14),transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-[13px] font-semibold text-accent">Безкоштовно для волонтерів</p>
          <h2 className="mt-3 text-balance text-[30px] leading-[1.1] sm:text-[44px]">Ваш збір заслуговує, щоб його побачили.</h2>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-fg-muted">Підключіть свою банку Monobank. Нові збори з малою аудиторією отримують додаткову видимість.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard/campaigns/new" size="lg"><Plus /> Створити збір</ButtonLink>
            <ButtonLink href="/explore" size="lg" variant="secondary">Знайти збір</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
