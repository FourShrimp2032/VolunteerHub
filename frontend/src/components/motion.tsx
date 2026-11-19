"use client";

/**
 * Motion layer. One root wires up every effect by delegation, so components
 * only need class names / data attributes:
 *   .reveal, .reveal-clip, .reveal-line, .split-scroll, [data-words]  → get `data-in` when scrolled into view
 *   [data-tilt]                                                       → pointer tilt + spotlight (fine pointers only)
 *   [data-cursor="label"]                                             → orange cursor bubble with that label
 *   .magnetic                                                         → element leans toward the pointer
 * Everything respects prefers-reduced-motion.
 */

import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/cn";

const REVEAL = ".reveal, .reveal-clip, .reveal-line, .split-scroll, [data-words], [data-count]";

export function MotionRoot() {
  const pathname = usePathname();
  const progress = React.useRef<HTMLDivElement>(null);
  const cursor = React.useRef<HTMLDivElement>(null);
  const [label, setLabel] = React.useState("");

  // Scroll reveal, including nodes that appear later (data loads, route changes).
  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          e.target.dispatchEvent(new CustomEvent("vh:in"));
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    const seen = new WeakSet<Element>();
    const watch = (el: Element) => {
      if (seen.has(el) || el.hasAttribute("data-in")) return;
      seen.add(el);
      io.observe(el);
    };
    const scan = (root: Element | Document) => {
      if (root instanceof Element && root.matches(REVEAL)) watch(root);
      root.querySelectorAll(REVEAL).forEach(watch);
    };
    scan(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  // Scroll progress + hero drift.
  React.useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;
    const update = () => {
      ticking = false;
      const root = document.documentElement;
      const max = root.scrollHeight - innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      if (reduce) return;
      document.querySelectorAll<HTMLElement>("[data-drift]").forEach((el) => {
        const h = Math.min(scrollY / innerHeight, 1);
        el.style.transform = `translate3d(0, ${h * -10}vh, 0)`;
        el.style.opacity = String(1 - h * 0.75);
      });
    };
    const on = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, [pathname]);

  // Pointer effects: cursor bubble, tilt, magnetic.
  React.useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let cx = -200, cy = -200, tx = -200, ty = -200, raf = 0;
    let tilted: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    const follow = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.current?.style.setProperty("--x", `${cx}px`);
      cursor.current?.style.setProperty("--y", `${cy}px`);
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);

    const resetTilt = () => {
      if (!tilted) return;
      tilted.style.setProperty("--rx", "0deg");
      tilted.style.setProperty("--ry", "0deg");
      tilted = null;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target as Element | null;

      const lab = t?.closest<HTMLElement>("[data-cursor]");
      cursor.current?.classList.toggle("is-on", !!lab);
      if (lab) setLabel(lab.dataset.cursor || "");

      const tilt = t?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilt !== tilted) resetTilt();
      if (tilt) {
        tilted = tilt;
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tilt.style.setProperty("--mx", `${x * 100}%`);
        tilt.style.setProperty("--my", `${y * 100}%`);
        tilt.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
        tilt.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
      }

      const mag = t?.closest<HTMLElement>(".magnetic") ?? null;
      if (magnet && mag !== magnet) magnet.style.transform = "";
      magnet = mag;
      if (mag) {
        const r = mag.getBoundingClientRect();
        mag.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
      }
    };
    const onLeave = () => {
      cursor.current?.classList.remove("is-on");
      resetTilt();
      if (magnet) magnet.style.transform = "";
      magnet = null;
    };
    addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Hide the cursor bubble when the route changes under it.
  React.useEffect(() => cursor.current?.classList.remove("is-on"), [pathname]);

  return (
    <>
      <div ref={progress} className="vh-progress" aria-hidden />
      <div ref={cursor} className="vh-cursor" aria-hidden>
        <span className="px-3">{label}</span>
      </div>
    </>
  );
}

/**
 * Big title split into letters. `lines` render as separate masked rows.
 * mode "now" animates on mount (heroes); "scroll" waits until in view.
 */
export function SplitTitle({ lines, as: Tag = "h1", mode = "now", className, base = 120, accentLine }: { lines: string[]; as?: "h1" | "h2" | "p"; mode?: "now" | "scroll"; className?: string; base?: number; accentLine?: number }) {
  let i = 0;
  return (
    <Tag className={cn(mode === "now" ? "split-now" : "split-scroll", className)} aria-label={lines.join(" ")} style={{ ["--base" as string]: `${base}ms` }}>
      {lines.map((line, li) => (
        <span key={li} className="split-line" aria-hidden>
          <span className={cn("split", accentLine === li && "text-accent")}>
            {[...line].map((c, ci) => (
              <span key={ci} className="ch" style={{ ["--i" as string]: i++ }}>
                {c === " " ? "\u00A0" : c}
              </span>
            ))}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** Section heading whose words rise one after another when scrolled into view. */
export function RiseWords({ text, as: Tag = "h2", className }: { text: string; as?: "h1" | "h2" | "h3" | "p"; className?: string }) {
  const words = text.split(/\s+/);
  return (
    <Tag data-words className={className} aria-label={text}>
      {words.map((w, n) => (
        <React.Fragment key={n}>
          <span className="w" aria-hidden>
            <span style={{ ["--n" as string]: n }}>{w}</span>
          </span>
          {n < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/** Paragraph that lights up word by word as it travels through the viewport. */
export function ScrubText({ text, className }: { text: string; className?: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const words = React.useMemo(() => text.split(/\s+/), [text]);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = [...el.querySelectorAll<HTMLElement>(".sw")];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const p = reduce ? 1 : (innerHeight * 0.9 - r.top) / (r.height + innerHeight * 0.3);
      const lit = Math.round(Math.max(0, Math.min(1, p)) * spans.length);
      spans.forEach((s, n) => s.classList.toggle("on", n < lit));
    };
    const on = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, [words]);
  return (
    <p ref={ref} className={className}>
      {words.map((w, n) => (
        <React.Fragment key={n}>
          <span className="sw">{w}</span>
          {n < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </p>
  );
}

/** Endless marquee that drifts on its own and speeds up with scroll, following scroll direction. */
export function Marquee({ children, className }: { children: React.ReactNode; className?: string }) {
  const track = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = track.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = 0, speed = 0.5, velocity = 0, dir = 1, lastY = scrollY, raf = 0;
    const onScroll = () => {
      const dy = scrollY - lastY;
      lastY = scrollY;
      if (dy) dir = dy > 0 ? 1 : -1;
      velocity = Math.min(Math.abs(dy), 80);
    };
    const loop = () => {
      const target = (0.5 + velocity * 0.35) * dir;
      speed += (target - speed) * 0.08;
      velocity *= 0.9;
      const half = el.scrollWidth / 2;
      if (half > 0) {
        x = (x - speed) % half;
        if (x > 0) x -= half;
        el.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div className={cn("vh-marquee", className)}>
      <div ref={track} className="vh-marquee__track">
        {children}
        <span className="contents" aria-hidden>
          {children}
        </span>
      </div>
    </div>
  );
}

/** Number that counts up (ease-out quart) the first time it scrolls into view. */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString("uk-UA"), className }: { value?: number; format?: (v: number) => string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState<number | null>(null);
  const started = React.useRef(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || value === undefined) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - t0) / 1600, 1);
        setShown(value * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (el.hasAttribute("data-in")) run();
    el.addEventListener("vh:in", run);
    return () => el.removeEventListener("vh:in", run);
  }, [value]);
  return (
    <span ref={ref} data-count className={cn("tabular-nums", className)}>
      {value === undefined ? "—" : format(shown ?? 0)}
    </span>
  );
}
