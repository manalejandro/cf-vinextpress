/** URL-safe slug generation. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

/**
 * Slugs that would collide with core routes are reserved and cannot be
 * used by posts or pages.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "category",
  "tag",
  "author",
  "search",
  "feed",
  "media",
  "page",
  "assets",
  "sitemap.xml",
  "robots.txt",
  "login",
  "install",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
