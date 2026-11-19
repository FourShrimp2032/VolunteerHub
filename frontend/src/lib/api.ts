/** Tiny typed fetch wrapper for the Volunteerhub API (same origin, cookie session). */
export class ApiError extends Error {
  constructor(public status: number, message: string, public data: Record<string, unknown> | null = null) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string" ? (data as { error: string }).error : null) ?? "Щось пішло не так. Спробуйте ще раз.";
    throw new ApiError(res.status, msg, data && typeof data === "object" ? (data as Record<string, unknown>) : null);
  }
  return data as T;
}

/** `raw`: the file is already prepared (e.g. a PNG template that must keep its transparency). */
export async function uploadFile(file: File | Blob, purpose: "image" | "document" | "verification", opts: { raw?: boolean; name?: string } = {}) {
  const fd = new FormData();
  const asFile = file instanceof File ? file : new File([file], opts.name ?? "image.jpg", { type: file.type });
  const prepared = purpose === "image" && !opts.raw ? await downscaleImage(asFile) : asFile;
  fd.append("file", prepared);
  fd.append("purpose", purpose);
  return api<{ id: string; url: string; name: string; mime: string; size: number }>("/files", { method: "POST", body: fd });
}

/** Resizes large photos in the browser before upload (max 1600px, JPEG). */
async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.84));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
