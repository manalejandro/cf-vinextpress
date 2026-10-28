import { paginationPath } from "../permalinks";
import type { Pagination as PaginationInfo } from "../types";

/**
 * The default pagination template: previous/next links plus a compact
 * page window. Themes may override it via `templates.Pagination`, and
 * callers may replace path pagination with query pagination (search)
 * through `hrefFor`.
 */

export interface PaginationProps {
  pagination: PaginationInfo;
  basePath: string;
  hrefFor?: (page: number) => string;
}

export function Pagination({ pagination, basePath, hrefFor }: PaginationProps) {
  if (pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  const href = hrefFor ?? ((p: number) => paginationPath(basePath, p));

  const window: number[] = [];
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, Math.max(page + 2, 5));
  for (let p = from; p <= to; p++) window.push(p);

  return (
    <nav className="vp-pagination" aria-label="Pagination">
      {page > 1 ? (
        <a className="vp-pagination-prev" href={href(page - 1)} rel="prev">
          ← Newer
        </a>
      ) : (
        <span className="vp-pagination-prev is-disabled" aria-hidden="true">
          ← Newer
        </span>
      )}

      <ol className="vp-pagination-pages">
        {window[0]! > 1 ? (
          <li>
            <a href={href(1)}>1</a>
            {window[0]! > 2 ? <span className="vp-pagination-gap">…</span> : null}
          </li>
        ) : null}
        {window.map((p) => (
          <li key={p}>
            {p === page ? (
              <span className="is-current" aria-current="page">
                {p}
              </span>
            ) : (
              <a href={href(p)}>{p}</a>
            )}
          </li>
        ))}
        {window[window.length - 1]! < totalPages ? (
          <li>
            {window[window.length - 1]! < totalPages - 1 ? <span className="vp-pagination-gap">…</span> : null}
            <a href={href(totalPages)}>{totalPages}</a>
          </li>
        ) : null}
      </ol>

      {page < totalPages ? (
        <a className="vp-pagination-next" href={href(page + 1)} rel="next">
          Older →
        </a>
      ) : (
        <span className="vp-pagination-next is-disabled" aria-hidden="true">
          Older →
        </span>
      )}
    </nav>
  );
}
