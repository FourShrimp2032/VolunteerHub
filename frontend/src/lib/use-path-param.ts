"use client";

import { usePathname } from "next/navigation";

/**
 * Dynamic pages are statically exported once as "/<section>/_" and the Worker
 * serves that HTML for every "/<section>/<value>". This hook reads the real value
 * from the browser URL (null while rendering the placeholder at build time).
 */
export function usePathParam(): string | null {
  const pathname = usePathname();
  const fromBrowser = typeof window !== "undefined" ? window.location.pathname : pathname;
  const parts = (fromBrowser || "").split("/").filter(Boolean);
  const value = parts[1] ? decodeURIComponent(parts[1]) : null;
  return value && value !== "_" ? value : null;
}
