import type { Theme } from "../../press/themes/types";
import { svgScreenshot } from "../screenshot";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { Home, Index, Archive, Search } from "./listing";
import { Single, Page } from "./single";
import { NotFound } from "./not-found";

/**
 * Nocturne — a dark, terminal-inspired theme.
 *
 * Mono kickers, card-grid archives and a neon accent, for engineering
 * blogs and product changelogs.
 */

const palette = {
  "--vp-color-scheme": "dark",
  "--vp-bg": "#0a0d12",
  "--vp-card": "#11161d",
  "--vp-ink": "#e6edf3",
  "--vp-muted": "#8b98a5",
  "--vp-accent": "#4cc2ff",
  "--vp-line": "#1d2733",
  "--vp-radius": "0.75rem",
  "--vp-font-head": `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  "--vp-font-body": `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  "--vp-font-mono": `ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace`,
};

export const nocturne: Theme = {
  manifest: {
    slug: "nocturne",
    name: "Nocturne",
    version: "1.0.0",
    author: "VinextPress",
    description:
      "A dark, terminal-inspired theme with mono kickers, card-grid archives and a neon accent. For engineering blogs and changelogs.",
    screenshot: svgScreenshot({
      name: "NOCTURNE",
      tagline: "a dark theme for engineering blogs",
      bg: palette["--vp-bg"]!,
      card: palette["--vp-card"]!,
      ink: palette["--vp-ink"]!,
      muted: "#3b4754",
      accent: palette["--vp-accent"]!,
      serif: false,
    }),
    palette,
  },
  templates: {
    SiteHeader,
    SiteFooter,
    Home,
    Index,
    Single,
    Page,
    Archive,
    Search,
    NotFound,
  },
};
