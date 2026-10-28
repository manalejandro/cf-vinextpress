import { can, getCurrentUser, HttpError } from "@/press/auth";
import { getPress } from "@/press/context";
import { CoreHooks } from "@/press/hooks";
import { insertComment, listComments, type NewCommentInput } from "@/press/models/comments";
import { getPostById } from "@/press/models/posts";
import { handleRest, json, parsePagination, serializeComment } from "@/press/rest";
import { revalidatePage } from "@/press/cache";
import type { CommentStatus } from "@/press/types";

export const dynamic = "force-dynamic";

const STATUSES: CommentStatus[] = ["approved", "pending", "spam", "trash"];

/** GET /api/v1/comments — public sees approved only; moderators see everything. */
export async function GET(request: Request): Promise<Response> {
  return handleRest(async () => {
    const url = new URL(request.url);
    const user = await getCurrentUser();
    const moderator = user !== null && can(user, "moderate_comments");
    const { page, perPage } = parsePagination(url, 20, 100);

    const statusParam = url.searchParams.get("status");
    const status = moderator && statusParam && STATUSES.includes(statusParam as CommentStatus)
      ? (statusParam as CommentStatus)
      : moderator && statusParam === "all"
        ? "all"
        : "approved";
    const postId = Number(url.searchParams.get("post") ?? 0) || undefined;

    const { comments, total } = await listComments({ postId, status, page, perPage });
    return json(comments.map(serializeComment), { headers: { "x-total": String(total) } });
  });
}

/** POST /api/v1/comments — public submission, moderated like the themed form. */
export async function POST(request: Request): Promise<Response> {
  return handleRest(async () => {
    const press = await getPress();
    if (!press.settings.installed) throw new HttpError(404, "Site not installed");

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "Body must be valid JSON");
    }

    const postId = Number(body.post ?? body.post_id ?? 0);
    const content = String(body.content ?? "").trim();
    if (!Number.isInteger(postId) || postId <= 0) throw new HttpError(400, "Field 'post' (id) is required");
    if (!content) throw new HttpError(400, "Field 'content' is required");

    const post = await getPostById(postId);
    if (!post || post.status !== "publish") throw new HttpError(404, "Post not found");
    if (post.commentStatus !== "open") throw new HttpError(403, "Comments are closed for this entry");

    const user = await getCurrentUser();
    const authorName = String(body.author_name ?? body.author ?? "").trim().slice(0, 120);
    const authorEmail = String(body.author_email ?? body.email ?? "").trim().slice(0, 190);
    const authorUrl = String(body.author_url ?? body.url ?? "").trim().slice(0, 300);

    if (!user && press.settings.requireNameEmail) {
      if (!authorName) throw new HttpError(400, "author_name is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) throw new HttpError(400, "a valid author_email is required");
    }

    const draft: NewCommentInput = {
      postId,
      parentId: Number(body.parent ?? 0) || null,
      authorName: user?.displayName ?? (authorName || "Anonymous"),
      authorEmail: user?.email ?? authorEmail,
      authorUrl,
      content: content.slice(0, 10_000),
      status: press.settings.commentModeration === "auto" ? "approved" : "pending",
      userId: user?.id ?? null,
    };

    const filtered = (await press.applyFilters(CoreHooks.CommentPreprocess, draft, [post])) as NewCommentInput | null;
    if (!filtered) throw new HttpError(400, "Comment was rejected");

    const comment = await insertComment(filtered);
    await press.doAction(CoreHooks.CommentSubmitted, [comment, post]);
    if (comment.status === "approved") {
      revalidatePage(await press.permalink(post));
    }
    return json(serializeComment(comment), { status: 201 });
  });
}
