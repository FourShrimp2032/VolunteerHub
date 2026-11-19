"use client";

import { Check, Copy, Download, ExternalLink, Link2, Send } from "lucide-react";
import * as React from "react";
import { Badge, Button, Card, Progress, Skeleton, buttonVariants } from "@/components/ui/primitives";
import { api, uploadFile } from "@/lib/api";
import { cn } from "@/lib/cn";
import { money, pct } from "@/lib/format";
import { canvasToBlob, loadImage, renderHelperImage } from "@/lib/helper-image";
import { useToast } from "@/lib/toast";
import type { Helper, HelperTemplate } from "@/lib/types";

function Instagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** The helper's photo cropped like in the share image (focal point → object-position). */
export function HelperPhoto({ h, className }: { h: Pick<Helper, "photoUrl" | "photoCrop" | "displayName">; className?: string }) {
  if (!h.photoUrl) return <div className={cn("bg-muted", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={h.photoUrl}
      alt={h.displayName}
      loading="lazy"
      className={cn("object-cover", className)}
      style={{ objectPosition: `${h.photoCrop.x * 100}% ${h.photoCrop.y * 100}%` }}
    />
  );
}

export function HelperCard({ h, campaignSlug }: { h: Helper; campaignSlug: string }) {
  return (
    <Card className="group flex flex-col overflow-hidden">
      <a href={`/campaigns/${campaignSlug}?jar=${h.id}`} className="relative block aspect-[4/5] overflow-hidden bg-muted">
        <HelperPhoto h={h} className="size-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
        {h.goalReached && <Badge tone="success" className="absolute left-3 top-3">Ціль досягнуто</Badge>}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <p className="truncate font-semibold">{h.displayName}</p>
        {h.user && <p className="mono mt-0.5 text-[11px] uppercase tracking-[0.06em] text-fg-subtle">{h.user.level.nameUk}</p>}
        <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold tabular-nums">{money(h.raisedAmount)}</span>
          <span className="text-fg-subtle tabular-nums">з {money(h.goalAmount)}</span>
        </div>
        <Progress value={h.progress} size="sm" tone={h.goalReached ? "success" : "accent"} className="mt-2" />
        <a href={`/api/helpers/${h.id}/donate`} target="_blank" rel="noopener noreferrer nofollow" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 w-full")}>
          Задонатити <ExternalLink />
        </a>
      </div>
    </Card>
  );
}

/** Renders the share image from the template; shows the stored one while it draws. */
export function useShareImage(opts: { template: HelperTemplate | null; helper: Pick<Helper, "photoUrl" | "photoCrop" | "goalAmount"> | null; photo?: HTMLImageElement | null; maxSide?: number }) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
  const { template, helper, photo, maxSide } = opts;
  React.useEffect(() => {
    if (!template || !helper) return;
    let live = true;
    (async () => {
      const img = photo ?? (helper.photoUrl ? await loadImage(helper.photoUrl).catch(() => null) : null);
      const { canvas: c } = await renderHelperImage({ template, photo: img, crop: helper.photoCrop, goal: helper.goalAmount, maxSide: maxSide ?? 1920 });
      if (!live) return;
      setCanvas(c);
      setUrl(c.toDataURL("image/jpeg", 0.9));
    })().catch(() => null);
    return () => {
      live = false;
    };
  }, [template, helper, photo, maxSide]);
  return { url, canvas };
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share step: the generated image, the caption, and buttons for Instagram Stories, Telegram,
 * download and copy. Instagram has no web API for Stories, so on phones we open the system
 * share sheet with the image (Instagram → Stories) and copy the caption and jar link first.
 */
export function HelperShare({ helper, template, share, onImageSaved }: { helper: Helper; template: HelperTemplate; share: { link: string; caption: string }; onImageSaved?: () => void }) {
  const toast = useToast();
  const { url, canvas } = useShareImage({ template, helper });
  const [copied, setCopied] = React.useState<string | null>(null);
  const saving = React.useRef(false);
  const fileName = `volunteerhub-${helper.displayName.toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, "-")}.jpg`;

  // Keep the generated image on the jar so its page and link previews show it.
  React.useEffect(() => {
    if (!canvas || helper.shareImageUrl || saving.current) return;
    saving.current = true;
    (async () => {
      let blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      if (blob.size > 1_400_000) blob = await canvasToBlob(canvas, "image/jpeg", 0.75);
      const up = await uploadFile(blob, "image", { raw: true, name: fileName });
      await api(`/helpers/${helper.id}`, { method: "PATCH", json: { shareFileId: up.id } });
      onImageSaved?.();
    })().catch(() => (saving.current = false));
  }, [canvas, helper.id, helper.shareImageUrl, fileName, onImageSaved]);

  const flash = (k: string) => {
    setCopied(k);
    setTimeout(() => setCopied((c) => (c === k ? null : c)), 1800);
  };

  const imageFile = async () => {
    if (!canvas) throw new Error("Зображення ще готується.");
    return new File([await canvasToBlob(canvas, "image/jpeg", 0.92)], fileName, { type: "image/jpeg" });
  };

  const download = async () => {
    const f = await imageFile();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const track = (channel: string) => api(`/campaigns/${helper.campaignId}/share`, { method: "POST", json: { channel } }).catch(() => null);

  const instagram = async () => {
    try {
      await copy(`${share.caption}`);
      const f = await imageFile();
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f] });
        toast({ kind: "success", title: "Текст і посилання скопійовано", description: "У Stories додайте стікер «Посилання» та вставте посилання на банку." });
      } else {
        await download();
        toast({ kind: "success", title: "Зображення збережено", description: "Відкрийте Instagram на телефоні та додайте його в Stories. Текст уже скопійовано." });
      }
      track("native");
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ kind: "error", title: (e as Error).message });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,300px)_1fr]">
      <div className="self-start overflow-hidden rounded-2xl border border-border bg-subtle shadow-card">
        {url || helper.shareImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url ?? helper.shareImageUrl!} alt="Зображення для поширення" className="block w-full" />
        ) : (
          <Skeleton className="aspect-[9/16] w-full rounded-none" />
        )}
      </div>
      <div className="grid content-start gap-4">
        <Button size="lg" onClick={instagram} disabled={!canvas} className="w-full sm:w-auto">
          <Instagram /> Поділитися в Instagram Stories
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => download().catch((e) => toast({ kind: "error", title: e.message }))} disabled={!canvas}>
            <Download /> Завантажити зображення
          </Button>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(share.link)}&text=${encodeURIComponent(share.caption.replace(share.link, "").trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("telegram")}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Send /> Telegram
          </a>
          <Button variant="secondary" size="sm" onClick={async () => (await copy(share.link)) && (flash("link"), track("copy"))}>
            {copied === "link" ? <Check /> : <Link2 />} Посилання
          </Button>
          <Button variant="secondary" size="sm" onClick={async () => (await copy(helper.jarUrl)) && flash("jar")}>
            {copied === "jar" ? <Check /> : <Link2 />} Посилання на банку
          </Button>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium">Текст допису</p>
            <button type="button" onClick={async () => (await copy(share.caption)) && flash("caption")} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
              {copied === "caption" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied === "caption" ? "Скопійовано" : "Скопіювати"}
            </button>
          </div>
          <p className="whitespace-pre-line rounded-xl border border-border bg-subtle p-3.5 text-sm leading-relaxed text-fg-muted">{share.caption}</p>
        </div>
        <p className="text-xs leading-relaxed text-fg-subtle">
          Порада: у Stories додайте стікер «Посилання» з вашою банкою, щоб донатити можна було одним дотиком. Зібрано {money(helper.raisedAmount)} з {money(helper.goalAmount)} ({pct(helper.progress)}).
        </p>
      </div>
    </div>
  );
}
