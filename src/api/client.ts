import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import type { Vault, VaultMeta } from '../crypto/vault'
import type { Note } from '../types/note'
import { NOTE_PAYLOAD_VERSION, isEncryptedPayload } from '../types/noteWire'

async function parseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function mapStatusToError(status: number, body: { error?: string } | null): AppError {
  const msg = body?.error ?? resMessage(status)
  if (status === 401) {
    if (msg.includes('credentials')) {
      return new AppError(ErrorCodes.AUTH_INVALID_CREDENTIALS, msg)
    }
    return new AppError(ErrorCodes.AUTH_UNAUTHORIZED, msg)
  }
  if (status === 403) return new AppError(ErrorCodes.AUTH_FORBIDDEN, msg)
  if (status === 409) {
    if (msg.includes('Encryption already')) {
      return new AppError(ErrorCodes.AUTH_CRYPTO_ALREADY_SET, msg)
    }
    return new AppError(ErrorCodes.AUTH_USERNAME_TAKEN, msg)
  }
  if (status >= 400 && status < 500) {
    return new AppError(ErrorCodes.VALIDATION_INVALID_NOTE, msg)
  }
  return new AppError(ErrorCodes.AUTH_NETWORK, msg)
}

function resMessage(status: number): string {
  if (status === 401) return 'Unauthorized'
  if (status === 403) return 'Forbidden'
  if (status === 404) return 'Not found'
  if (status === 409) return 'Conflict'
  return `Request failed (${status})`
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch (e) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Network error — is the API running?', e)
  }
}

export type MeResponse = {
  username: string
  encryptionMeta: VaultMeta | null
}

export async function getMe(): Promise<MeResponse | null> {
  const res = await apiFetch('/api/me')
  if (res.status === 401) return null
  const body = await parseJson<MeResponse | { error?: string }>(res)
  if (!res.ok) {
    throw mapStatusToError(res.status, body as { error?: string } | null)
  }
  if (!body || !('username' in body)) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Invalid response from server')
  }
  return body as MeResponse
}

export async function register(
  username: string,
  password: string,
  encryptionMeta: VaultMeta,
): Promise<MeResponse> {
  const res = await apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, encryptionMeta }),
  })
  const body = await parseJson<MeResponse | { error?: string }>(res)
  if (!res.ok) throw mapStatusToError(res.status, body as { error?: string } | null)
  if (!body || !('username' in body)) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Invalid response from server')
  }
  return body as MeResponse
}

export async function login(username: string, password: string): Promise<MeResponse> {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  const body = await parseJson<MeResponse | { error?: string }>(res)
  if (!res.ok) throw mapStatusToError(res.status, body as { error?: string } | null)
  if (!body || !('username' in body)) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Invalid response from server')
  }
  return body as MeResponse
}

export async function patchEncryptionMeta(encryptionMeta: VaultMeta): Promise<void> {
  const res = await apiFetch('/api/me/encryption-meta', {
    method: 'PATCH',
    body: JSON.stringify({ encryptionMeta }),
  })
  if (res.status === 401) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not logged in')
  }
  if (!res.ok && res.status !== 204) {
    const body = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, body)
  }
}

export async function logout(): Promise<void> {
  const res = await apiFetch('/api/logout', { method: 'POST' })
  if (!res.ok && res.status !== 204) {
    const body = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, body)
  }
}

function isLegacyPlainNote(p: unknown): p is Note {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.title === 'string' && o.document !== undefined
}

export type ListNotesResult = { notes: Note[]; legacyIds: string[] }

export async function listNotes(vault: Vault): Promise<ListNotesResult> {
  const res = await apiFetch('/api/notes')
  if (res.status === 401) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not logged in')
  }
  const body = await parseJson<{ id: string; updatedAt: number; payload: unknown }[]>(res)
  if (!res.ok) {
    throw mapStatusToError(res.status, body as { error?: string } | null)
  }
  const rows = body ?? []
  const notes: Note[] = []
  const legacyIds: string[] = []
  for (const row of rows) {
    if (isEncryptedPayload(row.payload)) {
      const json = await vault.decrypt(row.payload.ivB64, row.payload.ciphertextB64)
      let note: Note
      try {
        note = JSON.parse(json) as Note
      } catch (e) {
        throw new AppError(ErrorCodes.STORAGE_CORRUPT, 'Could not parse decrypted note', e)
      }
      if (note.updatedAt !== row.updatedAt) {
        note = { ...note, updatedAt: row.updatedAt }
      }
      notes.push(note)
    } else if (isLegacyPlainNote(row.payload)) {
      let note = row.payload
      if (note.updatedAt !== row.updatedAt) {
        note = { ...note, updatedAt: row.updatedAt }
      }
      notes.push(note)
      legacyIds.push(row.id)
    }
  }
  return { notes, legacyIds }
}

export async function saveNote(vault: Vault, note: Note): Promise<void> {
  const json = JSON.stringify(note)
  const { ivB64, ciphertextB64 } = await vault.encrypt(json)
  const body = {
    v: NOTE_PAYLOAD_VERSION,
    ivB64,
    ciphertextB64,
    updatedAt: note.updatedAt,
  }
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
    const errBody = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, errBody)
  }
}

/** Re-save a legacy plaintext note as encrypted (same id and content). */
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
