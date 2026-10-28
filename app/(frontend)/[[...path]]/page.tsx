import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPress, type PressContext } from "@/press/context";
import { resolveMainQuery } from "@/press/query";
import { buildHead } from "@/press/head";
import { chooseTemplate, defaultArchiveTitle } from "@/press/templates/hierarchy";
import { NotInstalled } from "@/press/components/NotInstalled";
import { getPostComments } from "@/press/models/comments";
import { getChildPages, getNextPost, getPageAncestors, getPostTerms, getPreviousPost } from "@/press/models/posts";
import { getMediaById, mediaUrl } from "@/press/models/media";
import { categoryPath, pagePathFromSlugs } from "@/press/permalinks";
import { CoreHooks } from "@/press/hooks";
import type { MainQuery, PostWithAuthor } from "@/press/types";
import type { ListProps, SingleProps } from "@/press/themes/types";

/**
 * The front controller. A single optional catch-all route receives every
 * public URL, resolves it through the main query (posts, pages, term /
 * author / date archives, pagination), and renders it with the active
 * theme's most specific template — the classic template-hierarchy flow,
 * implemented as one cacheable edge route.
 *
 * Returning [] from generateStaticParams opts every path into on-demand
 * ISR: responses are stored by the Response Store on first visit and
 * purged via revalidatePath whenever content changes.
 */

export const dynamicParams = true;
export const revalidate = 900;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ path?: string[] }> };

function pathnameOf(segments?: string[]): string {
  if (!segments || segments.length === 0) return "/";
  return `/${segments.map(decodeURIComponent).join("/")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const press = await getPress();
  if (!press.settings.installed) {
    return { title: "VinextPress — installation required", robots: { index: false } };
  }
  const { path } = await params;
  const query = await resolveMainQuery(pathnameOf(path), press);
  const { metadata } = await buildHead(press, query);
  return metadata;
}

async function featuredImageOf(post: PostWithAuthor) {
  if (!post.featuredMediaId) return null;
  const media = await getMediaById(post.featuredMediaId);
  if (!media || !media.mimeType.startsWith("image/")) return null;
  return {
    url: mediaUrl(media),
    alt: media.alt || post.title,
    caption: media.caption || undefined,
    width: media.width,
    height: media.height,
  };
}

async function buildSingleProps(
  press: PressContext,
  query: MainQuery,
  post: PostWithAuthor,
): Promise<SingleProps> {
  const isPost = query.kind === "single";

  const [renderedContent, renderedExcerpt, terms, comments, previous, next, featuredImage] = await Promise.all([
    press.renderContent(post),
    press.renderExcerpt(post),
    isPost ? getPostTerms(post.id) : Promise.resolve([]),
    getPostComments(post.id),
    isPost ? getPreviousPost(post) : Promise.resolve(null),
    isPost ? getNextPost(post) : Promise.resolve(null),
    featuredImageOf(post),
  ]);

  // Breadcrumbs: home → (category | page ancestors) → title.
  const breadcrumbs: Array<{ label: string; url?: string }> = [{ label: "Home", url: "/" }];
  if (isPost) {
    const category = terms.find((t) => t.taxonomy === "category");
    if (category) breadcrumbs.push({ label: category.name, url: categoryPath(category) });
    breadcrumbs.push({ label: post.title });
  } else if (query.kind === "page") {
    const ancestors = await getPageAncestors(post);
    const chain: string[] = [];
    for (const ancestor of ancestors) {
      chain.push(ancestor.slug);
      breadcrumbs.push({ label: ancestor.title, url: pagePathFromSlugs(chain) });
    }
    breadcrumbs.push({ label: post.title });
  } else {
    breadcrumbs.push({ label: post.title });
  }

  const children = !isPost ? await getChildPages(post.id) : undefined;

  return {
    press,
    site: press.site,
    query,
    post,
    renderedContent,
    renderedExcerpt,
    terms,
    comments,
    previous,
    next,
    children,
    breadcrumbs,
    featuredImage,
  };
}

export default async function FrontendPage({ params }: Props) {
  const press = await getPress();
  const { path } = await params;
  const pathname = pathnameOf(path);

  if (!press.settings.installed) {
    return <NotInstalled />;
  }

  const query = await resolveMainQuery(pathname, press);
  if (query.kind === "not-found") {
    notFound();
  }

  // Canonicalize single-post URLs (bare slug vs date permalink).
  if (query.kind === "single" && query.post) {
    const canonical = await press.permalink(query.post);
    if (canonical !== pathname) {
      redirect(canonical);
    }
  }

  const theme = press.theme;
  const choice = chooseTemplate(theme, query);

  let view: React.ReactNode;

  if (choice.variant === "not-found") {
    notFound();
  } else if (choice.variant === "single" || choice.variant === "page" || choice.variant === "home-page") {
    const singleProps = await buildSingleProps(press, query, query.post!);
    const Template = choice.component;
    view = <Template {...singleProps} />;
  } else {
    const heading =
      query.kind === "home"
        ? undefined
        : await press.applyFilters(CoreHooks.ArchiveTitle, defaultArchiveTitle(query), [query]);
    const listProps: ListProps = {
      press,
      site: press.site,
      query,
      posts: query.posts ?? [],
      pagination: query.pagination,
      basePath: query.basePath,
      heading,
      description: query.term?.description || undefined,
    };
    const Template = choice.component;
    view = <Template {...listProps} />;
  }

  const { jsonLd } = await buildHead(press, query);

  return (
    <>
      {view}
      {jsonLd.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
