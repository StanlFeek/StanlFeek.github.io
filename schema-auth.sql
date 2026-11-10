-- stanl.top 用户系统
-- 执行：npx wrangler d1 execute stanl-blog --remote --file=./schema-auth.sql

-- ── 用户 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  nickname      TEXT NOT NULL,
  password_hash TEXT NOT NULL,              -- pbkdf2$迭代次数$salt_b64$hash_b64
  role          TEXT NOT NULL DEFAULT 'user',    -- user | admin
  status        TEXT NOT NULL DEFAULT 'active',  -- active | banned
  created_at    TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- ── 会话 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,              -- sha256(明文 token)
  user_id    INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  ip         TEXT,
  ua         TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON sessions(expires_at);

-- ── 邮箱验证码 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_codes (
  email      TEXT NOT NULL,
  purpose    TEXT NOT NULL,                 -- register | reset
  code_hash  TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (email, purpose)
);

-- ── 留言关联用户 ────────────────────────────────────────────────────
-- D1 的 ALTER TABLE 不支持 IF NOT EXISTS，重复执行会报 duplicate column，忽略即可
ALTER TABLE comments ADD COLUMN user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
