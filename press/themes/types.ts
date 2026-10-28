import type { ReactNode } from "react";
import type { PressContext } from "../context";
import type { Comment, MainQuery, Pagination, PostWithAuthor, SiteContext, Term } from "../types";
import type { PluginAPI } from "../plugins/types";

/**
 * The contract every theme implements. A theme is a folder of React Server
 * Components plus a manifest; templates receive fully resolved data from
 * the core query layer, so a theme never talks to the database directly.
 *
 * Themes may optionally provide `setup()`, which receives the same API
 * plugins get, to hook into filters (excerpt length, nav menus, head tags).
 */

export interface ThemeManifest {
  slug: string;
  name: string;
  version: string;
  author: string;
  description: string;
  /** Inline SVG data URI rendered as the preview card in the dashboard. */
  screenshot: string;
  /** Palette tokens injected as CSS custom properties on the site shell. */
  palette?: Record<string, string>;
}

export interface ThemeBaseProps {
  press: PressContext;
  site: SiteContext;
  query: MainQuery;
}

/** Props for site chrome rendered by the frontend layout (no query available there). */
export interface HeaderProps {
  press: PressContext;
  site: SiteContext;
  path: string;
}

export interface ListProps extends ThemeBaseProps {
  posts: PostWithAuthor[];
  pagination: Pagination;
  /** Base path used to build pagination links ("/", "/category/news"...). */
  basePath: string;
  /** Optional custom pagination href builder (used by search, which paginates via query string). */
  hrefForPage?: (page: number) => string;
  heading?: string;
  description?: string;
}

export interface SingleProps extends ThemeBaseProps {
  post: PostWithAuthor;
  /** HTML produced by the core content pipeline (markdown + shortcodes + filters). */
  renderedContent: string;
  renderedExcerpt: string;
  terms: Term[];
  comments: Comment[];
  previous: PostWithAuthor | null;
  next: PostWithAuthor | null;
  children?: PostWithAuthor[];
  breadcrumbs: Array<{ label: string; url?: string }>;
  featuredImage?: { url: string; alt: string; caption?: string; width?: number | null; height?: number | null } | null;
}

export interface NotFoundProps {
  press: PressContext;
  site: SiteContext;
}

type Renderable = ReactNode | Promise<ReactNode>;

export interface ThemeTemplates {
  /** Site-wide chrome rendered by the frontend layout. */
  SiteHeader(props: HeaderProps): Renderable;
  SiteFooter(props: HeaderProps): Renderable;
  /** Front page when it displays the latest posts. */
  Home?(props: ListProps): Renderable;
  /** Blog listing and the generic fallback for archives. */
  Index(props: ListProps): Renderable;
  /** Single post. */
  Single(props: SingleProps): Renderable;
  /** Static page; falls back to Single. */
  Page?(props: SingleProps): Renderable;
  /** Term/author/date archives; falls back to Index. */
  Archive?(props: ListProps): Renderable;
  /** Search results; falls back to Index. */
  Search?(props: ListProps): Renderable;
  NotFound?(props: NotFoundProps): Renderable;
  /** Comment list + form area; core provides a default implementation. */
  Comments?(props: { press: PressContext; post: PostWithAuthor; comments: Comment[] }): Renderable;
  Pagination?(props: { pagination: Pagination; basePath: string }): Renderable;
}

export interface Theme {
  manifest: ThemeManifest;
  templates: ThemeTemplates;
  setup?(api: PluginAPI): void | Promise<void>;
}

/** Themes reuse the plugin extension API for their own hooks. */
export type ThemeAPI = PluginAPI;
