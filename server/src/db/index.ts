import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.resolve(config.db.path);
  logger.info({ dbPath }, 'Opening SQLite database');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // 加载 sqlite-vec 扩展
  try {
    _db.loadExtension('sqlite-vec');
    logger.info('sqlite-vec extension loaded successfully');
    _db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec USING vec0(embedding float[${config.embedding.dim}])`);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'sqlite-vec not available, will use fallback vector storage');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS memory_vec (
        rowid TEXT PRIMARY KEY,
        embedding BLOB NOT NULL
      );
    `);
  }

  // —— v0.2.0: 迁移逻辑 ——
  const userTableExists = _db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='user'`
  ).get();

  if (!userTableExists) {
    // 全新库：执行完整 schema
    logger.info('Fresh database detected, applying full schema');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    _db.exec(schema);
  } else {
    // 增量库：检查是否缺 address_book 表（v0.1.0 → v0.2.0 标记）
    const addrTableExists = _db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='address_book'`
    ).get();
    if (!addrTableExists) {
      logger.info('Running migration 002: add user + address_book');
      const migration = fs.readFileSync(
        path.join(__dirname, 'migrations', '002_add_user_and_address_book.sql'),
        'utf-8'
      );
      _db.exec(migration);
    }

    // v0.2.0 → v0.3.0: 检查是否缺 letter_process_log 表
    const lplTableExists = _db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='letter_process_log'`
    ).get();
    if (!lplTableExists) {
      logger.info('Running migration 003: add letter_process_log');
      const migration = fs.readFileSync(
        path.join(__dirname, 'migrations', '003_add_letter_process_log.sql'),
        'utf-8'
      );
      _db.exec(migration);
    }
  }

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
