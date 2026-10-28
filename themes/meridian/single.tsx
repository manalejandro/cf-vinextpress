import type { SingleProps } from "../../press/themes/types";
import { Comments } from "../../press/components/Comments";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";
import { categoryPath } from "../../press/permalinks";

/** Meridian single post & page templates: a centered editorial column. */

export async function Single({ press, query, post, renderedContent, terms, comments, previous, next, breadcrumbs, featuredImage }: SingleProps) {
  const title = await press.renderTitle(post);
  const minutes = readingTimeMinutes(post.content, post.contentFormat);
  const categories = terms.filter((t) => t.taxonomy === "category");
  const tags = terms.filter((t) => t.taxonomy === "tag");
  const CommentsTemplate = press.theme.templates.Comments ?? Comments;

  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-[var(--vp-muted)]">
        <ol className="flex flex-wrap items-center gap-2">
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.url ? (
                <a href={crumb.url} className="hover:text-[var(--vp-accent)]">
                  {crumb.label}
                </a>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header>
        {categories.length > 0 ? (
          <p className="flex flex-wrap gap-3 text-xs font-semibold tracking-[0.18em] uppercase">
            {categories.map((term) => (
              <a key={term.id} href={categoryPath(term)} className="text-[var(--vp-accent)] hover:opacity-75">
                {term.name}
              </a>
            ))}
          </p>
        ) : null}
        <h1 className="vp-font-head mt-3 text-4xl leading-tight font-bold text-[var(--vp-ink)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--vp-muted)]">
          <span>
            By{" "}
            <a href={`/author/${post.authorSlug}`} className="font-medium text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
              {post.authorName}
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt ?? post.createdAt}>
            {formatDate(post.publishedAt ?? post.createdAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{minutes} min read</span>
        </p>
      </header>

      {featuredImage ? (
        <figure className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featuredImage.url}
            alt={featuredImage.alt}
            width={featuredImage.width ?? undefined}
            height={featuredImage.height ?? undefined}
            className="w-full rounded-[var(--vp-radius)] border border-[var(--vp-line)]"
          />
          {featuredImage.caption ? (
            <figcaption className="mt-2 text-sm text-[var(--vp-muted)]">{featuredImage.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="vp-content mt-10" dangerouslySetInnerHTML={{ __html: renderedContent }} />

      {tags.length > 0 ? (
        <footer className="mt-10 flex flex-wrap gap-2 border-t border-[var(--vp-line)] pt-6">
          {tags.map((tag) => (
            <a
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="rounded-full border border-[var(--vp-line)] px-3 py-1 text-xs text-[var(--vp-muted)] transition-colors hover:border-[var(--vp-accent)] hover:text-[var(--vp-accent)]"
            >
              #{tag.name}
            </a>
          ))}
        </footer>
      ) : null}

      {(previous || next) && query.kind === "single" ? (
        <nav className="mt-10 grid gap-4 border-t border-[var(--vp-line)] pt-8 sm:grid-cols-2" aria-label="Post navigation">
          {previous ? (
            <a
              href={await press.permalink(previous)}
              className="group rounded-[var(--vp-radius)] border border-[var(--vp-line)] bg-[var(--vp-card)] p-5 transition-colors hover:border-[var(--vp-accent)]"
            >
              <span className="text-xs tracking-widest text-[var(--vp-muted)] uppercase">← Newer</span>
              <span className="vp-font-head mt-1 block text-lg font-semibold text-[var(--vp-ink)] group-hover:text-[var(--vp-accent)]">
                {previous.title}
              </span>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a
              href={await press.permalink(next)}
              className="group rounded-[var(--vp-radius)] border border-[var(--vp-line)] bg-[var(--vp-card)] p-5 text-right transition-colors hover:border-[var(--vp-accent)]"
            >
              <span className="text-xs tracking-widest text-[var(--vp-muted)] uppercase">Older →</span>
              <span className="vp-font-head mt-1 block text-lg font-semibold text-[var(--vp-ink)] group-hover:text-[var(--vp-accent)]">
                {next.title}
              </span>
            </a>
          ) : null}
        </nav>
      ) : null}

      <div className="mt-14 border-t border-[var(--vp-line)] pt-10">
        <CommentsTemplate press={press} post={post} comments={comments} />
      </div>
    </article>
  );
}

export async function Page({ press, query, post, renderedContent, breadcrumbs, children, comments }: SingleProps) {
  const title = await press.renderTitle(post);
  const CommentsTemplate = press.theme.templates.Comments ?? Comments;

  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      {breadcrumbs.length > 1 ? (
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-[var(--vp-muted)]">
          <ol className="flex flex-wrap items-center gap-2">
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.url ? (
                  <a href={crumb.url} className="hover:text-[var(--vp-accent)]">
                    {crumb.label}
                  </a>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <h1 className="vp-font-head text-4xl leading-tight font-bold text-[var(--vp-ink)]">{title}</h1>

      <div className="vp-content mt-8" dangerouslySetInnerHTML={{ __html: renderedContent }} />

      {children && children.length > 0 ? (
        <section className="mt-12 border-t border-[var(--vp-line)] pt-8">
          <h2 className="text-xs font-semibold tracking-widest text-[var(--vp-muted)] uppercase">Sub-pages</h2>
          <ul className="mt-4 space-y-2">
            {children.map((child) => (
              <li key={child.id}>
                <a
                  href={`${query.basePath.replace(/\/$/, "")}/${child.slug}`}
                  className="vp-font-head text-lg text-[var(--vp-ink)] hover:text-[var(--vp-accent)]"
                >
                  {child.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-14 border-t border-[var(--vp-line)] pt-10">
        <CommentsTemplate press={press} post={post} comments={comments} />
      </div>
    </article>
  );
}
