import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 单例数据库连接
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.resolve(config.db.path);
  logger.info({ dbPath }, 'Opening SQLite database');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // 加载 sqlite-vec 扩展
  // better-sqlite3 支持 .loadExtension()，需要扩展 .so 文件
  // DEMO 阶段我们先尝试加载，如果失败则降级：用纯 SQLite + 简单的 embedding 存储（blob）
  try {
    _db.loadExtension('sqlite-vec');
    logger.info('sqlite-vec extension loaded successfully');
    _db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec USING vec0(embedding float[' + config.embedding.dim + '])');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'sqlite-vec not available, will use fallback vector storage');
    // fallback：用普通 BLOB 列存 embedding，查询时在 Node 层做余弦距离
    _db.exec(`
      CREATE TABLE IF NOT EXISTS memory_vec (
        rowid TEXT PRIMARY KEY,
        embedding BLOB NOT NULL
      );
    `);
  }

  // 执行 schema.sql 建表
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  _db.exec(schema);

  logger.info('Database initialized');
  return _db;
}

/** 是否使用真正的 sqlite-vec（还是 fallback） */
export function isVecEnabled(): boolean {
  if (!_db) getDb();
  try {
    _db!.prepare('SELECT vec_version()').get();
    return true;
  } catch {
    return false;
  }
}
