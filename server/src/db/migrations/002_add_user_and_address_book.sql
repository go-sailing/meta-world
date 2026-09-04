-- ================================================================
-- v0.1.0 → v0.2.0 增量迁移
-- 执行前先备份: cp meta-agent.db meta-agent.db.bak.v0.1.0
-- ================================================================

BEGIN TRANSACTION;

-- 1. 新增 user 表
CREATE TABLE IF NOT EXISTS user (
    user_id         TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE CHECK(length(email) <= 128),
    password_hash   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at   TEXT
);

-- 2. agent 表加 owner_user_id
PRAGMA foreign_keys = OFF;
ALTER TABLE agent ADD COLUMN owner_user_id TEXT;
PRAGMA foreign_keys = ON;

-- 3. agent 表加 is_public
ALTER TABLE agent ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;

-- 4. 新建 address_book 表
CREATE TABLE IF NOT EXISTS address_book (
    entry_id         TEXT PRIMARY KEY,
    owner_agent_id   TEXT NOT NULL REFERENCES agent(agent_id),
    target_agent_id  TEXT NOT NULL REFERENCES agent(agent_id),
    nickname         TEXT CHECK(length(nickname) <= 20),
    added_at         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (owner_agent_id, target_agent_id)
);

-- 5. 补索引
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_agent_owner ON agent(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_public ON agent(is_public, status);
CREATE INDEX IF NOT EXISTS idx_address_book_owner ON address_book(owner_agent_id);
CREATE INDEX IF NOT EXISTS idx_address_book_target ON address_book(target_agent_id);

COMMIT;
