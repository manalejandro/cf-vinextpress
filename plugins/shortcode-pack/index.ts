import type { PluginDefinition } from "../../press/plugins/types";
import { escapeHtml } from "../../press/content/format";
import { getMediaById, mediaUrl } from "../../press/models/media";

/**
 * Shortcode Pack — a small, useful set of content shortcodes:
 *
 *   [note type="info|tip|warning"]text[/note]
 *   [button url="/about" style="primary"]Label[/button]
 *   [image id="12" caption="..." width="800"]   (media library by id)
 *   [image src="/media/2026/10/x.png" alt="..."]
 *   [year]
 *   [hr]
 *
 * Styles live in globals.css (.vp-note, .vp-button, ...) so every theme
 * gets a consistent baseline and can override freely.
 */
export const shortcodePack: PluginDefinition = {
  manifest: {
    slug: "shortcode-pack",
    name: "Shortcode Pack",
    description: "Callouts, buttons, media-library images, horizontal rules and a [year] shortcode for evergreen footers.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.registerShortcode("note", (attrs, content) => {
      const type = ["info", "tip", "warning"].includes(attrs.type ?? "") ? attrs.type : "info";
      const body = content?.trim() ? content : "";
      return `<div class="vp-note vp-note-${escapeHtml(type!)}" role="note">${body}</div>`;
    });

    api.registerShortcode("button", (attrs, content) => {
      const url = attrs.url ?? "#";
      const style = attrs.style === "ghost" ? "vp-button-ghost" : "vp-button-solid";
      const label = content?.trim() || attrs.label || "Learn more";
      const external = /^https?:\/\//.test(url);
      const rel = external ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a class="vp-button ${style}" href="${escapeHtml(url)}"${rel}>${label}</a>`;
    });

    api.registerShortcode("image", async (attrs) => {
      let src = attrs.src ?? "";
      let alt = attrs.alt ?? "";
      let width = attrs.width ? Number(attrs.width) : undefined;

      if (attrs.id) {
        const media = await getMediaById(Number(attrs.id));
        if (!media) return "";
        src = mediaUrl(media);
        alt = alt || media.alt;
        width = width ?? media.width ?? undefined;
      }
      if (!src) return "";

      const caption = attrs.caption
        ? `<figcaption class="vp-figure-caption">${escapeHtml(attrs.caption)}</figcaption>`
        : "";
      const widthAttr = width ? ` width="${Math.min(width, 2000)}"` : "";
      return `<figure class="vp-figure"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${widthAttr} loading="lazy">${caption}</figure>`;
    });

    api.registerShortcode("year", () => `${new Date().getUTCFullYear()}`);

    api.registerShortcode("hr", () => `<hr class="vp-hr">`);

    // Custom-field reader: [field key="seo_focus"] prints a post meta value.
    api.registerShortcode("field", async (attrs, _content, _tag, ctx) => {
      const key = attrs.key ?? attrs.name ?? "";
      if (!key || !ctx?.post) return "";
      const { getPostMetaValue } = await import("../../press/models/postmeta");
      return escapeHtml(await getPostMetaValue(ctx.post.id, key));
    });
  },
};
