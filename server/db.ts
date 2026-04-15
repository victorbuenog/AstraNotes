import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

/** WAL is fastest on local disks; DELETE/TRUNCATE are safer on network filesystems (SMB/NAS) and many cloud folders. */
export type SqliteJournalMode = 'WAL' | 'DELETE' | 'TRUNCATE'

export function openDb(
  dbPath: string,
  opts?: { journalMode?: SqliteJournalMode },
): Database.Database {
  const dir = path.dirname(dbPath)
  fs.mkdirSync(dir, { recursive: true })
  const db = new Database(dbPath)
  const journalMode = opts?.journalMode ?? 'WAL'
  db.pragma(`journal_mode = ${journalMode}`)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      encryption_meta TEXT
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
  `)
  try {
    db.exec('ALTER TABLE users ADD COLUMN encryption_meta TEXT')
  } catch {
    /* column already present */
  }
  return db
}
