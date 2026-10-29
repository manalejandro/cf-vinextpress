/**
 * VinextPress hook system: actions and filters.
 *
 * This is the extension backbone of the platform, inspired by the classic
 * hook architectures of publishing systems: plugins and themes register
 * callbacks on named hooks, and core fires them at well-defined points
 * (`applyFilters` transforms a value, `doAction` notifies listeners).
 *
 * Hooks are asynchronous: callbacks may return promises and run in
 * priority order (lower runs first, default 10, insertion order breaks
 * ties).
 */

export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => T | Promise<T>;
export type ActionCallback = (...args: unknown[]) => void | Promise<void>;

interface HookEntry {
  callback: (value: unknown, ...args: unknown[]) => unknown;
  priority: number;
  /** Slug of the plugin that registered the hook, when it comes from a plugin. */
  plugin?: string;
}

export class HookRegistry {
  private filters = new Map<string, HookEntry[]>();
  private actions = new Map<string, HookEntry[]>();

  addFilter<T>(hook: string, callback: FilterCallback<T>, priority = 10, plugin?: string): void {
    const list = this.filters.get(hook) ?? [];
    list.push({ callback: callback as HookEntry["callback"], priority, plugin });
    list.sort((a, b) => a.priority - b.priority);
    this.filters.set(hook, list);
  }

  addAction(hook: string, callback: ActionCallback, priority = 10, plugin?: string): void {
    const list = this.actions.get(hook) ?? [];
    list.push({ callback: callback as HookEntry["callback"], priority, plugin });
    list.sort((a, b) => a.priority - b.priority);
    this.actions.set(hook, list);
  }

  removeFilter(hook: string, callback: FilterCallback): void {
    const list = this.filters.get(hook);
    if (!list) return;
    this.filters.set(hook, list.filter((entry) => entry.callback !== callback));
  }

  removeAction(hook: string, callback: ActionCallback): void {
    const list = this.actions.get(hook);
    if (!list) return;
    this.actions.set(hook, list.filter((entry) => entry.callback !== callback));
  }

  /**
   * Run every callback registered for `hook`, threading the value through
   * each one. Callbacks attached to an inactive plugin are skipped; pass
   * `activePlugins` to enable the gate.
   */
  async applyFilters<T>(hook: string, value: T, args: unknown[] = [], activePlugins?: Set<string>): Promise<T> {
    const list = this.filters.get(hook);
    if (!list || list.length === 0) return value;
    let current: unknown = value;
    for (const entry of list) {
      if (entry.plugin && activePlugins && !activePlugins.has(entry.plugin)) continue;
      current = await entry.callback(current, ...args);
    }
    return current as T;
  }

  /** Run every listener registered for `hook`, in priority order. */
  async doAction(hook: string, args: unknown[] = [], activePlugins?: Set<string>): Promise<void> {
    const list = this.actions.get(hook);
    if (!list || list.length === 0) return;
    for (const entry of list) {
      if (entry.plugin && activePlugins && !activePlugins.has(entry.plugin)) continue;
      await entry.callback(undefined, ...args);
    }
  }

  hasFilter(hook: string): boolean {
    return (this.filters.get(hook)?.length ?? 0) > 0;
  }

  hasAction(hook: string): boolean {
    return (this.actions.get(hook)?.length ?? 0) > 0;
  }
}

/**
 * Well-known hooks fired by core. Plugins and themes can attach to any
 * of them; the list doubles as documentation for extension authors.
 */
export const CoreHooks = {
  /** Filter the rendered HTML of a post/page content. (value: html, post) */
  RenderContent: "render_content",
  /** Filter a post title for display. (value: title, post) */
  RenderTitle: "render_title",
  /** Filter the excerpt shown in listings. (value: excerpt, post) */
  RenderExcerpt: "render_excerpt",
  /** Contribute tags to the document head / route metadata. (value: HeadContribution, ctx) */
  DocumentHead: "document_head",
  /** Filter navigation menu items before rendering. (value: NavMenuItem[]) */
  NavMenu: "nav_menu",
  /** Filter/replace the resolved main query before rendering. (value: MainQuery) */
  PreMainQuery: "pre_main_query",
  /** Filter a comment before it is stored. Return null to reject. (value: comment draft, post) */
  CommentPreprocess: "comment_preprocess",
  /** Runs after a comment is accepted. (comment, post) */
  CommentSubmitted: "comment_submitted",
  /** Runs after a post/page is created or updated. (post, previous|null) */
  PostSaved: "post_saved",
  /** Runs after a post/page is deleted. (post) */
  PostDeleted: "post_deleted",
  /** Runs after a media item is uploaded. (media) */
  MediaUploaded: "media_uploaded",
  /** Filter the RSS/Atom item list. (value: posts, settings) */
  FeedItems: "feed_items",
  /** Filter the computed permalink for a post. (value: path, post, settings) */
  PostPermalink: "post_permalink",
  /** Runs once the installation completes. (settings) */
  InstallCompleted: "install_completed",
  /** Runs after site settings are saved. (username) */
  SettingsSaved: "settings_saved",
  /** Runs when the active theme boots for a request. (theme, ctx) */
  ThemeSetup: "theme_setup",
  /** Filter the archive title shown on term/author/date archives. (value: string, query) */
  ArchiveTitle: "archive_title",
  /** Contribute nodes rendered at the end of <body> on frontend pages. (value: unknown[], press, query) */
  DocumentFooter: "document_footer",
  /** Gate a login attempt before credentials are checked. (value: {allowed, reason?}, {username, ip}) */
  LoginThrottle: "login_throttle",
  /** Runs on every login attempt through the dashboard form. ({username, ip, success}) */
  LoginAttempt: "login_attempt",
  /** Contribute extra form fields to the post/page editor. (value: ReactNode[], {post, type, press}) */
  AdminEditorFields: "admin_post_editor",
  /** Intercept an unresolved path before the 404 renders. (value: {target, status} | null, pathname) */
  PreNotFound: "pre_not_found",
} as const;
