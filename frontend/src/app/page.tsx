"use client";

import { ArrowRight, BadgeCheck, CheckCircle2, Compass, FileCheck2, HandHeart, Landmark, Megaphone, ScanSearch, Search, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CampaignCard, CampaignCardSkeleton, CampaignGrid, CampaignRow, SectionHeader } from "@/components/campaign";
import { Badge, Button, ButtonLink, Card, Progress } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
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

      <section className="container-page mt-20">
        <SectionHeader
          eyebrow="Обрані збори"
          title="Щодня — нові збори на першому місці"
          description="Ці слоти ротуються щодня. Ми не ставимо вгору тих, хто вже зібрав найбільше."
          action={<ButtonLink href="/explore" variant="secondary" size="sm">Усі збори <ArrowRight /></ButtonLink>}
        />
        <CampaignGrid items={data?.featured} loading={!data} />
      </section>

      <FeedRow title="Нові збори" eyebrow="Щойно опубліковані" description="Перші години найважливіші для нового збору." items={data?.fresh} href="/explore?sort=new" />
      <FeedRow title="Потребують уваги" eyebrow="Чесне просування" description="Збори, які ще мало хто бачив. Один перегляд і поширення тут важать найбільше." items={data?.attention} href="/explore?sort=attention" tone="accent" />
      <FeedRow title="Майже зібрано" eyebrow="Фінішна пряма" description="Залишилось зовсім трохи до цілі." items={data?.almost} href="/explore?sort=almost" />
      <FeedRow
        title="Рекомендовано для вас"
        eyebrow={data?.personalized ? "За вашими інтересами" : "Наш збалансований підбір"}
        description={
          data?.personalized
            ? "Враховуємо ваші категорії, новизну, терміновість і збори з малою аудиторією."
            : user
              ? "Оберіть категорії у профілі, і підбір стане персональним."
              : "Увійдіть і оберіть категорії, щоб отримати персональні рекомендації."
        }
        items={data?.recommended}
        href="/explore"
      />

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
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.215_263/0.12),transparent)]" />
      <div className="container-page relative grid items-center gap-12 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24">
        <div className="animate-fade-up">
          <Link href="/transparency" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 py-1 pl-1 pr-3 text-[13px] text-fg-muted shadow-card backdrop-blur transition hover:text-fg">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">Новий підхід</span>
            Донати йдуть напряму на банки організаторів <ArrowRight className="size-3.5" />
          </Link>
          <h1 className="mt-6 text-balance text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[56px] lg:text-[64px]">
            Кожен важливий збір має бути <span className="bg-gradient-to-r from-accent to-[oklch(0.6_0.2_290)] bg-clip-text text-transparent">помітним</span>.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-[17px] leading-relaxed text-fg-muted sm:text-lg">
            Volunteerhub збирає збори з Telegram, Instagram і чатів в одному місці. Тут їх легко знайти й перевірити, а потім побачити звіт про результат. Навіть якщо в організатора немає тисяч підписників.
          </p>
          <form
            className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-surface p-1.5 shadow-lift focus-within:border-accent focus-within:shadow-ring"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          >
            <Search className="ml-3 size-5 shrink-0 text-fg-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Дрон, генератор, реабілітація, Харків…" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle" aria-label="Пошук зборів" />
            <Button type="submit" size="lg" className="h-11 rounded-xl">
              Знайти збір
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/dashboard/campaigns/new" variant="link" className="text-[15px] font-medium text-fg no-underline hover:text-accent">
              Створити збір <ArrowRight />
            </ButtonLink>
            <span className="flex items-center gap-4 text-[13px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Безкоштовно</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Без комісії</span>
              <span className="hidden items-center gap-1.5 sm:inline-flex"><CheckCircle2 className="size-4 text-success" /> Модерація</span>
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms] lg:max-w-none">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-accent-soft via-transparent to-gold-soft blur-2xl" />
          <div className="relative">
            {sample ? <CampaignCard c={sample} className="shadow-lift" /> : <CampaignCardSkeleton />}
            <div className="absolute -left-4 top-24 hidden w-56 rotate-[-3deg] rounded-2xl border border-border bg-surface/95 p-3.5 shadow-lift backdrop-blur sm:block lg:-left-12">
              <p className="flex items-center gap-2 text-[12px] font-medium text-fg-muted"><Sparkles className="size-3.5 text-gold" /> Impact XP</p>
              <p className="mt-1 font-display text-lg font-bold">Прихильник · 240 XP</p>
              <Progress value={0.7} tone="gold" size="sm" className="mt-2" />
              <p className="mt-1.5 text-[11px] text-fg-subtle">60 XP до рівня «Амбасадор змін»</p>
            </div>
            <div className="absolute -bottom-24 -right-3 hidden w-60 rotate-[2deg] rounded-2xl border border-border bg-surface/95 p-3.5 shadow-lift backdrop-blur sm:block lg:-right-8">
              <p className="text-[12px] font-medium text-fg-muted">Шлях збору</p>
              <ol className="mt-2 grid gap-1.5 text-[12.5px]">
                {["Збір розпочато", "Ціль досягнуто", "Закупівлю здійснено", "Фінальний звіт"].map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${i < 3 ? "bg-success" : "bg-border-strong"}`} />
                    <span className={i < 3 ? "text-fg" : "text-fg-subtle"}>{s}</span>
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

function Categories({ counts }: { counts?: Record<string, number> }) {
  return (
    <section className="container-page">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/explore?category=${c.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `oklch(0.96 0.03 ${c.hue})`, color: `oklch(0.5 0.13 ${c.hue})` }}>
              <c.icon className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium">{c.label}</span>
              <span className="text-xs text-fg-subtle">{counts ? `${counts[c.slug] ?? 0} активних` : " "}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeedRow({ title, eyebrow, description, items, href, tone }: { title: string; eyebrow: string; description: string; items?: CardT[]; href: string; tone?: "accent" }) {
  if (items && items.length === 0) return null;
  return (
    <section className={tone === "accent" ? "mt-20 border-y border-border bg-subtle/60 py-16" : "container-page mt-20"}>
      <div className={tone === "accent" ? "container-page" : undefined}>
        <SectionHeader eyebrow={eyebrow} title={title} description={description} action={<ButtonLink href={href} variant="ghost" size="sm">Дивитися всі <ArrowRight /></ButtonLink>} />
        <CampaignRow items={items} loading={!items} />
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
        {[{ title: "Для донорів", items: donor }, { title: "Для організаторів", items: org }].map((col) => (
          <Card key={col.title} className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-fg-muted">{col.title}</p>
            <ol className="mt-6 grid gap-6">
              {col.items.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-subtle">
                    <s.icon className="size-5 text-fg" strokeWidth={1.7} />
                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-fg text-[10px] font-semibold text-white">{i + 1}</span>
                  </span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
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
    <section className="mt-24 bg-fg py-20 text-white">
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-[13px] font-medium text-[oklch(0.75_0.12_263)]">Довіра та прозорість</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Позначка з'являється лише тоді, коли перевірка справді відбулася.</h2>
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
              <b.icon className="size-5 text-[oklch(0.8_0.14_155)]" />
              <p className="mt-3 font-semibold">{b.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{b.d}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:col-span-2">
            <p className="text-sm font-medium text-white/70">Таймлайн збору</p>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px] text-white/60 sm:text-xs">
              {["Створено", "Розпочато", "Ціль досягнуто", "Закупівля", "Фінальний звіт"].map((s, i) => (
                <div key={s}>
                  <div className={`mx-auto mb-2 h-1 rounded-full ${i < 4 ? "bg-[oklch(0.72_0.15_155)]" : "bg-white/20"}`} />
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
                <p className="font-display text-3xl font-bold tabular-nums">{s.v === undefined ? "—" : num(s.v)}</p>
                <p className="mt-1 text-sm text-fg-muted">{s.l}</p>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs text-fg-subtle">Живі дані платформи, разом із демо-зборами.</p>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-6">
            <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-gold" /> Челендж місяця</p>
            <p className="mt-3 font-display text-xl font-bold">Перші 100 відвідувачів для 10 нових зборів</p>
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
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-card sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.215_263/0.15),transparent)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Badge tone="accent">Безкоштовно для волонтерів</Badge>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight">Ваш збір заслуговує на те, щоб його побачили.</h2>
            <p className="mt-3 text-fg-muted">Підключіть свою банку Monobank. Нові збори з малою аудиторією отримують додаткову видимість.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/dashboard/campaigns/new" size="lg">Створити збір</ButtonLink>
            <ButtonLink href="/explore" size="lg" variant="secondary">Знайти збір</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
