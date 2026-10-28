import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { getRelatedPosts } from "../../press/models/posts";
import { escapeHtml } from "../../press/content/format";
import type { Post } from "../../press/types";
import type { PressContext } from "../../press/context";

/**
 * Related Posts — appends a "Keep reading" section to single posts,
 * chosen by shared categories and tags. Pure `render_content` filter:
 * runs server-side before the page is cached, zero client cost.
 */
export const relatedPosts: PluginDefinition = {
  manifest: {
    slug: "related-posts",
    name: "Related Posts",
    description: "Appends a keep-reading section to every published post, picked by shared categories and tags.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.addFilter<string>(CoreHooks.RenderContent, async (html, ...args) => {
      const [post, press] = args as [Post, PressContext];
      if (!post || post.type !== "post" || post.status !== "publish") return html;
      const related = await getRelatedPosts(post, 3);
      if (related.length === 0) return html;

      const items = (
        await Promise.all(
          related.map(async (item) => {
            const url = await press.permalink(item);
            return `<li><a href="${escapeHtml(url)}">${escapeHtml(item.title)}</a></li>`;
          }),
        )
      ).join("");

      return `${html}
<aside class="vp-related" aria-label="Related posts">
  <h2 class="vp-related-title">Keep reading</h2>
  <ul class="vp-related-list">${items}</ul>
</aside>`;
    }, 50);
  },
};
