import { db } from "./client";

/**
 * VinextPress database schema.
 *
 * Every statement is idempotent, so the runtime installer can ensure the
 * schema on a fresh environment (local dev, a brand-new D1 database) and
 * `migrations/0001_init.sql` applies the exact same DDL through the CLI.
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS vp_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'author',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS vp_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'post',
    status TEXT NOT NULL DEFAULT 'draft',
    slug TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    content_format TEXT NOT NULL DEFAULT 'markdown',
    author_id INTEGER,
    parent_id INTEGER,
    menu_order INTEGER NOT NULL DEFAULT 0,
    comment_status TEXT NOT NULL DEFAULT 'open',
    featured_media_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    published_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vp_posts_type_slug ON vp_posts(type, slug)`,
  `CREATE INDEX IF NOT EXISTS vp_posts_timeline ON vp_posts(type, status, published_at)`,
  `CREATE INDEX IF NOT EXISTS vp_posts_parent ON vp_posts(parent_id)`,
  `CREATE TABLE IF NOT EXISTS vp_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taxonomy TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    parent_id INTEGER,
    UNIQUE (taxonomy, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS vp_term_relationships (
    term_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    PRIMARY KEY (term_id, post_id)
  )`,
  `CREATE INDEX IF NOT EXISTS vp_term_rel_post ON vp_term_relationships(post_id)`,
  `CREATE TABLE IF NOT EXISTS vp_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_id INTEGER,
    author_name TEXT NOT NULL DEFAULT '',
    author_email TEXT NOT NULL DEFAULT '',
    author_url TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS vp_comments_post ON vp_comments(post_id, status, created_at)`,
  `CREATE INDEX IF NOT EXISTS vp_comments_status ON vp_comments(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS vp_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    r2_key TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size INTEGER NOT NULL DEFAULT 0,
    width INTEGER,
    height INTEGER,
    alt TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    uploaded_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS vp_options (
    name TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    autoload INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS vp_postmeta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    meta_key TEXT NOT NULL,
    meta_value TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS vp_postmeta_lookup ON vp_postmeta(post_id, meta_key)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vp_postmeta_unique ON vp_postmeta(post_id, meta_key)`,
  `CREATE TABLE IF NOT EXISTS vp_form_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    ip_hash TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS vp_form_entries_form ON vp_form_entries(form_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS vp_redirects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL UNIQUE,
    target TEXT NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 301,
    hits INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS vp_stats_daily (
    day TEXT NOT NULL,
    path TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    uniques INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, path)
  )`,
  `CREATE TABLE IF NOT EXISTS vp_login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT '',
    success INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS vp_login_attempts_lookup ON vp_login_attempts(username, ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS vp_stats_uniques (
    day TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    PRIMARY KEY (day, ip_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS vp_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

/** Create any missing tables/indexes. Safe to call repeatedly. */
export async function ensureSchema(database: D1Database = db()): Promise<void> {
  await database.batch(SCHEMA_STATEMENTS.map((sql) => database.prepare(sql)));
}

/** True once the schema exists (the options table is the sentinel). */
export async function schemaExists(database: D1Database = db()): Promise<boolean> {
  try {
    const row = await database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vp_options'")
      .first();
    return row !== null;
  } catch {
    return false;
  }
}

let schemaCurrentChecked = false;

/**
 * Upgrade path: installations created before a schema revision gain the
 * missing tables on the first request after a deploy (idempotent DDL).
 * Checked once per isolate.
 */
export async function ensureSchemaCurrent(database: D1Database = db()): Promise<void> {
  if (schemaCurrentChecked) return;
  schemaCurrentChecked = true;
  try {
    const row = await database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vp_redirects'")
      .first();
    if (!row) await ensureSchema(database);
  } catch {
    await ensureSchema(database);
  }
}
