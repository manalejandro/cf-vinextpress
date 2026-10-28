import { can, requireUser, HttpError } from "@/press/auth";
import { getPress } from "@/press/context";
import { deleteComment, getCommentById, setCommentStatus } from "@/press/models/comments";
import { getPostById } from "@/press/models/posts";
import { handleRest, json, serializeComment } from "@/press/rest";
import { revalidatePage } from "@/press/cache";
import type { CommentStatus } from "@/press/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: CommentStatus[] = ["approved", "pending", "spam", "trash"];

export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(async () => {
    const comment = await getCommentById(Number(id));
    if (!comment) throw new HttpError(404, "Comment not found");
    if (comment.status !== "approved") {
      const user = await requireUser("editor");
      if (!can(user, "moderate_comments")) throw new HttpError(403, "Insufficient permissions");
    }
    return json(serializeComment(comment));
  });
}

/** PUT /api/v1/comments/{id} — moderators set { status }. */
export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(async () => {
    const user = await requireUser("editor");
    if (!can(user, "moderate_comments")) throw new HttpError(403, "Insufficient permissions");
    const comment = await getCommentById(Number(id));
    if (!comment) throw new HttpError(404, "Comment not found");

    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    const status = body?.status as CommentStatus | undefined;
    if (!status || !STATUSES.includes(status)) {
      throw new HttpError(400, `Field 'status' must be one of: ${STATUSES.join(", ")}`);
    }

    await setCommentStatus(comment.id, status);
    await revalidateCommentPost(comment.postId);
    const updated = await getCommentById(comment.id);
    return json(serializeComment(updated!));
  });
}

export async function DELETE(_request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(async () => {
    const user = await requireUser("editor");
    if (!can(user, "moderate_comments")) throw new HttpError(403, "Insufficient permissions");
    const comment = await getCommentById(Number(id));
    if (!comment) throw new HttpError(404, "Comment not found");
    await deleteComment(comment.id);
    await revalidateCommentPost(comment.postId);
    return json({ deleted: true, previous: serializeComment(comment) });
  });
}

async function revalidateCommentPost(postId: number): Promise<void> {
  const press = await getPress();
  const post = await getPostById(postId);
  if (post) revalidatePage(await press.permalink(post));
}
