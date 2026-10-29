import type { ListProps } from "../../press/themes/types";
import type { PostWithAuthor } from "../../press/types";
import type { PressContext } from "../../press/context";
import { Pagination } from "../../press/components/Pagination";
import { formatDate } from "../../press/utils/dates";
import { readingTimeMinutes } from "../../press/content/format";

/** Kite listings: airy rows separated by hairlines, micro-labels in caps. */

async function Row({ press, post }: { press: PressContext; post: PostWithAuthor }) {
  const [title, excerpt, url] = await Promise.all([press.renderTitle(post), press.renderExcerpt(post), press.permalink(post)]);
  return (
    <a href={url} className="group block border-b border-[var(--vp-line)] py-7 first:pt-0 last:border-b-0">
      <p className="vp-font-mono text-[10px] tracking-[0.18em] text-[var(--vp-muted)] uppercase">
        {formatDate(post.publishedAt ?? post.createdAt, "short")} · {readingTimeMinutes(post.content, post.contentFormat)} min
      </p>
      <h2 className="mt-1.5 text-xl leading-snug font-semibold tracking-tight text-[var(--vp-ink)] transition-colors group-hover:text-[var(--vp-accent)]">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--vp-muted)]">{excerpt}</p>
    </a>
  );
}

export function Index({ press, posts, pagination, basePath, hrefForPage, heading, description }: ListProps) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      {heading ? (
        <header className="mb-8">
          <p className="vp-font-mono text-[10px] tracking-[0.22em] text-[var(--vp-accent)] uppercase">archive</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-[var(--vp-ink)]">{heading}</h1>
          {description ? <p className="mt-2 text-[15px] leading-7 text-[var(--vp-muted)]">{description}</p> : null}
        </header>
      ) : null}

      {posts.length > 0 ? (
        <div>
          {posts.map((post) => (
            <Row key={post.id} press={press} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-[15px] text-[var(--vp-muted)]">Nothing published here yet.</p>
      )}

      <div className="mt-10">
        <Pagination pagination={pagination} basePath={basePath} hrefFor={hrefForPage} />
      </div>
    </div>
  );
}

export async function Home({ press, site, query, posts, pagination, basePath, hrefForPage }: ListProps) {
  return (
    <div>
      {pagination.page === 1 ? (
        <section className="border-b border-[var(--vp-line)] bg-[var(--vp-card)]">
          <div className="mx-auto max-w-2xl px-6 py-16">
            <p className="vp-font-mono text-[10px] tracking-[0.22em] text-[var(--vp-accent)] uppercase">
              {site.settings.siteTagline || "notes & writing"}
            </p>
            <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight text-[var(--vp-ink)]">
              {site.settings.siteTitle}
            </h1>
            {site.description ? (
              <p className="mt-4 max-w-xl text-[16px] leading-8 text-[var(--vp-muted)]">{site.description}</p>
            ) : null}
          </div>
        </section>
      ) : null}
      <Index press={press} site={site} query={query} posts={posts} pagination={pagination} basePath={basePath} hrefForPage={hrefForPage} />
    </div>
  );
}

export function Archive(props: ListProps) {
  return <Index {...props} />;
}

export function Search(props: ListProps) {
  return <Index {...props} />;
}
