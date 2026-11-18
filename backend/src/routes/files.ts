import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db/client";
import { files } from "../db/schema";
import type { AppEnv } from "../env";
import { rateLimit, requireUser } from "../lib/auth";
import { DAY } from "../lib/constants";
import { getBody, putBody, validateUpload } from "../lib/storage";
import { newId } from "../lib/util";

export const fileRoutes = new Hono<AppEnv>()
  /**
   * multipart/form-data: file, purpose = image | document | verification.
   * "verification" files are private: only the owner and admins can read them.
   */
  .post("/", async (c) => {
    const user = requireUser(c);
    const db = getDb(c.env.DB);
    if (!(await rateLimit(db, `upload:${user.id}`, 60, DAY))) return c.json({ error: "Перевищено ліміт завантажень на добу." }, 429);
    const form = await c.req.parseBody();
    const file = form["file"];
    const purpose = String(form["purpose"] ?? "image");
    if (!(file instanceof File)) return c.json({ error: "Файл не отримано." }, 400);
    const v = await validateUpload(file, purpose === "image" ? "image" : "document");
    if ("error" in v) return c.json({ error: v.error }, 400);
    const id = newId("f_");
    const visibility = purpose === "verification" ? "private" : "public";
    const stored = await putBody(c.env, `${visibility}/${user.id}/${id}`, v);
    await db.insert(files).values({ id, ownerId: user.id, name: v.name, mime: v.mime, size: v.size, visibility, data: stored.data as never, storageKey: stored.storageKey, createdAt: Date.now() });
    return c.json({ id, url: `/api/files/${id}`, name: v.name, mime: v.mime, size: v.size }, 201);
  })
  .get("/:id", async (c) => {
    const db = getDb(c.env.DB);
    const [row] = await db.select().from(files).where(eq(files.id, c.req.param("id"))).limit(1);
    if (!row) return c.json({ error: "Файл не знайдено." }, 404);
    if (row.visibility === "private") {
      const u = c.get("user");
      if (!u || (u.id !== row.ownerId && u.role !== "admin")) return c.json({ error: "Файл не знайдено." }, 404);
    }
    const data = await getBody(c.env, row);
    if (!data) return c.json({ error: "Файл не знайдено." }, 404);
    const isPdf = row.mime === "application/pdf";
    return new Response(data, {
      headers: {
        "Content-Type": row.mime,
        "Content-Length": String(row.size),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        "Content-Disposition": `${isPdf ? "inline" : "inline"}; filename*=UTF-8''${encodeURIComponent(row.name)}`,
        "Cache-Control": row.visibility === "private" ? "private, no-store" : "public, max-age=86400, immutable",
      },
    });
  });
