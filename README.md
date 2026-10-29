# VinextPress

**An open-source, code-first publishing platform that runs entirely on Cloudflare Workers.**

> Live reference deployment: <https://vp.manalejandro.com>

VinextPress gives you the classic blogging/CMS workflow — posts, pages, a media library, comments, categories and tags, themes, plugins, a dashboard and a JSON REST API — implemented as a single edge application. There is no origin server, no PHP runtime and no managed database: your content lives in D1 (serverless SQLite), files live in R2, images are transformed by Cloudflare Images, and rendered pages are cached at the edge with instant invalidation on publish.

Built with [vinext](https://vinext.dev) — the Next.js API surface re-implemented on Vite by Cloudflare — and deployed with the `cf` CLI.

## Features

- **Posts & pages** — Markdown or HTML content, drafts/private/published states, hierarchical pages, featured images, excerpts, reading-time, previous/next navigation
- **Themes** — swap the entire look of the site at runtime; themes are folders of React Server Components with a manifest, a palette and a template hierarchy (home / index / single / page / archive / search / 404 / comments / pagination)
- **Plugins** — eleven bundled extensions (SEO suite with per-post meta boxes, form builder with submissions inbox, redirect manager, cookieless analytics, login firewall + audit log, consent banner, share buttons, related posts, spam shield, shortcodes…) built on async filters/actions (`render_content`, `document_head`, `comment_preprocess`, `pre_not_found`, `login_throttle`…), `[shortcodes]`, plugin REST routes under `/api/v1/ext/<plugin>/…` and plugin-owned dashboard screens at `/admin/ext/<plugin>`
- **Dashboard** — `/admin`: install wizard, editor with live Markdown preview, comment moderation, media library, theme switcher, plugin toggles, settings, users & roles
- **REST API** — self-describing `/api/v1` with posts, pages, comments, categories, tags, media, users, settings, themes and plugins
- **Media library** — R2-backed uploads served through `/media/<key>` with on-the-fly resizing (`?w=800`) and format conversion (`&fmt=webp`) via the Images binding
- **Comments** — public forms (server actions, no client JS required), honeypot + heuristic spam filtering, manual or automatic moderation
- **SEO & feeds** — Open Graph, Twitter cards, JSON-LD, canonical URLs, robots directives, RSS at `/feed`, `sitemap.xml`, `robots.txt`
- **Permalinks** — `/post-name` or `/2026/10/post-name` structures with automatic canonical redirects; hierarchical page paths
- **Edge-native performance** — on-demand ISR through the Workers Response Store (R2-backed), `revalidatePath` invalidation on every mutation, zero cold-start origin
- **Auth built on WebCrypto** — PBKDF2-SHA256 passwords (100k iterations), HMAC-signed stateless session cookies, role-based capabilities (administrator / editor / author)
- **Observability** — Workers logs, real-time issues and traces enabled (`observability.enabled = true`)

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker                          │
│  vinext (App Router · RSC · server actions · route handlers)   │
│                                                                │
│  app/            routes: frontend catch-all, /admin, /api/v1   │
│  press/          core engine: query, hooks, content pipeline,  │
│                  models, auth, install, feeds, sitemap         │
│  themes/         meridian (default) · nocturne                 │
│  plugins/        seo-suite · related-posts · spam-shield ·     │
│                  shortcode-pack                                │
└───────┬───────────────┬───────────────┬───────────────┬────────┘
        │               │               │               │
      D1 (vp-db)    R2 (vp-media)   Images binding   Response Store
      content &     media bytes     resize/convert   ISR cache worker
      options                                       (R2 + SQLite DO)
```

Every public URL is resolved by one cacheable catch-all route: the **main query** maps the path to a view (home, single, page, archive, search, 404), and the **template hierarchy** picks the most specific template the active theme provides.

## Quick start (local)

Prerequisites: Node.js 20+, npm.

```bash
git clone https://github.com/manalejandro/cf-vinextpress.git
cd cf-vinextpress
npm install
npm run dev
```

Open http://localhost:5173/admin/install — the installer creates the schema (local D1/R2 are simulated and persisted under `.cloudflare/state`), your administrator account and starter content. No Cloudflare account needed for local development.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with simulated Workers bindings |
| `npm run build` | Production build (app + Response Store worker) |
| `npm run start` | Preview the built worker locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run deploy` | Build & deploy the application worker |
| `npm run deploy:response-store` | Deploy the ISR cache worker (only when its config changes) |
| `npm run db:migrate:apply:remote` | Apply `migrations/*.sql` to the production D1 database |

## Deploying to Cloudflare

1. **Authenticate**

   ```bash
   npx cf auth login          # or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
   ```

2. **Create the resources** (or reuse the ones already referenced in `cloudflare.config.ts`)

   ```bash
   npx cf d1 create vp-db                 # note the database id
   npx cf r2 buckets create --name vp-media
   ```

   Put the D1 `id` into the `DB` binding in [`cloudflare.config.ts`](./cloudflare.config.ts). The Response Store R2 bucket and any KV namespaces are provisioned automatically on deploy.

3. **Apply the schema**

   ```bash
   npm run db:migrate:apply:remote
   ```

4. **Configure the hostname & observability** — `cloudflare.config.ts` ships with:

   ```ts
   domains: ["vp.manalejandro.com"],          // your custom domain (zone must be in the account)
   observability: { enabled: true, headSamplingRate: 1 },
   limits: { cpuMs: 30_000 },                 // room for PBKDF2 + image transforms
   ```

5. **Deploy**

   ```bash
   npm run deploy:response-store   # first time only (or when the cache worker config changes)
   npm run deploy                  # builds and deploys the application worker
   ```

6. **Install the site** — open `https://<your-domain>/admin/install` (or `POST /api/v1/install` with JSON) and create the administrator account.

### GitHub Actions

`.github/workflows/deploy.yml` deploys on every push to `main` using two repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Repository layout

```
app/                  routes (frontend group, /admin dashboard, /api/v1, feed, sitemap, media)
press/                the core engine
  ├─ context.ts       per-request PressContext: settings + hooks + plugins + theme boot
  ├─ query.ts         main query: path → view resolution (permalinks, archives, pagination)
  ├─ hooks.ts         async filter/action registry (priority-ordered)
  ├─ head.ts          route Metadata + document_head contributions
  ├─ install.ts       installer & seed content
  ├─ models/          posts, terms, comments, users, media (D1 + R2)
  ├─ content/         markdown, shortcodes, formatting
  ├─ plugins/, themes/  registries + extension contracts
  └─ components/      core UI: comment form, comments, pagination, search
themes/               meridian/, nocturne/, broadsheet/, kite/ (+ index.ts registry)
plugins/              seo-suite/, related-posts/, spam-shield/, shortcode-pack/
migrations/           D1 schema migrations (mirrored by press/db/schema.ts)
docs/                 THEMES.md · PLUGINS.md · API.md
```

## Extending

- **[docs/THEMES.md](./docs/THEMES.md)** — theme anatomy, template hierarchy, palettes, the ThemeAPI
- **[docs/PLUGINS.md](./docs/PLUGINS.md)** — hooks reference, shortcodes, plugin REST routes, activation lifecycle
- **[docs/API.md](./docs/API.md)** — REST endpoints, authentication, query parameters

## Design notes

- **Caching** — the frontend catch-all returns `[]` from `generateStaticParams`, opting every path into on-demand ISR. Mutations call `revalidatePath("/", "layout")`, so published changes are visible immediately while cached responses keep the edge fast.
- **Cookies & ISR** — public pages never read cookies/headers, keeping them cacheable; comment forms identify signed-in authors inside the server action instead.
- **Security** — passwords hashed with PBKDF2 (100k iterations, per-user salt); sessions are HMAC-signed and expire after 7 days; comment content is escaped on render; uploads are size-capped; `HttpOnly`+`SameSite=Lax` cookies.
- **No client framework overhead** — the dashboard and public sites are React Server Components; the only client bundles are the editor preview, nav badge, comment form and small utilities.

## License

MIT © 2026 Manuel Alejandro — see [LICENSE](./LICENSE).
