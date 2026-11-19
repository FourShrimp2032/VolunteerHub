"use client";

import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Eye, FileCheck2, Flag, Heart, Landmark, ScanSearch, Search, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CampaignGrid, CampaignRow, SectionHeader } from "@/components/campaign";
import { CountUp, Marquee, RiseWords, ScrubText, SplitTitle } from "@/components/motion";
import { ButtonLink, Progress } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import type { CampaignCard as CardT } from "@/lib/types";

type Home = {
  featured: CardT[]; fresh: CardT[]; attention: CardT[]; almost: CardT[]; recommended: CardT[]; personalized: boolean;
  categoryCounts: Record<string, number>;
  stats: { active: number; completed: number; finalReports: number; members: number; organizers: number };
};

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;

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

      <section id="featured" className="container-page scroll-mt-10 pt-[clamp(80px,11vw,150px)]">
        <SectionHeader
          index="01"
          eyebrow="Обрані збори"
          title="Щодня нові збори на першому місці"
          description="Ці слоти ротуються щодня. Ми не ставимо вгору тих, хто вже зібрав найбільше."
          action={<ButtonLink href="/explore" variant="secondary" size="sm">Усі збори <span className="arrow"><ArrowRight /></span></ButtonLink>}
        />
        <CampaignGrid items={data?.featured} loading={!data} />
      </section>

      <Collections data={data} signedIn={!!user} />
      <Manifesto />
      <HowItWorks />
      <Trust />
      <Impact stats={data?.stats} />
      <FinalCta />
    </>
  );
}

/* ---------------------------------------------------------------- Hero */

function Hero({ data }: { data: Home | null }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const active = data?.stats.active;
  return (
    <section className="container-page relative flex min-h-[calc(86svh-68px)] sm:min-h-[calc(100svh-68px)] flex-col justify-end pb-10 pt-16 sm:pb-12">
      <a href="#featured" className="mono reveal absolute right-7 top-10 hidden items-center gap-2.5 text-[12.5px] text-fg-subtle transition-colors duration-300 hover:text-fg sm:flex lg:right-10" style={d(900)}>
        Гортайте <span className="bob"><ArrowDown className="size-3.5" aria-hidden /></span>
      </a>

      <p className="reveal mono mb-7 flex items-center gap-2.5 text-[12.5px] text-fg-muted" style={d(80)}>
        <span className="pulse" aria-hidden />
        {active === undefined ? "Збори в реальному часі" : `${active} активних зборів просто зараз`}
      </p>

      <div data-drift className="will-change-transform">
        <SplitTitle
          lines={["Кожен збір", "має бути", "помітним."]}
          className="ml-[-0.05em] text-[clamp(54px,16vw,96px)] font-medium sm:text-[clamp(64px,12.2vw,196px)] leading-[0.88] tracking-[-0.065em]"
        />
      </div>

      <div className="mt-10 grid gap-8 border-t border-border pt-7 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
        <div className="grid gap-7 md:grid-cols-[minmax(0,32ch)_minmax(0,1fr)] md:items-end md:gap-12">
          <p className="reveal text-pretty text-[clamp(18px,1.8vw,22px)] leading-[1.35] tracking-[-0.01em]" style={d(700)}>
            Збори з Telegram, Instagram і чатів в одному місці. Знайдіть, перевірте й побачте звіт про результат.
          </p>
          <form
            role="search"
            className="reveal group/s flex h-14 max-w-lg items-center gap-2 rounded-full border border-fg/80 bg-surface/60 pl-5 pr-1.5 transition-[box-shadow,background-color] duration-500 focus-within:bg-surface focus-within:shadow-ring"
            style={d(800)}
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          >
            <Search className="size-[18px] shrink-0 text-fg-subtle transition-colors duration-300 group-focus-within/s:text-fg" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Дрон, генератор, Харків…" className="h-full min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-fg-subtle" aria-label="Пошук зборів" />
            <button type="submit" className="fill-btn magnetic inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-bg [--fill:var(--color-accent)]" aria-label="Знайти збір">
              <span className="arrow"><ArrowRight className="size-[18px]" /></span>
            </button>
          </form>
        </div>
        <dl className="reveal mono grid grid-cols-3 gap-6 text-[12.5px] sm:gap-10" style={d(900)}>
          <div><dt className="text-fg-subtle">Комісія</dt><dd className="mt-1">0%</dd></div>
          <div><dt className="text-fg-subtle">Донати</dt><dd className="mt-1">Напряму</dd></div>
          <div><dt className="text-fg-subtle">Модерація</dt><dd className="mt-1">Кожен збір</dd></div>
        </dl>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Categories */

function Categories({ counts }: { counts?: Record<string, number> }) {
  return (
    <nav aria-label="Категорії зборів" className="mt-4">
      <Marquee>
        {CATEGORIES.map((c) => (
          <React.Fragment key={c.slug}>
            <Link href={`/explore?category=${c.slug}`} className="inline-flex items-center gap-2">
              {c.label}
              {counts && <sup className="text-[10px] text-fg-subtle">{counts[c.slug] ?? 0}</sup>}
            </Link>
            <i aria-hidden />
          </React.Fragment>
        ))}
      </Marquee>
    </nav>
  );
}

/* --------------------------------------------------------- Collections */

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

  // Sliding ink pill behind the active tab.
  const list = React.useRef<HTMLDivElement>(null);
  const [pill, setPill] = React.useState<{ x: number; w: number } | null>(null);
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = list.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [tab]);

  return (
    <section className="container-page pt-[clamp(80px,11vw,150px)]">
      <SectionHeader index="02" eyebrow="Чесне просування" title="Підбірки, де видно не лише найгучніших" />
      <div className="reveal flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div ref={list} className="no-scrollbar relative -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:rounded-full md:border md:border-border md:p-1" role="tablist" aria-label="Підбірки">
          {pill && (
            <span
              aria-hidden
              className="absolute inset-y-1 left-0 hidden rounded-full bg-ink transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:block"
              style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
            />
          )}
          {tabs.map((t) => (
            <button
              key={t.key}
              data-tab={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative z-10 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition-colors duration-500 md:border-transparent",
                tab === t.key ? "border-ink bg-ink text-bg md:bg-transparent" : "border-border text-fg-muted hover:text-fg",
              )}
            >
              <t.icon className="size-4" aria-hidden /> {t.label}
            </button>
          ))}
        </div>
        <Link href={current.href} className="link-u self-start text-[14px] text-fg-muted transition-colors hover:text-fg md:self-auto">
          Дивитися всі →
        </Link>
      </div>
      <p key={`d-${tab}`} className="mb-10 mt-6 max-w-2xl animate-[fade-up_0.6s_var(--ease)_both] text-[16px] leading-relaxed text-fg-muted">{current.description}</p>
      <CampaignRow key={tab} items={data?.[tab]} loading={!data} />
      {data && data[tab].length === 0 && <p className="text-sm text-fg-subtle">У цій підбірці поки порожньо.</p>}
    </section>
  );
}

/* ----------------------------------------------------------- Manifesto */

function Manifesto() {
  return (
    <section className="container-page pt-[clamp(100px,14vw,200px)]">
      <p className="reveal mono mb-8 text-[12px] uppercase tracking-[0.08em] text-fg-subtle">Чому Volunteerhub</p>
      <ScrubText
        className="max-w-[1100px] text-[clamp(26px,3.6vw,50px)] leading-[1.18] tracking-[-0.03em]"
        text="Тисячі важливих зборів губляться в стрічках, бо в організатора немає великої аудиторії. Ми піднімаємо нові та малопомітні збори, показуємо лише ті перевірки, що справді відбулися, і не торкаємося ваших грошей: кожна гривня йде напряму на банку волонтера."
      />
    </section>
  );
}

/* -------------------------------------------------------- How it works */

function HowItWorks() {
  const cols = [
    {
      title: "Для донорів",
      href: "/explore",
      cta: "Знайти збір",
      items: [
        { t: "Знайдіть збір", d: "Пошук, категорії та підбірки, що піднімають нові збори і збори з малою аудиторією." },
        { t: "Перевірте", d: "Позначки перевірок, бюджет, документи й історія звітів організатора." },
        { t: "Підтримайте напряму", d: "Кнопка веде на офіційну банку Monobank. Ми не торкаємося ваших грошей." },
      ],
    },
    {
      title: "Для організаторів",
      href: "/dashboard/campaigns/new",
      cta: "Створити збір",
      items: [
        { t: "Створіть збір за 5 кроків", d: "Опис, ціль, бюджет, банка Monobank і документи." },
        { t: "Пройдіть модерацію", d: "Перевірені збори отримують позначки довіри. Їх неможливо купити." },
        { t: "Звітуйте", d: "Публікуйте оновлення, чеки й фінальний звіт. Донори бачать результат." },
      ],
    },
  ];
  return (
    <section className="container-page pt-[clamp(100px,14vw,200px)]">
      <SectionHeader index="03" eyebrow="Як це працює" title="Простий шлях для обох сторін" />
      <div className="grid gap-16 lg:gap-20">
        {cols.map((col) => (
          <div key={col.title}>
            <div className="reveal mb-8 flex items-baseline justify-between gap-4">
              <h3 className="text-[clamp(22px,2.4vw,32px)] font-medium tracking-[-0.03em]">{col.title}</h3>
              <Link href={col.href} className="group inline-flex items-center gap-1.5 text-[14px] text-fg-muted transition-colors hover:text-fg">
                <span className="link-u">{col.cta}</span>
                <ArrowUpRight className="size-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" aria-hidden />
              </Link>
            </div>
            <ol className="grid md:grid-cols-3">
              {col.items.map((s, i) => (
                <li key={s.t} className="reveal flex flex-col gap-3 border-t border-border py-7 md:border-l md:border-t-0 md:px-7 md:py-0 md:first:border-l-0 md:first:pl-0" style={d(i * 110)}>
                  <span className="mono text-[12.5px] text-accent">0{i + 1}</span>
                  <p className="text-[clamp(19px,1.7vw,23px)] font-medium tracking-[-0.025em]">{s.t}</p>
                  <p className="max-w-[34ch] text-[15px] leading-relaxed text-fg-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Trust */

function Trust() {
  const badges = [
    { icon: BadgeCheck, t: "Особу перевірено", d: "Модератор переглянув приватні документи організатора. Вони ніколи не публікуються." },
    { icon: ScanSearch, t: "Мету перевірено", d: "Кожен збір проходить модерацію перед публікацією." },
    { icon: Landmark, t: "Банку перевірено", d: "Модератор відкрив банку Monobank і звірив її з організатором." },
    { icon: FileCheck2, t: "Звіт опубліковано", d: "Організатор показав, на що пішли кошти: чеки, фото, підсумок." },
  ];
  const steps = ["Створено", "Розпочато", "Ціль досягнуто", "Закупівля", "Фінальний звіт"];
  return (
    <section className="container-page pt-[clamp(100px,14vw,200px)]">
      <SectionHeader
        index="04"
        eyebrow="Довіра та прозорість"
        title="Позначка з'являється лише тоді, коли перевірка справді відбулася"
        action={<ButtonLink href="/transparency" variant="secondary" size="sm">Як ми перевіряємо <span className="arrow"><ArrowRight /></span></ButtonLink>}
      />
      <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((b, i) => (
          <div key={b.t} className="reveal group flex flex-col gap-4 bg-bg p-6 transition-colors duration-500 hover:bg-surface sm:p-7" style={d(i * 90)}>
            <span className="grid size-10 place-items-center rounded-full border border-border text-fg transition-[background-color,color,border-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-12 group-hover:border-signal group-hover:bg-signal group-hover:text-white">
              <b.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-6 text-[19px] font-medium tracking-[-0.025em]">{b.t}</p>
            <p className="text-[14.5px] leading-relaxed text-fg-muted">{b.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-14">
        <p className="reveal mono mb-6 text-[12px] uppercase tracking-[0.08em] text-fg-subtle">Таймлайн кожного збору</p>
        <ol className="relative grid grid-cols-5 gap-2">
          <span className="absolute left-0 right-0 top-[5px] h-px bg-border" aria-hidden />
          <span className="reveal-line absolute left-0 top-[5px] h-px w-[80%] bg-signal" aria-hidden />
          {steps.map((st, i) => (
            <li key={st} className="reveal relative" style={d(300 + i * 140)}>
              <span className={cn("relative block size-[11px] rounded-full border-2", i < 4 ? "border-signal bg-signal" : "border-border-strong bg-bg")} />
              <span className={cn("mt-4 block text-[12px] leading-snug sm:text-[14px]", i < 4 ? "text-fg" : "text-fg-subtle")}>{st}</span>
            </li>
          ))}
        </ol>
        <p className="reveal mt-8 max-w-2xl text-[14px] leading-relaxed text-fg-subtle">
          Суми зібраного завжди позначені як дані організатора, бо в Monobank немає офіційного API для балансу банки.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Impact */

function Impact({ stats }: { stats?: Home["stats"] }) {
  const items = [
    { v: stats?.active, l: "активних зборів" },
    { v: stats?.organizers, l: "організаторів" },
    { v: stats?.finalReports, l: "фінальних звітів" },
    { v: stats?.members, l: "учасників спільноти" },
  ];
  const levels = ["Козак", "Характерник", "Бугайло", "Отаман", "Гетьман"];
  return (
    <section className="container-page pt-[clamp(100px,14vw,200px)]">
      <SectionHeader
        index="05"
        eyebrow="Спільнота"
        title="Внесок — це не лише гроші"
        description="Impact XP нараховуються за участь: підписки, поширення перевірених зборів, нових відвідувачів і командні челенджі. Сума донату на рівень не впливає."
      />
      <dl className="grid grid-cols-2 gap-px border-y border-border bg-border lg:grid-cols-4">
        {items.map((s, i) => (
          <div key={s.l} className="reveal flex flex-col-reverse gap-2 bg-bg py-8 pr-4 [&:nth-child(even)]:pl-5 sm:[&:nth-child(even)]:pl-7 lg:[&:not(:first-child)]:pl-7" style={d(i * 90)}>
            <dt className="text-[14px] text-fg-muted">{s.l}</dt>
            <dd className="text-[clamp(40px,5vw,72px)] font-medium leading-none tracking-[-0.05em]">
              <CountUp value={s.v} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mono mt-3 text-[11.5px] text-fg-subtle">Живі дані платформи, разом із демо-зборами.</p>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
        <div className="reveal">
          <p className="mono flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-fg-subtle"><Trophy className="size-4 text-gold" aria-hidden /> Похід місяця</p>
          <p className="mt-4 text-[clamp(24px,2.6vw,36px)] font-medium leading-[1.15] tracking-[-0.03em]">Перші 100 відвідувачів для 10 нових зборів</p>
          <Progress value={0.34} tone="gold" className="mt-6" label="Прогрес челенджу" />
          <p className="mono mt-3 text-[11.5px] text-fg-subtle">Приклад інтерфейсу. Реальний прогрес — на сторінці спільнот.</p>
        </div>
        <div className="reveal" style={d(120)}>
          <ol className="grid grid-cols-5 border-t border-border">
            {levels.map((l, i) => (
              <li key={l} className="reveal pt-4" style={d(200 + i * 80)}>
                <span className={cn("mono text-[12px]", i < 2 ? "text-gold-fg" : "text-fg-subtle")}>0{i + 1}</span>
                <p className={cn("mt-1 truncate text-[12px] sm:text-[14px]", i < 2 ? "text-fg" : "text-fg-subtle")}>{l}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <span className="text-[14px] text-fg-muted">Університети, компанії, волонтерські команди</span>
            <ButtonLink href="/communities" size="sm" variant="secondary">Спільноти <span className="arrow"><ArrowRight /></span></ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Final CTA */

function FinalCta() {
  return (
    <section className="container-page pt-[clamp(120px,16vw,240px)]">
      <p className="reveal mono text-[12px] uppercase tracking-[0.08em] text-fg-subtle">Безкоштовно для волонтерів</p>
      <SplitTitle as="h2" mode="scroll" lines={["Ваш збір", "заслуговує уваги."]} className="mt-5 text-[clamp(46px,9vw,150px)] font-medium leading-[0.92] tracking-[-0.055em]" />
      <div className="mt-12 grid gap-10 border-t border-border pt-8 md:grid-cols-[minmax(0,40ch)_1fr] md:items-start">
        <RiseWords as="p" text="Підключіть свою банку Monobank. Нові збори з малою аудиторією отримують додаткову видимість." className="text-[18px] leading-[1.4] text-fg-muted" />
        <div className="reveal flex flex-wrap gap-3 md:justify-end" style={d(200)}>
          <ButtonLink href="/dashboard/campaigns/new" size="lg" className="magnetic">
            Створити збір <span className="arrow"><ArrowRight /></span>
          </ButtonLink>
          <ButtonLink href="/explore" size="lg" variant="secondary" className="magnetic">
            Знайти збір <span className="arrow"><ArrowRight /></span>
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
