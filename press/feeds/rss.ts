import type { PressContext } from "../context";
import { CoreHooks } from "../hooks";
import { listPosts } from "../models/posts";
import { getPostTerms } from "../models/posts";
import { escapeHtml } from "../content/format";
import { absoluteUrl, postPath } from "../permalinks";
import { isoDate } from "../utils/dates";
import type { PostWithAuthor } from "../types";

/** RSS 2.0 + Atom feed builder. */

export async function buildRssFeed(press: PressContext): Promise<string> {
  const { settings } = press;
  const origin = settings.siteUrl;
  let posts = (await listPosts({ type: "post", status: "publish", perPage: 20 })).posts;
  posts = (await press.applyFilters(CoreHooks.FeedItems, posts, [settings])) as PostWithAuthor[];

  const link = (path: string) => (origin ? absoluteUrl(origin, path) : path);
  const lastBuild = posts[0] ? isoDate(posts[0].publishedAt ?? posts[0].updatedAt) : new Date().toISOString();

  const items = await Promise.all(
    posts.map(async (post) => {
      const url = link(await press.permalink(post));
      const categories = (await getPostTerms(post.id, "category"))
        .map((t) => `      <category>${escapeHtml(t.name)}</category>`)
        .join("\n");
      const html = await press.renderContent(post);
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${escapeHtml(url)}</link>
      <guid isPermaLink="true">${escapeHtml(url)}</guid>
      <pubDate>${new Date(isoDate(post.publishedAt ?? post.createdAt)).toUTCString()}</pubDate>
      <dc:creator>${escapeHtml(post.authorName)}</dc:creator>
${categories}
      <description>${escapeHtml((await press.renderExcerpt(post)).slice(0, 500))}</description>
      <content:encoded><![CDATA[${html.replace(/]]>/g, "]]&gt;")}]]></content:encoded>
    </item>`;
    }),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(settings.siteTitle)}</title>
    <atom:link href="${escapeHtml(link("/feed"))}" rel="self" type="application/rss+xml"/>
    <link>${escapeHtml(link("/"))}</link>
    <description>${escapeHtml(settings.siteTagline)}</description>
    <language>en-US</language>
    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
    <generator>VinextPress</generator>
${items.join("\n")}
  </channel>
</rss>
`;
}
