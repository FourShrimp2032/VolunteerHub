import { Check, Minus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui/primitives";

export const metadata = { title: "Тарифи" };

const PLANS = [
  {
    key: "free", name: "Free", price: "0 ₴", period: "назавжди", who: "Для волонтерів та донорів",
    features: ["Створення та керування зборами", "Підключення банки Monobank", "Базова аналітика", "Оновлення та звіти про витрати", "Чесне просування в каталозі", "Модерація та позначки довіри"],
    cta: { href: "/register", label: "Почати безкоштовно" },
  },
  {
    key: "pro", name: "Pro", price: "799 ₴", period: "на місяць", who: "Для фондів та волонтерських команд", highlight: true,
    features: ["Усе з Free", "Розширена аналітика й джерела трафіку", "Командна робота над зборами", "Автоматизовані звіти", "Експорт даних (CSV, PDF)", "Додаткові інструменти керування", "API-доступ (згодом)"],
    cta: { href: "/business#contact", label: "Долучитися до бета-тесту" },
  },
  {
    key: "corporate", name: "Corporate", price: "Індивідуально", period: "", who: "Для компаній",
    features: ["Корпоративний простір спільноти", "Команди працівників", "Корпоративні челенджі", "Внутрішні досягнення", "Дашборди участі", "Агрегована аналітика впливу"],
    cta: { href: "/business", label: "Дізнатися більше" },
  },
];

const ROWS: [string, boolean | string, boolean | string, boolean | string][] = [
  ["Створення зборів", true, true, true],
  ["Чесне просування в каталозі", true, true, true],
  ["Позначки довіри після перевірки", true, true, true],
  ["Комісія з донатів", "0%", "0%", "0%"],
  ["Розширена аналітика", false, true, true],
  ["Командна робота", false, true, true],
  ["Експорт даних", false, true, true],
  ["Корпоративні челенджі та дашборди", false, false, true],
];

export default function PricingPage() {
  return (
    <div className="container-page pt-12 sm:pt-16">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="accent">Ми не беремо відсоток із донатів</Badge>
        <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">Безкоштовно для волонтерів. Pro для організацій.</h1>
        <p className="mt-4 text-lg text-fg-muted">Volunteerhub заробляє на програмних інструментах для організацій, а не на ваших донатах.</p>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.key} className={p.highlight ? "relative border-fg p-7 shadow-lift ring-1 ring-fg" : "p-7"}>
            {p.highlight && <Badge tone="dark" className="absolute -top-3 left-7">Скоро</Badge>}
            <p className="font-display text-lg font-bold">{p.name}</p>
            <p className="mt-1 text-sm text-fg-muted">{p.who}</p>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold tracking-tight">{p.price}</span>
              {p.period && <span className="text-sm text-fg-muted">{p.period}</span>}
            </p>
            {p.key === "pro" && <p className="mt-1 text-xs text-fg-subtle">Експериментальна ціна. Оплата ще не підключена.</p>}
            <ButtonLink href={p.cta.href} variant={p.highlight ? "primary" : "secondary"} className="mt-6 w-full">{p.cta.label}</ButtonLink>
            <ul className="mt-7 grid gap-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-4 font-medium text-fg-muted">Можливість</th>
              {PLANS.map((p) => <th key={p.key} className="px-5 py-4 text-center font-semibold">{p.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map(([label, ...vals]) => (
              <tr key={label}>
                <td className="px-5 py-3.5">{label}</td>
                {vals.map((v, i) => (
                  <td key={i} className="px-5 py-3.5 text-center">
                    {v === true ? <Check className="mx-auto size-4 text-success" /> : v === false ? <Minus className="mx-auto size-4 text-fg-subtle" /> : <span className="font-medium">{v}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-success" /> Наші принципи монетизації</p>
          <ul className="mt-4 grid gap-2 text-sm text-fg-muted">
            <li>• Ми ніколи не продаємо позначки перевірки.</li>
            <li>• Базове створення зборів завжди безкоштовне.</li>
            <li>• Чесне просування не буває платною функцією.</li>
            <li>• Компанії не можуть таємно впливати на органічні рекомендації.</li>
            <li>• Донати й дохід платформи завжди розділені.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <p className="font-semibold">Хочете підтримати Volunteerhub?</p>
          <p className="mt-2 text-sm text-fg-muted">Добровільна підтримка розвитку платформи йде на окремий, чітко позначений рахунок і ніколи не змішується з донатами на збори.</p>
          <Link href="/support" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">Підтримати платформу →</Link>
        </Card>
      </div>
    </div>
  );
}
