import type { Database } from 'better-sqlite3'
import type { VaultMetaJson } from '../validators/authValidators.js'
import { isVaultMeta } from '../validators/authValidators.js'

type UserRow = {
  id: number
  password_hash: string
  encryption_meta: string | null
}

function parseStoredVaultMeta(raw: string | null): VaultMetaJson | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isVaultMeta(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function createUser(
  db: Database,
  input: { username: string; passwordHash: string; createdAt: number; encryptionMeta: VaultMetaJson },
): number {
  const info = db
    .prepare(
      'INSERT INTO users (username, password_hash, created_at, encryption_meta) VALUES (?, ?, ?, ?)',
    )
    .run(
      input.username,
      input.passwordHash,
      input.createdAt,
      JSON.stringify(input.encryptionMeta),
    )
  return Number(info.lastInsertRowid)
}

export function findUserAuthByUsername(
  db: Database,
  username: string,
): { id: number; passwordHash: string; encryptionMeta: VaultMetaJson | null } | null {
  const row = db
    .prepare('SELECT id, password_hash, encryption_meta FROM users WHERE username = ?')
    .get(username) as UserRow | undefined
  if (!row) return null
  return {
    id: row.id,
    passwordHash: row.password_hash,
    encryptionMeta: parseStoredVaultMeta(row.encryption_meta),
  }
}

export function getUserEncryptionMeta(db: Database, userId: number): VaultMetaJson | null {
  const row = db.prepare('SELECT encryption_meta FROM users WHERE id = ?').get(userId) as
    | { encryption_meta: string | null }
    | undefined
  return parseStoredVaultMeta(row?.encryption_meta ?? null)
}

export function userHasEncryptionMeta(db: Database, userId: number): boolean {
  const row = db.prepare('SELECT encryption_meta FROM users WHERE id = ?').get(userId) as
    | { encryption_meta: string | null }
    | undefined
  return Boolean(row?.encryption_meta)
}

export function setUserEncryptionMeta(db: Database, userId: number, encryptionMeta: VaultMetaJson): void {
  db.prepare('UPDATE users SET encryption_meta = ? WHERE id = ?').run(
    JSON.stringify(encryptionMeta),
    userId,
  )
}
