import { cache } from "react";
import { HookRegistry, CoreHooks } from "./hooks";
import type { ShortcodeHandler, ShortcodeRegistry } from "./content/shortcodes";
import { doShortcodes } from "./content/shortcodes";
import { markdownToHtml } from "./content/markdown";
import { escapeHtml, makeExcerpt } from "./content/format";
import { loadSettings, type LoadedSettings } from "./options";
import { listPlugins } from "./plugins/registry";
import { createPluginAPI, type PluginAPI, type RegisteredPluginRoute } from "./plugins/types";
import { getDefaultTheme, getTheme } from "./themes/registry";
import type { Theme } from "./themes/types";
import type { Post, SiteContext } from "./types";
import { postPath } from "./permalinks";

/**
 * PressContext is the per-request core of VinextPress. One call to
 * `getPress()` loads settings, boots the active plugins and the active
 * theme into a fresh hook registry, and exposes the content pipeline.
 * React `cache()` guarantees a single boot per render/request.
 */
export interface PressContext {
  settings: LoadedSettings;
  site: SiteContext;
  hooks: HookRegistry;
  shortcodes: ShortcodeRegistry;
  activePlugins: Set<string>;
  theme: Theme;
  /** REST routes registered by active plugins, for the /api/v1/ext dispatcher. */
  pluginRoutes: RegisteredPluginRoute[];
  /** Run a filter hook; `args` are the extra arguments after the value. */
  applyFilters<T>(hook: string, value: T, args?: unknown[]): Promise<T>;
  /** Run an action hook. */
  doAction(hook: string, args?: unknown[]): Promise<void>;
  /** Full content pipeline: markdown/html -> shortcodes -> `render_content` filters. */
  renderContent(post: Pick<Post, "content" | "contentFormat">): Promise<string>;
  renderTitle(post: Pick<Post, "title">): Promise<string>;
  renderExcerpt(post: Pick<Post, "excerpt" | "content" | "contentFormat">): Promise<string>;
  /** Relative permalink for a post, after `post_permalink` filters. */
  permalink(post: Post): Promise<string>;
}

/** Boot the full core context for a known settings snapshot. */
export async function bootPress(settings: LoadedSettings): Promise<PressContext> {
  const hooks = new HookRegistry();
  const shortcodes: Map<string, ShortcodeHandler> = new Map();
  const pluginRoutes: RegisteredPluginRoute[] = [];

  const activePlugins = new Set(settings.activePlugins);

  // Boot active plugins. Inactive plugins never register, so dispatch
  // needs no extra gating.
  for (const plugin of listPlugins()) {
    if (!activePlugins.has(plugin.manifest.slug)) continue;
    const api: PluginAPI = createPluginAPI(plugin.manifest.slug, hooks, shortcodes, pluginRoutes);
    await plugin.setup(api);
  }

  // Boot the active theme (its setup() gets the same extension API).
  const theme = getTheme(settings.activeTheme) ?? getDefaultTheme();
  if (theme.setup) {
    const api = createPluginAPI(`theme:${theme.manifest.slug}`, hooks, shortcodes, pluginRoutes);
    await theme.setup(api);
  }

  const site: SiteContext = {
    settings,
    url: settings.siteUrl,
    description: settings.siteTagline,
  };

  const ctx: PressContext = {
    settings,
    site,
    hooks,
    shortcodes,
    activePlugins,
    theme,
    pluginRoutes,
    applyFilters: (hook, value, args = []) => hooks.applyFilters(hook, value, args),
    doAction: (hook, args = []) => hooks.doAction(hook, args),
    async renderContent(post) {
      let html = post.contentFormat === "markdown" ? markdownToHtml(post.content) : post.content;
      html = await doShortcodes(html, shortcodes);
      html = await hooks.applyFilters(CoreHooks.RenderContent, html, [post, ctx]);
      return html;
    },
    async renderTitle(post) {
      return hooks.applyFilters(CoreHooks.RenderTitle, post.title, [post, ctx]);
    },
    async renderExcerpt(post) {
      const base = post.excerpt?.trim() || makeExcerpt(post.content, post.contentFormat);
      return hooks.applyFilters(CoreHooks.RenderExcerpt, base, [post, ctx]);
    },
    async permalink(post) {
      const path = post.type === "post" ? postPath(post, settings) : `/${post.slug}`;
      return hooks.applyFilters(CoreHooks.PostPermalink, path, [post, settings]);
    },
  };

  await hooks.doAction(CoreHooks.ThemeSetup, [theme, ctx]);
  return ctx;
}

export const getPress: () => Promise<PressContext> = cache(async (): Promise<PressContext> => {
  return bootPress(await loadSettings());
});

/** Escape hatch for modules that need settings without the full context. */
export const getSiteSettings = loadSettings;

/** Convenience: build a full page title like "Post title – Site title". */
export function composeTitle(press: PressContext, pageTitle?: string): string {
  const site = press.settings.siteTitle;
  if (!pageTitle) return site;
  return `${pageTitle} – ${site}`;
}

export { escapeHtml };
