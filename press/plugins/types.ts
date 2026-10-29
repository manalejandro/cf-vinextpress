import type { HookRegistry, ActionCallback, FilterCallback } from "../hooks";
import type { ShortcodeHandler } from "../content/shortcodes";
import type { PressContext } from "../context";
import type { ReactNode } from "react";
import type { User, UserRole } from "../types";

/**
 * The contract every plugin implements. A plugin is a plain module:
 * a manifest plus a `setup()` function that receives the PluginAPI and
 * registers hooks, shortcodes and REST routes. Plugins are bundled at
 * build time and enabled/disabled at runtime from the dashboard.
 */

export interface PluginManifest {
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  /** Optional documentation URL shown in the dashboard. */
  docsUrl?: string;
}

export interface PluginRestContext {
  press: PressContext;
  user: User | null;
  /** Captured ":param" path segments, keyed by name. */
  params: Record<string, string>;
  url: URL;
}

export type PluginRouteHandler = (request: Request, ctx: PluginRestContext) => Response | Promise<Response>;

export interface PluginRestHandlers {
  GET?: PluginRouteHandler;
  POST?: PluginRouteHandler;
  PUT?: PluginRouteHandler;
  DELETE?: PluginRouteHandler;
}

/**
 * A dashboard screen owned by a plugin, mounted at /admin/ext/<plugin-slug>.
 * `render` receives the request context and returns any server-rendered
 * markup (forms may point at the plugin's own "use server" action module).
 */
export interface PluginAdminPageContext {
  press: PressContext;
  user: User;
  searchParams: Record<string, string>;
}

export interface PluginAdminPage {
  title: string;
  description?: string;
  /** Capability required to view the page. Defaults to "administrator". */
  capability?: UserRole;
  render: (ctx: PluginAdminPageContext) => ReactNode | Promise<ReactNode>;
}

export interface PluginAPI {
  /** Filter a value passing through a hook. */
  addFilter<T>(hook: string, callback: FilterCallback<T>, priority?: number): void;
  /** Listen for an action hook. */
  addAction(hook: string, callback: ActionCallback, priority?: number): void;
  /** Register a [shortcode] usable inside post content. */
  registerShortcode(name: string, handler: ShortcodeHandler): void;
  /**
   * Mount REST handlers under /api/v1/ext/<plugin-slug>/<path>.
   * Path segments like ":id" are captured into ctx.params.
   */
  registerRestRoute(path: string, handlers: PluginRestHandlers): void;
  /** Register a dashboard screen at /admin/ext/<plugin-slug>. */
  registerAdminPage(page: PluginAdminPage): void;
}

export interface PluginDefinition {
  manifest: PluginManifest;
  setup(api: PluginAPI): void | Promise<void>;
}

/** Where plugin REST routes are mounted, for documentation and dispatch. */
export const PLUGIN_REST_PREFIX = "/api/v1/ext";

export interface RegisteredPluginRoute {
  plugin: string;
  /** Path pattern relative to the plugin prefix, e.g. "data/:id". */
  path: string;
  handlers: PluginRestHandlers;
}

/**
 * Collects everything a plugin registers during setup. The core builds one
 * of these per request, wiring it to that request's hook registry.
 */
export interface PluginRegistration {
  hooks: HookRegistry;
  shortcodes: Map<string, ShortcodeHandler>;
  routes: RegisteredPluginRoute[];
}

export function createPluginAPI(
  pluginSlug: string,
  hooks: HookRegistry,
  shortcodes: Map<string, ShortcodeHandler>,
  routes: RegisteredPluginRoute[],
  adminPages: Map<string, PluginAdminPage>,
): PluginAPI {
  return {
    addFilter<T>(hook: string, callback: FilterCallback<T>, priority = 10): void {
      hooks.addFilter<T>(hook, callback, priority, pluginSlug);
    },
    addAction(hook: string, callback: ActionCallback, priority = 10): void {
      hooks.addAction(hook, callback, priority, pluginSlug);
    },
    registerShortcode(name: string, handler: ShortcodeHandler): void {
      shortcodes.set(name.toLowerCase(), handler);
    },
    registerRestRoute(path: string, handlers: PluginRestHandlers): void {
      routes.push({ plugin: pluginSlug, path: path.replace(/^\/+|\/+$/g, ""), handlers });
    },
    registerAdminPage(page: PluginAdminPage): void {
      adminPages.set(pluginSlug, page);
    },
  };
}
