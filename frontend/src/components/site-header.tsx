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

  React.useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const doLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className={cn("sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200", scrolled || open ? "border-border bg-bg/80 backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-bg/0")}>
      <div className="container-page flex h-16 items-center gap-8">
        <Link href="/" className="shrink-0" aria-label="Volunteerhub — на головну">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("rounded-md px-3 py-1.5 text-[14px] font-medium transition-colors", pathname.startsWith(n.href) ? "bg-accent-soft/70 text-accent" : "text-fg-muted hover:bg-muted hover:text-fg")}
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
                <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-4 hover:ring-muted" aria-label="Меню профілю" aria-haspopup="menu" aria-expanded={menu}>
                  <Avatar name={user.name} src={user.avatarUrl} size={34} />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-64 animate-fade-up overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-pop">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-fg-muted">{user.email}</p>
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold-soft px-1.5 py-0.5 text-[11.5px] font-medium text-gold-fg">
                        {user.level.nameUk} · {user.xp} XP
                      </p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <MenuLink href="/dashboard" icon={<LayoutDashboard />}>Мій кабінет</MenuLink>
                    <MenuLink href="/dashboard/organizer" icon={<Plus />}>Мої збори</MenuLink>
                    <MenuLink href="/dashboard/profile" icon={<User />}>Профіль</MenuLink>
                    {user.role === "admin" && <MenuLink href="/admin" icon={<Shield />}>Адмін-панель</MenuLink>}
                    <div className="my-1 h-px bg-border" />
                    <button onClick={doLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-muted hover:text-fg [&_svg]:size-4">
                      <LogOut /> Вийти
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")} onClick={() => setOpen((v) => !v)} aria-label="Меню" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <div className="container-page animate-fade-up pb-5 lg:hidden">
          <nav className="grid gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn("flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium hover:bg-muted", pathname.startsWith(n.href) ? "bg-muted text-fg" : "text-fg-muted")}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid gap-2 border-t border-border pt-4">
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
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-muted hover:text-fg [&_svg]:size-4">
      {icon}
      {children}
    </Link>
  );
}
