import type { Theme } from "../press/themes/types";
import { meridian } from "./meridian/theme";
import { nocturne } from "./nocturne/theme";

/**
 * Every theme bundled with this installation. The first entry is the
 * fallback when the configured active theme cannot be found.
 *
 * Adding a theme is one folder plus one line here — see docs/THEMES.md.
 */
export const THEMES: Theme[] = [meridian, nocturne];
