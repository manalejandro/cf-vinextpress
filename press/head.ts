import type { Metadata } from "next";
import { cache } from "react";
import type { PressContext } from "./context";
import { CoreHooks } from "./hooks";
import { defaultArchiveTitle } from "./templates/hierarchy";
import { getMediaById, mediaUrl } from "./models/media";
import { absoluteUrl } from "./permalinks";
import type { HeadContribution, MainQuery } from "./types";

/**
 * Builds Next.js route Metadata for a resolved main query and runs the
 * `document_head` filter so plugins (e.g. the bundled SEO suite) can
 * contribute meta tags, links and JSON-LD blocks.
 */

export interface BuiltHead {
  metadata: Metadata;
  jsonLd: Array<Record<string, unknown>>;
}

export async function buildHeadUncached(press: PressContext, query: MainQuery): Promise<BuiltHead> {
  const { settings, site } = press;
  const origin = settings.siteUrl;

  let title: string;
  let description = settings.siteTagline || undefined;
  let canonicalPath: string | undefined;

  switch (query.kind) {
    case "single":
    case "page":
    case "home": {
      if (query.post) {
        title = `${await press.renderTitle(query.post)} – ${settings.siteTitle}`;
        const excerpt = await press.renderExcerpt(query.post);
        if (excerpt) description = excerpt.slice(0, 300);
        canonicalPath = query.kind === "page" ? query.basePath : await press.permalink(query.post);
      } else {
        title = settings.siteTagline ? `${settings.siteTitle} – ${settings.siteTagline}` : settings.siteTitle;
        canonicalPath = "/";
      }
      break;
    }
    case "search":
      title = `Search: ${query.search ?? ""} – ${settings.siteTitle}`;
      break;
    default: {
      const archiveTitle = await press.applyFilters(CoreHooks.ArchiveTitle, defaultArchiveTitle(query), [query]);
      title = `${archiveTitle} – ${settings.siteTitle}`;
      canonicalPath = query.basePath;
      if (query.term?.description) description = query.term.description.slice(0, 300);
    }
  }

  const contribution: HeadContribution = { title, description, meta: [], links: [], jsonLd: [] };
  const filtered = await press.applyFilters(CoreHooks.DocumentHead, contribution, [query, press]);

  const openGraph: {
    title?: string;
    description?: string;
    siteName?: string;
    type?: "website" | "article";
    url?: string;
    images?: Array<{ url: string }>;
  } = {
    title: filtered.title ?? title,
    description: filtered.description ?? description,
    siteName: settings.siteTitle,
    type: query.kind === "single" ? "article" : "website",
    url: origin && canonicalPath ? absoluteUrl(origin, canonicalPath) : undefined,
  };

  // Featured image becomes the OG image when we know the site origin.
  if (query.post?.featuredMediaId && origin) {
    const media = await getMediaById(query.post.featuredMediaId);
    if (media && media.mimeType.startsWith("image/")) {
      openGraph.images = [{ url: absoluteUrl(origin, mediaUrl(media)) }];
    }
  }

  for (const meta of filtered.meta ?? []) {
    const key = meta.property ?? meta.name;
    if (!key) continue;
    if (key.startsWith("og:")) {
      const prop = key.slice(3);
      if (prop === "image") {
        openGraph.images = [{ url: meta.content }];
      } else {
        (openGraph as unknown as Record<string, unknown>)[camel(prop)] = meta.content;
      }
    }
  }

  const alternates: Metadata["alternates"] = {};
  if (origin && canonicalPath) alternates.canonical = absoluteUrl(origin, canonicalPath);
  if (origin) alternates.types = { "application/rss+xml": absoluteUrl(origin, "/feed") };

  const metadata: Metadata = {
    title: filtered.title ?? title,
    description: filtered.description ?? description,
    openGraph,
    alternates,
    other: Object.fromEntries(
      (filtered.meta ?? [])
        .filter((m) => m.name && !m.name.startsWith("og:") && m.name !== "description")
        .map((m) => [m.name!, m.content]),
    ),
  };

  const jsonLd = Array.isArray(filtered.jsonLd)
    ? (filtered.jsonLd as Array<Record<string, unknown>>)
    : filtered.jsonLd
      ? [filtered.jsonLd as Record<string, unknown>]
      : [];

  return { metadata, jsonLd };
}

function camel(value: string): string {
  return value.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase());
}

/** Request-memoized `buildHeadUncached`; both arguments are request-stable. */
export const buildHead = cache(buildHeadUncached);
