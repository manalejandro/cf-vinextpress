import { can, getCurrentUser, HttpError } from "@/press/auth";
import { getPress } from "@/press/context";
import { listThemes } from "@/press/themes/registry";
import { setOption } from "@/press/options";
import { handleRest, json } from "@/press/rest";
import { revalidateSite } from "@/press/cache";

export const dynamic = "force-dynamic";

/** GET /api/v1/themes — every bundled theme and which one is active. */
export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const press = await getPress();
    return json({
      active: press.settings.activeTheme,
      themes: listThemes().map((theme) => ({
        slug: theme.manifest.slug,
        name: theme.manifest.name,
        version: theme.manifest.version,
        author: theme.manifest.author,
        description: theme.manifest.description,
        screenshot: theme.manifest.screenshot,
        active: theme.manifest.slug === press.settings.activeTheme,
      })),
    });
  });
}

/** POST /api/v1/themes — administrators activate a theme: { slug }. */
export async function POST(request: Request): Promise<Response> {
  return handleRest(async () => {
    const user = await getCurrentUser();
    if (!user || !can(user, "switch_themes")) throw new HttpError(401, "Administrator session required");

    const body = (await request.json().catch(() => null)) as { slug?: string } | null;
    const slug = body?.slug;
    if (!slug) throw new HttpError(400, "Field 'slug' is required");
    const theme = listThemes().find((t) => t.manifest.slug === slug);
    if (!theme) throw new HttpError(404, `Unknown theme: ${slug}`);

    await setOption("active_theme", slug);
    revalidateSite();
    return json({ active: slug, name: theme.manifest.name });
  });
}
