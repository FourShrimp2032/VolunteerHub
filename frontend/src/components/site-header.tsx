"use client";

import { LayoutDashboard, LogOut, Menu, Plus, Search, Shield, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { ButtonLink, buttonVariants } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/explore", label: "Збори" },
  { href: "/communities", label: "Спільноти" },
  { href: "/transparency", label: "Прозорість" },
  { href: "/business", label: "Для компаній" },
  { href: "/pricing", label: "Тарифи" },
];

export function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);
  React.useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      // Slide away when reading down, come back the moment the user scrolls up.
      if (Math.abs(y - last) > 6) setHidden(y > last && y > 160);
      last = y;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const doLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        scrolled || open ? "border-border bg-bg/85 backdrop-blur-xl" : "border-transparent bg-bg/0",
        hidden && !open && !menu && "-translate-y-full",
      )}
    >
      <div className="container-page flex h-[68px] items-center gap-10">
        <Link href="/" className="shrink-0" aria-label="Volunteerhub — на головну">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className={cn("link-u text-[14.5px] transition-colors duration-300", pathname.startsWith(n.href) ? "text-fg" : "text-fg-muted hover:text-fg")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/explore" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")} aria-label="Пошук зборів">
            <Search />
          </Link>
          {!loading && !user && (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Увійти
              </ButtonLink>
              <ButtonLink href="/dashboard/campaigns/new" variant="primary" size="sm" className="hidden sm:inline-flex">
                <Plus /> Створити збір
              </ButtonLink>
            </>
          )}
          {user && (
            <>
              <ButtonLink href="/dashboard/campaigns/new" variant="secondary" size="sm" className="hidden sm:inline-flex">
                <Plus /> Створити збір
              </ButtonLink>
              <div className="relative hidden sm:block">
                <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full p-0.5 transition-shadow duration-300 hover:ring-4 hover:ring-fg/10" aria-label="Меню профілю" aria-haspopup="menu" aria-expanded={menu}>
                  <Avatar name={user.name} src={user.avatarUrl} size={34} />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-3 w-64 origin-top-right animate-[menu-in_0.45s_var(--ease)_both] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-pop">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-fg-muted">{user.email}</p>
                      <p className="mono mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] text-gold-fg">
                        {user.level.nameUk} · {user.xp} XP
                      </p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <MenuLink href="/dashboard" icon={<LayoutDashboard />}>Мій кабінет</MenuLink>
                    <MenuLink href="/dashboard/organizer" icon={<Plus />}>Мої збори</MenuLink>
                    <MenuLink href="/dashboard/profile" icon={<User />}>Профіль</MenuLink>
                    {user.role === "admin" && <MenuLink href="/admin" icon={<Shield />}>Адмін-панель</MenuLink>}
                    <div className="my-1 h-px bg-border" />
                    <button onClick={doLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors duration-300 hover:bg-subtle hover:text-fg [&_svg]:size-4">
                      <LogOut /> Вийти
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")} onClick={() => setOpen((v) => !v)} aria-label="Меню" aria-expanded={open}>
            <span key={open ? "x" : "m"} className="inline-flex animate-[spin-in_0.5s_var(--ease)_both]">{open ? <X /> : <Menu />}</span>
          </button>
        </div>
      </div>
      {open && (
        <div className="container-page pb-6 lg:hidden">
          <nav className="grid">
            {NAV.map((n, i) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn("flex min-h-14 items-center justify-between border-b border-border text-[26px] font-medium tracking-[-0.03em] animate-[fade-up_0.7s_var(--ease)_both]", pathname.startsWith(n.href) ? "text-fg" : "text-fg-muted")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {n.label}
                <span className="mono text-[12px] text-fg-subtle">0{i + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-5 grid gap-2 animate-[fade-up_0.7s_var(--ease)_250ms_both]">
            {user ? (
              <>
                <ButtonLink href="/dashboard" variant="secondary">Мій кабінет</ButtonLink>
                <ButtonLink href="/dashboard/organizer" variant="secondary">Мої збори</ButtonLink>
                {user.role === "admin" && <ButtonLink href="/admin" variant="secondary">Адмін-панель</ButtonLink>}
                <ButtonLink href="/dashboard/campaigns/new" variant="primary"><Plus /> Створити збір</ButtonLink>
                <button onClick={doLogout} className={buttonVariants({ variant: "ghost" })}>Вийти</button>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="secondary">Увійти</ButtonLink>
                <ButtonLink href="/register" variant="primary">Зареєструватися</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="group/m flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors duration-300 hover:bg-subtle hover:text-fg [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-500 hover:[&_svg]:translate-x-0.5">
      {icon}
      {children}
    </Link>
  );
}
