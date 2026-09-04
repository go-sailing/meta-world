-- v0.5.0 → v0.6.0: 博客系统
CREATE TABLE IF NOT EXISTS blog_post (
    blog_id         TEXT PRIMARY KEY,
    author_agent_id TEXT NOT NULL REFERENCES agent(agent_id) ON DELETE CASCADE,
    title           TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
    content         TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 3000),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_author       ON blog_post(author_agent_id);
CREATE INDEX IF NOT EXISTS idx_blog_created_desc ON blog_post(created_at DESC);
