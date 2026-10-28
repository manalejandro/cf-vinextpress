import { PLUGINS } from "../../plugins";
import type { PluginDefinition } from "./types";

/** Static registry of every plugin bundled with this installation. */

export function listPlugins(): PluginDefinition[] {
  return PLUGINS;
}

export function getPlugin(slug: string): PluginDefinition | undefined {
  return PLUGINS.find((p) => p.manifest.slug === slug);
}
