/**
 * Draws a helping jar's share image in the browser: the organization's stock image with the
 * helper's photo in its slot and «МОЯ ЦІЛЬ: N ГРН» in the organization's font and colour.
 * Every helper of a fundraiser gets the same layout; only the photo and the number change.
 * No AI and no server: the result is exact, instant, and photos never leave Volunteerhub.
 */
import type { HelperTemplate, PhotoCrop, TemplateConfig } from "./types";

/** Keep in sync with backend/src/lib/helpers.ts (all have Cyrillic on Google Fonts). */
export const TEMPLATE_FONTS = [
  "Unbounded",
  "Montserrat",
  "Rubik",
  "Manrope",
  "Oswald",
  "Golos Text",
  "Russo One",
  "Exo 2",
  "Roboto Condensed",
  "Playfair Display",
  "Comfortaa",
  "Days One",
] as const;

/** Single-weight families on Google Fonts. */
const FIXED_WEIGHT = new Set(["Russo One", "Days One"]);

/** Starting point for the organizer's editor and for fundraisers without a template. */
export const DEFAULT_CONFIG: TemplateConfig = {
  photo: { x: 0.074, y: 0.315, w: 0.852, h: 0.45, radius: 0.04, layer: "over" },
  goal: { x: 0.074, y: 0.79, align: "left", size: 0.062, font: "Unbounded", weight: 800, color: "#0e0e0f", layout: "stacked", uppercase: true, currency: "ГРН" },
};

export const STORY = { w: 1080, h: 1920 };
export const CROP_DEFAULT: PhotoCrop = { x: 0.5, y: 0.5, zoom: 1 };

const loadedFamilies = new Set<string>();

/** Loads a Google Font so canvas can draw with it (canvas never triggers font downloads itself). */
export async function loadFont(family: string, weight: number) {
  if (typeof document === "undefined") return;
  if (!loadedFamilies.has(family)) {
    loadedFamilies.add(family);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    const axis = FIXED_WEIGHT.has(family) ? "" : ":wght@400;500;600;700;800;900";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}${axis}&display=block`;
    document.head.appendChild(link);
    await new Promise((r) => {
      link.onload = r;
      link.onerror = r;
    });
  }
  const w = FIXED_WEIGHT.has(family) ? 400 : weight;
  try {
    await document.fonts.load(`${w} 64px "${family}"`, "МОЯ ЦІЛЬ: 0123456789 ГРН");
  } catch {
    /* falls back to a system font */
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не вдалося завантажити зображення."));
    img.src = src;
  });
}

export function formatGoal(n: number) {
  return Math.round(n).toLocaleString("uk-UA").replace(/\s/g, " ");
}

export function goalLines(goal: number, g: TemplateConfig["goal"]) {
  const label = g.uppercase ? "МОЯ ЦІЛЬ" : "Моя ціль";
  const value = `${formatGoal(goal)}${g.currency ? ` ${g.currency}` : ""}`;
  return { label, value };
}

type Rect = { x: number; y: number; w: number; h: number };
export type Layout = { width: number; height: number; photo: Rect; goal: Rect };

function roundedRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

/** Covers the slot with the photo; crop.x/y is the photo point kept in the centre, zoom ≥ 1. */
function drawPhoto(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, slot: Rect, crop: PhotoCrop, radius: number) {
  const scale = Math.max(slot.w / img.width, slot.h / img.height) * Math.max(1, crop.zoom);
  const dw = img.width * scale;
  const dh = img.height * scale;
  let dx = slot.x + slot.w / 2 - crop.x * dw;
  let dy = slot.y + slot.h / 2 - crop.y * dh;
  dx = Math.min(slot.x, Math.max(slot.x + slot.w - dw, dx));
  dy = Math.min(slot.y, Math.max(slot.y + slot.h - dh, dy));
  ctx.save();
  roundedRect(ctx, slot, radius);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, slot: Rect, radius: number) {
  ctx.save();
  roundedRect(ctx, slot, radius);
  ctx.clip();
  ctx.fillStyle = "#d9d6ce";
  ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
  // simple person silhouette
  const cx = slot.x + slot.w / 2;
  const s = Math.min(slot.w, slot.h);
  ctx.fillStyle = "#bdb9ae";
  ctx.beginPath();
  ctx.arc(cx, slot.y + slot.h * 0.42, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, slot.y + slot.h * 0.42 + s * 0.5, s * 0.34, s * 0.3, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

/** Draws «МОЯ ЦІЛЬ» + the number, shrinking it if a long number would run off the image. */
function drawGoal(ctx: CanvasRenderingContext2D, W: number, H: number, goal: number, g: TemplateConfig["goal"], avoid?: Rect): Rect {
  const { label, value } = goalLines(goal, g);
  const weight = FIXED_WEIGHT.has(g.font) ? 400 : g.weight;
  const family = `"${g.font}", "Inter Tight", system-ui, sans-serif`;
  const ax = g.x * W;
  let room = Math.max(40, (g.align === "left" ? W - ax : g.align === "right" ? ax : 2 * Math.min(ax, W - ax)) - W * 0.03);
  let size = g.size * W;
  const lines = g.layout === "inline" ? [{ text: `${label}: ${value}`, k: 1 }] : [{ text: label, k: 1 }, { text: value, k: 1.85 }];
  // Don't run into the photo: if the slot sits beside the text, the text must end before it.
  if (avoid) {
    const top = g.y * H;
    const bottom = top + size * lines.reduce((s, l) => s + l.k * 1.04, 0);
    const gap = W * 0.015;
    if (bottom > avoid.y && top < avoid.y + avoid.h) {
      if (g.align === "left" && avoid.x > ax) room = Math.min(room, avoid.x - ax - gap);
      if (g.align === "right" && avoid.x + avoid.w < ax) room = Math.min(room, ax - avoid.x - avoid.w - gap);
    }
    room = Math.max(40, room);
  }
  ctx.textBaseline = "top";
  ctx.textAlign = g.align;
  const widest = () => Math.max(...lines.map((l) => ((ctx.font = `${weight} ${size * l.k}px ${family}`), ctx.measureText(l.text).width)));
  for (let i = 0; i < 30 && widest() > room; i++) size *= 0.94;
  ctx.fillStyle = g.color;
  let y = g.y * H;
  let maxW = 0;
  for (const l of lines) {
    ctx.font = `${weight} ${size * l.k}px ${family}`;
    ctx.fillText(l.text, ax, y);
    maxW = Math.max(maxW, ctx.measureText(l.text).width);
    y += size * l.k * 1.04;
  }
  const left = g.align === "left" ? ax : g.align === "right" ? ax - maxW : ax - maxW / 2;
  return { x: left, y: g.y * H, w: maxW, h: y - g.y * H };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

/** Built-in Story template in Volunteerhub's style, used until the organization uploads its own. */
function drawDefaultBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: HelperTemplate) {
  ctx.fillStyle = "#f4f3ef";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c93810";
  ctx.fillRect(0, 0, W, H * 0.012);
  const m = W * 0.074;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#c93810";
  ctx.font = `600 ${W * 0.026}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillText("ДОПОМІЖНА БАНКА", m, H * 0.05);
  ctx.fillStyle = "#0e0e0f";
  ctx.font = `800 ${W * 0.066}px "Unbounded", "Inter Tight", system-ui, sans-serif`;
  const lines = wrap(ctx, t.title.toUpperCase(), W - 2 * m, 3);
  lines.forEach((l, i) => ctx.fillText(l, m, H * 0.08 + i * W * 0.078));
  const after = H * 0.08 + lines.length * W * 0.078 + W * 0.02;
  ctx.fillStyle = "#5f5e59";
  ctx.font = `500 ${W * 0.032}px "Inter Tight", system-ui, sans-serif`;
  if (t.orgName) ctx.fillText(t.orgName, m, after);
  ctx.fillStyle = "#0e0e0f";
  ctx.font = `700 ${W * 0.032}px "Inter Tight", system-ui, sans-serif`;
  if (t.totalGoal) ctx.fillText(`ЗАГАЛЬНА ЦІЛЬ: ${formatGoal(t.totalGoal)} ГРН`, m, after + W * 0.05);
  ctx.fillStyle = "#5f5e59";
  ctx.font = `600 ${W * 0.03}px "Inter Tight", system-ui, sans-serif`;
  ctx.fillText("КОЖНА ГРИВНЯ ВАЖЛИВА!", m, H * 0.935);
  ctx.textAlign = "right";
  ctx.fillStyle = "#75746e";
  ctx.font = `500 ${W * 0.026}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillText("volunteerhub", W - m, H * 0.937);
}

export type RenderInput = {
  template: HelperTemplate;
  /** Overrides template.config (the organizer's editor previews unsaved changes). */
  config?: TemplateConfig | null;
  /** Overrides template.url. */
  templateImage?: HTMLImageElement | null;
  photo: (CanvasImageSource & { width: number; height: number }) | null;
  crop?: PhotoCrop;
  goal: number;
  /** Longest side of the output, px. */
  maxSide?: number;
};

/** Renders into `canvas` (created if omitted) and returns the layout boxes for editor handles. */
export async function renderHelperImage(input: RenderInput, canvas: HTMLCanvasElement = document.createElement("canvas")) {
  const custom = input.templateImage ?? (input.template.url ? await loadImage(input.template.url) : null);
  const cfg = (custom ? (input.config ?? input.template.config) : null) ?? DEFAULT_CONFIG;
  const natural = custom ? { w: custom.naturalWidth, h: custom.naturalHeight } : STORY;
  const scale = Math.min(1, (input.maxSide ?? 1920) / Math.max(natural.w, natural.h));
  const W = Math.round(natural.w * scale);
  const H = Math.round(natural.h * scale);
  canvas.width = W;
  canvas.height = H;
  await Promise.all([loadFont(cfg.goal.font, cfg.goal.weight), custom ? null : loadFont("Unbounded", 800)]);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  const slot = { x: cfg.photo.x * W, y: cfg.photo.y * H, w: cfg.photo.w * W, h: cfg.photo.h * H };
  const radius = cfg.photo.radius * Math.min(slot.w, slot.h);
  const photo = () => (input.photo ? drawPhoto(ctx, input.photo, slot, input.crop ?? CROP_DEFAULT, radius) : drawPlaceholder(ctx, slot, radius));
  const background = () => (custom ? ctx.drawImage(custom, 0, 0, W, H) : drawDefaultBackground(ctx, W, H, input.template));
  if (cfg.photo.layer === "under") {
    photo();
    background();
  } else {
    background();
    photo();
  }
  const goal = drawGoal(ctx, W, H, input.goal, cfg.goal, slot);
  return { canvas, layout: { width: W, height: H, photo: slot, goal } satisfies Layout };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Не вдалося створити зображення."))), type, quality));
}

/** True if the image has transparent pixels (then it must stay PNG, e.g. a frame with a window). */
export function hasTransparency(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  const s = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

/** Shrinks a template to fit the 1.5 MB upload limit, keeping PNG when it has transparency. */
export async function prepareTemplateFile(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const png = hasTransparency(img);
    let side = Math.min(1920, Math.max(img.naturalWidth, img.naturalHeight));
    for (let i = 0; i < 6; i++) {
      const s = side / Math.max(img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const blob = await canvasToBlob(c, png ? "image/png" : "image/jpeg", 0.9);
      if (blob.size <= 1_400_000) return new File([blob], file.name.replace(/\.\w+$/, "") + (png ? ".png" : ".jpg"), { type: blob.type });
      side *= 0.82;
    }
    throw new Error("Зображення завелике. Спробуйте файл до 1,5 МБ.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Mirrors backend renderCaption (lib/helpers.ts). */
export const DEFAULT_CAPTION =
  "Я відкрив(ла) допоміжну банку для збору «{title}» від {org}. Моя ціль: {goal} ₴, загальна ціль збору: {total} ₴.\n\nКожна гривня важлива! Задонатити: {jar}\nПро збір: {link}";
