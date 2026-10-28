import type { Theme } from "../../press/themes/types";
import { svgScreenshot } from "../screenshot";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { Home, Index, Archive, Search } from "./listing";
import { Single, Page } from "./single";
import { NotFound } from "./not-found";

/**
 * Meridian — the default VinextPress theme.
 *
 * A warm editorial design: serif headlines, paper-toned palette and
 * generous whitespace, built for long-form writing.
 */

const palette = {
  "--vp-bg": "#faf8f3",
  "--vp-card": "#ffffff",
  "--vp-ink": "#201c16",
  "--vp-muted": "#6e6558",
  "--vp-accent": "#9a3412",
  "--vp-line": "#e8e1d3",
  "--vp-radius": "0.5rem",
  "--vp-font-head": `Georgia, "Iowan Old Style", "Times New Roman", serif`,
  "--vp-font-body": `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
};

export const meridian: Theme = {
  manifest: {
    slug: "meridian",
    name: "Meridian",
    version: "1.0.0",
    author: "VinextPress",
    description:
      "A warm editorial theme with serif headlines, generous whitespace and a paper-toned palette. Built for long-form writing.",
    screenshot: svgScreenshot({
      name: "Meridian",
      tagline: "An editorial theme for long-form writing",
      bg: palette["--vp-bg"]!,
      card: palette["--vp-card"]!,
      ink: palette["--vp-ink"]!,
      muted: "#b8ae9c",
      accent: palette["--vp-accent"]!,
      serif: true,
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
