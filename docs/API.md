# REST API

Base path: `/api/v1`. All responses are JSON (`application/json; charset=utf-8`). `GET /api/v1` returns the discovery document.

## Authentication

Writes use the dashboard **session cookie** (`vinextpress_session`) — sign in at `/admin/login` and reuse the cookie, or install through `POST /api/v1/install` which sets it in the response. Reads of published content are public.

Roles: `administrator` (everything) · `editor` (all content + moderation) · `author` (own posts, uploads).

Pagination: `?page=2&per_page=20` (max 100). List responses include `x-total` and `x-total-pages` headers. Errors: `{ "code": <http status>, "message": "…" }`.

## Endpoints

### Posts & pages

```
GET    /api/v1/posts?status=publish&search=…&category=slug&author=ID&page=1&per_page=10
POST   /api/v1/posts                       (auth: author+)
GET    /api/v1/posts/{idOrSlug}
PUT    /api/v1/posts/{idOrSlug}            (auth; PATCH alias available)
DELETE /api/v1/posts/{idOrSlug}            (auth; trashes — ?force=true deletes permanently)
```

`/api/v1/pages` mirrors the same verbs for `type=page` (supports `?parent=ID`).

POST/PUT body (all optional except `title` on create):

```json
{
  "title": "Hello",
  "slug": "hello",
  "content": "## Markdown **works**",
  "content_format": "markdown",
  "excerpt": "…",
  "status": "publish",
  "categories": [1, 2],
  "tags": ["edge", "workers"],
  "featured_media": 12,
  "comment_status": "open",
  "parent": null,
  "menu_order": 0
}
```

Serialized post:

```json
{
  "id": 4, "slug": "hello", "status": "publish", "type": "post",
  "date": "2026-10-28T12:00:00.000Z", "modified": "…",
  "link": "https://example.com/hello",
  "title": { "raw": "…", "rendered": "…" },
  "content": { "rendered": "<h2>…</h2>" },
  "excerpt": { "rendered": "…" },
  "author": 1, "author_name": "ale",
  "categories": [1], "tags": [3], "featured_media": null,
  "comment_status": "open", "parent": 0, "menu_order": 0
}
```

### Comments

```
GET  /api/v1/comments?post=4&status=approved   (moderators may pass status=pending|spam|trash|all)
POST /api/v1/comments                          (public; moderated per site settings + spam filters)
     body: { "post": 4, "author_name": "…", "author_email": "…", "author_url": "…", "content": "…", "parent": 0 }
GET  /api/v1/comments/{id}
PUT  /api/v1/comments/{id}   body: { "status": "approved|pending|spam|trash" }   (auth: editor+)
DELETE /api/v1/comments/{id}                                                     (auth: editor+)
```

### Taxonomies

```
GET  /api/v1/categories?hide_empty=true      GET /api/v1/tags
POST /api/v1/categories  { "name": "News", "slug": "news", "description": "" }   (auth: editor+)
```

### Media

```
GET    /api/v1/media?page=1&per_page=24
POST   /api/v1/media        multipart/form-data, field: file (≤25 MB) + optional alt, caption   (auth: author+)
GET    /api/v1/media/{id}
PUT    /api/v1/media/{id}   { "alt": "…", "caption": "…" }
DELETE /api/v1/media/{id}
```

File bytes are served (and transformed) at `GET /media/{r2_key}` — not part of `/api/v1`. Query params: `?w=800` (max 2560), `&fmt=webp|avif|jpeg|png` (Cloudflare Images).

### Users

```
GET  /api/v1/users        (auth; emails hidden from non-admins)
POST /api/v1/users        (admin) { "username", "email", "password", "role", "display_name"? }
PATCH /api/v1/users       (self-service profile, or admin for others) { "display_name"?, "password"?, "id"? }
GET  /api/v1/users/me
```

### Settings, themes, plugins

```
GET /api/v1/settings                    (public subset; full for admins)
PUT /api/v1/settings                    (admin)
    { "title", "description", "url", "admin_email", "permalink_structure": "post-name"|"date",
      "posts_per_page", "show_on_front": "posts"|"page", "page_on_front", "page_for_posts",
      "comment_moderation": "manual"|"auto", "require_name_email", "nav_menu": [{label,url}] }

GET  /api/v1/themes                     (list + active flag + screenshots)
POST /api/v1/themes   { "slug": "nocturne" }        (admin)

GET  /api/v1/plugins
POST /api/v1/plugins  { "slug": "related-posts", "active": false }   (admin)
```

### Installation

```
GET  /api/v1/install        → { "installed": bool }
POST /api/v1/install        (only while uninstalled; sets the admin session cookie)
     { "site_title", "site_tagline"?, "site_url"?, "admin_username", "admin_email", "admin_password" }
```

### Plugin routes

Active plugins may mount handlers under:

```
/api/v1/ext/{plugin-slug}/{path}
```

See [PLUGINS.md](./PLUGINS.md#plugin-rest-routes).

## Non-JSON endpoints

| Path | Content |
| --- | --- |
| `/feed` | RSS 2.0 (latest 20 published posts, full content encoded) |
| `/sitemap.xml` | posts, pages, non-empty category/tag archives |
| `/robots.txt` | allows all, disallows `/admin` + `/api`, links the sitemap |

## Examples

```bash
# Publish from a script
curl -X POST https://example.com/api/v1/posts \
  -H 'content-type: application/json' \
  -b 'vinextpress_session=<cookie>' \
  -d '{"title":"Deploy day","content":"We shipped.","status":"publish","tags":["meta"]}'

# Fetch everything for a static mirror
curl 'https://example.com/api/v1/posts?per_page=100' | jq '.[].link'
```
