import type { ListProps } from "../../press/themes/types";
import type { PostWithAuthor } from "../../press/types";
import type { PressContext } from "../../press/context";
import { Pagination } from "../../press/components/Pagination";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";

/** Nocturne listings: a responsive card grid with mono kickers. */

async function PostCard({ press, post }: { press: PressContext; post: PostWithAuthor }) {
  const [title, excerpt, url] = await Promise.all([
    press.renderTitle(post),
    press.renderExcerpt(post),
    press.permalink(post),
  ]);
  const minutes = readingTimeMinutes(post.content, post.contentFormat);

  return (
    <a
      href={url}
      className="group flex h-full flex-col rounded-[var(--vp-radius)] border border-[var(--vp-line)] bg-[var(--vp-card)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--vp-accent)]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    >
      <p className="vp-font-mono text-[11px] tracking-wider text-[var(--vp-accent)] uppercase">
        {formatDate(post.publishedAt ?? post.createdAt, "short")} · {minutes}min
      </p>
      <h2 className="mt-3 text-xl leading-snug font-semibold text-[var(--vp-ink)] transition-colors group-hover:text-[var(--vp-accent)]">
        {title}
      </h2>
      <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-[var(--vp-muted)]">{excerpt}</p>
      <p className="vp-font-mono mt-5 text-[11px] text-[var(--vp-muted)]">
        {post.authorName} <span className="text-[var(--vp-accent)]">→</span>
      </p>
    </a>
  );
}

export function Index({ press, posts, pagination, basePath, hrefForPage, heading, description }: ListProps) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      {heading ? (
        <header className="mb-10">
          <p className="vp-font-mono text-[11px] tracking-[0.25em] text-[var(--vp-accent)] uppercase">archive</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--vp-ink)]">{heading}</h1>
          {description ? <p className="mt-3 max-w-2xl leading-7 text-[var(--vp-muted)]">{description}</p> : null}
        </header>
      ) : null}

      {posts.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} press={press} post={post} />
          ))}
        </div>
      ) : (
        <p className="vp-font-mono py-16 text-center text-sm text-[var(--vp-muted)]">// nothing published here yet</p>
      )}

      <div className="mt-12">
        <Pagination pagination={pagination} basePath={basePath} hrefFor={hrefForPage} />
      </div>
    </div>
  );
}

export function Home(props: ListProps) {
  const { site, pagination } = props;
  return (
    <div>
      {pagination.page === 1 ? (
        <section className="border-b border-[var(--vp-line)]">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="vp-font-mono text-[11px] tracking-[0.3em] text-[var(--vp-accent)] uppercase">
              {`> ${site.settings.siteUrl || "edge-rendered"}`}
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl leading-tight font-bold tracking-tight text-[var(--vp-ink)]">
              {site.settings.siteTitle}
            </h1>
            {site.description ? (
              <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--vp-muted)]">{site.description}</p>
            ) : null}
          </div>
        </section>
      ) : null}
      <Index {...props} />
    </div>
  );
}

export function Archive(props: ListProps) {
  return <Index {...props} />;
}

export function Search(props: ListProps) {
  return <Index {...props} />;
}
