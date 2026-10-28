import { all, db, first, nullableNum, num, str } from "../db/client";
import type { Taxonomy, Term, TermWithCount } from "../types";
import { slugify } from "../utils/slug";

function mapTerm(row: Record<string, unknown>): TermWithCount {
  return {
    id: num(row, "id"),
    name: str(row, "name"),
    slug: str(row, "slug"),
    taxonomy: str(row, "taxonomy") as Taxonomy,
    description: str(row, "description"),
    parentId: nullableNum(row, "parent_id"),
    count: num(row, "term_count"),
  };
}

const SELECT_WITH_COUNT = `
  SELECT t.*, COUNT(r.post_id) AS term_count
  FROM vp_terms t
  LEFT JOIN vp_term_relationships r ON r.term_id = t.id
  LEFT JOIN vp_posts p ON p.id = r.post_id AND p.status = 'publish' AND p.type = 'post'
`;

/** All terms of a taxonomy with published-post counts, most used first. */
export async function listTerms(taxonomy: Taxonomy, options: { hideEmpty?: boolean } = {}): Promise<TermWithCount[]> {
  const terms = await all(
    db()
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM vp_term_relationships r JOIN vp_posts p ON p.id = r.post_id
           WHERE r.term_id = t.id AND p.status = 'publish' AND p.type = 'post') AS term_count
         FROM vp_terms t WHERE t.taxonomy = ?1 ORDER BY t.name COLLATE NOCASE`,
      )
      .bind(taxonomy),
    mapTerm,
  );
  return options.hideEmpty ? terms.filter((t) => t.count > 0) : terms;
}

export async function getTermBySlug(taxonomy: Taxonomy, slug: string): Promise<TermWithCount | null> {
  return first(
    db()
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM vp_term_relationships r JOIN vp_posts p ON p.id = r.post_id
           WHERE r.term_id = t.id AND p.status = 'publish' AND p.type = 'post') AS term_count
         FROM vp_terms t WHERE t.taxonomy = ?1 AND t.slug = ?2`,
      )
      .bind(taxonomy, slug),
    mapTerm,
  );
}

export async function getTermById(id: number): Promise<TermWithCount | null> {
  return first(
    db().prepare(`${SELECT_WITH_COUNT} WHERE t.id = ?1 GROUP BY t.id`).bind(id),
    mapTerm,
  );
}

export async function createTerm(
  taxonomy: Taxonomy,
  name: string,
  options: { slug?: string; description?: string; parentId?: number | null } = {},
): Promise<Term> {
  const slug = options.slug || slugify(name);
  const existing = await first(
    db().prepare("SELECT id FROM vp_terms WHERE taxonomy = ?1 AND slug = ?2").bind(taxonomy, slug),
    (r) => num(r, "id"),
  );
  if (existing) {
    const term = await getTermById(existing);
    return term!;
  }
  const result = await db()
    .prepare("INSERT INTO vp_terms (taxonomy, name, slug, description, parent_id) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(taxonomy, name.trim(), slug, options.description ?? "", options.parentId ?? null)
    .run();
  return {
    id: Number(result.meta.last_row_id),
    taxonomy,
    name: name.trim(),
    slug,
    description: options.description ?? "",
    parentId: options.parentId ?? null,
  };
}

export async function updateTerm(id: number, patch: { name?: string; slug?: string; description?: string }): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (patch.name !== undefined) {
    params.push(patch.name);
    fields.push(`name = ?${params.length}`);
  }
  if (patch.slug !== undefined) {
    params.push(slugify(patch.slug));
    fields.push(`slug = ?${params.length}`);
  }
  if (patch.description !== undefined) {
    params.push(patch.description);
    fields.push(`description = ?${params.length}`);
  }
  if (fields.length === 0) return;
  params.push(id);
  await db()
    .prepare(`UPDATE vp_terms SET ${fields.join(", ")} WHERE id = ?${params.length}`)
    .bind(...(params as never[]))
    .run();
}

export async function deleteTerm(id: number): Promise<void> {
  await db()
    .batch([
      db().prepare("DELETE FROM vp_term_relationships WHERE term_id = ?1").bind(id),
      db().prepare("DELETE FROM vp_terms WHERE id = ?1").bind(id),
    ]);
}
