import type { Vault } from '../crypto/vault'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import type { Note } from '../types/note'
import { apiFetch, mapStatusToError, parseJson } from './httpClient'
import { decodeNoteWireRow, encodeEncryptedNote, type NoteWireRow } from './noteWireCodec'

export type ListNotesResult = { notes: Note[]; legacyIds: string[] }

export async function listNotes(vault: Vault): Promise<ListNotesResult> {
  const res = await apiFetch('/api/notes')
  if (res.status === 401) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not logged in')
  }

  const body = await parseJson<NoteWireRow[] | { error?: string }>(res)
  if (!res.ok) {
    throw mapStatusToError(res.status, body as { error?: string } | null)
  }

  const rows = Array.isArray(body) ? body : []
  const notes: Note[] = []
  const legacyIds: string[] = []

  for (const row of rows) {
    const decoded = await decodeNoteWireRow(vault, row)
    if (!decoded) continue
    notes.push(decoded.note)
    if (decoded.legacy) legacyIds.push(row.id)
  }

  return { notes, legacyIds }
}

export async function saveNote(vault: Vault, note: Note): Promise<void> {
  const body = await encodeEncryptedNote(vault, note)
  const res = await apiFetch(`/api/notes/${encodeURIComponent(note.id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

  if (res.status === 401) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not logged in')
  }
  if (res.status === 403) {
    throw new AppError(ErrorCodes.AUTH_FORBIDDEN, 'Cannot save this note')
  }
  if (!res.ok && res.status !== 204) {
    const errorBody = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, errorBody)
  }
}

export async function upgradeLegacyNote(vault: Vault, note: Note): Promise<void> {
  await saveNote(vault, note)
}

export async function deleteNote(id: string): Promise<void> {
  const res = await apiFetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (res.status === 401) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not logged in')
  }
  if (res.status === 404) {
    throw new AppError(ErrorCodes.NOTE_NOT_FOUND, 'Note not found')
  }
  if (!res.ok && res.status !== 204) {
    const body = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, body)
  }
}
