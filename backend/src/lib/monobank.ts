/**
 * Monobank Jar ("Банка") link handling.
 *
 * Monobank does not offer an official, approved public API for reading a jar's
 * balance, so Volunteerhub only stores and validates the official jar link and
 * redirects donors to it. Progress is reported by organizers and labelled as such.
 *
 * Official jar links look like: https://send.monobank.ua/jar/2ABCdEfGhJ
 */
const JAR_ID_RE = /^[A-Za-z0-9]{6,16}$/;

export type JarParseResult = { ok: true; url: string; jarId: string } | { ok: false; error: string };

export function parseJarUrl(input: string): JarParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Вставте посилання на банку." };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "Це не схоже на посилання." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "Посилання має починатися з https://" };
  if (url.hostname.toLowerCase() !== "send.monobank.ua") {
    return { ok: false, error: "Підтримуються лише офіційні посилання send.monobank.ua/jar/…" };
  }
  if (url.username || url.password || (url.port && url.port !== "443")) return { ok: false, error: "Некоректне посилання." };
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "jar" || !JAR_ID_RE.test(parts[1])) {
    return { ok: false, error: "Посилання має виглядати як https://send.monobank.ua/jar/XXXXXXXXXX" };
  }
  const jarId = parts[1];
  return { ok: true, jarId, url: `https://send.monobank.ua/jar/${jarId}` };
}
