/**
 * File uploads.
 *
 * Files are validated by their magic bytes (not by the client-supplied MIME type
 * or extension). Only images (JPEG, PNG, WebP) and PDF documents are accepted.
 *
 * Storage driver: if an R2 bucket is bound as `UPLOADS`, file bodies go to R2
 * (S3-compatible). Otherwise they are stored inline in D1 — fine for an MVP,
 * which is why the limit is kept small.
 */
import type { Env } from "../env";

export const MAX_IMAGE_BYTES = 1_500_000;
export const MAX_DOC_BYTES = 1_800_000;

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffMime(bytes: Uint8Array): SniffedType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "image/webp";
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  return null;
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "file").slice(0, 120);
}

export type ValidatedUpload = { bytes: Uint8Array; mime: SniffedType; name: string; size: number };

export async function validateUpload(file: File, allow: "image" | "document" | "any"): Promise<ValidatedUpload | { error: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return { error: "Підтримуються лише JPG, PNG, WebP та PDF." };
  const isImage = mime.startsWith("image/");
  if (allow === "image" && !isImage) return { error: "Потрібне зображення (JPG, PNG або WebP)." };
  if (allow === "document" && !isImage && mime !== "application/pdf") return { error: "Непідтримуваний формат." };
  const limit = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (bytes.byteLength > limit) return { error: `Файл завеликий. Максимум ${(limit / 1_000_000).toFixed(1)} МБ.` };
  return { bytes, mime, name: sanitizeFilename(file.name), size: bytes.byteLength };
}

export async function putBody(env: Env, key: string, up: ValidatedUpload): Promise<{ data: Uint8Array | null; storageKey: string | null }> {
  if (env.UPLOADS) {
    await env.UPLOADS.put(key, up.bytes, { httpMetadata: { contentType: up.mime } });
    return { data: null, storageKey: key };
  }
  return { data: up.bytes, storageKey: null };
}

export async function getBody(env: Env, row: { data: unknown; storageKey: string | null }): Promise<ArrayBuffer | Uint8Array | null> {
  if (row.storageKey && env.UPLOADS) {
    const obj = await env.UPLOADS.get(row.storageKey);
    return obj ? await obj.arrayBuffer() : null;
  }
  if (row.data instanceof ArrayBuffer) return row.data;
  if (row.data instanceof Uint8Array) return row.data;
  if (Array.isArray(row.data)) return new Uint8Array(row.data as number[]);
  return null;
}
