import { getCurrentUser, HttpError } from "@/press/auth";
import { getPress } from "@/press/context";
import { handleRest } from "@/press/rest";
import type { PluginRestHandlers } from "@/press/plugins/types";

/**
 * Dispatcher for plugin-registered REST routes, mounted at
 * /api/v1/ext/<plugin-slug>/<path>. Path patterns may contain
 * ":param" segments, captured into ctx.params.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

function matchRoute(pattern: string, segments: string[]): Record<string, string> | null {
  const parts = pattern.split("/").filter(Boolean);
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const segment = decodeURIComponent(segments[i] ?? "");
    if (part.startsWith(":")) params[part.slice(1)] = segment;
    else if (part !== segment) return null;
  }
  return params;
}

async function dispatch(request: Request, ctx: Ctx): Promise<Response> {
  return handleRest(async () => {
    const { path } = await ctx.params;
    const press = await getPress();
    const [pluginSlug, ...rest] = path ?? [];
    if (!pluginSlug) throw new HttpError(404, "Unknown extension route");
    if (!press.activePlugins.has(pluginSlug)) {
      throw new HttpError(404, `Plugin '${pluginSlug}' is not active`);
    }

    const method = request.method.toUpperCase() as keyof PluginRestHandlers;
    let matchedButNoMethod = false;

    for (const route of press.pluginRoutes) {
      if (route.plugin !== pluginSlug) continue;
      const params = matchRoute(route.path, rest);
      if (!params) continue;
      const handler = route.handlers[method];
      if (!handler) {
        matchedButNoMethod = true;
        continue;
      }
      const user = await getCurrentUser();
      return handler(request, { press, user, params, url: new URL(request.url) });
    }

    if (matchedButNoMethod) throw new HttpError(405, `${request.method} not allowed on this route`);
    throw new HttpError(404, "Route not found");
  });
}

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  return dispatch(request, ctx);
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  return dispatch(request, ctx);
}

export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  return dispatch(request, ctx);
}

export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  return dispatch(request, ctx);
}

export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
  return dispatch(request, ctx);
}
