import type { Metadata } from "next";
import { getPress } from "@/press/context";
import { resolveMainQuery } from "@/press/query";
import { NotInstalled } from "@/press/components/NotInstalled";
import { SearchForm } from "@/press/components/SearchForm";
import type { ListProps } from "@/press/themes/types";

/**
 * Search results. Reads the query string, so this route is intentionally
 * dynamic (never cached); everything around it stays on ISR.
 */

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const press = await getPress();
  const q = firstParam(sp.q).trim();
  const title = q ? `Search: ${q}` : "Search";
  return {
    title: `${title} – ${press.settings.siteTitle}`,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const press = await getPress();
  if (!press.settings.installed) return <NotInstalled />;

  const q = firstParam(sp.q).trim().slice(0, 120);
  const paged = Math.max(1, Number(firstParam(sp.paged)) || 1);

  const query = await resolveMainQuery("/search", press, { search: q, page: paged });
  const theme = press.theme;
  const Template = (theme.templates.Search ?? theme.templates.Index) as React.ComponentType<ListProps>;

  const hrefForPage = (page: number) =>
    `/search?q=${encodeURIComponent(q)}${page > 1 ? `&paged=${page}` : ""}`;

  return (
    <div>
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-6 pt-14">
        <SearchForm q={q} />
        {q ? (
          <p className="text-sm text-[var(--vp-muted)]">
            {query.pagination.total} result{query.pagination.total === 1 ? "" : "s"} for <strong>“{q}”</strong>
          </p>
        ) : null}
      </div>
      <Template
        press={press}
        site={press.site}
        query={query}
        posts={query.posts ?? []}
        pagination={query.pagination}
        basePath="/search"
        hrefForPage={hrefForPage}
      />
    </div>
  );
}
