import type { SingleProps } from "../../press/themes/types";
import { Comments } from "../../press/components/Comments";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";

/** Kite article: narrow column, quiet meta, generous rhythm. */

export async function Single({ press, post, renderedContent, terms, comments, previous, next, featuredImage, breadcrumbs }: SingleProps) {
  const title = await press.renderTitle(post);
  const tags = terms.filter((t) => t.taxonomy === "tag");
  const CommentsTemplate = press.theme.templates.Comments ?? Comments;

  return (
    <article className="mx-auto max-w-2xl px-6 py-14">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--vp-muted)]">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.url ? (
              <a href={crumb.url} className="hover:text-[var(--vp-accent)]">
                {crumb.label}
              </a>
            ) : (
              <span aria-current="page" className="truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <h1 className="text-3xl leading-tight font-semibold tracking-tight text-[var(--vp-ink)] sm:text-4xl">{title}</h1>

      <p className="vp-font-mono mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-wide text-[var(--vp-muted)] uppercase">
        <span>{post.authorName}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt, "short")}</time>
        <span aria-hidden="true">·</span>
        <span>{readingTimeMinutes(post.content, post.contentFormat)} min read</span>
      </p>

      {featuredImage ? (
        <figure className="mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featuredImage.url}
            alt={featuredImage.alt}
            className="w-full rounded-[var(--vp-radius)] border border-[var(--vp-line)]"
          />
          {featuredImage.caption ? <figcaption className="mt-2 text-xs text-[var(--vp-muted)]">{featuredImage.caption}</figcaption> : null}
        </figure>
      ) : null}

      <div className="vp-content mt-8" dangerouslySetInnerHTML={{ __html: renderedContent }} />

      {tags.length > 0 ? (
        <div className="mt-10 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <a
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="rounded-full border border-[var(--vp-line)] px-3 py-1 text-xs text-[var(--vp-muted)] transition-colors hover:border-[var(--vp-accent)] hover:text-[var(--vp-accent)]"
            >
              {tag.name}
            </a>
          ))}
        </div>
      ) : null}

      {(previous || next) ? (
        <nav className="mt-12 flex items-center justify-between gap-4 border-t border-[var(--vp-line)] pt-6 text-sm" aria-label="Post navigation">
          {previous ? (
            <a href={await press.permalink(previous)} className="max-w-[45%] truncate text-[var(--vp-muted)] transition-colors hover:text-[var(--vp-accent)]">
              ← {previous.title}
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a href={await press.permalink(next)} className="max-w-[45%] truncate text-right text-[var(--vp-muted)] transition-colors hover:text-[var(--vp-accent)]">
              {next.title} →
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

export function Page(props: SingleProps) {
  return <Single {...props} />;
}
