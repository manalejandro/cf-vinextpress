import { getPress } from "@/press/context";
import { handleRest, json } from "@/press/rest";

/**
 * REST API discovery document — GET /api/v1
 * Mirrors the self-describing index style popularized by classic CMS APIs.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const press = await getPress();
    const base = press.settings.siteUrl ? `${press.settings.siteUrl}/api/v1` : "/api/v1";
    return json({
      name: press.settings.siteTitle,
      description: "VinextPress REST API",
      url: base,
      home: press.settings.siteUrl || "/",
      namespaces: ["v1"],
      authentication: {
        cookie: {
          description: "Dashboard session cookie (vinextpress_session). Writes require an authenticated session.",
        },
      },
      routes: {
        "/v1": "This discovery document",
        "/v1/posts": "GET list (public, published) · POST create (auth)",
        "/v1/posts/{idOrSlug}": "GET · PUT (auth) · DELETE (auth)",
        "/v1/pages": "GET list · POST create (auth)",
        "/v1/pages/{idOrSlug}": "GET · PUT (auth) · DELETE (auth)",
        "/v1/comments": "GET list (?post=&status=) · POST submit (public, moderated)",
        "/v1/comments/{id}": "GET · PUT status (auth) · DELETE (auth)",
        "/v1/categories": "GET list · POST create (auth)",
        "/v1/tags": "GET list · POST create (auth)",
        "/v1/media": "GET list · POST multipart upload (auth)",
        "/v1/media/{id}": "GET · PUT alt/caption (auth) · DELETE (auth)",
        "/v1/users": "GET list (auth)",
        "/v1/users/me": "GET current user",
        "/v1/settings": "GET public subset (full for auth) · PUT (admin)",
        "/v1/themes": "GET list · POST activate {slug} (admin)",
        "/v1/plugins": "GET list · POST toggle {slug, active} (admin)",
        "/v1/ext/{plugin}/{path}": "Routes registered by active plugins",
      },
    });
  });
}
