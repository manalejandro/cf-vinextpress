import { env } from "cloudflare:workers";
import { all, db, first, nullableNum, num, str } from "../db/client";
import type { MediaItem } from "../types";
import { nowDb } from "../utils/dates";

/**
 * The media library: file bytes live in the R2 bucket bound as MEDIA,
 * metadata lives in D1. Public URLs are served by the /media route with
 * optional on-the-fly transforms through the Cloudflare Images binding.
 */

function mapMedia(row: Record<string, unknown>): MediaItem {
  return {
    id: num(row, "id"),
    r2Key: str(row, "r2_key"),
    filename: str(row, "filename"),
    mimeType: str(row, "mime_type"),
    size: num(row, "size"),
    width: nullableNum(row, "width"),
    height: nullableNum(row, "height"),
    alt: str(row, "alt"),
    caption: str(row, "caption"),
    uploadedBy: num(row, "uploaded_by"),
    createdAt: str(row, "created_at"),
  };
}

export function mediaUrl(item: Pick<MediaItem, "r2Key">): string {
  return `/media/${item.r2Key}`;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/plain": "txt",
};

function safeExt(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (fromName && fromName.length <= 5) return fromName;
  return EXT_BY_MIME[mime] ?? "bin";
}

async function probeDimensions(key: string, mime: string): Promise<{ width: number | null; height: number | null }> {
  if (!mime.startsWith("image/") || mime === "image/svg+xml") return { width: null, height: null };
  try {
    const images = (env as unknown as { IMAGES?: ImagesBinding }).IMAGES;
    const stored = await env.MEDIA.get(key);
    if (!images || !stored) return { width: null, height: null };
    const info = await images.info(stored.body);
    if ("width" in info) {
      return { width: info.width, height: info.height };
    }
    return { width: null, height: null };
  } catch {
    return { width: null, height: null };
  }
}

export async function uploadMedia(
  file: { name: string; type: string; arrayBuffer(): Promise<ArrayBuffer> },
  uploadedBy: number,
): Promise<MediaItem> {
  if (file.name.length === 0) throw new Error("Missing file name");
  const now = new Date();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${rand}.${safeExt(file.name, file.type)}`;
  const body = await file.arrayBuffer();
  await env.MEDIA.put(key, body, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { originalName: file.name },
  });
  const { width, height } = await probeDimensions(key, file.type);
  const result = await db()
    .prepare(
      `INSERT INTO vp_media (r2_key, filename, mime_type, size, width, height, uploaded_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(key, file.name.slice(0, 240), file.type || "application/octet-stream", body.byteLength, width, height, uploadedBy, nowDb())
    .run();
  return (await getMediaById(Number(result.meta.last_row_id)))!;
}

export async function getMediaById(id: number): Promise<MediaItem | null> {
  return first(db().prepare("SELECT * FROM vp_media WHERE id = ?1").bind(id), mapMedia);
}

export async function getMediaByKey(key: string): Promise<MediaItem | null> {
  return first(db().prepare("SELECT * FROM vp_media WHERE r2_key = ?1").bind(key), mapMedia);
}

export async function listMedia(options: { page?: number; perPage?: number } = {}): Promise<{ items: MediaItem[]; total: number }> {
  const perPage = options.perPage ?? 24;
  const page = Math.max(1, options.page ?? 1);
  const countRow = await db().prepare("SELECT COUNT(*) AS n FROM vp_media").first();
  const items = await all(
    db()
      .prepare("SELECT * FROM vp_media ORDER BY created_at DESC, id DESC LIMIT ?1 OFFSET ?2")
      .bind(perPage, (page - 1) * perPage),
    mapMedia,
  );
  return { items, total: num((countRow ?? {}) as Record<string, unknown>, "n") };
}

export async function updateMedia(id: number, patch: { alt?: string; caption?: string }): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (patch.alt !== undefined) {
    params.push(patch.alt);
    fields.push(`alt = ?${params.length}`);
  }
  if (patch.caption !== undefined) {
    params.push(patch.caption);
    fields.push(`caption = ?${params.length}`);
  }
  if (!fields.length) return;
  params.push(id);
  await db()
    .prepare(`UPDATE vp_media SET ${fields.join(", ")} WHERE id = ?${params.length}`)
    .bind(...(params as never[]))
    .run();
}

export async function deleteMedia(id: number): Promise<void> {
  const item = await getMediaById(id);
  if (!item) return;
  await env.MEDIA.delete(item.r2Key);
  await db().prepare("DELETE FROM vp_media WHERE id = ?1").bind(id).run();
}
