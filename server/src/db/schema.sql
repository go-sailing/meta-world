-- ================================================================
-- MetaAgent v0.2.0 Schema
-- 全新库直接执行本文件全量建表；增量库走 migrations/002_add_user_and_address_book.sql
-- ================================================================

-- ------ 1. 用户表 ------
CREATE TABLE IF NOT EXISTS user (
    user_id         TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE CHECK(length(email) <= 128),
    password_hash   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);

-- ------ 2. 智能体表 ------
CREATE TABLE IF NOT EXISTS agent (
    agent_id        TEXT PRIMARY KEY,
    owner_user_id   TEXT REFERENCES user(user_id),
    name            TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 20),
    persona_tags    TEXT NOT NULL,
    is_public       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled'))
);
CREATE INDEX IF NOT EXISTS idx_agent_owner ON agent(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_public ON agent(is_public, status);

-- ------ 3. 通讯录表 ------
CREATE TABLE IF NOT EXISTS address_book (
    entry_id         TEXT PRIMARY KEY,
    owner_agent_id   TEXT NOT NULL REFERENCES agent(agent_id),
    target_agent_id  TEXT NOT NULL REFERENCES agent(agent_id),
    nickname         TEXT CHECK(length(nickname) <= 20),
    added_at         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (owner_agent_id, target_agent_id)
);
CREATE INDEX IF NOT EXISTS idx_address_book_owner ON address_book(owner_agent_id);
CREATE INDEX IF NOT EXISTS idx_address_book_target ON address_book(target_agent_id);

-- ------ 4. 对话消息表 ------
CREATE TABLE IF NOT EXISTS chat_message (
    msg_id     TEXT PRIMARY KEY,
    agent_id   TEXT NOT NULL REFERENCES agent(agent_id),
    role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_message_agent_time ON chat_message(agent_id, created_at);

-- ------ 5. 信件表 ------
CREATE TABLE IF NOT EXISTS letter (
    letter_id      TEXT PRIMARY KEY,
    from_agent_id  TEXT NOT NULL REFERENCES agent(agent_id),
    to_agent_id    TEXT NOT NULL REFERENCES agent(agent_id),
    subject        TEXT CHECK(length(subject) <= 50),
    body           TEXT NOT NULL CHECK(length(body) <= 2000),
    status         TEXT NOT NULL DEFAULT 'delivered'
                       CHECK(status IN ('sent','delivered','read',
                                        'processing','processing_failed',
                                        'replied','done')),
    reply_to       TEXT REFERENCES letter(letter_id),
    sent_at        TEXT NOT NULL DEFAULT (datetime('now')),
    delivered_at   TEXT,
    read_at        TEXT,
    processed_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_letter_to_status ON letter(to_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_letter_from ON letter(from_agent_id);

-- ------ 6. 记忆条目表 ------
CREATE TABLE IF NOT EXISTS memory_item (
    memory_id        TEXT PRIMARY KEY,
    agent_id         TEXT NOT NULL REFERENCES agent(agent_id),
    layer            TEXT NOT NULL CHECK(layer IN ('self','world','other')),
    target_agent_id  TEXT REFERENCES agent(agent_id),
    content          TEXT NOT NULL,
    confidence       REAL NOT NULL DEFAULT 0.5 CHECK(confidence BETWEEN 0 AND 1),
    source_type      TEXT NOT NULL CHECK(source_type IN ('dialogue','letter_receive','letter_send')),
    source_id        TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memory_agent_layer ON memory_item(agent_id, layer);
CREATE INDEX IF NOT EXISTS idx_memory_confidence   ON memory_item(confidence);

-- ------ 7. 信件处理日志表 (v0.3.0 新增) ------
CREATE TABLE IF NOT EXISTS letter_process_log (
    log_id      TEXT PRIMARY KEY,
    letter_id   TEXT NOT NULL REFERENCES letter(letter_id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,
    event_type  TEXT NOT NULL CHECK(event_type IN (
                    'letter_received',
                    'llm_called',
                    'memories_extracted',
                    'reply_decision',
                    'reply_sent',
                    'processing_error'
                )),
    detail      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (letter_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_lpl_letter_seq ON letter_process_log(letter_id, seq);

-- ------ 8. 信件表索引增强 (v0.3.0) ------
CREATE INDEX IF NOT EXISTS idx_letter_from_sent ON letter(from_agent_id, sent_at DESC);

-- ------ 9. 向量表（sqlite-vec 虚拟表，由 db/index.ts 动态创建） ------
