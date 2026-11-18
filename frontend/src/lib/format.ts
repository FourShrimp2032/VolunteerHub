const uah = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

export const money = (n: number) => `${uah.format(n)} ₴`;
export const num = (n: number) => uah.format(n);
export const pct = (p: number) => `${Math.round(p * 100)}%`;

export function date(ts: number | null | undefined) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}

export function shortDate(ts: number | null | undefined) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function timeAgo(ts: number | null | undefined) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "щойно";
  if (min < 60) return `${min} хв тому`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} год тому`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ${plural(d, "день", "дні", "днів")} тому`;
  return shortDate(ts);
}

export function daysLeft(deadline: number | null | undefined) {
  if (!deadline) return null;
  return Math.ceil((deadline - Date.now()) / 86_400_000);
}
