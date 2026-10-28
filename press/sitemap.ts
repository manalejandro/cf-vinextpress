import type { PressContext } from "./context";
import { listPosts, getPageAncestors } from "./models/posts";
import { listTerms } from "./models/terms";
import { absoluteUrl, categoryPath, pagePath, postPath, tagPath } from "./permalinks";
import { escapeHtml } from "./content/format";
import { isoDate } from "./utils/dates";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

/** Build sitemap.xml entries for posts, pages and non-empty archives. */
export async function buildSitemapEntries(press: PressContext): Promise<SitemapEntry[]> {
  const origin = press.settings.siteUrl;
  if (!origin) return [];
  const entries: SitemapEntry[] = [{ loc: absoluteUrl(origin, "/"), changefreq: "daily", priority: "1.0" }];

  const { posts } = await listPosts({ type: "post", status: "publish", perPage: 1000, orderBy: "published" });
  for (const post of posts) {
    entries.push({
      loc: absoluteUrl(origin, postPath(post, press.settings)),
      lastmod: isoDate(post.updatedAt),
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  const { posts: pages } = await listPosts({ type: "page", status: "publish", perPage: 500, orderBy: "menu_order" });
  for (const page of pages) {
    const ancestors = await getPageAncestors(page);
    entries.push({
      loc: absoluteUrl(origin, pagePath(page, ancestors)),
      lastmod: isoDate(page.updatedAt),
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  const categories = await listTerms("category", { hideEmpty: true });
  for (const term of categories) {
    entries.push({ loc: absoluteUrl(origin, categoryPath(term)), changefreq: "weekly", priority: "0.5" });
  }
  const tags = await listTerms("tag", { hideEmpty: true });
  for (const term of tags) {
    entries.push({ loc: absoluteUrl(origin, tagPath(term)), changefreq: "weekly", priority: "0.4" });
  }

  return entries;
}

export async function buildSitemapXml(press: PressContext): Promise<string> {
  const entries = await buildSitemapEntries(press);
  const body = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeHtml(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority) parts.push(`    <priority>${entry.priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildRobotsTxt(siteUrl: string): string {
  const sitemap = siteUrl ? `Sitemap: ${absoluteUrl(siteUrl, "/sitemap.xml")}\n` : "";
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\n${sitemap}`;
}
