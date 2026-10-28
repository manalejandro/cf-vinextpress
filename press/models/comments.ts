import { all, db, first, nullableNum, num, str } from "../db/client";
import type { Comment, CommentStatus } from "../types";
import { nowDb } from "../utils/dates";

function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: num(row, "id"),
    postId: num(row, "post_id"),
    parentId: nullableNum(row, "parent_id"),
    authorName: str(row, "author_name"),
    authorEmail: str(row, "author_email"),
    authorUrl: str(row, "author_url"),
    content: str(row, "content"),
    status: (str(row, "status") || "pending") as CommentStatus,
    userId: nullableNum(row, "user_id"),
    createdAt: str(row, "created_at"),
  };
}

export interface ListCommentsOptions {
  postId?: number;
  status?: CommentStatus | "all";
  page?: number;
  perPage?: number;
}

export async function listComments(options: ListCommentsOptions = {}): Promise<{ comments: Comment[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.postId !== undefined) {
    params.push(options.postId);
    where.push(`post_id = ?${params.length}`);
  }
  if (options.status && options.status !== "all") {
    params.push(options.status);
    where.push(`status = ?${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const perPage = options.perPage ?? 20;
  const page = Math.max(1, options.page ?? 1);
  params.push(perPage, (page - 1) * perPage);

  const countRow = await db()
    .prepare(`SELECT COUNT(*) AS n FROM vp_comments ${whereSql}`)
    .bind(...(params.slice(0, params.length - 2) as never[]))
    .first();
  const comments = await all(
    db()
      .prepare(`SELECT * FROM vp_comments ${whereSql} ORDER BY created_at DESC LIMIT ?${params.length - 1} OFFSET ?${params.length}`)
      .bind(...(params as never[])),
    mapComment,
  );
  return { comments, total: num((countRow ?? {}) as Record<string, unknown>, "n") };
}

/** Approved comments of a post, oldest first, for display under the content. */
export async function getPostComments(postId: number): Promise<Comment[]> {
  return all(
    db()
      .prepare("SELECT * FROM vp_comments WHERE post_id = ?1 AND status = 'approved' ORDER BY created_at ASC")
      .bind(postId),
    mapComment,
  );
}

export async function getCommentById(id: number): Promise<Comment | null> {
  return first(db().prepare("SELECT * FROM vp_comments WHERE id = ?1").bind(id), mapComment);
}

export interface NewCommentInput {
  postId: number;
  parentId?: number | null;
  authorName: string;
  authorEmail?: string;
  authorUrl?: string;
  content: string;
  status?: CommentStatus;
  userId?: number | null;
}

export async function insertComment(input: NewCommentInput): Promise<Comment> {
  const result = await db()
    .prepare(
      `INSERT INTO vp_comments (post_id, parent_id, author_name, author_email, author_url, content, status, user_id, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      input.postId,
      input.parentId ?? null,
      input.authorName.slice(0, 120),
      (input.authorEmail ?? "").slice(0, 190),
      (input.authorUrl ?? "").slice(0, 300),
      input.content.slice(0, 10_000),
      input.status ?? "pending",
      input.userId ?? null,
      nowDb(),
    )
    .run();
  return (await getCommentById(Number(result.meta.last_row_id)))!;
}

export async function setCommentStatus(id: number, status: CommentStatus): Promise<void> {
  await db().prepare("UPDATE vp_comments SET status = ?1 WHERE id = ?2").bind(status, id).run();
}

export async function deleteComment(id: number): Promise<void> {
  await db()
    .batch([
      db().prepare("DELETE FROM vp_comments WHERE parent_id = ?1").bind(id),
      db().prepare("DELETE FROM vp_comments WHERE id = ?1").bind(id),
    ]);
}

export async function countComments(status?: CommentStatus): Promise<number> {
  const stmt = status
    ? db().prepare("SELECT COUNT(*) AS n FROM vp_comments WHERE status = ?1").bind(status)
    : db().prepare("SELECT COUNT(*) AS n FROM vp_comments");
  const row = await stmt.first();
  return num((row ?? {}) as Record<string, unknown>, "n");
}
