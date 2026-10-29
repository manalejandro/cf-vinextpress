import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";
import { escapeHtml } from "../../press/content/format";
import type { Post } from "../../press/types";
import type { PressContext } from "../../press/context";

/**
 * Social Share — lightweight share bar appended to published posts.
 *
 * Plain anchor links to the major networks' share intents (no scripts, no
 * trackers, no third-party requests until the visitor clicks), styled to
 * inherit the active theme's palette.
 */

const NETWORKS: Array<{ key: string; label: string; href: (url: string, title: string) => string }> = [
  { key: "x", label: "Share on X", href: (u, t) => `https://x.com/intent/post?url=${u}&text=${t}` },
  { key: "facebook", label: "Share on Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  {
    key: "linkedin",
    label: "Share on LinkedIn",
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  },
  { key: "reddit", label: "Share on Reddit", href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}` },
  { key: "email", label: "Share by email", href: (u, t) => `mailto:?subject=${t}&body=${u}` },
];

const ICONS: Record<string, string> = {
  x: "𝕏",
  facebook: "f",
  linkedin: "in",
  reddit: "◉",
  email: "✉",
};

export const socialShare: PluginDefinition = {
  manifest: {
    slug: "social-share",
    name: "Social Share",
    description:
      "Privacy-friendly share bar (X, Facebook, LinkedIn, Reddit, email) appended to posts. Plain links — no trackers loaded.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    api.addFilter<string>(CoreHooks.RenderContent, async (html, ...args) => {
      const [post, press] = args as [Post, PressContext];
      if (!post || post.type !== "post" || post.status !== "publish") return html;
      const origin = press.settings.siteUrl;
      if (!origin) return html; // absolute URLs required by share intents
      const path = await press.permalink(post);
      const url = encodeURIComponent(origin + path);
      const title = encodeURIComponent(post.title);

      const buttons = NETWORKS.map(
        (network) =>
          `<a class="vp-share-btn vp-share-${network.key}" href="${escapeHtml(network.href(url, title))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(network.label)}" title="${escapeHtml(network.label)}"><span aria-hidden="true">${ICONS[network.key]}</span><span class="vp-share-label">${escapeHtml(network.label.replace("Share ", ""))}</span></a>`,
      ).join("");

      return `${html}
<div class="vp-share" role="group" aria-label="Share this post">
  <span class="vp-share-title">Share</span>
  ${buttons}
</div>`;
    }, 60);

    api.addFilter<unknown[]>(CoreHooks.DocumentFooter, (nodes) => [
      ...nodes,
      <style
        key="social-share-css"
        dangerouslySetInnerHTML={{
          __html: `.vp-share{display:flex;flex-wrap:wrap;align-items:center;gap:.5em;margin-top:2.5em;padding-top:1.2em;border-top:1px solid var(--vp-line)}
.vp-share-title{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--vp-muted);margin-right:.5em}
.vp-share-btn{display:inline-flex;align-items:center;gap:.4em;border:1px solid var(--vp-line);border-radius:999px;padding:.35em .9em;font-size:.78rem;font-weight:600;color:var(--vp-ink);text-decoration:none;transition:all .15s ease}
.vp-share-btn:hover{border-color:var(--vp-accent);color:var(--vp-accent)}
.vp-share-btn span[aria-hidden]{font-size:.9em}
@media (max-width:480px){.vp-share-label{display:none}}`,
        }}
      />,
    ]);
  },
};
