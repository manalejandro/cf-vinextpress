import type { PluginDefinition } from "../../press/plugins/types";
import type { ReactNode } from "react";
import { CoreHooks } from "../../press/hooks";
import { getPostMeta } from "../../press/models/postmeta";
import { escapeHtml } from "../../press/content/format";
import type { HeadContribution, MainQuery, Post } from "../../press/types";
import type { PressContext } from "../../press/context";

/**
 * Searchlight — per-entry SEO controls.
 *
 * Adds an SEO meta box to the post/page editor (meta title, description,
 * focus phrase, canonical override, noindex) stored as post meta, then
 * applies those values over the computed document head. Also provides a
 * [breadcrumbs] shortcode and emits breadcrumb JSON-LD for single posts.
 */

interface SeoMeta {
  seo_title?: string;
  seo_description?: string;
  seo_focus?: string;
  seo_canonical?: string;
  seo_noindex?: string;
}

async function metaFor(query: MainQuery): Promise<SeoMeta | null> {
  const post = query.post;
  if (!post || (query.kind !== "single" && query.kind !== "page" && query.kind !== "home")) return null;
  return getPostMeta(post.id) as Promise<SeoMeta>;
}

function editorField(props: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  type?: "input" | "textarea";
}): ReactNode {
  const control =
    props.type === "textarea" ? (
      <textarea
        name={`meta[${props.name}]`}
        defaultValue={props.defaultValue ?? ""}
        rows={2}
        maxLength={300}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
      />
    ) : (
      <input
        name={`meta[${props.name}]`}
        defaultValue={props.defaultValue ?? ""}
        maxLength={300}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
      />
    );
  return (
    <label key={props.name} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{props.label}</span>
      {control}
      {props.hint ? <span className="mt-1 block text-[11px] text-slate-400">{props.hint}</span> : null}
    </label>
  );
}

export const searchlight: PluginDefinition = {
  manifest: {
    slug: "searchlight",
    name: "Searchlight SEO",
    description:
      "Per-post SEO titles, meta descriptions, canonical overrides and noindex, plus breadcrumbs and a live snippet preview in the editor.",
    version: "1.0.0",
    author: "VinextPress",
  },

  setup(api) {
    // 1) Meta box in the editor.
    api.addFilter<ReactNode[]>(CoreHooks.AdminEditorFields, async (nodes, ...args) => {
      const [{ post }] = args as [{ post: Post | null; type: string; press: PressContext }];
      const meta = post ? await getPostMeta(post.id) : {};
      const title = String(meta.seo_title ?? "");
      const description = String(meta.seo_description ?? "");
      return [
        ...nodes,
        <div key="searchlight-box" className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-800">🔍 Searchlight SEO</p>
          <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] leading-5 text-slate-500">
            <span className="block truncate text-sm font-medium text-[#1a0dab]">
              {title || post?.title || "Post title"} – site title
            </span>
            <span className="block truncate text-[#006621]">https://your-site{post ? `/${post.slug}` : "/slug"}</span>
            <span className="block truncate">{description || "The meta description appears here — aim for 120–160 characters."}</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {editorField({ name: "seo_title", label: "SEO title", defaultValue: title, hint: "Overrides the visible title in search results." })}
            {editorField({ name: "seo_focus", label: "Focus phrase", defaultValue: String(meta.seo_focus ?? ""), hint: "The topic this entry targets." })}
            {editorField({ name: "seo_description", label: "Meta description", defaultValue: description, type: "textarea", hint: "120–160 characters recommended." })}
            {editorField({ name: "seo_canonical", label: "Canonical URL", defaultValue: String(meta.seo_canonical ?? ""), hint: "Absolute URL when content is syndicated." })}
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input type="hidden" name="meta[seo_noindex]" value="0" />
              <input
                type="checkbox"
                name="meta[seo_noindex]"
                value="1"
                defaultChecked={meta.seo_noindex === "1"}
                className="h-4 w-4 accent-orange-600"
              />
              Ask search engines not to index this entry
            </label>
          </div>
        </div>,
      ];
    }, 10);

    // 2) Apply stored values over the computed head.
    api.addFilter<HeadContribution>(CoreHooks.DocumentHead, async (head, ...args) => {
      const [query] = args as [MainQuery, PressContext];
      const meta = await metaFor(query);
      if (!meta) return head;
      const next: HeadContribution = { ...head, meta: [...(head.meta ?? [])], links: [...(head.links ?? [])] };
      if (meta.seo_title) next.title = meta.seo_title;
      if (meta.seo_description) next.description = meta.seo_description;
      if (meta.seo_noindex === "1") {
        next.meta = (next.meta ?? []).filter((m) => m.name !== "robots");
        next.meta.push({ name: "robots", content: "noindex, follow" });
      }
      if (meta.seo_canonical) {
        next.links = (next.links ?? []).filter((l) => l.rel !== "canonical");
        next.links.push({ rel: "canonical", href: meta.seo_canonical });
      }
      return next;
    }, 40); // after SEO Suite (20)

    // 3) Breadcrumbs shortcode.
    api.registerShortcode("breadcrumbs", async (_attrs, _content, _tag, ctx) => {
      const post = ctx?.post;
      const press = ctx?.press;
      if (!post || !press) return "";
      const { getPostTerms } = await import("../../press/models/posts");
      const terms = await getPostTerms(post.id, "category");
      const crumbs: Array<{ label: string; url?: string }> = [{ label: "Home", url: "/" }];
      if (terms[0]) crumbs.push({ label: terms[0].name, url: `/category/${terms[0].slug}` });
      crumbs.push({ label: post.title });
      const items = crumbs
        .map(
          (c, i) =>
            `<li>${
              c.url && i < crumbs.length - 1
                ? `<a href="${escapeHtml(c.url)}">${escapeHtml(c.label)}</a>`
                : `<span aria-current="page">${escapeHtml(c.label)}</span>`
            }</li>`,
        )
        .join("");
      return `<nav class="vp-breadcrumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
    });

    // 4) Breadcrumb styles.
    api.addFilter<unknown[]>(CoreHooks.DocumentFooter, (nodes) => [
      ...nodes,
      <style
        key="searchlight-css"
        dangerouslySetInnerHTML={{
          __html: `.vp-breadcrumbs{margin:0 0 1.5em;font-size:.8rem;color:var(--vp-muted)}
.vp-breadcrumbs ol{display:flex;flex-wrap:wrap;gap:.4em;list-style:none;margin:0;padding:0}
.vp-breadcrumbs a{color:var(--vp-accent);text-decoration:none}
.vp-breadcrumbs a:hover{text-decoration:underline}
.vp-breadcrumbs li+li::before{content:"/";margin-right:.4em;color:var(--vp-line)}`,
        }}
      />,
    ]);
  },
};
