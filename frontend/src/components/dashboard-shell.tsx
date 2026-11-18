"use client";

import { Heart, LayoutGrid, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { Skeleton } from "@/components/ui/primitives";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { Me } from "@/lib/types";

const TABS = [
  { href: "/dashboard", label: "Мій вплив", icon: Heart },
  { href: "/dashboard/organizer", label: "Мої збори", icon: LayoutGrid },
  { href: "/dashboard/profile", label: "Профіль", icon: User },
];

export function DashboardShell({ title, description, actions, children, admin }: { title: string; description?: string; actions?: React.ReactNode; children: (user: Me) => React.ReactNode; admin?: boolean }) {
  const { user } = useRequireAuth({ admin });
  const pathname = usePathname();
  if (!user)
    return (
      <div className="container-page pt-10">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-48 w-full rounded-2xl" />
      </div>
    );
  const tabs = user.role === "admin" ? [...TABS, { href: "/admin", label: "Адмін", icon: Shield }] : TABS;
  return (
    <div className="container-page pt-6 sm:pt-10">
      <div className="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tabs.map((t) => {
          const active = t.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn("-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition", active ? "border-fg font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg")}
            >
              <t.icon className="size-4" /> {t.label}
            </Link>
          );
        })}
      </div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children(user)}
    </div>
  );
}
