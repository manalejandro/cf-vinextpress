# Plugin development

A plugin is a plain TypeScript module: a manifest plus a `setup()` function. Because plugins are bundled at build time and gated by an option at runtime, activating/deactivating is instant and requires no deploy — but adding a *new* plugin to the codebase does.

Bundled examples live in [`plugins/`](../plugins): **SEO Suite** (`document_head`), **Related Posts** (`render_content`), **Spam Shield** (`comment_preprocess`), **Shortcode Pack** (shortcodes).

## Quick start

```
plugins/my-plugin/
  index.ts
```

```ts
import type { PluginDefinition } from "../../press/plugins/types";
import { CoreHooks } from "../../press/hooks";

export const myPlugin: PluginDefinition = {
  manifest: {
    slug: "my-plugin",          // unique; stored in the active_plugins option
    name: "My Plugin",
    description: "One sentence for the dashboard.",
    version: "1.0.0",
    author: "You",
  },
  setup(api) {
    api.addFilter<string>(CoreHooks.RenderContent, (html, post) =>
      html.replace(/™/g, "<sup>TM</sup>"));
  },
};
```

Register it in `plugins/index.ts`:

```ts
export const PLUGINS: PluginDefinition[] = [seoSuite, relatedPosts, spamShield, shortcodePack, myPlugin];
```

Deploy, then toggle it under **Dashboard → Plugins** (or `POST /api/v1/plugins {slug, active}`).

## Lifecycle

`setup(api)` runs **once per request**, only while the plugin is active, against that request's fresh hook registry (built by `getPress()`). Keep it cheap and synchronous-ish: register callbacks, don't do I/O at setup time — do I/O inside the callbacks.

## The PluginAPI

```ts
interface PluginAPI {
  addFilter<T>(hook: string, cb: (value: T, ...args) => T | Promise<T>, priority?: number): void;
  addAction(hook: string, cb: (...args) => void | Promise<void>, priority?: number): void;
  registerShortcode(name: string, handler: (attrs, content | null, tag) => string | Promise<string>): void;
  registerRestRoute(path: string, handlers: { GET?, POST?, PUT?, DELETE? }): void;
}
```

Filters run sequentially in priority order (lower first, default `10`); each receives the previous callback's output. Actions run after core has done the work (notifications).

## Core hooks reference

`import { CoreHooks } from "@/press/hooks"` (or use the raw strings).

### Filters

| Hook | Value | Extra args | Fired when |
| --- | --- | --- | --- |
| `render_content` | `html: string` | `post, press` | after Markdown + shortcodes, before output |
| `render_title` | `title: string` | `post, press` | any title display |
| `render_excerpt` | `excerpt: string` | `post, press` | listings, feeds, meta descriptions |
| `document_head` | `HeadContribution` | `query, press` | building route Metadata (see below) |
| `nav_menu` | `NavMenuItem[]` | — | theme header/footer menus |
| `pre_main_query` | `MainQuery` | — | after path resolution, before rendering |
| `comment_preprocess` | `NewCommentInput \| null` | `post` | before storing a comment; return `null` to reject, or set `status: "spam"` |
| `feed_items` | `PostWithAuthor[]` | `settings` | RSS generation |
| `post_permalink` | `path: string` | `post, settings` | every URL computation |
| `archive_title` | `title: string` | `query` | archive/search headings |

### Actions

| Hook | Args | Fired when |
| --- | --- | --- |
| `post_saved` | `post, previous \| null` | create/update (REST + dashboard) |
| `post_deleted` | `post` | permanent delete |
| `comment_submitted` | `comment, post` | comment accepted |
| `media_uploaded` | `media` | after R2 put + row insert |
| `install_completed` | `settings` | installer finished |
| `theme_setup` | `theme, press` | active theme booted for the request |

### Contributing to `<head>`

The `document_head` filter receives a mutable contribution object:

```ts
api.addFilter(CoreHooks.DocumentHead, (head, query, press) => {
  head.meta = [...(head.meta ?? []), { name: "generator", content: "VinextPress" }];
  head.links = [...(head.links ?? []), { rel: "preconnect", href: "https://example.com" }];
  head.jsonLd = [...(head.jsonLd ?? []), { "@context": "https://schema.org", "@type": "WebSite", /* … */ }];
  // head.title / head.description override the computed ones
  return head;
}, 100); // run after SEO Suite (priority 20)
```

`og:*` meta entries merge into Next.js OpenGraph metadata; everything else is emitted as `<meta>`; `jsonLd` blocks are rendered as `<script type="application/ld+json">`.

## Shortcodes

```ts
api.registerShortcode("cta", async (attrs, content) => {
  const url = attrs.url ?? "/";
  return `<a class="vp-button vp-button-solid" href="${url}">${content ?? attrs.label ?? "Go"}</a>`;
});
```

Authors write `[cta url="/pricing"]See pricing[/cta]`. Details:

- Attributes: `key="value"`, `key='value'`, `key=value` and bare flags (`[hr large]` → `attrs.large === "true"`)
- Paired (`[x]…[/x]`) or self-closing (`[x /]`); inner content is expanded recursively (depth-capped) and passed as `content`
- Handlers are `async` — query D1, call other services
- Unknown shortcodes render as literal text
- Output runs **before** `render_content` filters and before caching (no client JS involved)

## Plugin REST routes

Routes mount under `/api/v1/ext/<your-slug>/<path>`:

```ts
api.registerRestRoute("stats/:slug", {
  async GET(request, { press, user, params, url }) {
    const { getPostBySlug } = await import("../../press/models/posts");
    const post = await getPostBySlug("post", params.slug!);
    if (!post) return Response.json({ error: "not found" }, { status: 404 });
    if (url.searchParams.get("secret") !== "1" && !user) {
      return Response.json({ error: "auth required" }, { status: 401 });
    }
    return Response.json({ slug: post.slug, words: post.content.split(/\s+/).length });
  },
});
```

`:param` segments are captured into `ctx.params`. Inactive plugins' routes 404 automatically. Use `ctx.user` (session cookie) for authorization.

## Working with data

Plugins are first-class code — import models directly:

```ts
import { listPosts, getPostById, savePost } from "@/press/models/posts";
import { listTerms, createTerm } from "@/press/models/terms";
import { getOption, setOption } from "@/press/options";
```

Rules of thumb:

- Store plugin settings as options (`setOption("myplugin_key", …)`) — they ride along with backups and the options API
- Don't mutate posts inside `render_content` filters; use `post_saved` actions for writes
- Cache invalidation is core's job after mutations; after writing options that affect public pages call `revalidateSite()` from `@/press/cache` yourself

## Testing a plugin locally

1. `npm run dev`
2. Activate it in **Dashboard → Plugins**
3. Exercise the surface: content filters via any post, head filters via `curl -s localhost:5173/post | grep '<meta'`, shortcodes by editing a post, REST routes with `curl localhost:5173/api/v1/ext/<slug>/…`
