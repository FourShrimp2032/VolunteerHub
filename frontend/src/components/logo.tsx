import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id="vh-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.58 0.2 262)" />
          <stop offset="1" stopColor="oklch(0.47 0.2 264)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#vh-mark)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="white" strokeOpacity="0.18" />
      <path d="M9.5 11 16 21.5 22.5 11" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9.6" r="2.2" fill="white" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-[26px]" />
      <span className="font-display text-[16px] font-bold tracking-[-0.035em]">Volunteerhub</span>
    </span>
  );
}
