import Link from "next/link";
import { Logo } from "@/components/logo";

const COLS = [
  { title: "Платформа", links: [["/explore", "Знайти збір"], ["/dashboard/campaigns/new", "Створити збір"], ["/communities", "Спільноти та челенджі"], ["/transparency", "Як ми перевіряємо"]] },
  { title: "Для організацій", links: [["/pricing", "Тарифи"], ["/business", "Corporate Volunteerhub"], ["/support", "Підтримати платформу"]] },
  { title: "Акаунт", links: [["/login", "Увійти"], ["/register", "Реєстрація"], ["/dashboard", "Мій кабінет"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Кожен важливий збір — помітний, прозорий і доступний, незалежно від того, хто його розпочав.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
            Volunteerhub не приймає й не зберігає донати. Кошти надходять напряму на банки Monobank організаторів.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-fg-muted transition hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Volunteerhub. MVP-прототип. Збори з позначкою «Демо» вигадані.</p>
          <p>Зроблено в Україні 🇺🇦</p>
        </div>
      </div>
    </footer>
  );
}
