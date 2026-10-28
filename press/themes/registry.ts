import { THEMES } from "../../themes";
import type { Theme } from "./types";

/** Static registry of every theme bundled with this installation. */

export function listThemes(): Theme[] {
  return THEMES;
}

export function getTheme(slug: string): Theme | undefined {
  return THEMES.find((t) => t.manifest.slug === slug);
}

/** The theme used when the configured one is missing: the first registered. */
export function getDefaultTheme(): Theme {
  const theme = THEMES[0];
  if (!theme) throw new Error("VinextPress requires at least one registered theme.");
  return theme;
}
