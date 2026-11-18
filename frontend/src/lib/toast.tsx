"use client";

import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

type Toast = { id: number; kind: "success" | "error" | "xp"; title: string; description?: string };
const ToastContext = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-lift backdrop-blur",
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="mt-0.5 size-5 text-success" />}
            {t.kind === "error" && <XCircle className="mt-0.5 size-5 text-danger" />}
            {t.kind === "xp" && (
              <span className="grid size-7 place-items-center rounded-full bg-gold-soft">
                <Sparkles className="size-4 text-gold-fg" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx.push;
}
