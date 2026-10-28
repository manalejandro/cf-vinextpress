import { getPress, type PressContext } from "../context";
import { CoreHooks } from "../hooks";
import { HttpError, can, canEditPost, requireUser } from "../auth";
import {
  deletePostPermanently,
  getPostById,
  getPostBySlug,
  listPosts,
  restorePost,
  savePost,
  trashPost,
  type SavePostInput,
} from "../models/posts";
import { getTermById } from "../models/terms";
import { revalidateSite } from "../cache";
import { json, parsePagination, serializePost } from "../rest";
import type { PostStatus, PostType, User } from "../types";
import { isReservedSlug } from "../utils/slug";

/**
 * Shared logic behind /api/v1/posts, /api/v1/pages and the dashboard
 * server actions, so REST and UI mutations behave identically.
 */

const STATUSES: PostStatus[] = ["publish", "draft", "private", "trash"];

export async function listPostsResponse(url: URL, type: PostType, user: User | null): Promise<Response> {
  const press = await getPress();
  const { page, perPage } = parsePagination(url, 10, 100);
  const statusParam = url.searchParams.get("status");
  const canSeeAll = user !== null && can(user, "edit_posts");

  let status: PostStatus | PostStatus[] | "any" = "publish";
  if (statusParam && canSeeAll) {
    status = statusParam === "any" ? "any" : (statusParam.split(",").filter((s) => STATUSES.includes(s as PostStatus)) as PostStatus[]);
    if (Array.isArray(status) && status.length === 0) status = "publish";
  }

  const authorParam = Number(url.searchParams.get("author") ?? 0);
  const search = url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined;
  const termSlug = url.searchParams.get(type === "page" ? "parent" : "category");

  let termId: number | undefined;
  if (termSlug && type === "post") {
    const { getTermBySlug } = await import("../models/terms");
    const term = await getTermBySlug("category", termSlug);
    termId = term?.id;
  }

  const { posts, total } = await listPosts({
    type,
    status,
    page,
    perPage,
    search: search || undefined,
    authorId: authorParam || undefined,
    termId,
    parentId: type === "page" && url.searchParams.has("parent") ? Number(url.searchParams.get("parent")) || null : undefined,
  });

  const body = await Promise.all(posts.map((post) => serializePost(press, post)));
  return json(body, {
    headers: {
      "x-wp-total": String(total),
      "x-total": String(total),
      "x-wp-totalpages": String(Math.max(1, Math.ceil(total / perPage))),
      "x-total-pages": String(Math.max(1, Math.ceil(total / perPage))),
    },
  });
}

export interface PostRequestBody {
  title?: string;
  slug?: string;
  content?: string;
  content_format?: "markdown" | "html";
  excerpt?: string;
  status?: PostStatus;
  categories?: number[];
  tags?: string[];
  featured_media?: number | null;
  comment_status?: "open" | "closed";
  parent?: number | null;
  menu_order?: number;
}

export async function readPostBody(request: Request): Promise<PostRequestBody> {
  let body: PostRequestBody;
  try {
    body = (await request.json()) as PostRequestBody;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (body === null || typeof body !== "object") throw new HttpError(400, "Request body must be a JSON object");
  return body;
}

function toSaveInput(body: PostRequestBody, type: PostType, authorId: number): SavePostInput {
  if (body.status && !STATUSES.includes(body.status)) {
    throw new HttpError(400, `Invalid status. Use one of: ${STATUSES.join(", ")}`);
  }
  if (body.slug && isReservedSlug(body.slug)) {
    throw new HttpError(400, "That slug is reserved by the platform.");
  }
  return {
    type,
    title: body.title !== undefined ? String(body.title).slice(0, 300) : undefined,
    slug: body.slug ? String(body.slug).slice(0, 200) : undefined,
    content: body.content !== undefined ? String(body.content) : undefined,
    contentFormat: body.content_format === "html" ? "html" : body.content_format === "markdown" ? "markdown" : undefined,
    excerpt: body.excerpt !== undefined ? String(body.excerpt).slice(0, 1000) : undefined,
    status: body.status,
    categories: Array.isArray(body.categories) ? body.categories.map(Number).filter(Number.isInteger) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 50) : undefined,
    featuredMediaId: body.featured_media === null ? null : body.featured_media !== undefined ? Number(body.featured_media) || null : undefined,
    commentStatus: body.comment_status === "closed" ? "closed" : body.comment_status === "open" ? "open" : undefined,
    parentId: body.parent === null ? null : body.parent !== undefined ? Number(body.parent) || null : undefined,
    menuOrder: body.menu_order !== undefined ? Number(body.menu_order) || 0 : undefined,
    authorId,
  };
}

/** Create a post/page through the REST API. */
export async function createPostFromRequest(request: Request, type: PostType): Promise<Response> {
  const user = await requireUser("author");
  const press = await getPress();
  const body = await readPostBody(request);
  if (!body.title || !body.title.trim()) throw new HttpError(400, "A title is required.");
  if (!can(user, "publish_posts") && body.status === "publish") {
    throw new HttpError(403, "You are not allowed to publish.");
  }
  const saved = await savePost(toSaveInput(body, type, user.id));
  await press.doAction(CoreHooks.PostSaved, [saved, null]);
  revalidateSite();
  return json(await serializePost(press, saved), { status: 201 });
}

/** Update a post/page (id or slug in the path). */
export async function updatePostFromRequest(request: Request, idOrSlug: string, type: PostType): Promise<Response> {
  const user = await requireUser("author");
  const press = await getPress();
  const existing = await resolvePostRef(idOrSlug, type, user);
  const body = await readPostBody(request);
  if (!canEditPost(user, existing)) throw new HttpError(403, "You can only edit your own posts.");
  if (!can(user, "publish_posts") && body.status === "publish") {
    throw new HttpError(403, "You are not allowed to publish.");
  }
  const input = toSaveInput(body, type, existing.authorId);
  input.id = existing.id;
  const saved = await savePost(input);
  await press.doAction(CoreHooks.PostSaved, [saved, existing]);
  revalidateSite();
  return json(await serializePost(press, saved));
}

/** Trash by default; ?force=true deletes permanently. */
export async function deletePostFromRequest(url: URL, idOrSlug: string, type: PostType): Promise<Response> {
  const user = await requireUser("author");
  const press = await getPress();
  const existing = await resolvePostRef(idOrSlug, type, user);
  if (!canEditPost(user, existing)) throw new HttpError(403, "You can only delete your own posts.");

  if (url.searchParams.get("force") === "true") {
    await deletePostPermanently(existing.id);
  } else if (existing.status === "trash") {
    await restorePost(existing.id, existing.publishedAt ? "publish" : "draft");
  } else {
    await trashPost(existing.id);
  }
  const after = await getPostById(existing.id);
  await press.doAction(CoreHooks.PostDeleted, [existing]);
  revalidateSite();
  return json({ deleted: true, previous: after ? await serializePost(press, after) : null });
}

export async function getPostResponse(idOrSlug: string, type: PostType): Promise<Response> {
  const press = await getPress();
  const { getCurrentUser } = await import("../auth");
  const user = await getCurrentUser();
  const post = await resolvePostRef(idOrSlug, type, user, !user);
  if (post.status !== "publish" && post.status !== "private") {
    if (!user || !can(user, "edit_posts")) throw new HttpError(404, "Post not found");
  }
  return json(await serializePost(press, post));
}

async function resolvePostRef(idOrSlug: string, type: PostType, user: User | null, publicOnly = false) {
  const decoded = decodeURIComponent(idOrSlug);
  const asId = Number(decoded);
  const post = Number.isInteger(asId) && asId > 0
    ? await getPostById(asId)
    : await getPostBySlug(type, decoded, publicOnly ? ["publish"] : "any");
  if (!post || post.type !== type) throw new HttpError(404, `${type === "post" ? "Post" : "Page"} not found`);
  if (publicOnly && post.status !== "publish") throw new HttpError(404, "Post not found");
  if (!publicOnly && !user) throw new HttpError(401, "Authentication required");
  return post;
}

export { getTermById };
export type { PressContext };
