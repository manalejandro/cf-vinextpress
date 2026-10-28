import type { ComponentType } from "react";
import type { Theme } from "../themes/types";
import type { ListProps, SingleProps } from "../themes/types";
import type { MainQuery } from "../types";

/**
 * The template hierarchy: map a resolved main query to the most specific
 * template the active theme provides, with sensible fallbacks
 * (Page -> Single, Archive/Search -> Index), mirroring the classic
 * template-file cascade of publishing platforms.
 */

export type TemplateChoice =
  | { variant: "home-posts"; component: ComponentType<ListProps> }
  | { variant: "home-page"; component: ComponentType<SingleProps> }
  | { variant: "list"; component: ComponentType<ListProps> }
  | { variant: "single"; component: ComponentType<SingleProps> }
  | { variant: "page"; component: ComponentType<SingleProps> }
  | { variant: "archive"; component: ComponentType<ListProps> }
  | { variant: "search"; component: ComponentType<ListProps> }
  | { variant: "not-found" };

export function chooseTemplate(theme: Theme, query: MainQuery): TemplateChoice {
  const t = theme.templates;
  switch (query.kind) {
    case "home":
      return query.post
        ? { variant: "home-page", component: (t.Page ?? t.Single) as ComponentType<SingleProps> }
        : { variant: "home-posts", component: (t.Home ?? t.Index) as ComponentType<ListProps> };
    case "blog":
      return { variant: "list", component: t.Index as ComponentType<ListProps> };
    case "single":
      return { variant: "single", component: t.Single as ComponentType<SingleProps> };
    case "page":
      return { variant: "page", component: (t.Page ?? t.Single) as ComponentType<SingleProps> };
    case "archive-category":
    case "archive-tag":
    case "archive-author":
    case "archive-date":
      return { variant: "archive", component: (t.Archive ?? t.Index) as ComponentType<ListProps> };
    case "search":
      return { variant: "search", component: (t.Search ?? t.Index) as ComponentType<ListProps> };
    default:
      return { variant: "not-found" };
  }
}

/** Human-readable archive heading, filterable through `archive_title`. */
export function defaultArchiveTitle(query: MainQuery): string {
  switch (query.kind) {
    case "archive-category":
      return `Category: ${query.term?.name ?? ""}`;
    case "archive-tag":
      return `Tag: ${query.term?.name ?? ""}`;
    case "archive-author":
      return `Author: ${query.author?.displayName ?? ""}`;
    case "archive-date": {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      if (query.date?.month) return `${months[query.date.month - 1]} ${query.date.year}`;
      return `${query.date?.year ?? ""}`;
    }
    case "search":
      return `Search results for “${query.search ?? ""}`;
    case "blog":
      return "Blog";
    default:
      return "Archive";
  }
}
