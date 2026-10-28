import { env } from "cloudflare:workers";
import { getMediaByKey } from "@/press/models/media";

/**
 * Public media delivery: streams objects from the R2 bucket, with optional
 * on-the-fly transforms through the Cloudflare Images binding:
 *
 *   /media/2026/10/ab12cd.png            -- original
 *   /media/2026/10/ab12cd.png?w=800      -- resized to width 800
 *   /media/2026/10/ab12cd.png?w=800&fmt=webp
 *
 * Keys are content-addressed random names, so responses are immutable
 * and cached aggressively at the edge.
 */

const OUTPUT_FORMATS: Record<string, "image/webp" | "image/avif" | "image/jpeg" | "image/png"> = {
  webp: "image/webp",
  avif: "image/avif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ key: string[] }> };

async function resolveObject(request: Request, key: string) {
  const object = await env.MEDIA.get(key);
  if (!object) return null;

  const etag = request.headers.get("if-none-match");
  if (etag && (etag === object.httpEtag || etag === `W/${object.httpEtag}` || object.httpEtag === etag.trim())) {
    return { notModified: true as const };
  }
  return { object };
}

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const { key } = await ctx.params;
  const objectKey = key.map(decodeURIComponent).join("/");
  if (!objectKey || objectKey.includes("..")) {
    return new Response("Bad key", { status: 400 });
  }

  const resolved = await resolveObject(request, objectKey);
  if (!resolved) return new Response("Not found", { status: 404 });
  if ("notModified" in resolved) return new Response(null, { status: 304 });
  const { object } = resolved;

  const url = new URL(request.url);
  const widthParam = Number(url.searchParams.get("w") ?? 0);
  const formatParam = url.searchParams.get("fmt") ?? "";
  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
  const outputFormat = OUTPUT_FORMATS[formatParam];
  const transformable =
    contentType.startsWith("image/") &&
    !contentType.includes("svg") &&
    (widthParam > 0 || outputFormat !== undefined);

  if (transformable && env.IMAGES) {
    try {
      const transform: { width?: number; fit?: "scale-down" } = {};
      if (widthParam > 0) {
        transform.width = Math.min(Math.round(widthParam), 2560);
        transform.fit = "scale-down";
      }
      const result = await env.IMAGES.input(object.body)
        .transform(transform)
        .output(outputFormat ? { format: outputFormat } : { format: "image/webp" });
      const response = result.response();
      const headers = new Headers(response.headers);
      headers.set("cache-control", "public, max-age=86400, s-maxage=604800");
      headers.set("vary", "query-string");
      return new Response(response.body, { status: 200, headers });
    } catch (error) {
      console.error("[vinextpress:media] transform failed, serving original", error);
    }
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { status: 200, headers });
}

export async function HEAD(request: Request, ctx: Ctx): Promise<Response> {
  const { key } = await ctx.params;
  const objectKey = key.map(decodeURIComponent).join("/");
  const object = await env.MEDIA.head(objectKey);
  if (!object) return new Response(null, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-length", String(object.size));
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(null, { status: 200, headers });
}

/** DELETE is restricted to authenticated editors and mirrors the media row removal. */
export async function DELETE(_request: Request, ctx: Ctx): Promise<Response> {
  const { getCurrentUser, can } = await import("@/press/auth");
  const user = await getCurrentUser();
  if (!user || !can(user, "upload_files")) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const { key } = await ctx.params;
  const objectKey = key.map(decodeURIComponent).join("/");
  const item = await getMediaByKey(objectKey);
  if (item) {
    const { deleteMedia } = await import("@/press/models/media");
    await deleteMedia(item.id);
    return Response.json({ deleted: item.id });
  }
  await env.MEDIA.delete(objectKey);
  return Response.json({ deleted: objectKey });
}
