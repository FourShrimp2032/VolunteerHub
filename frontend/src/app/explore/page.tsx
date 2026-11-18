"use client";

import { Flame, Info, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { CampaignGrid, EmptyState } from "@/components/campaign";
import { Button, Input, Select } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { num, plural } from "@/lib/format";
import type { CampaignCard } from "@/lib/types";

const SORTS = [
  { value: "recommended", label: "Рекомендовані" },
  { value: "new", label: "Нові" },
  { value: "attention", label: "Потребують уваги" },
  { value: "almost", label: "Майже зібрано" },
  { value: "deadline", label: "Найближчий дедлайн" },
  { value: "goal_asc", label: "Менша ціль" },
];

const STATUSES = [
  { value: "open", label: "Активні" },
  { value: "funded", label: "Ціль досягнуто" },
  { value: "completed", label: "Завершені" },
  { value: "all", label: "Усі" },
];

export default function ExplorePage() {
  return (
    <React.Suspense>
      <Explore />
    </React.Suspense>
  );
}

function Explore() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = {
    q: sp.get("q") ?? "",
    category: sp.get("category") ?? "",
    sort: sp.get("sort") ?? "recommended",
    status: sp.get("status") ?? "open",
    verified: sp.get("verified") === "1",
    urgent: sp.get("urgent") === "1",
    city: sp.get("city") ?? "",
    page: Number(sp.get("page") ?? 1) || 1,
  };
  const [q, setQ] = React.useState(params.q);
  const [data, setData] = React.useState<{ items: CampaignCard[]; total: number; pages: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const set = React.useCallback(
    (patch: Partial<Record<keyof typeof params, string | boolean | number>>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" || v === false || v === undefined || (k === "page" && v === 1)) next.delete(k);
        else next.set(k, v === true ? "1" : String(v));
      }
      if (!("page" in patch)) next.delete("page");
      router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  React.useEffect(() => {
    setQ(params.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  React.useEffect(() => {
    setData(null);
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    qs.set("sort", params.sort);
    qs.set("status", params.status);
    if (params.verified) qs.set("verified", "1");
    if (params.urgent) qs.set("urgent", "1");
    if (params.city) qs.set("city", params.city);
    qs.set("page", String(params.page));
    api<{ items: CampaignCard[]; total: number; pages: number }>(`/campaigns?${qs}`).then(setData).catch(() => setData({ items: [], total: 0, pages: 1 }));
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters = [params.category, params.verified, params.urgent, params.city, params.status !== "open"].filter(Boolean).length;

  return (
    <div className="container-page pt-8 sm:pt-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Знайдіть збір, якому потрібна ваша допомога</h1>
        <p className="mt-3 text-fg-muted">«Рекомендовані» враховують новизну, малу кількість переглядів, перевірки, терміновість і близькість до цілі. Не лише популярність.</p>
      </div>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q });
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-fg-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук за назвою, описом чи містом" className="h-12 pl-10" aria-label="Пошук" />
        </div>
        <Button type="submit" size="lg" className="h-12">Шукати</Button>
        <Button type="button" variant="secondary" size="lg" className="h-12 md:hidden" onClick={() => setFiltersOpen((v) => !v)} aria-label="Фільтри">
          <SlidersHorizontal />
          {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">{activeFilters}</span>}
        </Button>
      </form>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!params.category} onClick={() => set({ category: "" })}>Усі категорії</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.slug} active={params.category === c.slug} onClick={() => set({ category: params.category === c.slug ? "" : c.slug })}>
            <c.icon className="size-3.5" /> {c.short}
          </Chip>
        ))}
      </div>

      <div className={cn("mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card md:flex md:items-center md:justify-between", !filtersOpen && "hidden md:flex")}>
        <div className="flex flex-wrap items-center gap-2">
          <Toggle active={params.verified} onClick={() => set({ verified: !params.verified })}>
            <ShieldCheck className="size-4" /> Перевірені
          </Toggle>
          <Toggle active={params.urgent} onClick={() => set({ urgent: !params.urgent })}>
            <Flame className="size-4" /> Термінові
          </Toggle>
          <Select value={params.status} onChange={(e) => set({ status: e.target.value })} className="h-9 w-auto text-sm" aria-label="Статус">
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <CityInput value={params.city} onSubmit={(city) => set({ city })} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-subtle">Сортування</span>
          <Select value={params.sort} onChange={(e) => set({ sort: e.target.value })} className="h-9 w-auto text-sm" aria-label="Сортування">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-5 mt-7 flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {data ? `${num(data.total)} ${plural(data.total, "збір", "збори", "зборів")}` : "Завантаження…"}
          {params.q && <> за запитом «{params.q}»</>}
        </p>
        {(activeFilters > 0 || params.q) && (
          <button onClick={() => router.replace(pathname)} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
            <X className="size-3.5" /> Скинути
          </button>
        )}
      </div>

      {params.verified && (
        <p className="mb-5 flex items-center gap-2 text-[13px] text-fg-muted">
          <Info className="size-4" /> «Перевірені» означає, що модератор переглянув мету збору й перевірив банку.
        </p>
      )}

      <CampaignGrid
        items={data?.items}
        loading={!data}
        empty={<EmptyState icon={<Search />} title="Нічого не знайдено" description="Спробуйте інший запит або приберіть фільтри." action={<Button variant="secondary" onClick={() => router.replace(pathname)}>Скинути фільтри</Button>} />}
      />

      {data && data.pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={params.page <= 1} onClick={() => set({ page: params.page - 1 })}>Назад</Button>
          <span className="px-3 text-sm text-fg-muted">{params.page} / {data.pages}</span>
          <Button variant="secondary" size="sm" disabled={params.page >= data.pages} onClick={() => set({ page: params.page + 1 })}>Далі</Button>
        </div>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
        active ? "border-ink bg-ink text-white" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition",
        active ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function CityInput({ value, onSubmit }: { value: string; onSubmit: (v: string) => void }) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v.trim());
      }}
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() !== value && onSubmit(v.trim())} placeholder="Місто чи область" className="h-9 w-44 text-sm" aria-label="Місто" />
    </form>
  );
}
