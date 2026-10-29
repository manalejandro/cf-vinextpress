import { can, getCurrentUser } from "@/press/auth";
import { CoreHooks } from "@/press/hooks";
import { getPress } from "@/press/context";
import { setOption } from "@/press/options";
import { handleRest, json } from "@/press/rest";
import { revalidateSite } from "@/press/cache";
import { HttpError } from "@/press/auth";
import { isReservedSlug } from "@/press/utils/slug";
import type { PermalinkStructure } from "@/press/types";

export const dynamic = "force-dynamic";

const PERMALINKS: PermalinkStructure[] = ["post-name", "date"];

/** GET /api/v1/settings — public subset for guests, everything for admins. */
export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const press = await getPress();
    const user = await getCurrentUser();
    const s = press.settings;

    const publicSettings = {
      title: s.siteTitle,
      description: s.siteTagline,
      url: s.siteUrl,
      permalink_structure: s.permalinkStructure,
      posts_per_page: s.postsPerPage,
      show_on_front: s.showOnFront,
      installed: s.installed,
      theme: s.activeTheme,
    };
    if (!user || !can(user, "manage_options")) return json(publicSettings);

    return json({
      ...publicSettings,
      admin_email: s.adminEmail,
      page_on_front: s.pageOnFront,
      page_for_posts: s.pageForPosts,
      comment_moderation: s.commentModeration,
      require_name_email: s.requireNameEmail,
      active_plugins: s.activePlugins,
      nav_menu: s.navMenu,
      installed_at: s.installedAt,
    });
  });
}

/** PUT /api/v1/settings — administrators update site settings. */
export async function PUT(request: Request): Promise<Response> {
  return handleRest(async () => {
    const user = await getCurrentUser();
    if (!user || !can(user, "manage_options")) throw new HttpError(401, "Administrator session required");

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, "Body must be valid JSON");

    const writes: Record<string, string> = {};
    if (typeof body.title === "string") writes.site_title = body.title.slice(0, 120);
    if (typeof body.description === "string") writes.site_tagline = body.description.slice(0, 240);
    if (typeof body.url === "string") {
      const url = body.url.trim().replace(/\/+$/, "");
      if (url && !/^https?:\/\//.test(url)) throw new HttpError(400, "url must start with http(s)://");
      writes.site_url = url;
    }
    if (typeof body.admin_email === "string") writes.admin_email = body.admin_email.slice(0, 190);
    if (typeof body.permalink_structure === "string") {
      if (!PERMALINKS.includes(body.permalink_structure as PermalinkStructure)) {
        throw new HttpError(400, `permalink_structure must be one of: ${PERMALINKS.join(", ")}`);
      }
      writes.permalink_structure = body.permalink_structure;
    }
    if (body.posts_per_page !== undefined) {
      const n = Number(body.posts_per_page);
      if (!Number.isInteger(n) || n < 1 || n > 50) throw new HttpError(400, "posts_per_page must be 1..50");
      writes.posts_per_page = String(n);
    }
    if (body.show_on_front === "posts" || body.show_on_front === "page") writes.show_on_front = body.show_on_front;
    if (body.page_on_front !== undefined) writes.page_on_front = body.page_on_front ? String(Number(body.page_on_front) || "") : "";
    if (body.page_for_posts !== undefined) writes.page_for_posts = body.page_for_posts ? String(Number(body.page_for_posts) || "") : "";
    if (body.comment_moderation === "manual" || body.comment_moderation === "auto") writes.comment_moderation = body.comment_moderation;
    if (typeof body.require_name_email === "boolean") writes.require_name_email = body.require_name_email ? "1" : "0";
    if (Array.isArray(body.nav_menu)) {
      const menu = body.nav_menu
        .filter((item): item is { label: string; url: string } =>
          typeof item === "object" && item !== null && typeof (item as { label?: unknown }).label === "string" && typeof (item as { url?: unknown }).url === "string")
        .slice(0, 30)
        .map((item) => ({ label: item.label.slice(0, 60), url: item.url.slice(0, 300) }));
      writes.nav_menu = JSON.stringify(menu);
    }

    if (Object.keys(writes).length === 0) throw new HttpError(400, "No recognized settings fields");
    if (writes.site_title !== undefined && isReservedSlug(writes.site_title)) {
      throw new HttpError(400, "That title is reserved.");
    }

    for (const [name, value] of Object.entries(writes)) {
      await setOption(name, value);
    }
    const press = await getPress();
    await press.doAction(CoreHooks.SettingsSaved, [user.username]);
    revalidateSite();

    const { freshSettings } = await import("@/press/options");
    const s = await freshSettings();
    return json({
      title: s.siteTitle,
      description: s.siteTagline,
      url: s.siteUrl,
      permalink_structure: s.permalinkStructure,
      posts_per_page: s.postsPerPage,
      show_on_front: s.showOnFront,
      page_on_front: s.pageOnFront,
      page_for_posts: s.pageForPosts,
      comment_moderation: s.commentModeration,
      require_name_email: s.requireNameEmail,
      nav_menu: s.navMenu,
    });
  });
}
