"use client";

/**
 * The organization's helping-jar template: upload a stock image, then drag the photo slot and
 * «МОЯ ЦІЛЬ» into place and match the font and colour. Every helper's image is drawn from this.
 */
import { ImagePlus, Move, Pipette, RotateCcw, Trash2 } from "lucide-react";
import * as React from "react";
import { Alert, Button, Card, Field, Input, Segmented, Select, Textarea } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { DEFAULT_CAPTION, DEFAULT_CONFIG, hasTransparency, loadImage, prepareTemplateFile, renderHelperImage, TEMPLATE_FONTS, type Layout } from "@/lib/helper-image";
import { useToast } from "@/lib/toast";
import type { TemplateConfig } from "@/lib/types";

type Props = {
  campaignId: string;
  title: string;
  orgName: string;
  totalGoal: number;
  initial: { url: string | null; fileId: string | null; config: TemplateConfig | null; captionTemplate: string; helpersInTotal: boolean };
  onSaved?: () => void;
  /** Wizard mode: compact copy, save button label. */
  compact?: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function TemplateEditor({ campaignId, title, orgName, totalGoal, initial, onSaved, compact }: Props) {
  const toast = useToast();
  const [fileId, setFileId] = React.useState(initial.fileId);
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const [cfg, setCfg] = React.useState<TemplateConfig>(initial.config ?? DEFAULT_CONFIG);
  const [caption, setCaption] = React.useState(initial.captionTemplate);
  const [inTotal, setInTotal] = React.useState(initial.helpersInTotal);
  const [sample, setSample] = React.useState(3500);
  const [layout, setLayout] = React.useState<Layout | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initial.url) loadImage(initial.url).then(setImg).catch(() => setImg(null));
  }, [initial.url]);

  const template = React.useMemo(() => ({ url: null, config: null, captionTemplate: caption, title, orgName, totalGoal }), [caption, title, orgName, totalGoal]);

  React.useEffect(() => {
    let live = true;
    const c = canvasRef.current;
    if (!c) return;
    renderHelperImage({ template, templateImage: img, config: cfg, photo: null, goal: sample, maxSide: 1080 }, c)
      .then((r) => live && setLayout(r.layout))
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [img, cfg, sample, template]);

  const set = (fn: (c: TemplateConfig) => TemplateConfig) => {
    setCfg(fn);
    setDirty(true);
  };
  const setGoal = (p: Partial<TemplateConfig["goal"]>) => set((c) => ({ ...c, goal: { ...c.goal, ...p } }));
  const setPhoto = (p: Partial<TemplateConfig["photo"]>) => set((c) => ({ ...c, photo: { ...c.photo, ...p } }));

  /** Pointer drag on the preview, in fractions of the image. */
  const drag = (e: React.PointerEvent, onMove: (dx: number, dy: number) => void) => {
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    const box = boxRef.current!.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => onMove((ev.clientX - sx) / box.width, (ev.clientY - sy) / box.height);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startPhotoMove = (e: React.PointerEvent) => {
    const s = cfg.photo;
    drag(e, (dx, dy) => setPhoto({ x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) }));
  };
  const startPhotoResize = (e: React.PointerEvent) => {
    const s = cfg.photo;
    drag(e, (dx, dy) => setPhoto({ w: clamp(s.w + dx, 0.05, 1 - s.x), h: clamp(s.h + dy, 0.05, 1 - s.y) }));
  };
  const startGoalMove = (e: React.PointerEvent) => {
    const s = cfg.goal;
    drag(e, (dx, dy) => setGoal({ x: clamp(s.x + dx, 0, 1), y: clamp(s.y + dy, 0, 0.98) }));
  };

  const pickColor = (e: React.MouseEvent) => {
    if (!picking || !canvasRef.current) return;
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * c.width);
    const y = Math.round(((e.clientY - r.top) / r.height) * c.height);
    const [R, G, B] = c.getContext("2d")!.getImageData(x, y, 1, 1).data;
    setGoal({ color: `#${[R, G, B].map((v) => v.toString(16).padStart(2, "0")).join("")}` });
    setPicking(false);
  };

  const onFile = async (f: File) => {
    setUploading(true);
    try {
      const prepared = await prepareTemplateFile(f);
      const up = await uploadFile(prepared, "image", { raw: true });
      const loaded = await loadImage(up.url);
      setImg(loaded);
      setFileId(up.id);
      // A frame with a transparent window: the photo goes underneath it.
      if (hasTransparency(loaded)) setPhoto({ layer: "under", radius: 0 });
      setDirty(true);
    } catch (er) {
      toast({ kind: "error", title: (er as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api(`/campaigns/${campaignId}/template`, { method: "PUT", json: { fileId, config: fileId ? cfg : null, captionTemplate: caption, helpersInTotal: inTotal } });
      toast({ kind: "success", title: "Шаблон збережено", description: "Нові допоміжні банки отримають зображення в цьому стилі." });
      setDirty(false);
      onSaved?.();
    } catch (er) {
      toast({ kind: "error", title: (er as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const pctBox = (r: { x: number; y: number; w: number; h: number }) =>
    layout ? { left: `${(r.x / layout.width) * 100}%`, top: `${(r.y / layout.height) * 100}%`, width: `${(r.w / layout.width) * 100}%`, height: `${(r.h / layout.height) * 100}%` } : undefined;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Шаблон для допоміжних банок</p>
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          {compact
            ? "Завантажте стокове зображення збору. Ми накладемо на нього фото кожного помічника та «Моя ціль», тож усі дописи виглядатимуть однаково."
            : "Завантажте стокове зображення збору й позначте, де буде фото помічника та «Моя ціль». Кожен помічник отримає готове зображення в цьому стилі: змінюються лише фото й сума."}
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div>
          <div
            ref={boxRef}
            className={`relative w-full overflow-hidden rounded-xl border border-border bg-subtle select-none ${picking ? "cursor-crosshair" : ""}`}
            style={{ aspectRatio: layout ? `${layout.width} / ${layout.height}` : "9 / 16" }}
            onClick={pickColor}
          >
            <canvas ref={canvasRef} className="absolute inset-0 size-full" />
            {img && layout && !picking && (
              <>
                <div
                  className="absolute cursor-move border-2 border-dashed border-accent bg-accent/5 touch-none"
                  style={pctBox(layout.photo)}
                  onPointerDown={startPhotoMove}
                  role="presentation"
                >
                  <span className="mono absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-fg">ФОТО</span>
                  <span
                    className="absolute -bottom-2 -right-2 size-5 cursor-nwse-resize rounded-full border-2 border-surface bg-accent touch-none"
                    onPointerDown={startPhotoResize}
                    aria-label="Змінити розмір фото"
                    role="presentation"
                  />
                </div>
                <div className="absolute cursor-move rounded border-2 border-dashed border-ink/70 touch-none" style={pctBox(layout.goal)} onPointerDown={startGoalMove} role="presentation">
                  <Move className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-ink p-1 text-bg" aria-hidden />
                </div>
              </>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
            {img
              ? picking
                ? "Натисніть на потрібний колір на зображенні."
                : "Перетягніть рамку фото й текст. Кружечок у кутку змінює розмір фото."
              : "Зараз показано стандартний макет Volunteerhub. Завантажте своє зображення, щоб дописи були у стилі вашого збору."}
          </p>
        </div>

        <div className="grid content-start gap-5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <ImagePlus /> {img ? "Замінити зображення" : "Завантажити стокове зображення"}
            </Button>
            {img && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImg(null);
                  setFileId(null);
                  setCfg(DEFAULT_CONFIG);
                  setDirty(true);
                }}
              >
                <Trash2 /> Прибрати
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onFile(f);
              }}
            />
          </div>
          <p className="-mt-3 text-xs text-fg-subtle">Найкраще 1080×1920 (Stories) або 1080×1350. PNG з прозорим «вікном» теж підходить: фото стане під рамку.</p>

          {img && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Фото">
                  <Segmented
                    value={cfg.photo.layer}
                    onChange={(v) => setPhoto({ layer: v })}
                    options={[
                      { value: "over", label: "Поверх шаблону" },
                      { value: "under", label: "Під шаблоном" },
                    ]}
                  />
                </Field>
                <Field label="Заокруглення кутів">
                  <input type="range" min={0} max={0.5} step={0.01} value={cfg.photo.radius} onChange={(e) => setPhoto({ radius: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" aria-label="Заокруглення кутів" />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Шрифт «Моя ціль»">
                  <Select value={cfg.goal.font} onChange={(e) => setGoal({ font: e.target.value })}>
                    {TEMPLATE_FONTS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Насиченість">
                  <Select value={cfg.goal.weight} onChange={(e) => setGoal({ weight: Number(e.target.value) as TemplateConfig["goal"]["weight"] })}>
                    {[400, 500, 600, 700, 800, 900].map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Колір">
                  <div className="flex gap-2">
                    <input type="color" value={cfg.goal.color} onChange={(e) => setGoal({ color: e.target.value })} className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-surface p-1" aria-label="Колір тексту" />
                    <Button type="button" variant={picking ? "primary" : "secondary"} size="sm" className="h-11" onClick={() => setPicking((p) => !p)}>
                      <Pipette /> З зображення
                    </Button>
                  </div>
                </Field>
                <Field label="Розмір">
                  <input type="range" min={0.02} max={0.16} step={0.002} value={cfg.goal.size} onChange={(e) => setGoal({ size: Number(e.target.value) })} className="mt-3 w-full accent-[var(--color-accent)]" aria-label="Розмір тексту" />
                </Field>
              </div>

              <div className="flex flex-wrap gap-3">
                <Segmented
                  value={cfg.goal.layout}
                  onChange={(v) => setGoal({ layout: v })}
                  options={[
                    { value: "stacked", label: "Двома рядками" },
                    { value: "inline", label: "В один рядок" },
                  ]}
                />
                <Segmented
                  value={cfg.goal.align}
                  onChange={(v) => setGoal({ align: v })}
                  options={[
                    { value: "left", label: "Ліворуч" },
                    { value: "center", label: "Центр" },
                    { value: "right", label: "Праворуч" },
                  ]}
                />
                <Segmented
                  value={cfg.goal.uppercase ? "up" : "normal"}
                  onChange={(v) => setGoal({ uppercase: v === "up" })}
                  options={[
                    { value: "up", label: "МОЯ ЦІЛЬ" },
                    { value: "normal", label: "Моя ціль" },
                  ]}
                />
                <Select value={cfg.goal.currency} onChange={(e) => setGoal({ currency: e.target.value as TemplateConfig["goal"]["currency"] })} className="h-10 w-28" aria-label="Валюта">
                  <option value="ГРН">ГРН</option>
                  <option value="грн">грн</option>
                  <option value="₴">₴</option>
                  <option value="">без валюти</option>
                </Select>
              </div>
            </>
          )}

          <Field label="Сума для перевірки" hint="лише для попереднього перегляду">
            <div className="flex flex-wrap gap-2">
              {[1000, 3500, 25_000, 150_000].map((n) => (
                <button key={n} type="button" onClick={() => setSample(n)} className={`rounded-full border px-3 py-1.5 text-[13px] ${sample === n ? "border-ink bg-ink text-bg" : "border-border text-fg-muted hover:text-fg"}`}>
                  {n.toLocaleString("uk-UA")}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Текст допису" hint="{goal} {total} {title} {org} {jar} {link} {name}">
            <Textarea value={caption} onChange={(e) => (setCaption(e.target.value), setDirty(true))} placeholder={DEFAULT_CAPTION} className="min-h-28 text-sm" />
            {caption && (
              <button type="button" onClick={() => (setCaption(""), setDirty(true))} className="mt-1.5 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
                <RotateCcw className="size-3" /> Стандартний текст
              </button>
            )}
          </Field>

          <label className="flex items-start gap-3 rounded-xl border border-border p-3.5 text-sm">
            <input type="checkbox" checked={!inTotal} onChange={(e) => (setInTotal(!e.target.checked), setDirty(true))} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
            <span>
              <span className="font-medium">Помічники переказують кошти на банку організації</span>
              <span className="mt-0.5 block text-fg-muted">
                Тоді суми допоміжних банок показуються окремо й не додаються до загальної, щоб не рахувати ті самі гроші двічі.
              </span>
            </span>
          </label>

          {!fileId && img === null && initial.fileId && <Alert tone="warning">Шаблон буде прибрано після збереження.</Alert>}
          <div>
            <Button type="button" onClick={save} loading={busy} disabled={!dirty}>
              Зберегти шаблон
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
