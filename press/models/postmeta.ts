import { all, db, first, num, str } from "../db/client";

/**
 * Generic post meta (the custom-fields table). Plugins and the editor
 * store arbitrary string values per post under `meta[key]` form fields.
 */

export async function getPostMeta(postId: number): Promise<Record<string, string>> {
  const rows = await all(
    db().prepare("SELECT meta_key, meta_value FROM vp_postmeta WHERE post_id = ?1").bind(postId),
    (r) => ({ key: str(r, "meta_key"), value: str(r, "meta_value") }),
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getPostMetaValue(postId: number, key: string, fallback = ""): Promise<string> {
  const value = await first(
    db().prepare("SELECT meta_value FROM vp_postmeta WHERE post_id = ?1 AND meta_key = ?2").bind(postId, key),
    (r) => str(r, "meta_value"),
  );
  return value ?? fallback;
}

export async function setPostMeta(postId: number, key: string, value: string): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO vp_postmeta (post_id, meta_key, meta_value) VALUES (?1, ?2, ?3)
       ON CONFLICT(post_id, meta_key) DO UPDATE SET meta_value = ?3`,
    )
    .bind(postId, key, value)
    .run();
}

export async function deletePostMeta(postId: number, key: string): Promise<void> {
  await db().prepare("DELETE FROM vp_postmeta WHERE post_id = ?1 AND meta_key = ?2").bind(postId, key).run();
}

/** Replace every meta key present in `entries` (others untouched). */
export async function savePostMeta(postId: number, entries: Record<string, string>): Promise<void> {
  const statements = Object.entries(entries).map(([key, value]) =>
    db()
      .prepare(
        `INSERT INTO vp_postmeta (post_id, meta_key, meta_value) VALUES (?1, ?2, ?3)
         ON CONFLICT(post_id, meta_key) DO UPDATE SET meta_value = ?3`,
      )
      .bind(postId, key, value),
  );
  if (statements.length) await db().batch(statements);
}

export async function countMeta(key: string): Promise<number> {
  const row = await db().prepare("SELECT COUNT(*) AS n FROM vp_postmeta WHERE meta_key = ?1").bind(key).first();
  return num((row ?? {}) as Record<string, unknown>, "n");
}
