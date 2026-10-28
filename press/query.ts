import { cache } from "react";
import type { PressContext } from "./context";
import { CoreHooks } from "./hooks";
import { getPageByPath, getPostBySlug, getPublishedPostById, listPosts } from "./models/posts";
import { getTermBySlug } from "./models/terms";
import { first, db, num, str } from "./db/client";
import type { MainQuery, Pagination, QueryKind } from "./types";

/**
 * The main query: resolve a request path into a view kind plus its data,
 * the way a classic publishing platform parses pretty permalinks.
 *
 * Resolution order:
 *   1. trailing /page/N  -> pagination suffix
 *   2. /category/<slug>, /tag/<slug>, /author/<slug>
 *   3. /YYYY and /YYYY/MM -> date archives; /YYYY/MM/<slug> -> single post
 *   4. hierarchical page paths ("/about/team")
 *   5. the configured posts page (blog index at its path)
 *   6. bare post slug
 *   7. otherwise: not found
 */

const PAGE_SUFFIX = /^page\/(\d+)$/;

function emptyPagination(perPage: number): Pagination {
  return { page: 1, perPage, total: 0, totalPages: 1 };
}

function paginate(total: number, page: number, perPage: number): Pagination {
  return { total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export interface ResolveOptions {
  /** Search terms, when the /search route resolves the query. */
  search?: string;
  /** Plain-permalink id (?p=123). */
  postId?: number;
  /** Explicit page number (query-string pagination, e.g. ?paged=2). */
  page?: number;
}

export const resolveMainQuery = cache(
  async (pathname: string, press: PressContext, options: ResolveOptions = {}): Promise<MainQuery> => {
    const settings = press.settings;
    const perPage = settings.postsPerPage;
    const normalized = pathname === "/" ? "" : pathname.replace(/^\/|\/$/g, "");
    let segments = normalized ? normalized.split("/") : [];

    // Pagination suffix: ".../page/N"
    let page = 1;
    if (segments.length >= 2 && PAGE_SUFFIX.test(segments.slice(-2).join("/"))) {
      page = Math.max(1, Number(segments[segments.length - 1]));
      segments = segments.slice(0, -2);
    }
    if (options.page) page = Math.max(1, options.page);
    const basePath = segments.length ? `/${segments.join("/")}` : "/";

    async function listing(
      kind: QueryKind,
      extra: Partial<MainQuery>,
      filter: Parameters<typeof listPosts>[0],
    ): Promise<MainQuery> {
      const { posts, total } = await listPosts({ type: "post", status: "publish", page, perPage, ...filter });
      if (posts.length === 0 && page > 1) return notFound(pathname, basePath, perPage);
      const query: MainQuery = {
        kind,
        path: pathname,
        basePath,
        posts,
        pagination: paginate(total, page, perPage),
        ...extra,
      };
      return press.applyFilters(CoreHooks.PreMainQuery, query);
    }

    function notFound(path: string, base: string, per: number): MainQuery {
      return { kind: "not-found", path, basePath: base, pagination: emptyPagination(per) };
    }

    // -- Search (handled by the /search route, resolved here for reuse) -----
    if (options.search !== undefined) {
      const { posts, total } = await listPosts({
        type: "post",
        status: "publish",
        search: options.search,
        page,
        perPage,
      });
      const query: MainQuery = {
        kind: "search",
        path: pathname,
        basePath,
        search: options.search,
        posts,
        pagination: paginate(total, page, perPage),
      };
      return press.applyFilters(CoreHooks.PreMainQuery, query);
    }

    // -- Plain permalink (?p=ID) --------------------------------------------
    if (options.postId) {
      const full = await getPublishedPostById(options.postId);
      if (full) {
        const query: MainQuery = {
          kind: full.type === "page" ? "page" : "single",
          path: pathname,
          basePath,
          post: full,
          pagination: emptyPagination(perPage),
        };
        return press.applyFilters(CoreHooks.PreMainQuery, query);
      }
    }

    // -- Root: front page ----------------------------------------------------
    if (segments.length === 0) {
      if (settings.showOnFront === "page" && settings.pageOnFront) {
        const front = await getPublishedPostById(settings.pageOnFront);
        if (front && front.type === "page") {
          const query: MainQuery = {
            kind: "home",
            path: pathname,
            basePath,
            post: front,
            pagination: emptyPagination(perPage),
          };
          return press.applyFilters(CoreHooks.PreMainQuery, query);
        }
      }
      return listing("home", {}, {});
    }

    const [head, second, third] = segments;

    // -- Taxonomy and author archives ----------------------------------------
    if (head === "category" && second && !third) {
      const term = await getTermBySlug("category", second);
      if (term) return listing("archive-category", { term }, { termId: term.id });
      return notFound(pathname, basePath, perPage);
    }
    if (head === "tag" && second && !third) {
      const term = await getTermBySlug("tag", second);
      if (term) return listing("archive-tag", { term }, { termId: term.id });
      return notFound(pathname, basePath, perPage);
    }
    if (head === "author" && second && !third) {
      const author = await first(
        db().prepare("SELECT id, username, display_name FROM vp_users WHERE username = ?1 COLLATE NOCASE").bind(second),
        (row) => ({ id: num(row, "id"), username: str(row, "username"), displayName: str(row, "display_name") }),
      );
      if (author) return listing("archive-author", { author }, { authorId: author.id });
      return notFound(pathname, basePath, perPage);
    }

    // -- Date archives and date permalinks ------------------------------------
    if (/^\d{4}$/.test(head!)) {
      const year = Number(head);
      if (!second) {
        return listing("archive-date", { date: { year } }, { year });
      }
      if (/^\d{1,2}$/.test(second)) {
        const month = Number(second);
        if (!third) {
          return listing("archive-date", { date: { year, month } }, { year, month });
        }
        // /YYYY/MM/slug -> single post
        const post = await getPostBySlug("post", third);
        if (post) {
          const query: MainQuery = { kind: "single", path: pathname, basePath, post, pagination: emptyPagination(perPage) };
          return press.applyFilters(CoreHooks.PreMainQuery, query);
        }
        return notFound(pathname, basePath, perPage);
      }
    }

    // -- Hierarchical pages ----------------------------------------------------
    const resolvedPage = await getPageByPath(segments);
    if (resolvedPage) {
      // The page configured as "posts page" renders the blog index instead.
      if (settings.showOnFront === "page" && settings.pageForPosts === resolvedPage.id) {
        return listing("blog", {}, {});
      }
      const query: MainQuery = { kind: "page", path: pathname, basePath, post: resolvedPage, pagination: emptyPagination(perPage) };
      return press.applyFilters(CoreHooks.PreMainQuery, query);
    }

    // -- Bare post slug (post-name permalinks) -----------------------------------
    if (segments.length === 1) {
      const post = await getPostBySlug("post", head!);
      if (post) {
        const query: MainQuery = { kind: "single", path: pathname, basePath, post, pagination: emptyPagination(perPage) };
        return press.applyFilters(CoreHooks.PreMainQuery, query);
      }
    }

    return notFound(pathname, basePath, perPage);
  },
);
