import { all, db, first, nullableNum, nullableStr, num, str } from "../db/client";
import type { Post, PostStatus, PostType, PostWithAuthor, ContentFormat, Term } from "../types";
import { slugify } from "../utils/slug";

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: num(row, "id"),
    slug: str(row, "slug"),
    title: str(row, "title"),
    excerpt: str(row, "excerpt"),
    content: str(row, "content"),
    contentFormat: (str(row, "content_format") || "markdown") as ContentFormat,
    type: (str(row, "type") || "post") as PostType,
    status: (str(row, "status") || "draft") as PostStatus,
    authorId: num(row, "author_id"),
    parentId: nullableNum(row, "parent_id"),
    menuOrder: num(row, "menu_order"),
    commentStatus: str(row, "comment_status") === "closed" ? "closed" : "open",
    featuredMediaId: nullableNum(row, "featured_media_id"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
    publishedAt: nullableStr(row, "published_at"),
  };
}

function mapPostWithAuthor(row: Record<string, unknown>): PostWithAuthor {
  return {
    ...mapPost(row),
    authorName: str(row, "author_name") || "Unknown",
    authorSlug: str(row, "author_slug") || "unknown",
  };
}

const SELECT_WITH_AUTHOR = `
  SELECT p.*, u.display_name AS author_name, u.username AS author_slug
  FROM vp_posts p LEFT JOIN vp_users u ON u.id = p.author_id
`;

export interface ListPostsOptions {
  type?: PostType;
  status?: PostStatus | PostStatus[] | "any";
  authorId?: number;
  termId?: number;
  parentId?: number | null;
  search?: string;
  year?: number;
  month?: number;
  page?: number;
  perPage?: number;
  orderBy?: "published" | "title" | "menu_order" | "created";
  excludeId?: number;
}

interface ListResult {
  posts: PostWithAuthor[];
  total: number;
}

/**
 * The workhorse query builder for posts and pages, mirroring the classic
 * "main query" of a publishing platform: filters, search, archives and
 * pagination in one place.
 */
export async function listPosts(options: ListPostsOptions = {}): Promise<ListResult> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, ...values: unknown[]) => {
    params.push(...values);
    where.push(sql);
  };

  const type = options.type ?? "post";
  add("p.type = ?", type);

  if (options.status === undefined || options.status === null) {
    add("p.status = ?", "publish");
  } else if (options.status !== "any") {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    add(`p.status IN (${statuses.map(() => "?").join(", ")})`, ...statuses);
  }

  if (options.authorId !== undefined) add("p.author_id = ?", options.authorId);
  if (options.excludeId !== undefined) add("p.id != ?", options.excludeId);
  if (options.parentId !== undefined) {
    if (options.parentId === null) add("p.parent_id IS NULL");
    else add("p.parent_id = ?", options.parentId);
  }
  if (options.termId !== undefined) {
    add(
      "p.id IN (SELECT post_id FROM vp_term_relationships WHERE term_id = ?)",
      options.termId,
    );
  }
  if (options.search) {
    const like = `%${options.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    add("(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\' OR p.excerpt LIKE ? ESCAPE '\\')", like, like, like);
  }
  if (options.year !== undefined) {
    add("CAST(strftime('%Y', p.published_at) AS INTEGER) = ?", options.year);
    if (options.month !== undefined) {
      add("CAST(strftime('%m', p.published_at) AS INTEGER) = ?", options.month);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy =
    options.orderBy === "title"
      ? "p.title COLLATE NOCASE ASC"
      : options.orderBy === "menu_order"
        ? "p.menu_order ASC, p.title COLLATE NOCASE ASC"
        : options.orderBy === "created"
          ? "p.created_at DESC"
          : "p.published_at DESC, p.id DESC";

  const perPage = Math.max(1, options.perPage ?? 10);
  const page = Math.max(1, options.page ?? 1);
  const offset = (page - 1) * perPage;

  const countRow = await db()
    .prepare(`SELECT COUNT(*) AS n FROM vp_posts p ${whereSql}`)
    .bind(...(params as never[]))
    .first();

  const posts = await all(
    db()
      .prepare(`${SELECT_WITH_AUTHOR} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...(params as never[]), perPage, offset),
    mapPostWithAuthor,
  );

  return { posts, total: num((countRow ?? {}) as Record<string, unknown>, "n") };
}

export async function getPostById(id: number): Promise<PostWithAuthor | null> {
  return first(
    db().prepare(`${SELECT_WITH_AUTHOR} WHERE p.id = ?1`).bind(id),
    mapPostWithAuthor,
  );
}

/** Published-only lookup by id, used by front-page and plain-permalink resolution. */
export async function getPublishedPostById(id: number): Promise<PostWithAuthor | null> {
  return first(
    db()
      .prepare(`${SELECT_WITH_AUTHOR} WHERE p.id = ?1 AND p.status = 'publish'`)
      .bind(id),
    mapPostWithAuthor,
  );
}

export async function getPostBySlug(
  type: PostType,
  slug: string,
  status: PostStatus[] | "any" = ["publish"],
): Promise<PostWithAuthor | null> {
  const statuses = status === "any" ? null : status;
  const sql = statuses
    ? `${SELECT_WITH_AUTHOR} WHERE p.type = ?1 AND p.slug = ?2 AND p.status IN (${statuses.map(() => "?").join(",")})`
    : `${SELECT_WITH_AUTHOR} WHERE p.type = ?1 AND p.slug = ?2`;
  const stmt = statuses
    ? db().prepare(sql).bind(type, slug, ...statuses)
    : db().prepare(sql).bind(type, slug);
  return first(stmt, mapPostWithAuthor);
}

/**
 * Resolve a hierarchical page path ("/about/team") to a page, walking
 * parent slugs from the right. Returns the deepest match.
 */
export async function getPageByPath(pathSegments: string[]): Promise<PostWithAuthor | null> {
  if (pathSegments.length === 0) return null;
  const slug = pathSegments[pathSegments.length - 1]!;
  const candidates = await all(
    db()
      .prepare(
        `${SELECT_WITH_AUTHOR} WHERE p.type = 'page' AND p.slug = ?1 AND p.status = 'publish'`,
      )
      .bind(slug),
    mapPostWithAuthor,
  );
  if (candidates.length === 0) return null;
  if (pathSegments.length === 1) {
    return candidates.find((c) => c.parentId === null) ?? candidates[0]!;
  }
  // Walk upwards: match each ancestor slug.
  for (const candidate of candidates) {
    let current: PostWithAuthor | null = candidate;
    const chain: string[] = [slug];
    let ok = true;
    for (let i = pathSegments.length - 2; i >= 0; i--) {
      if (!current || current.parentId === null) {
        ok = false;
        break;
      }
      const parent = await getPostById(current.parentId);
      if (!parent || parent.type !== "page" || parent.slug !== pathSegments[i]) {
        ok = false;
        break;
      }
      chain.unshift(parent.slug);
      current = parent;
    }
    if (ok && chain.length === pathSegments.length && current?.parentId === null) {
      return candidate;
    }
  }
  return null;
}

export async function getChildPages(parentId: number): Promise<PostWithAuthor[]> {
  const { posts } = await listPosts({
    type: "page",
    parentId,
    perPage: 100,
    orderBy: "menu_order",
  });
  return posts;
}

/** The full ancestor path of a page, root first. */
export async function getPageAncestors(page: Post): Promise<Post[]> {
  const chain: Post[] = [];
  let parentId = page.parentId;
  let guard = 0;
  while (parentId !== null && guard++ < 20) {
    const parent = await getPostById(parentId);
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parentId;
  }
  return chain;
}

export async function getPreviousPost(post: Post): Promise<PostWithAuthor | null> {
  return first(
    db()
      .prepare(
        `${SELECT_WITH_AUTHOR} WHERE p.type = 'post' AND p.status = 'publish' AND p.published_at < ?1 ORDER BY p.published_at DESC LIMIT 1`,
      )
      .bind(post.publishedAt ?? post.createdAt),
    mapPostWithAuthor,
  );
}

export async function getNextPost(post: Post): Promise<PostWithAuthor | null> {
  return first(
    db()
      .prepare(
        `${SELECT_WITH_AUTHOR} WHERE p.type = 'post' AND p.status = 'publish' AND p.published_at > ?1 ORDER BY p.published_at ASC LIMIT 1`,
      )
      .bind(post.publishedAt ?? post.createdAt),
    mapPostWithAuthor,
  );
}

/** Posts sharing at least one term with the given post, most recent first. */
export async function getRelatedPosts(post: Post, limit = 3): Promise<PostWithAuthor[]> {
  return all(
    db()
      .prepare(
        `${SELECT_WITH_AUTHOR}
         WHERE p.type = 'post' AND p.status = 'publish' AND p.id != ?1
           AND p.id IN (
             SELECT tr.post_id FROM vp_term_relationships tr
             WHERE tr.term_id IN (SELECT term_id FROM vp_term_relationships WHERE post_id = ?1)
           )
         ORDER BY p.published_at DESC LIMIT ?2`,
      )
      .bind(post.id, limit),
    mapPostWithAuthor,
  );
}

export interface SavePostInput {
  id?: number;
  type?: PostType;
  /** Required on create; optional on update (keeps the stored title). */
  title?: string;
  /** Omit on update to keep the stored slug. */
  slug?: string;
  excerpt?: string;
  content?: string;
  contentFormat?: ContentFormat;
  status?: PostStatus;
  authorId?: number;
  parentId?: number | null;
  menuOrder?: number;
  commentStatus?: "open" | "closed";
  featuredMediaId?: number | null;
  publishedAt?: string | null;
  categories?: number[];
  tags?: string[];
}

/** Ensure a slug is unique within its post type, suffixing -2, -3... */
export async function uniqueSlug(type: PostType, desired: string, excludeId?: number): Promise<string> {
  const base = slugify(desired) || (type === "page" ? "page" : "post");
  let candidate = base;
  let n = 2;
  for (;;) {
    const existing = await getPostBySlug(type, candidate, "any");
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${n++}`;
    if (n > 500) return `${base}-${Date.now()}`;
  }
}

/**
 * Create or update a post/page. Updates are partial: any field left
 * undefined keeps its stored value (including the slug, so links never
 * break on a title edit). Returns the stored row.
 */
export async function savePost(input: SavePostInput): Promise<PostWithAuthor> {
  const type = input.type ?? "post";
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const existing = input.id ? await getPostById(input.id) : null;
  if (input.id && !existing) throw new Error(`Post ${input.id} not found`);

  let slug: string;
  if (input.slug !== undefined && input.slug.trim() !== "") {
    slug = await uniqueSlug(type, input.slug, input.id);
  } else if (existing) {
    slug = existing.slug;
  } else {
    slug = await uniqueSlug(type, input.title ?? "");
  }

  const title = input.title ?? existing?.title ?? "";
  const publishing = input.status === "publish";

  if (existing) {
    const publishedAt =
      input.publishedAt !== undefined
        ? input.publishedAt
        : publishing && !existing.publishedAt
          ? now
          : existing.publishedAt ?? null;
    await db()
      .prepare(
        `UPDATE vp_posts SET
           title = ?1, slug = ?2, excerpt = ?3, content = ?4, content_format = ?5,
           status = ?6, parent_id = ?7, menu_order = ?8, comment_status = ?9,
           featured_media_id = ?10, published_at = ?11, updated_at = ?12, type = ?13
         WHERE id = ?14`,
      )
      .bind(
        title,
        slug,
        input.excerpt ?? existing.excerpt,
        input.content ?? existing.content,
        input.contentFormat ?? existing.contentFormat,
        input.status ?? existing.status,
        input.parentId !== undefined ? input.parentId : existing.parentId,
        input.menuOrder ?? existing.menuOrder,
        input.commentStatus ?? existing.commentStatus,
        input.featuredMediaId !== undefined ? input.featuredMediaId : existing.featuredMediaId,
        publishedAt,
        now,
        type,
        existing.id,
      )
      .run();
    if (input.categories) await setPostTerms(existing.id, "category", input.categories);
    if (input.tags) await setPostTags(existing.id, input.tags);
    return (await getPostById(existing.id))!;
  }

  const publishedAt = publishing ? (input.publishedAt ?? now) : (input.publishedAt ?? null);
  const result = await db()
    .prepare(
      `INSERT INTO vp_posts
         (type, status, slug, title, excerpt, content, content_format, author_id,
          parent_id, menu_order, comment_status, featured_media_id,
          created_at, updated_at, published_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14)`,
    )
    .bind(
      type,
      input.status ?? "draft",
      slug,
      title,
      input.excerpt ?? "",
      input.content ?? "",
      input.contentFormat ?? "markdown",
      input.authorId ?? null,
      input.parentId ?? null,
      input.menuOrder ?? 0,
      input.commentStatus ?? "open",
      input.featuredMediaId ?? null,
      now,
      publishedAt,
    )
    .run();
  const id = Number(result.meta.last_row_id);
  if (input.categories) await setPostTerms(id, "category", input.categories);
  if (input.tags) await setPostTags(id, input.tags);
  return (await getPostById(id))!;
}

/** Move to trash (soft delete) or remove permanently. */
export async function trashPost(id: number): Promise<void> {
  await db()
    .prepare("UPDATE vp_posts SET status = 'trash', updated_at = datetime('now') WHERE id = ?1")
    .bind(id)
    .run();
}

export async function restorePost(id: number, status: PostStatus = "publish"): Promise<void> {
  await db()
    .prepare("UPDATE vp_posts SET status = ?1, updated_at = datetime('now') WHERE id = ?2")
    .bind(status, id)
    .run();
}

export async function deletePostPermanently(id: number): Promise<void> {
  await db()
    .batch([
      db().prepare("DELETE FROM vp_term_relationships WHERE post_id = ?1").bind(id),
      db().prepare("DELETE FROM vp_comments WHERE post_id = ?1").bind(id),
      db().prepare("DELETE FROM vp_postmeta WHERE post_id = ?1").bind(id),
      db().prepare("DELETE FROM vp_posts WHERE id = ?1").bind(id),
    ]);
}

/** Terms attached to a post, optionally filtered by taxonomy. */
export async function getPostTerms(postId: number, taxonomy?: "category" | "tag"): Promise<Term[]> {
  const sql = taxonomy
    ? `SELECT t.* FROM vp_terms t JOIN vp_term_relationships r ON r.term_id = t.id
       WHERE r.post_id = ?1 AND t.taxonomy = ?2 ORDER BY t.name`
    : `SELECT t.* FROM vp_terms t JOIN vp_term_relationships r ON r.term_id = t.id
       WHERE r.post_id = ?1 ORDER BY t.taxonomy, t.name`;
  const stmt = taxonomy ? db().prepare(sql).bind(postId, taxonomy) : db().prepare(sql).bind(postId);
  return all(stmt, (row) => ({
    id: num(row, "id"),
    name: str(row, "name"),
    slug: str(row, "slug"),
    taxonomy: str(row, "taxonomy") as "category" | "tag",
    description: str(row, "description"),
    parentId: nullableNum(row, "parent_id"),
  }));
}

export async function setPostTerms(postId: number, taxonomy: "category" | "tag", termIds: number[]): Promise<void> {
  const removes = db()
    .prepare(
      `DELETE FROM vp_term_relationships WHERE post_id = ?1 AND term_id IN
       (SELECT id FROM vp_terms WHERE taxonomy = ?2)`,
    )
    .bind(postId, taxonomy);
  const inserts = termIds.map((termId) =>
    db()
      .prepare("INSERT OR IGNORE INTO vp_term_relationships (term_id, post_id) VALUES (?1, ?2)")
      .bind(termId, postId),
  );
  await db().batch([removes, ...inserts]);
}

/** Attach tags by name, creating missing terms on the fly. */
export async function setPostTags(postId: number, tagNames: string[]): Promise<void> {
  const ids: number[] = [];
  for (const raw of tagNames) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const existing = await first(
      db().prepare("SELECT id FROM vp_terms WHERE taxonomy = 'tag' AND slug = ?1").bind(slug),
      (r) => num(r, "id"),
    );
    if (existing) {
      ids.push(existing);
      continue;
    }
    const result = await db()
      .prepare("INSERT INTO vp_terms (taxonomy, name, slug) VALUES ('tag', ?1, ?2)")
      .bind(name, slug)
      .run();
    ids.push(Number(result.meta.last_row_id));
  }
  await setPostTerms(postId, "tag", ids);
}

export async function countPosts(type: PostType, status?: PostStatus): Promise<number> {
  const sql = status
    ? "SELECT COUNT(*) AS n FROM vp_posts WHERE type = ?1 AND status = ?2"
    : "SELECT COUNT(*) AS n FROM vp_posts WHERE type = ?1";
  const stmt = status ? db().prepare(sql).bind(type, status) : db().prepare(sql).bind(type);
  const row = await stmt.first();
  return num((row ?? {}) as Record<string, unknown>, "n");
}
