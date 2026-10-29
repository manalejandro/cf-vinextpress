import { ensureSchema } from "./db/schema";
import { db } from "./db/client";
import { freshSettings, getSecretKey, setOption } from "./options";
import { bootPress } from "./context";
import { CoreHooks } from "./hooks";
import { createUser } from "./models/users";
import { hashPassword } from "./auth";
import { savePost } from "./models/posts";
import { createTerm } from "./models/terms";
import { insertComment } from "./models/comments";
import { nowDb } from "./utils/dates";

/**
 * The installer: creates the schema, the first administrator, sensible
 * default options and a small set of starter content so a fresh site is
 * alive in under a minute. Idempotent guard: refuses to run twice.
 */

export interface InstallInput {
  siteTitle: string;
  siteTagline?: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  siteUrl?: string;
}

export const DEFAULT_ACTIVE_PLUGINS = [
  "seo-suite",
  "related-posts",
  "spam-shield",
  "shortcode-pack",
  "formsmith",
  "searchlight",
  "waypoint",
  "pulse",
  "bastion",
  "social-share",
];

export async function isSiteInstalled(): Promise<boolean> {
  const settings = await freshSettings();
  return settings.installed;
}

export async function installSite(input: InstallInput): Promise<void> {
  if (await isSiteInstalled()) {
    throw new Error("VinextPress is already installed on this database.");
  }
  await ensureSchema();

  // Force creation of the site secret used to sign session cookies.
  await getSecretKey();

  const passwordHash = await hashPassword(input.adminPassword);
  const admin = await createUser({
    username: input.adminUsername,
    email: input.adminEmail,
    displayName: input.adminUsername,
    passwordHash,
    role: "administrator",
  });

  const options: Record<string, string> = {
    site_title: input.siteTitle.trim() || "VinextPress",
    site_tagline: (input.siteTagline ?? "Publishing at the edge").trim(),
    admin_email: input.adminEmail.trim(),
    site_url: (input.siteUrl ?? "").replace(/\/+$/, ""),
    permalink_structure: "post-name",
    posts_per_page: "10",
    show_on_front: "posts",
    comment_moderation: "manual",
    require_name_email: "1",
    active_theme: "meridian",
    active_plugins: JSON.stringify(DEFAULT_ACTIVE_PLUGINS),
    nav_menu: JSON.stringify([{ label: "Home", url: "/" }]),
    installed: "1",
    installed_at: nowDb(),
  };
  await db().batch(
    Object.entries(options).map(([name, value]) =>
      db()
        .prepare("INSERT INTO vp_options (name, value, autoload) VALUES (?1, ?2, 1) ON CONFLICT(name) DO UPDATE SET value = ?2")
        .bind(name, value),
    ),
  );

  await seedContent(admin.id);

  const press = await bootPress(await freshSettings());
  await press.doAction(CoreHooks.InstallCompleted, [press.settings]);
}

/** Starter content: a welcome post, a features post, an About page and a first comment. */
async function seedContent(adminId: number): Promise<void> {
  const announcements = await createTerm("category", "Announcements");
  const engineering = await createTerm("category", "Engineering");
  await createTerm("tag", "edge");
  await createTerm("tag", "serverless");

  const welcome = await savePost({
    type: "post",
    status: "publish",
    authorId: adminId,
    title: "Welcome to VinextPress",
    slug: "welcome-to-vinextpress",
    excerpt: "Your new publishing platform is live — running entirely on Cloudflare Workers, with D1 storage, R2 media and edge caching.",
    contentFormat: "markdown",
    content: `Congratulations — your site is live, and every byte of it is served from the edge.

## What you are running

VinextPress is a self-contained publishing platform built on **Cloudflare Workers**:

- **Posts & pages** stored in D1, the serverless SQLite database
- **Media library** backed by R2 object storage, with on-the-fly image transforms
- **Themes** that swap the entire look of your site in one click
- **Plugins** that hook into filters and actions across the rendering pipeline
- **Edge caching** with instant invalidation the moment you publish

## Writing in Markdown

Posts are written in Markdown by default. Lists, links, quotes and code all work:

\`\`\`ts
// A tiny edge function — this whole site is made of these
export default {
  fetch(request: Request) {
    return new Response("Hello from the edge");
  },
};
\`\`\`

> Prefer HTML? Every post can switch its content format — the rendering
> pipeline handles both.

## Try a shortcode

Plugins can register shortcodes. With the bundled **Shortcode Pack** active,
this renders a callout:

[note]Shortcodes are expanded server-side, before the page is cached — zero
client JavaScript required.[/note]

## Next steps

1. Visit **/admin** and make the site yours (Settings → General).
2. Write your first real post, then delete this one.
3. Browse **Appearance** to switch themes, and **Plugins** to extend behaviour.

Happy publishing!`,
    categories: [announcements.id],
    tags: ["edge", "serverless"],
  });

  await savePost({
    type: "post",
    status: "publish",
    authorId: adminId,
    title: "Themes and Plugins, First-Class Citizens",
    slug: "themes-and-plugins",
    excerpt: "How the extension architecture works: hooks, shortcodes, REST routes and template overrides.",
    contentFormat: "markdown",
    content: `A publishing platform lives or dies by its extensions. Here is how VinextPress does them.

## The hook system

Everything interesting flows through **filters** and **actions**, in priority order:

\`\`\`ts
api.addFilter("render_content", async (html, post) => {
  return html.replace(/TODO/g, "<mark>TODO</mark>");
});
\`\`\`

Core fires hooks like \`render_content\`, \`document_head\`, \`comment_preprocess\`
and \`post_saved\`. Plugins attach; themes get the same API.

## Shortcodes

\`api.registerShortcode("button", handler)\` makes \`[button url="/about"]About us[/button]\`
work inside any post. Handlers are async and run before caching, so the output
is plain HTML at the edge.

## Plugin REST routes

Plugins can mount their own JSON endpoints under \`/api/v1/ext/<slug>/...\`,
complete with path parameters and access to the authenticated user.

## Templates

Themes are React Server Components with a manifest. The template hierarchy
resolves each request — home, single, page, archive, search, 404 — and picks
the most specific template the active theme provides.

Switch themes in **Appearance**; the content stays exactly where it is.`,
    categories: [engineering.id],
    tags: ["serverless"],
  });

  await savePost({
    type: "page",
    status: "publish",
    authorId: adminId,
    title: "About",
    slug: "about",
    contentFormat: "markdown",
    content: `This site runs on **VinextPress**, an open-source publishing platform that
deploys as a single Cloudflare Worker.

Edit or replace this page from the dashboard — it is just a page, like any other.`,
  });

  await insertComment({
    postId: welcome.id,
    authorName: "A Friendly Reader",
    authorEmail: "reader@example.com",
    authorUrl: "",
    content: "This is a sample comment. Approve, edit or delete it in the dashboard — and then say hello to your readers!",
    status: "approved",
  });
}

/** Small helper reused by the settings screens. */
export async function updateOptions(patch: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(patch)) {
    await setOption(name, value);
  }
}
