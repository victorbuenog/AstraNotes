import type { Database } from 'better-sqlite3'
import { NOTE_PAYLOAD_V2, type EncryptedNotePutBody } from '../validators/noteValidators.js'

export type NoteListItem = {
  id: string
  updatedAt: number
  payload: unknown
}

export function listNotesByUser(db: Database, userId: number): NoteListItem[] {
  const rows = db
    .prepare('SELECT id, payload, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId) as { id: string; payload: string; updated_at: number }[]

  const notes: NoteListItem[] = []
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload) as unknown
      notes.push({ id: row.id, updatedAt: row.updated_at, payload })
    } catch {
      /* skip corrupt row */
    }
  }
  return notes
}

export function saveEncryptedNoteForUser(
  db: Database,
  input: { id: string; userId: number; body: EncryptedNotePutBody },
): 'ok' | 'forbidden' {
  const existing = db.prepare('SELECT user_id FROM notes WHERE id = ?').get(input.id) as
    | { user_id: number }
    | undefined
  if (existing && existing.user_id !== input.userId) {
    return 'forbidden'
  }

  const payload = JSON.stringify({
    v: NOTE_PAYLOAD_V2,
    ivB64: input.body.ivB64,
    ciphertextB64: input.body.ciphertextB64,
  })

  db.prepare('INSERT OR REPLACE INTO notes (id, user_id, payload, updated_at) VALUES (?, ?, ?, ?)').run(
    input.id,
    input.userId,
    payload,
    input.body.updatedAt,
  )

  return 'ok'
}

export function deleteNoteForUser(db: Database, input: { id: string; userId: number }): boolean {
  const info = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(input.id, input.userId)
  return info.changes > 0
}
