import { cache } from "react";
import { all, db, first, str, num } from "./db/client";
import type { NavMenuItem, PermalinkStructure, SiteSettings } from "./types";

/**
 * The options table backs every site setting, the active theme, the list
 * of enabled plugins and the navigation menus. Reads are memoized per
 * request with React `cache()` so a render touches D1 once.
 */

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "VinextPress",
  siteTagline: "Publishing at the edge",
  siteUrl: "",
  adminEmail: "",
  permalinkStructure: "post-name",
  postsPerPage: 10,
  showOnFront: "posts",
  pageOnFront: null,
  pageForPosts: null,
  commentModeration: "manual",
  requireNameEmail: true,
  activeTheme: "meridian",
  activePlugins: [],
  navMenu: [],
  installed: false,
  installedAt: null,
};

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface LoadedSettings extends SiteSettings {
  /** HMAC key for session cookies; empty until the site is installed. */
  secretKey: string;
}

function rowToSettings(rows: Array<Record<string, unknown>>): LoadedSettings {
  const map = new Map(rows.map((r) => [str(r, "name"), str(r, "value")]));
  const get = (key: string): string => map.get(key) ?? "";
  return {
    siteTitle: get("site_title") || DEFAULT_SETTINGS.siteTitle,
    siteTagline: get("site_tagline"),
    siteUrl: get("site_url").replace(/\/+$/, ""),
    adminEmail: get("admin_email"),
    permalinkStructure: (get("permalink_structure") || "post-name") as PermalinkStructure,
    postsPerPage: Math.max(1, Number(get("posts_per_page")) || DEFAULT_SETTINGS.postsPerPage),
    showOnFront: get("show_on_front") === "page" ? "page" : "posts",
    pageOnFront: get("page_on_front") ? Number(get("page_on_front")) : null,
    pageForPosts: get("page_for_posts") ? Number(get("page_for_posts")) : null,
    commentModeration: get("comment_moderation") === "auto" ? "auto" : "manual",
    requireNameEmail: get("require_name_email") !== "0",
    activeTheme: get("active_theme") || DEFAULT_SETTINGS.activeTheme,
    activePlugins: parseJson<string[]>(get("active_plugins"), []),
    navMenu: parseJson<NavMenuItem[]>(get("nav_menu"), []),
    installed: map.has("installed") && get("installed") === "1",
    installedAt: get("installed_at") || null,
    secretKey: get("site_secret"),
  };
}

/**
 * Read all autoloaded options straight from D1. Bypasses the request
 * memoization; used right after writes (install, settings saves) when the
 * current render must observe the new values.
 */
export async function freshSettings(): Promise<LoadedSettings> {
  try {
    const rows = await all(
      db().prepare("SELECT name, value FROM vp_options WHERE autoload = 1"),
      (r) => r,
    );
    return rowToSettings(rows);
  } catch {
    const { ensureSchema } = await import("./db/schema");
    await ensureSchema();
    return rowToSettings([]);
  }
}

/**
 * Load all autoloaded options. When the schema does not exist yet (a fresh
 * local environment), ensure it and return defaults marked as not installed.
 * Memoized per request with React `cache()`.
 */
export const loadSettings: () => Promise<LoadedSettings> = cache(async () => freshSettings());

export async function getOption(name: string, fallback = ""): Promise<string> {
  const row = await first(
    db().prepare("SELECT value FROM vp_options WHERE name = ?1").bind(name),
    (r) => str(r, "value"),
  );
  return row ?? fallback;
}

export async function setOption(name: string, value: string, autoload = true): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO vp_options (name, value, autoload) VALUES (?1, ?2, ?3)
       ON CONFLICT(name) DO UPDATE SET value = ?2, autoload = ?3`,
    )
    .bind(name, value, autoload ? 1 : 0)
    .run();
}

export async function deleteOption(name: string): Promise<void> {
  await db().prepare("DELETE FROM vp_options WHERE name = ?1").bind(name).run();
}

/** Read and lazily create the secret used to sign session cookies. */
export async function getSecretKey(): Promise<string> {
  const settings = await loadSettings();
  if (settings.secretKey) return settings.secretKey;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await setOption("site_secret", secret);
  return secret;
}

export async function countInstalledUsers(): Promise<number> {
  try {
    const row = await db().prepare("SELECT COUNT(*) AS n FROM vp_users").first();
    return num(row as unknown as Record<string, unknown>, "n");
  } catch {
    return 0;
  }
}

/** Convenience guard used by the dashboard shell. */
export async function isInstalled(): Promise<boolean> {
  const settings = await loadSettings();
  return settings.installed;
}
