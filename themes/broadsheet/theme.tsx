import type { Theme } from "../../press/themes/types";
import { svgScreenshot } from "../screenshot";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";
import { Home, Index, Archive, Search } from "./listing";
import { Single, Page } from "./single";
import { NotFound } from "./not-found";
import { CoreHooks } from "../../press/hooks";

/**
 * Broadsheet — a newspaper-inspired magazine theme.
 *
 * Dated masthead, ruled navigation, lead-story front page with a sections
 * sidebar, drop-cap articles. For publications that want gravitas.
 */

const palette = {
  "--vp-color-scheme": "light",
  "--vp-bg": "#fbfaf7",
  "--vp-card": "#ffffff",
  "--vp-ink": "#16130f",
  "--vp-muted": "#6d675e",
  "--vp-accent": "#b3261e",
  "--vp-line": "#e3ded4",
  "--vp-radius": "0.25rem",
  "--vp-font-head": `"Playfair Display", Georgia, "Times New Roman", serif`,
  "--vp-font-body": `Georgia, "Iowan Old Style", serif`,
  "--vp-font-mono": `"Courier New", ui-monospace, monospace`,
};

export const broadsheet: Theme = {
  manifest: {
    slug: "broadsheet",
    name: "Broadsheet",
    version: "1.0.0",
    author: "VinextPress",
    description:
      "A newspaper-inspired magazine theme: dated masthead, ruled nav, lead-story front page with sections sidebar and drop-cap articles.",
    screenshot: svgScreenshot({
      name: "BROADSHEET",
      tagline: "a newspaper-inspired magazine theme",
      bg: palette["--vp-bg"]!,
      card: palette["--vp-card"]!,
      ink: palette["--vp-ink"]!,
      muted: "#c9c2b4",
      accent: palette["--vp-accent"]!,
      serif: true,
    }),
    palette,
  },
  templates: { SiteHeader, SiteFooter, Home, Index, Single, Page, Archive, Search, NotFound },
  setup(api) {
    // Drop-cap on the first paragraph of every article.
    api.addFilter<unknown[]>(CoreHooks.DocumentFooter, (nodes) => [
      ...nodes,
      <style
        key="broadsheet-css"
        dangerouslySetInnerHTML={{
          __html: `.bs-dropcap > p:first-of-type::first-letter{float:left;font-family:var(--vp-font-head);font-size:3.4em;line-height:.85;font-weight:900;padding:.06em .12em 0 0;color:var(--vp-accent)}`,
        }}
      />,
    ]);
  },
};
