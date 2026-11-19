"use client";

import { ArrowRight, BadgeCheck, Eye, EyeOff, HandHeart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { CredentialResponse, GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { LogoMark } from "@/components/logo";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  "994822121085-m28q8e8mlvb1vudambms6ejlr3934l5o.apps.googleusercontent.com";

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

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Не вдалося отримати токен від Google.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let ref: string | undefined;
      try {
        ref = localStorage.getItem("vh_ref") ?? undefined;
      } catch {
        ref = undefined;
      }
      const r = await api<{ user: Me }>("/auth/google", {
        method: "POST",
        json: {
          credential: credentialResponse.credential,
          id_token: credentialResponse.credential,
          ref,
        },
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
        <h1 className="mt-6 text-[30px] font-extrabold tracking-[-0.035em]">{mode === "login" ? "З поверненням" : "Створіть акаунт"}</h1>
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

        <div className="mt-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-bg px-3 text-xs uppercase tracking-wider text-fg-subtle">
              або
            </span>
          </div>
          <div className="mt-5 flex justify-center">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale="uk">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Помилка авторизації через Google.")}
                text={mode === "login" ? "signin_with" : "signup_with"}
                shape="rectangular"
                size="large"
                width="384"
              />
            </GoogleOAuthProvider>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-fg-muted">
          {mode === "login" ? (
            <>Ще немає акаунта? <Link href={`/register${sp.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">Зареєструватися</Link></>
          ) : (
            <>Вже маєте акаунт? <Link href={`/login${sp.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">Увійти</Link></>
          )}
        </p>
      </div>
      <div className="relative hidden h-full min-h-[560px] overflow-hidden rounded-3xl border border-border bg-surface p-10 shadow-card lg:block">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(70%_60%_at_100%_0%,black,transparent)]" aria-hidden />
        <div className="pointer-events-none absolute right-[-160px] top-[-160px] size-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.53_0.2_262/0.16),transparent)]" aria-hidden />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <p className="max-w-sm pt-2 font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.04em]">Допомога, яку <span className="text-gradient">видно</span> від першої гривні до звіту.</p>
          <div className="grid gap-3">
            {[
              { icon: HandHeart, t: "Донати напряму", d: "Ми не торкаємося грошей. Кнопка веде на офіційну банку Monobank." },
              { icon: BadgeCheck, t: "Чесні перевірки", d: "Позначки довіри лише після реальної модерації. Їх не можна купити." },
              { icon: Sparkles, t: "Impact XP", d: "Рівні й досягнення за участь, а не за суму донату." },
            ].map((x) => (
              <div key={x.t} className="flex gap-4 rounded-xl border border-border bg-surface/90 p-5 shadow-card backdrop-blur">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent-border/60 bg-accent-soft text-accent"><x.icon className="size-[18px]" aria-hidden /></span>
                <div>
                  <p className="font-heading font-bold tracking-tight">{x.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
