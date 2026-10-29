-- VinextPress extension tables (mirrors press/db/schema.ts — keep in sync).
-- Used by the bundled plugins: formsmith, waypoint, pulse, bastion.
-- Apply with: npx cf d1 migrations apply <database-id>

CREATE UNIQUE INDEX IF NOT EXISTS vp_postmeta_unique ON vp_postmeta(post_id, meta_key);

-- formsmith: contact-form submissions
CREATE TABLE IF NOT EXISTS vp_form_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  ip_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS vp_form_entries_form ON vp_form_entries(form_id, created_at);

-- waypoint: redirect rules
CREATE TABLE IF NOT EXISTS vp_redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL UNIQUE,
  target TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,
  hits INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pulse: privacy-friendly daily traffic aggregates
CREATE TABLE IF NOT EXISTS vp_stats_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  uniques INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);

-- bastion: login attempts + audit trail
CREATE TABLE IF NOT EXISTS vp_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS vp_login_attempts_lookup ON vp_login_attempts(username, ip_hash, created_at);

CREATE TABLE IF NOT EXISTS vp_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pulse: per-day pseudonymous visitors (dedupe key for uniques)
CREATE TABLE IF NOT EXISTS vp_stats_uniques (
  day TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  PRIMARY KEY (day, ip_hash)
);
