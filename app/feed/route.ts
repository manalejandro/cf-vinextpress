import { getPress } from "@/press/context";
import { buildRssFeed } from "@/press/feeds/rss";

/** RSS 2.0 feed of the latest published posts: /feed */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const press = await getPress();
  if (!press.settings.installed) {
    return new Response("<?xml version=\"1.0\"?><error>Site not installed</error>", {
      status: 404,
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }
  const xml = await buildRssFeed(press);
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=900",
    },
  });
}
