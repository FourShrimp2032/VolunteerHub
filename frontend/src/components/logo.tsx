import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="oklch(0.2 0.02 265)" />
      <path d="M9 10.5 16 22l7-11.5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9.5" r="2.4" fill="oklch(0.62 0.2 263)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[17px] font-bold tracking-tight">Volunteerhub</span>
    </span>
  );
}
