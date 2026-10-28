import { getPress } from "@/press/context";
import { buildSitemapXml } from "@/press/sitemap";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const press = await getPress();
  if (!press.settings.installed) {
    return new Response("Not found", { status: 404 });
  }
  const xml = await buildSitemapXml(press);
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}
