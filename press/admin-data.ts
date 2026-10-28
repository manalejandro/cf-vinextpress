import { all, db, num } from "@/press/db/client";

/** Dashboard-only aggregate queries (status counts, comment counts). */

export async function postStatusCounts(type: "post" | "page"): Promise<Record<string, number>> {
  const rows = await all(
    db().prepare("SELECT status, COUNT(*) AS n FROM vp_posts WHERE type = ?1 GROUP BY status").bind(type),
    (row) => ({ status: String(row.status), n: num(row, "n") }),
  );
  const counts: Record<string, number> = { all: 0, publish: 0, draft: 0, private: 0, trash: 0 };
  for (const row of rows) {
    counts[row.status] = row.n;
    if (row.status !== "trash") counts.all += row.n;
  }
  return counts;
}

export async function approvedCommentCountByPost(): Promise<Record<number, number>> {
  const rows = await all(
    db().prepare("SELECT post_id, COUNT(*) AS n FROM vp_comments WHERE status = 'approved' GROUP BY post_id"),
    (row) => ({ postId: num(row, "post_id"), n: num(row, "n") }),
  );
  return Object.fromEntries(rows.map((r) => [r.postId, r.n]));
}
