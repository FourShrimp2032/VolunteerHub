import { cn } from "@/lib/cn";

/** Ink tile with a V and a signal-orange dot. The dot hops on hover of the parent `.group`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0e0e0f" />
      <path d="M9.5 12 16 22 22.5 12" fill="none" stroke="#f4f3ef" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9.4" r="2.3" fill="#ff4d1c" className="origin-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[1.5px]" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-[26px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[-8deg]" />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">Volunteerhub</span>
    </span>
  );
}
