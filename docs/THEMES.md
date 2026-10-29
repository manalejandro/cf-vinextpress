# Theme development

A VinextPress theme is a folder of React Server Components plus a manifest. Themes never touch the database: the core resolves every request into a `MainQuery`, runs the content pipeline (Markdown → shortcodes → filters), and hands ready-to-render data to your templates.

Bundled themes live in [`themes/`](../themes):

| Theme | Character |
| --- | --- |
| **Meridian** (default) | warm editorial serif, paper palette, hairline rules |
| **Nocturne** | dark terminal-inspired, mono kickers, card grid |
| **Broadsheet** | newspaper magazine: dated masthead, lead story + sections sidebar, drop caps |
| **Kite** | minimal multipurpose: cool neutrals, hairlines, generous whitespace |

Copy any of them as a starting point.

## Anatomy

```
themes/my-theme/
  theme.ts        # manifest + template assembly (required)
  header.tsx      # SiteHeader
  footer.tsx      # SiteFooter
  listing.tsx     # Home / Index / Archive / Search
  single.tsx      # Single / Page
  not-found.tsx   # NotFound
```

Register it in `themes/index.ts`:

```ts
import { myTheme } from "./my-theme/theme";
export const THEMES = [meridian, nocturne, myTheme];
```

The theme becomes selectable in **Dashboard → Appearance** after the next build/deploy — switching is a runtime option, never a rebuild.

## The theme object

```ts
import type { Theme } from "../press/themes/types";

export const myTheme: Theme = {
  manifest: {
    slug: "my-theme",            // unique, stable; stored in the options table
    name: "My Theme",
    version: "1.0.0",
    author: "You",
    description: "Shown on the Appearance screen.",
    screenshot: svgScreenshot({ /* see themes/screenshot.ts */ }),
    palette: {                   // injected as CSS variables on the site wrapper
      "--vp-color-scheme": "dark",   // "light" | "dark"
      "--vp-bg": "#0a0d12",
      "--vp-card": "#11161d",
      "--vp-ink": "#e6edf3",
      "--vp-muted": "#8b98a5",
      "--vp-accent": "#4cc2ff",
      "--vp-line": "#1d2733",
      "--vp-radius": "0.75rem",
      "--vp-font-head": "Georgia, serif",
      "--vp-font-body": "system-ui, sans-serif",
      "--vp-font-mono": "ui-monospace, monospace",
    },
  },
  templates: { SiteHeader, SiteFooter, Index, Single, /* optional: */ Home, Page, Archive, Search, NotFound, Comments, Pagination },
  setup(api) {
    // optional: register filters/shortcodes like a plugin (see PLUGINS.md)
  },
};
```

## Templates & the hierarchy

| Template | Renders | Required | Fallback |
| --- | --- | --- | --- |
| `SiteHeader` / `SiteFooter` | site chrome around every public page | ✅ | — |
| `Index` | blog listing, generic archive | ✅ | — |
| `Single` | one post | ✅ | — |
| `Home` | front page when it shows latest posts | — | `Index` |
| `Page` | static page | — | `Single` |
| `Archive` | category / tag / author / date | — | `Index` |
| `Search` | search results | — | `Index` |
| `NotFound` | themed 404 | — | core default |
| `Comments` | comment list + form | — | core `Comments` |
| `Pagination` | pager | — | core `Pagination` |

All templates are **server components** and may be `async`. Props are fully resolved data:

```ts
interface ListProps {
  press: PressContext;      // settings, filters, content pipeline
  site: SiteContext;        // { settings, url, description }
  query: MainQuery;         // kind, path, term/author/date, pagination…
  posts: PostWithAuthor[];
  pagination: Pagination;
  basePath: string;         // pagination base ("/", "/category/news")
  hrefForPage?: (page: number) => string;   // set by the search route
  heading?: string; description?: string;
}

interface SingleProps {
  press; site; query;
  post: PostWithAuthor;
  renderedContent: string;  // final HTML: markdown + shortcodes + render_content filters
  renderedExcerpt: string;
  terms: Term[];            // categories + tags (posts)
  comments: Comment[];      // approved only
  previous: PostWithAuthor | null;
  next: PostWithAuthor | null;
  children?: PostWithAuthor[];              // child pages (Page template)
  breadcrumbs: Array<{ label; url? }>;
  featuredImage?: { url; alt; caption?; width?; height? } | null;
}
```

Render post content with `dangerouslySetInnerHTML={{ __html: renderedContent }}` — the pipeline output is trusted author content. Style it with the `.vp-content` class (typography lives in `app/globals.css`, driven by your palette variables).

### Helpers you can reuse

```tsx
import { Comments } from "../../press/components/Comments";     // full comment section + form
import { Pagination } from "../../press/components/Pagination"; // prev/next + page window
import { SearchForm } from "../../press/components/SearchForm";
import { readingTimeMinutes } from "../../press/content/format";
import { formatDate, timeAgo } from "../../press/utils/dates";
import { categoryPath, tagPath, authorPath } from "../../press/permalinks";
```

Post URLs: always use `await press.permalink(post)` — it respects the configured permalink structure and the `post_permalink` filter.

## Styling contract

Core CSS (prose, notes, buttons, figures, comments, pagination) reads your palette variables. Setting the `--vp-*` tokens in `manifest.palette` is usually enough; add Tailwind utilities (or a CSS file imported from `theme.ts`) for layout. Class names core components rely on: `.vp-content`, `.vp-note`, `.vp-button`, `.vp-figure`, `.vp-related`, `.vp-comments*`, `.vp-pagination*` — override them per theme via a wrapper attribute selector, e.g. `[data-theme="my-theme"] .vp-note { … }`.

## Theme `setup()` hooks

`setup(api)` receives the same API plugins get. Themes typically use it for presentation filters:

```ts
setup(api) {
  api.addFilter("render_excerpt", (excerpt) => excerpt.slice(0, 160));
  api.addFilter("nav_menu", (items) => [...items, { label: "RSS", url: "/feed" }]);
  api.addFilter("archive_title", (title, query) => title.toUpperCase());
}
```

Theme hooks are registered under the `theme:<slug>` namespace and boot on every request while the theme is active.

## Checklist for a new theme

1. Copy `themes/nocturne` → rename slug/name, adjust `palette`.
2. Implement the five required templates; lean on core `Comments`/`Pagination` first.
3. Register in `themes/index.ts`.
4. `npm run dev` → **Appearance** → activate → browse home, single, page, archive, search, 404.
5. Screenshot: extend `themes/screenshot.ts` or embed any `data:image/svg+xml` URI.
