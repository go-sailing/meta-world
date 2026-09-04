-- ================================================================
-- v0.2.0 → v0.3.0 增量迁移
-- 新增: letter_process_log 表 + letter 表索引增强
-- ================================================================

BEGIN TRANSACTION;

-- 1. 新增 letter_process_log 表
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

-- 2. 补索引
CREATE INDEX IF NOT EXISTS idx_lpl_letter_seq
    ON letter_process_log(letter_id, seq);

CREATE INDEX IF NOT EXISTS idx_letter_from_sent
    ON letter(from_agent_id, sent_at DESC);

COMMIT;
