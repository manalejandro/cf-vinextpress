import { can, getCurrentUser, HttpError } from "@/press/auth";
import { getPress } from "@/press/context";
import { listPlugins, getPlugin } from "@/press/plugins/registry";
import { setOption } from "@/press/options";
import { handleRest, json } from "@/press/rest";
import { revalidateSite } from "@/press/cache";

export const dynamic = "force-dynamic";

/** GET /api/v1/plugins — every bundled plugin and its activation state. */
export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const press = await getPress();
    const active = new Set(press.settings.activePlugins);
    return json({
      plugins: listPlugins().map((plugin) => ({
        slug: plugin.manifest.slug,
        name: plugin.manifest.name,
        description: plugin.manifest.description,
        version: plugin.manifest.version,
        author: plugin.manifest.author,
        active: active.has(plugin.manifest.slug),
      })),
    });
  });
}

/** POST /api/v1/plugins — administrators toggle a plugin: { slug, active }. */
export async function POST(request: Request): Promise<Response> {
  return handleRest(async () => {
    const user = await getCurrentUser();
    if (!user || !can(user, "manage_plugins")) throw new HttpError(401, "Administrator session required");

    const body = (await request.json().catch(() => null)) as { slug?: string; active?: boolean } | null;
    const slug = body?.slug;
    const active = body?.active;
    if (!slug || typeof active !== "boolean") throw new HttpError(400, "Fields 'slug' and 'active' (boolean) are required");
    if (!getPlugin(slug)) throw new HttpError(404, `Unknown plugin: ${slug}`);

    const press = await getPress();
    const current = new Set(press.settings.activePlugins);
    if (active) current.add(slug);
    else current.delete(slug);

    await setOption("active_plugins", JSON.stringify([...current]));
    revalidateSite();
    return json({ slug, active });
  });
}
