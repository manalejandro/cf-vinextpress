import type { PluginDefinition } from "../../press/plugins/types";
import type { HeadContribution, MainQuery } from "../../press/types";
import type { PressContext } from "../../press/context";
import { CoreHooks } from "../../press/hooks";
import { getPostTerms } from "../../press/models/posts";
import { getMediaById, mediaUrl } from "../../press/models/media";
import { absoluteUrl, postPath } from "../../press/permalinks";
import { isoDate } from "../../press/utils/dates";

/**
 * SEO Suite — search engine and social card enhancements.
 *
 * Hooks into `document_head` to emit Open Graph article metadata,
 * Twitter cards, robots directives and schema.org JSON-LD.
 */
export const seoSuite: PluginDefinition = {
  manifest: {
    slug: "seo-suite",
    name: "SEO Suite",
    description:
      "Open Graph, Twitter cards, robots directives and schema.org JSON-LD for every view — injected through the document_head filter.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.addFilter<HeadContribution>(
      CoreHooks.DocumentHead,
      async (head, ...args) => {
        const [query, press] = args as [MainQuery, PressContext];
        const origin = press.settings.siteUrl;
        const contribution: HeadContribution = { ...head };
        contribution.meta = [...(head.meta ?? [])];
        contribution.jsonLd = Array.isArray(head.jsonLd) ? [...head.jsonLd] : head.jsonLd ? [head.jsonLd] : [];

        // Robots: index everything except search results and paginated tails.
        const noindex = query.kind === "search" || query.pagination.page > 1;
        contribution.meta.push({
          name: "robots",
          content: noindex ? "noindex, follow" : "index, follow, max-image-preview:large",
        });
        contribution.meta.push({ name: "twitter:card", content: "summary_large_image" });

        // Site-level WebPage schema on the front page.
        if (origin && query.kind === "home" && !query.post) {
          (contribution.jsonLd as Array<Record<string, unknown>>).push({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: press.settings.siteTitle,
            description: press.settings.siteTagline,
            url: absoluteUrl(origin, "/"),
          });
        }

        // Article schema with keywords for single posts.
        const post = query.post;
        if (origin && post && query.kind === "single") {
          const url = absoluteUrl(origin, postPath(post, press.settings));
          const terms = await getPostTerms(post.id);
          let image: string | undefined;
          if (post.featuredMediaId) {
            const media = await getMediaById(post.featuredMediaId);
            if (media && media.mimeType.startsWith("image/")) {
              image = absoluteUrl(origin, mediaUrl(media));
            }
          }
          (contribution.jsonLd as Array<Record<string, unknown>>).push({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: (await press.renderExcerpt(post)).slice(0, 300),
            datePublished: isoDate(post.publishedAt ?? post.createdAt),
            dateModified: isoDate(post.updatedAt),
            author: { "@type": "Person", name: post.authorName },
            publisher: { "@type": "Organization", name: press.settings.siteTitle },
            keywords: terms.map((t) => t.name).join(", ") || undefined,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            image,
          });

          contribution.meta.push({
            property: "article:published_time",
            content: isoDate(post.publishedAt ?? post.createdAt),
          });
          contribution.meta.push({ property: "article:author", content: post.authorName });
          for (const term of terms.filter((t) => t.taxonomy === "category")) {
            contribution.meta.push({ property: "article:section", content: term.name });
          }
          for (const term of terms.filter((t) => t.taxonomy === "tag")) {
            contribution.meta.push({ property: "article:tag", content: term.name });
          }
        }

        return contribution;
      },
      20,
    );
  },
};
