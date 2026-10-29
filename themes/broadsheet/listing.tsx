import type { ListProps } from "../../press/themes/types";
import type { PostWithAuthor } from "../../press/types";
import type { PressContext } from "../../press/context";
import { Pagination } from "../../press/components/Pagination";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate } from "../../press/utils/dates";
import { listTerms } from "../../press/models/terms";
import { getPostTerms, listPosts } from "../../press/models/posts";

/** Broadsheet listings: a lead story, a ruled grid, and a sidebar of sections. */

async function Kicker({ press, post }: { press: PressContext; post: PostWithAuthor }) {
  const terms = post.type === "post" ? await getPostTerms(post.id, "category") : [];
  const label = terms[0]?.name ?? (post.type === "post" ? "Dispatch" : "Page");
  return (
    <p className="vp-font-mono text-[10px] font-bold tracking-[0.2em] text-[var(--vp-accent)] uppercase">
      {label} · {formatDate(post.publishedAt ?? post.createdAt, "short")} · {readingTimeMinutes(post.content, post.contentFormat)} min
    </p>
  );
}

async function LeadStory({ press, post }: { press: PressContext; post: PostWithAuthor }) {
  const [title, excerpt, url] = await Promise.all([press.renderTitle(post), press.renderExcerpt(post), press.permalink(post)]);
  return (
    <article className="border-b-2 border-[var(--vp-ink)] pb-8">
      <Kicker press={press} post={post} />
      <h2 className="vp-font-head mt-2 text-4xl leading-[1.1] font-black text-[var(--vp-ink)] sm:text-5xl">
        <a href={url} className="hover:text-[var(--vp-accent)]">
          {title}
        </a>
      </h2>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--vp-muted)]">{excerpt}</p>
      <p className="mt-3 text-sm text-[var(--vp-muted)]">
        By <span className="font-semibold text-[var(--vp-ink)]">{post.authorName}</span>
      </p>
    </article>
  );
}

async function GridStory({ press, post }: { press: PressContext; post: PostWithAuthor }) {
  const [title, excerpt, url] = await Promise.all([press.renderTitle(post), press.renderExcerpt(post), press.permalink(post)]);
  return (
    <article className="border-b border-[var(--vp-line)] pb-6">
      <Kicker press={press} post={post} />
      <h3 className="vp-font-head mt-1.5 text-2xl leading-snug font-bold text-[var(--vp-ink)]">
        <a href={url} className="hover:text-[var(--vp-accent)]">
          {title}
        </a>
      </h3>
      <p className="mt-2 text-[15px] leading-7 text-[var(--vp-muted)]">{excerpt}</p>
    </article>
  );
}

async function Sidebar({ press }: { press: PressContext }) {
  const [categories, recent] = await Promise.all([
    listTerms("category", { hideEmpty: true }),
    listPosts({ type: "post", status: "publish", perPage: 5, orderBy: "published" }),
  ]);
  const recentWithUrls = await Promise.all(
    recent.posts.map(async (post) => ({ post, url: await press.permalink(post) })),
  );
  return (
    <aside className="flex flex-col gap-8 border-t-2 border-[var(--vp-ink)] pt-6 lg:border-t-0 lg:border-l lg:border-[var(--vp-line)] lg:pl-8 lg:pt-0">
      <section>
        <p className="vp-font-mono text-[10px] font-bold tracking-widest text-[var(--vp-muted)] uppercase">Sections</p>
        <ul className="mt-3 space-y-2">
          {categories.map((term) => (
            <li key={term.id} className="flex items-baseline justify-between gap-2 border-b border-[var(--vp-line)] pb-1.5">
              <a href={`/category/${term.slug}`} className="vp-font-head text-[15px] font-bold text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
                {term.name}
              </a>
              <span className="vp-font-mono text-[10px] text-[var(--vp-muted)]">{term.count}</span>
            </li>
          ))}
          {categories.length === 0 ? <li className="text-sm text-[var(--vp-muted)]">No sections yet.</li> : null}
        </ul>
      </section>
      <section>
        <p className="vp-font-mono text-[10px] font-bold tracking-widest text-[var(--vp-muted)] uppercase">Most recent</p>
        <ul className="mt-3 space-y-3">
          {recentWithUrls.map(({ post, url }) => (
            <li key={post.id}>
              <a href={url} className="vp-font-head text-[15px] leading-snug font-bold text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
                {post.title}
              </a>
              <p className="vp-font-mono mt-0.5 text-[10px] text-[var(--vp-muted)] uppercase">
                {formatDate(post.publishedAt ?? post.createdAt, "short")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

export async function Index({ press, posts, pagination, basePath, hrefForPage, heading, description }: ListProps) {
  const lead = pagination.page === 1 && !heading ? (posts[0] ?? null) : null;
  const rest = lead ? posts.slice(1) : posts;
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {heading ? (
        <header className="mb-8 border-b-2 border-[var(--vp-ink)] pb-4">
          <h1 className="vp-font-head text-4xl font-black text-[var(--vp-ink)]">{heading}</h1>
          {description ? <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--vp-muted)]">{description}</p> : null}
        </header>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div>
          {lead ? (
            <div className="mb-8">
              <LeadStory press={press} post={lead} />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2">
              {rest.map((post) => (
                <GridStory key={post.id} press={press} post={post} />
              ))}
            </div>
          ) : null}
          {posts.length === 0 ? <p className="py-12 text-center text-[var(--vp-muted)]">Nothing published here yet.</p> : null}
          <div className="mt-10">
            <Pagination pagination={pagination} basePath={basePath} hrefFor={hrefForPage} />
          </div>
        </div>
        <Sidebar press={press} />
      </div>
    </div>
  );
}

export function Home(props: ListProps) {
  return <Index {...props} />;
}

export function Archive(props: ListProps) {
  return <Index {...props} />;
}

export function Search(props: ListProps) {
  return <Index {...props} />;
}
