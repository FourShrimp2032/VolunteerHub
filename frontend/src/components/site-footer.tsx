import Link from "next/link";
import { Logo } from "@/components/logo";

const COLS = [
  { title: "Платформа", links: [["/explore", "Знайти збір"], ["/dashboard/campaigns/new", "Створити збір"], ["/communities", "Спільноти та челенджі"], ["/transparency", "Як ми перевіряємо"]] },
  { title: "Для організацій", links: [["/pricing", "Тарифи"], ["/business", "Corporate Volunteerhub"], ["/support", "Підтримати платформу"]] },
  { title: "Акаунт", links: [["/login", "Увійти"], ["/register", "Реєстрація"], ["/dashboard", "Мій кабінет"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Кожен важливий збір — помітний, прозорий і доступний, незалежно від того, хто його розпочав.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-white/45">
            Volunteerhub не приймає й не зберігає донати. Кошти надходять напряму на банки Monobank організаторів.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">{c.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-white/80 transition hover:text-sun">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Volunteerhub. MVP-прототип. Збори з позначкою «Демо» вигадані.</p>
          <p>Зроблено в Україні 🇺🇦</p>
        </div>
      </div>
    </footer>
  );
}
