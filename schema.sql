-- stanl.top D1 schema
-- 执行：npx wrangler d1 execute stanl-blog --remote --file=./schema.sql

-- ── 浏览量 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pageviews (
  path       TEXT PRIMARY KEY,
  views      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── 留言 / 评论 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  path          TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  email         TEXT,
  website       TEXT,
  content       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'approved',
  reply_to      INTEGER,
  reply_content TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_path ON comments(path, status);
CREATE INDEX IF NOT EXISTS idx_comments_time ON comments(created_at);

-- ── 友链申请 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS link_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  avatar     TEXT,
  desc       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_links_status ON link_requests(status, created_at);
