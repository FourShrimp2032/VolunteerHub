"use client";

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SplitTitle } from "@/components/motion";

const COLS = [
  { title: "Платформа", links: [["/explore", "Знайти збір"], ["/explore", "Відкрити допоміжну банку"], ["/communities", "Спільноти та челенджі"], ["/transparency", "Як ми перевіряємо"]] },
  { title: "Для організацій", links: [["/dashboard/campaigns/new", "Заявка організації"], ["/pricing", "Тарифи"], ["/business", "Corporate Volunteerhub"], ["/support", "Підтримати платформу"]] },
  { title: "Акаунт", links: [["/login", "Увійти"], ["/register", "Реєстрація"], ["/dashboard", "Мій кабінет"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border">
      <div className="container-page grid gap-12 pt-16 pb-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="reveal max-w-xs">
          <Logo />
          <p className="mt-5 text-[15px] leading-relaxed text-fg-muted">
            Кожен важливий збір — помітний, прозорий і доступний, незалежно від того, хто його розпочав.
          </p>
          <p className="mt-4 text-[13px] leading-relaxed text-fg-subtle">
            Volunteerhub не приймає й не зберігає донати. Кошти надходять напряму на банки Monobank організацій і помічників.
          </p>
        </div>
        {COLS.map((c, i) => (
          <div key={c.title} className="reveal" style={{ ["--d" as string]: `${(i + 1) * 80}ms` }}>
            <p className="mono text-[12px] uppercase tracking-[0.08em] text-fg-subtle">{c.title}</p>
            <ul className="mt-5 grid gap-3">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="link-u text-[15px] text-fg-muted transition-colors duration-300 hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-page overflow-hidden" aria-hidden>
        <SplitTitle as="p" mode="scroll" lines={["Volunteerhub"]} className="select-none text-[clamp(52px,16.5vw,250px)] font-medium leading-[0.85] tracking-[-0.065em] text-fg" />
      </div>

      <div className="border-t border-border">
        <div className="container-page mono flex flex-col gap-3 py-6 text-[12px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Volunteerhub. MVP-прототип. Збори з позначкою «Демо» вигадані.</p>
          <div className="flex items-center gap-6">
            <p className="inline-flex items-center gap-2">
              <span className="inline-flex h-2.5 w-4 flex-col overflow-hidden rounded-[2px]" aria-hidden>
                <span className="flex-1 bg-[#0057b7]" />
                <span className="flex-1 bg-[#ffd700]" />
              </span>
              Зроблено в Україні
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
              className="group inline-flex min-h-11 items-center gap-2 transition-colors duration-300 hover:text-fg"
            >
              Нагору <ArrowUp className="size-3.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
