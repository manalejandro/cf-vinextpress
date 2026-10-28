import type { SingleProps } from "../../press/themes/types";
import { Comments } from "../../press/components/Comments";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";

/** Nocturne single post & page templates: wide hero title, focused column. */

export async function Single({ press, post, renderedContent, terms, comments, previous, next, featuredImage }: SingleProps) {
  const title = await press.renderTitle(post);
  const minutes = readingTimeMinutes(post.content, post.contentFormat);
  const tags = terms.filter((t) => t.taxonomy === "tag");
  const categories = terms.filter((t) => t.taxonomy === "category");
  const CommentsTemplate = press.theme.templates.Comments ?? Comments;

  return (
    <article>
      <header className="border-b border-[var(--vp-line)]">
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-12">
          <p className="vp-font-mono flex flex-wrap items-center gap-3 text-[11px] tracking-wider text-[var(--vp-muted)] uppercase">
            {categories.map((term) => (
              <a key={term.id} href={`/category/${term.slug}`} className="text-[var(--vp-accent)] hover:underline">
                {term.name}
              </a>
            ))}
            <time dateTime={post.publishedAt ?? post.createdAt}>
              {formatDate(post.publishedAt ?? post.createdAt, "short")}
            </time>
            <span>·</span>
            <span>{minutes} min read</span>
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-[var(--vp-ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="vp-font-mono mt-5 text-xs text-[var(--vp-muted)]">
            by <a href={`/author/${post.authorSlug}`} className="text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">{post.authorName}</a>
          </p>
        </div>
      </header>

      {featuredImage ? (
        <div className="mx-auto max-w-4xl px-6 pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featuredImage.url}
            alt={featuredImage.alt}
            width={featuredImage.width ?? undefined}
            height={featuredImage.height ?? undefined}
            className="w-full rounded-[var(--vp-radius)] border border-[var(--vp-line)]"
          />
          {featuredImage.caption ? (
            <p className="vp-font-mono mt-2 text-[11px] text-[var(--vp-muted)]">{featuredImage.caption}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="vp-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />

        {tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <a
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="vp-font-mono rounded-full border border-[var(--vp-line)] px-3 py-1 text-[11px] text-[var(--vp-muted)] transition-colors hover:border-[var(--vp-accent)] hover:text-[var(--vp-accent)]"
              >
                #{tag.name}
              </a>
            ))}
          </div>
        ) : null}

        {(previous || next) ? (
          <nav className="mt-12 grid gap-4 border-t border-[var(--vp-line)] pt-8 sm:grid-cols-2" aria-label="Post navigation">
            {previous ? (
              <a
                href={await press.permalink(previous)}
                className="group rounded-[var(--vp-radius)] border border-[var(--vp-line)] bg-[var(--vp-card)] p-5 hover:border-[var(--vp-accent)]/60"
              >
                <span className="vp-font-mono text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">newer →</span>
                <span className="mt-1 block font-semibold text-[var(--vp-ink)] group-hover:text-[var(--vp-accent)]">
                  {previous.title}
                </span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a
                href={await press.permalink(next)}
                className="group rounded-[var(--vp-radius)] border border-[var(--vp-line)] bg-[var(--vp-card)] p-5 text-right hover:border-[var(--vp-accent)]/60"
              >
                <span className="vp-font-mono text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">← older</span>
                <span className="mt-1 block font-semibold text-[var(--vp-ink)] group-hover:text-[var(--vp-accent)]">
                  {next.title}
                </span>
              </a>
            ) : null}
          </nav>
        ) : null}

        <div className="mt-14 border-t border-[var(--vp-line)] pt-10">
          <CommentsTemplate press={press} post={post} comments={comments} />
        </div>
      </div>
    </article>
  );
}

export async function Page({ press, query, post, renderedContent, children, comments }: SingleProps) {
  const title = await press.renderTitle(post);
  const CommentsTemplate = press.theme.templates.Comments ?? Comments;

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="vp-font-mono text-[11px] tracking-[0.25em] text-[var(--vp-accent)] uppercase">page</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--vp-ink)]">{title}</h1>

      <div className="vp-content mt-8" dangerouslySetInnerHTML={{ __html: renderedContent }} />

      {children && children.length > 0 ? (
        <section className="mt-12 border-t border-[var(--vp-line)] pt-8">
          <h2 className="vp-font-mono text-[11px] tracking-widest text-[var(--vp-muted)] uppercase">sub-pages</h2>
          <ul className="mt-4 grid gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <a
                  href={`${query.basePath.replace(/\/$/, "")}/${child.slug}`}
                  className="block rounded-[var(--vp-radius)] border border-[var(--vp-line)] bg-[var(--vp-card)] px-4 py-3 text-[var(--vp-ink)] hover:border-[var(--vp-accent)]/60"
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
