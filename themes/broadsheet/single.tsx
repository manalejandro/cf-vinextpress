import type { SingleProps } from "../../press/themes/types";
import { Comments } from "../../press/components/Comments";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";

/** Broadsheet article: ruled byline, drop-cap body, tagline footer. */

export async function Single({ press, post, renderedContent, terms, comments, previous, next, featuredImage, breadcrumbs }: SingleProps) {
  const title = await press.renderTitle(post);
  const categories = terms.filter((t) => t.taxonomy === "category");
  const tags = terms.filter((t) => t.taxonomy === "tag");
  const CommentsTemplate = press.theme.templates.Comments ?? Comments;

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <nav aria-label="Breadcrumb" className="vp-font-mono mb-4 text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">
        {breadcrumbs.map((c, i) => (
          <span key={`${c.label}-${i}`}>
            {i > 0 ? " / " : ""}
            {c.url ? (
              <a href={c.url} className="hover:text-[var(--vp-accent)]">
                {c.label}
              </a>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      {categories.length > 0 ? (
        <p className="vp-font-mono text-[10px] font-bold tracking-[0.2em] text-[var(--vp-accent)] uppercase">
          {categories.map((c) => c.name).join(" · ")}
        </p>
      ) : null}

      <h1 className="vp-font-head mt-2 text-4xl leading-[1.08] font-black text-[var(--vp-ink)] sm:text-5xl">{title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-[var(--vp-line)] py-2.5 text-sm text-[var(--vp-muted)]">
        <span>
          By <span className="font-bold text-[var(--vp-ink)]">{post.authorName}</span>
        </span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt)}</time>
        <span aria-hidden="true">·</span>
        <span>{readingTimeMinutes(post.content, post.contentFormat)} min read</span>
      </div>

      {featuredImage ? (
        <figure className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featuredImage.url} alt={featuredImage.alt} className="w-full border border-[var(--vp-line)]" />
          {featuredImage.caption ? (
            <figcaption className="vp-font-mono mt-1.5 text-[10px] tracking-wide text-[var(--vp-muted)] uppercase">
              {featuredImage.caption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="vp-content bs-dropcap mt-8" dangerouslySetInnerHTML={{ __html: renderedContent }} />

      {tags.length > 0 ? (
        <p className="mt-8 border-t border-[var(--vp-line)] pt-4 text-sm text-[var(--vp-muted)]">
          Filed under:{" "}
          {tags.map((tag, i) => (
            <span key={tag.id}>
              {i > 0 ? ", " : ""}
              <a href={`/tag/${tag.slug}`} className="font-semibold text-[var(--vp-accent)] hover:underline">
                {tag.name}
              </a>
            </span>
          ))}
        </p>
      ) : null}

      {(previous || next) ? (
        <nav className="mt-8 grid gap-4 border-t-2 border-[var(--vp-ink)] pt-5 sm:grid-cols-2" aria-label="Post navigation">
          {previous ? (
            <a href={await press.permalink(previous)} className="group">
              <span className="vp-font-mono text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">← Newer</span>
              <span className="vp-font-head mt-0.5 block text-lg font-bold text-[var(--vp-ink)] group-hover:text-[var(--vp-accent)]">
                {previous.title}
              </span>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a href={await press.permalink(next)} className="group text-right">
              <span className="vp-font-mono text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">Older →</span>
              <span className="vp-font-head mt-0.5 block text-lg font-bold text-[var(--vp-ink)] group-hover:text-[var(--vp-accent)]">
                {next.title}
              </span>
            </a>
          ) : null}
        </nav>
      ) : null}

      <div className="mt-12 border-t border-[var(--vp-line)] pt-8">
        <CommentsTemplate press={press} post={post} comments={comments} />
      </div>
    </article>
  );
}

export function Page(props: SingleProps) {
  return <Single {...props} />;
}
