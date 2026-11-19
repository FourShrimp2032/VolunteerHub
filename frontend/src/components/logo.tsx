import { cn } from "@/lib/cn";

/** Ink tile with a minimal bulava (Cossack mace). The orange finial hops on hover of the parent `.group`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0e0e0f" />
      <path d="M16 5.6c3.6 0 5.6 2.3 5.6 4.9 0 2.9-2.6 4.9-5.6 4.9s-5.6-2-5.6-4.9c0-2.6 2-4.9 5.6-4.9Z" fill="#f4f3ef" />
      <path d="M16 5.6v9.8M13.1 6.3v8.4M18.9 6.3v8.4" stroke="#0e0e0f" strokeWidth="0.95" />
      <rect x="13.3" y="15.9" width="5.4" height="1.7" rx="0.85" fill="#f4f3ef" />
      <path d="M16 17.6v8" stroke="#f4f3ef" strokeWidth="2.1" strokeLinecap="round" />
      <rect x="14.2" y="25.2" width="3.6" height="1.6" rx="0.8" fill="#f4f3ef" />
      <circle cx="16" cy="3.9" r="1.4" fill="#ff4d1c" className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[1.5px]" />
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
