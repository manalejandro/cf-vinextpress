/**
 * VinextPress core types.
 *
 * The data model behind posts, pages, users, comments, taxonomies,
 * media, options and the main template query.
 */

export type PostType = "post" | "page";
export type PostStatus = "publish" | "draft" | "private" | "trash";
export type ContentFormat = "markdown" | "html";
export type CommentStatus = "approved" | "pending" | "spam" | "trash";
export type Taxonomy = "category" | "tag";
export type UserRole = "administrator" | "editor" | "author";
export type PermalinkStructure = "post-name" | "date" | "plain";

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  contentFormat: ContentFormat;
  type: PostType;
  status: PostStatus;
  authorId: number;
  parentId: number | null;
  menuOrder: number;
  commentStatus: "open" | "closed";
  featuredMediaId: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** A post joined with the author's display name. */
export type PostWithAuthor = Post & { authorName: string; authorSlug: string };

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  authorUrl: string;
  content: string;
  status: CommentStatus;
  userId: number | null;
  createdAt: string;
}

export interface Term {
  id: number;
  name: string;
  slug: string;
  taxonomy: Taxonomy;
  description: string;
  parentId: number | null;
}

export interface TermWithCount extends Term {
  count: number;
}

export interface MediaItem {
  id: number;
  r2Key: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  uploadedBy: number;
  createdAt: string;
}

export interface SiteSettings {
  siteTitle: string;
  siteTagline: string;
  /** Canonical origin (https://example.com) used for absolute URLs in feeds, sitemaps and meta tags. */
  siteUrl: string;
  adminEmail: string;
  permalinkStructure: PermalinkStructure;
  postsPerPage: number;
  showOnFront: "posts" | "page";
  pageOnFront: number | null;
  /** Page whose path hosts the blog index when the front page is static. */
  pageForPosts: number | null;
  commentModeration: "manual" | "auto";
  requireNameEmail: boolean;
  activeTheme: string;
  activePlugins: string[];
  navMenu: NavMenuItem[];
  installed: boolean;
  installedAt: string | null;
}

export interface NavMenuItem {
  label: string;
  url: string;
}

export interface SiteContext {
  settings: SiteSettings;
  url: string;
  description: string;
}

/**
 * The result of resolving a request path against the content table,
 * equivalent to a CMS "main query": what kind of view is being requested
 * plus the data needed to render it.
 */
export type QueryKind =
  | "home"
  | "blog"
  | "single"
  | "page"
  | "archive-category"
  | "archive-tag"
  | "archive-author"
  | "archive-date"
  | "search"
  | "not-found";

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface MainQuery {
  kind: QueryKind;
  /** The requested pathname, always starting with "/". */
  path: string;
  /** Path without any trailing /page/N, used to build pagination links. */
  basePath: string;
  post?: PostWithAuthor;
  posts?: PostWithAuthor[];
  term?: TermWithCount;
  author?: Pick<User, "id" | "displayName" | "username">;
  date?: { year: number; month?: number };
  search?: string;
  pagination: Pagination;
  /** Child pages of the resolved page, for page indexes. */
  children?: PostWithAuthor[];
}

/** Contributions plugins can make to the document <head> and metadata. */
export interface HeadContribution {
  meta?: Array<{ name?: string; property?: string; content: string }>;
  links?: Array<{ rel: string; href: string; type?: string }>;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  title?: string;
  description?: string;
}

export interface BreadcrumbItem {
  label: string;
  url?: string;
}
