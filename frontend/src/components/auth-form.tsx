"use client";

import { ArrowRight, BadgeCheck, Eye, EyeOff, HandHeart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { LogoMark } from "@/components/logo";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

function safeNext(next: string | null) {
  // Only allow same-site relative paths (no open redirects).
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { setUser, user, loading } = useAuth();
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const next = safeNext(sp.get("next"));

  React.useEffect(() => {
    const ref = sp.get("ref");
    if (ref) {
      try {
        localStorage.setItem("vh_ref", ref.slice(0, 20));
      } catch {
        /* storage unavailable */
      }
    }
  }, [sp]);

  React.useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let ref: string | undefined;
      try {
        ref = localStorage.getItem("vh_ref") ?? undefined;
      } catch {
        ref = undefined;
      }
      const r = await api<{ user: Me }>(`/auth/${mode}`, {
        method: "POST",
        json: mode === "register" ? { ...form, ref } : { email: form.email, password: form.password },
      });
      setUser(r.user);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-sm animate-fade-up">
        <LogoMark className="size-10" />
        <h1 className="mt-6 text-[28px] font-medium tracking-tight">{mode === "login" ? "З поверненням" : "Створіть акаунт"}</h1>
        <p className="mt-2 text-fg-muted">
          {mode === "login" ? "Увійдіть, щоб стежити за зборами та керувати своїми." : "Один акаунт, щоб підтримувати збори й створювати власні."}
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          {mode === "register" && (
            <Field label="Ім'я та прізвище" htmlFor="name">
              <Input id="name" autoComplete="name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Олена Коваль" />
            </Field>
          )}
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </Field>
          <Field label="Пароль" htmlFor="password" hint={mode === "register" ? "Мінімум 8 символів" : undefined}>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : 1}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pr-11"
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg" aria-label={show ? "Сховати пароль" : "Показати пароль"}>
                {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" size="lg" loading={busy} className="mt-2">
            {mode === "login" ? "Увійти" : "Зареєструватися"} <ArrowRight />
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-fg-muted">
          {mode === "login" ? (
            <>Ще немає акаунта? <Link href={`/register${sp.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">Зареєструватися</Link></>
          ) : (
            <>Вже маєте акаунт? <Link href={`/login${sp.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">Увійти</Link></>
          )}
        </p>
      </div>
      <div className="relative hidden h-full min-h-[560px] overflow-hidden rounded-3xl border border-border bg-ink p-10 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,oklch(0.49_0.2_260/0.55),transparent)]" />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <p className="max-w-sm pt-2 font-display text-[30px] font-medium leading-[1.15] tracking-tight">Допомога, яку <span className="text-sun">видно</span> від першої гривні до звіту.</p>
          <div className="grid gap-4">
            {[
              { icon: HandHeart, t: "Донати напряму", d: "Ми не торкаємося грошей. Кнопка веде на офіційну банку Monobank." },
              { icon: BadgeCheck, t: "Чесні перевірки", d: "Позначки довіри лише після реальної модерації. Їх не можна купити." },
              { icon: Sparkles, t: "Impact XP", d: "Рівні й досягнення за участь, а не за суму донату." },
            ].map((x) => (
              <div key={x.t} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                <x.icon className="size-5 shrink-0 text-sun" />
                <div>
                  <p className="font-semibold">{x.t}</p>
                  <p className="mt-1 text-sm text-white/65">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
