import type { Post, SiteSettings, Term, User } from "./types";
import { parseDbDate } from "./utils/dates";

/**
 * Permalink builders. The structure for posts is configurable
 * ("post-name" → /hello-world, "date" → /2026/10/hello-world);
 * pages always live at their hierarchical path.
 */

export function postPath(post: Pick<Post, "slug" | "publishedAt" | "createdAt">, settings: SiteSettings): string {
  if (settings.permalinkStructure === "date") {
    const date = parseDbDate(post.publishedAt ?? post.createdAt) ?? new Date();
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `/${y}/${m}/${post.slug}`;
  }
  return `/${post.slug}`;
}

export function pagePathFromSlugs(slugs: string[]): string {
  return `/${slugs.filter(Boolean).join("/")}`;
}

/** Full hierarchical path of a page given its ancestor chain (root first). */
export function pagePath(page: Pick<Post, "slug">, ancestors: Array<Pick<Post, "slug">>): string {
  return pagePathFromSlugs([...ancestors.map((a) => a.slug), page.slug]);
}

export function categoryPath(term: Pick<Term, "slug">): string {
  return `/category/${term.slug}`;
}

export function tagPath(term: Pick<Term, "slug">): string {
  return `/tag/${term.slug}`;
}

export function authorPath(author: Pick<User, "username">): string {
  return `/author/${author.username}`;
}

export function dateArchivePath(year: number, month?: number): string {
  return month ? `/${year}/${String(month).padStart(2, "0")}` : `/${year}`;
}

export function searchPath(query: string, page = 1): string {
  const base = `/search?q=${encodeURIComponent(query)}`;
  return page > 1 ? `${base}&paged=${page}` : base;
}

/** Path of the blog index: "/" when posts are the front page, otherwise the posts page path. */
export function blogIndexPath(settings: SiteSettings, postsPagePath?: string | null): string {
  if (settings.showOnFront === "posts") return "/";
  return postsPagePath || "/blog";
}

export function paginationPath(base: string, page: number): string {
  if (page <= 1) return base === "/" ? "/" : base;
  if (base === "/") return `/page/${page}`;
  return `${base.replace(/\/$/, "")}/page/${page}`;
}

export function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
