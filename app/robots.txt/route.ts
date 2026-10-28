import { getPress } from "@/press/context";
import { buildRobotsTxt } from "@/press/sitemap";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const press = await getPress();
  return new Response(buildRobotsTxt(press.settings.siteUrl), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
