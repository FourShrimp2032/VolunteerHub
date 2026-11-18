import Link from "next/link";
import { Logo } from "@/components/logo";

const COLS = [
  { title: "Платформа", links: [["/explore", "Знайти збір"], ["/dashboard/campaigns/new", "Створити збір"], ["/communities", "Спільноти та челенджі"], ["/transparency", "Як ми перевіряємо"]] },
  { title: "Для організацій", links: [["/pricing", "Тарифи"], ["/business", "Corporate Volunteerhub"], ["/support", "Підтримати платформу"]] },
  { title: "Акаунт", links: [["/login", "Увійти"], ["/register", "Реєстрація"], ["/dashboard", "Мій кабінет"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
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
            <p className="text-[13px] font-semibold text-fg">{c.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-fg-muted transition-colors hover:text-fg">
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
          <p className="inline-flex items-center gap-2">
            <span className="inline-flex h-2.5 w-4 flex-col overflow-hidden rounded-[2px]" aria-hidden>
              <span className="flex-1 bg-[#0057b7]" />
              <span className="flex-1 bg-[#ffd700]" />
            </span>
            Зроблено в Україні
          </p>
        </div>
      </div>
    </footer>
  );
}
