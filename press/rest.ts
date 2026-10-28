import type { PressContext } from "./context";
import { HttpError } from "./auth";
import { getPostTerms } from "./models/posts";
import { mediaUrl } from "./models/media";
import { absoluteUrl } from "./permalinks";
import { isoDate } from "./utils/dates";
import type { Comment, MediaItem, Post, PostWithAuthor, Term, User } from "./types";

/** Shared helpers for the JSON REST API under /api/v1. */

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data, null, process.env.NODE_ENV === "production" ? 0 : 2), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers,
  });
}

/** Wrap a REST handler: HttpError -> status, anything else -> 500. */
export async function handleRest(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ code: error.status, message: error.message }, { status: error.status });
    }
    console.error("[vinextpress:rest]", error);
    return json({ code: 500, message: "Internal Server Error" }, { status: 500 });
  }
}

export function parsePagination(url: URL, defaultPerPage = 10, maxPerPage = 100): { page: number; perPage: number } {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(maxPerPage, Math.max(1, Number(url.searchParams.get("per_page") ?? defaultPerPage) || defaultPerPage));
  return { page, perPage };
}

export async function serializePost(
  press: PressContext,
  post: PostWithAuthor | Post,
  options: { render?: boolean } = {},
): Promise<Record<string, unknown>> {
  const path = await press.permalink(post);
  const authorName = "authorName" in post ? (post as PostWithAuthor).authorName : "";
  const base: Record<string, unknown> = {
    id: post.id,
    date: isoDate(post.publishedAt ?? post.createdAt),
    date_gmt: isoDate(post.publishedAt ?? post.createdAt),
    modified: isoDate(post.updatedAt),
    slug: post.slug,
    status: post.status,
    type: post.type,
    link: press.settings.siteUrl ? absoluteUrl(press.settings.siteUrl, path) : path,
    title: { raw: post.title, rendered: await press.renderTitle(post) },
    author: post.authorId,
    author_name: authorName,
    comment_status: post.commentStatus,
    featured_media: post.featuredMediaId,
    parent: post.parentId ?? 0,
    menu_order: post.menuOrder,
  };
  if (options.render !== false) {
    base.content = { rendered: await press.renderContent(post) };
    base.excerpt = { rendered: await press.renderExcerpt(post) };
  }
  const terms = await getPostTerms(post.id);
  base.categories = terms.filter((t) => t.taxonomy === "category").map((t) => t.id);
  base.tags = terms.filter((t) => t.taxonomy === "tag").map((t) => t.id);
  return base;
}

export function serializeTerm(term: Term & { count?: number }): Record<string, unknown> {
  return {
    id: term.id,
    name: term.name,
    slug: term.slug,
    taxonomy: term.taxonomy,
    description: term.description,
    parent: term.parentId ?? 0,
    count: term.count ?? 0,
  };
}

export function serializeComment(comment: Comment): Record<string, unknown> {
  return {
    id: comment.id,
    post: comment.postId,
    parent: comment.parentId ?? 0,
    date: isoDate(comment.createdAt),
    status: comment.status,
    author_name: comment.authorName,
    author_url: comment.authorUrl,
    content: { rendered: comment.content },
  };
}

export function serializeUser(user: User): Record<string, unknown> {
  return {
    id: user.id,
    username: user.username,
    name: user.displayName,
    email: user.email,
    role: user.role,
    registered: isoDate(user.createdAt),
  };
}

export function serializeMedia(item: MediaItem): Record<string, unknown> {
  return {
    id: item.id,
    date: isoDate(item.createdAt),
    source_url: mediaUrl(item),
    media_type: item.mimeType.startsWith("image/") ? "image" : "file",
    mime_type: item.mimeType,
    filename: item.filename,
    size: item.size,
    width: item.width,
    height: item.height,
    alt_text: item.alt,
    caption: { rendered: item.caption },
  };
}
