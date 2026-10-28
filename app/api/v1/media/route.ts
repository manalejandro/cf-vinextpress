import { requireUser, can } from "@/press/auth";
import { getPress } from "@/press/context";
import { CoreHooks } from "@/press/hooks";
import { listMedia, uploadMedia } from "@/press/models/media";
import { handleRest, json, parsePagination, serializeMedia } from "@/press/rest";
import { HttpError } from "@/press/auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/media — public listing of the media library (metadata only). */
export async function GET(request: Request): Promise<Response> {
  return handleRest(async () => {
    const url = new URL(request.url);
    const { page, perPage } = parsePagination(url, 24, 100);
    const { items, total } = await listMedia({ page, perPage });
    return json(items.map(serializeMedia), { headers: { "x-total": String(total) } });
  });
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

/** POST /api/v1/media — multipart upload (authenticated, `file` field). */
export async function POST(request: Request): Promise<Response> {
  return handleRest(async () => {
    const user = await requireUser("author");
    if (!can(user, "upload_files")) throw new HttpError(403, "You are not allowed to upload files");

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new HttpError(400, "Use multipart/form-data with a 'file' field");
    }
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES) {
      throw new HttpError(413, `Uploads are limited to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Missing 'file' field");
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new HttpError(413, `Uploads are limited to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`);
    }

    const alt = String(form.get("alt") ?? "").slice(0, 500);
    const caption = String(form.get("caption") ?? "").slice(0, 1000);

    const item = await uploadMedia({ name: file.name, type: file.type, arrayBuffer: () => file.arrayBuffer() }, user.id);
    if (alt || caption) {
      const { updateMedia } = await import("@/press/models/media");
      await updateMedia(item.id, { alt, caption });
    }
    const press = await getPress();
    await press.doAction(CoreHooks.MediaUploaded, [item]);

    const { getMediaById } = await import("@/press/models/media");
    const stored = (await getMediaById(item.id))!;
    return json(serializeMedia(stored), { status: 201 });
  });
}
