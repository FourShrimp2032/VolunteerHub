import { cn } from "@/lib/cn";

function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const hue = hueOf(name);
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)} style={{ width: size, height: size }} />;
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-display font-semibold text-white ring-1 ring-black/5", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(160deg, oklch(0.66 0.1 ${hue}), oklch(0.5 0.12 ${(hue + 30) % 360}))` }}
      aria-label={name}
    >
      {initials || "?"}
    </span>
  );
}
