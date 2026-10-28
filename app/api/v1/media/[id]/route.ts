import { requireUser, can, HttpError } from "@/press/auth";
import { deleteMedia, getMediaById, updateMedia } from "@/press/models/media";
import { handleRest, json, serializeMedia } from "@/press/rest";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(async () => {
    const item = await getMediaById(Number(id));
    if (!item) throw new HttpError(404, "Media not found");
    return json(serializeMedia(item));
  });
}

/** PUT /api/v1/media/{id} — update { alt, caption } (authenticated). */
export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(async () => {
    await requireUser("author");
    const item = await getMediaById(Number(id));
    if (!item) throw new HttpError(404, "Media not found");
    const body = (await request.json().catch(() => null)) as { alt?: string; caption?: string } | null;
    await updateMedia(item.id, {
      alt: body?.alt !== undefined ? String(body.alt).slice(0, 500) : undefined,
      caption: body?.caption !== undefined ? String(body.caption).slice(0, 1000) : undefined,
    });
    const updated = (await getMediaById(item.id))!;
    return json(serializeMedia(updated));
  });
}

export async function DELETE(_request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(async () => {
    const user = await requireUser("author");
    if (!can(user, "upload_files")) throw new HttpError(403, "Insufficient permissions");
    const item = await getMediaById(Number(id));
    if (!item) throw new HttpError(404, "Media not found");
    await deleteMedia(item.id);
    return json({ deleted: true, previous: serializeMedia(item) });
  });
}
