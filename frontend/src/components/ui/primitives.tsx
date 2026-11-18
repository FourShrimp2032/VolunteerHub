/**
 * Volunteerhub UI primitives, written in the shadcn/ui style
 * (Tailwind + class-variance-authority, owned in-repo rather than imported).
 */
"use client";

import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 active:translate-y-px select-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_oklch(0.4_0.18_262/0.3),0_0_0_1px_oklch(0.47_0.2_262)] hover:bg-accent-hover",
        sun: "bg-accent text-accent-fg hover:bg-accent-hover",
        dark: "bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_1px_2px_oklch(0.2_0.02_260/0.3)] hover:bg-[oklch(0.28_0.015_260)]",
        secondary: "bg-surface text-fg border border-border shadow-card hover:border-border-strong hover:bg-subtle",
        ghost: "text-fg-muted hover:text-fg hover:bg-muted",
        soft: "bg-accent-soft text-accent hover:bg-[oklch(0.94_0.035_262)]",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-accent underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, loading, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
});

export function ButtonLink({ href, className, variant, size, children, ...rest }: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
    </Link>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-[15px] text-fg placeholder:text-fg-subtle shadow-card transition hover:border-border-strong focus:border-accent focus:shadow-ring focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle shadow-card transition hover:border-border-strong focus:border-accent focus:shadow-ring focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full appearance-none rounded-lg border border-border bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat pl-3.5 pr-9 text-[15px] text-fg shadow-card transition focus:border-accent focus:shadow-ring focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ children, hint, htmlFor, className }: { children: React.ReactNode; hint?: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-fg", className)}>
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-fg-subtle">{hint}</span>}
    </label>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label hint={hint} htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
      {error && <p role="alert" className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[12px] font-medium leading-[18px] [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "border-border bg-subtle text-fg-muted",
      accent: "border-accent-border/60 bg-accent-soft text-accent",
      success: "border-[oklch(0.88_0.06_158)] bg-success-soft text-[oklch(0.45_0.12_158)]",
      warning: "border-[oklch(0.88_0.08_75)] bg-warning-soft text-[oklch(0.48_0.12_60)]",
      danger: "border-[oklch(0.89_0.06_25)] bg-danger-soft text-danger",
      gold: "border-[oklch(0.9_0.07_80)] bg-gold-soft text-gold-fg",
      dark: "border-transparent bg-ink text-white",
      outline: "border-border bg-surface text-fg-muted",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ tone, className, children, title }: VariantProps<typeof badgeVariants> & { className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn(badgeVariants({ tone }), className)}>
      {children}
    </span>
  );
}

export function Progress({ value, className, tone = "accent", size = "md", label }: { value: number; className?: string; tone?: "accent" | "success" | "gold"; size?: "sm" | "md" | "lg"; label?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const fill = tone === "success" ? "bg-success" : tone === "gold" ? "bg-gold" : "bg-accent";
  const h = size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";
  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-muted", h, className)} role="progressbar" aria-label={label ?? "Прогрес"} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full origin-left rounded-full transition-[width] duration-700 ease-out animate-[grow-x_0.9s_cubic-bezier(0.2,0.7,0.2,1)_both]", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-muted/60 p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition",
            value === o.value ? "bg-surface text-fg shadow-[0_1px_2px_oklch(0.2_0.02_260/0.08),0_0_0_1px_oklch(0.2_0.02_260/0.06)]" : "text-fg-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Alert({ tone = "neutral", children, className, icon }: { tone?: "neutral" | "danger" | "success" | "warning" | "accent"; children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  const tones = {
    neutral: "bg-subtle border-border text-fg-muted",
    danger: "bg-danger-soft border-[oklch(0.89_0.06_25)] text-danger",
    success: "bg-success-soft border-[oklch(0.88_0.06_158)] text-[oklch(0.42_0.12_158)]",
    warning: "bg-warning-soft border-[oklch(0.88_0.08_75)] text-[oklch(0.45_0.12_60)]",
    accent: "bg-accent-soft border-accent-border/60 text-[oklch(0.45_0.18_262)]",
  } as const;
  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", tones[tone], className)}>
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[oklch(0.2_0.02_260/0.32)] backdrop-blur-[3px] animate-fade-up" onClick={onClose} />
      <div className="relative z-10 m-0 w-full max-w-lg animate-fade-up rounded-t-2xl border border-border bg-surface p-6 shadow-pop sm:m-4 sm:rounded-2xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
