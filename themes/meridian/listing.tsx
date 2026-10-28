import type { ListProps } from "../../press/themes/types";
import type { PostWithAuthor } from "../../press/types";
import type { PressContext } from "../../press/context";
import { Pagination } from "../../press/components/Pagination";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";

/** Meridian listings: editorial rows separated by hairlines. */

async function PostRow({ press, post }: { press: PressContext; post: PostWithAuthor }) {
  const [title, excerpt, url] = await Promise.all([
    press.renderTitle(post),
    press.renderExcerpt(post),
    press.permalink(post),
  ]);
  const minutes = readingTimeMinutes(post.content, post.contentFormat);

  return (
    <article className="border-b border-[var(--vp-line)] pb-10 last:border-b-0">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--vp-accent)] uppercase">
        {formatDate(post.publishedAt ?? post.createdAt, "short")} · {minutes} min read
      </p>
      <h2 className="vp-font-head mt-2 text-3xl leading-snug font-bold text-[var(--vp-ink)]">
        <a href={url} className="transition-colors hover:text-[var(--vp-accent)]">
          {title}
        </a>
      </h2>
      <p className="mt-2 text-sm text-[var(--vp-muted)]">
        By <a href={`/author/${post.authorSlug}`} className="hover:text-[var(--vp-accent)]">{post.authorName}</a>
      </p>
      {excerpt ? <p className="mt-4 max-w-2xl leading-7 text-[var(--vp-ink)] opacity-80">{excerpt}</p> : null}
      <a
        href={url}
        className="mt-4 inline-block text-sm font-semibold text-[var(--vp-accent)] transition-opacity hover:opacity-75"
      >
        Continue reading →
      </a>
    </article>
  );
}

export function Index({ press, posts, pagination, basePath, hrefForPage, heading, description }: ListProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      {heading ? (
        <header className="mb-10">
          <h1 className="vp-font-head text-4xl font-bold text-[var(--vp-ink)]">{heading}</h1>
          {description ? <p className="mt-3 leading-7 text-[var(--vp-muted)]">{description}</p> : null}
        </header>
      ) : null}

      {posts.length > 0 ? (
        <div className="flex flex-col gap-10">
          {posts.map((post) => (
            <PostRow key={post.id} press={press} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-[var(--vp-muted)]">Nothing published here yet.</p>
      )}

      <div className="mt-12">
        <Pagination pagination={pagination} basePath={basePath} hrefFor={hrefForPage} />
      </div>
    </div>
  );
}

export async function Home(props: ListProps) {
  const { site, pagination } = props;
  return (
    <div>
      {pagination.page === 1 && site.description ? (
        <section className="border-b border-[var(--vp-line)] bg-[var(--vp-card)]">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h1 className="vp-font-head text-4xl font-bold text-[var(--vp-ink)] sm:text-5xl">
              {site.settings.siteTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg italic leading-8 text-[var(--vp-muted)]">
              {site.description}
            </p>
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
