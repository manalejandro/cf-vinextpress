import type { Theme } from "../../press/themes/types";
import { svgScreenshot } from "../screenshot";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { Home, Index, Archive, Search } from "./listing";
import { Single, Page } from "./single";
import { NotFound } from "./not-found";

/**
 * Kite — a minimal, multipurpose theme.
 *
 * Cool neutrals, a single accent, hairline rules and generous whitespace.
 * The quiet workhorse: suits product blogs, personal sites and docs-like
 * page trees alike.
 */

const palette = {
  "--vp-color-scheme": "light",
  "--vp-bg": "#ffffff",
  "--vp-card": "#ffffff",
  "--vp-ink": "#111827",
  "--vp-muted": "#6b7280",
  "--vp-accent": "#0284c7",
  "--vp-line": "#e5e7eb",
  "--vp-radius": "0.5rem",
  "--vp-font-head": `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  "--vp-font-body": `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  "--vp-font-mono": `ui-monospace, "SF Mono", Menlo, monospace`,
};

export const kite: Theme = {
  manifest: {
    slug: "kite",
    name: "Kite",
    version: "1.0.0",
    author: "VinextPress",
    description:
      "A minimal multipurpose theme: cool neutrals, hairline rules, mono micro-labels and generous whitespace. The quiet workhorse.",
    screenshot: svgScreenshot({
      name: "Kite",
      tagline: "a minimal multipurpose theme",
      bg: palette["--vp-bg"]!,
      card: "#f8fafc",
      ink: palette["--vp-ink"]!,
      muted: "#cbd5e1",
      accent: palette["--vp-accent"]!,
      serif: false,
    }),
    palette,
  },
  templates: { SiteHeader, SiteFooter, Home, Index, Single, Page, Archive, Search, NotFound },
};
