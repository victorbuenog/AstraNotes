import { openDB, type IDBPDatabase } from 'idb'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import type { Note } from '../types/note'
import { Vault, type VaultMeta } from '../crypto/vault'
import { DB_NAME, DB_VERSION, type StoredNotePayload, type StoredNoteRecord } from './schema'

const META_KEY = 'vault'
const STORE_META = 'meta'
const STORE_NOTES = 'notes'

type MetaRow = { key: string; value: VaultMeta }

let dbPromise: Promise<IDBPDatabase> | null = null

/** Clears cached DB handle (e.g. after tests call `deleteDB`) */
export function resetDbConnectionForTests(): void {
  dbPromise = null
}

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_META)) {
          database.createObjectStore(STORE_META, { keyPath: 'key' })
        }
        if (!database.objectStoreNames.contains(STORE_NOTES)) {
          database.createObjectStore(STORE_NOTES, { keyPath: 'id' })
        }
      },
    }).catch((e) => {
      dbPromise = null
      throw new AppError(ErrorCodes.STORAGE_OPEN_FAILED, 'Could not open local database', e)
    })
  }
  return dbPromise
}

export async function getVaultMeta(): Promise<VaultMeta | null> {
  const db = await getDb()
  const row = await db.get(STORE_META, META_KEY)
  return (row as MetaRow | undefined)?.value ?? null
}

export async function setVaultMeta(meta: VaultMeta): Promise<void> {
  const db = await getDb()
  await db.put(STORE_META, { key: META_KEY, value: meta })
}

export type NoteSummary = Pick<Note, 'id' | 'title' | 'updatedAt' | 'archived'>

function payloadFromNote(note: Note): StoredNotePayload {
  return {
    title: note.title,
    archived: note.archived,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    document: note.document,
  }
}

function noteFromPayload(id: string, p: StoredNotePayload): Note {
  return {
    id,
    title: p.title,
    archived: p.archived,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    document: p.document,
  }
}

export async function saveNote(vault: Vault, note: Note): Promise<void> {
  const db = await getDb()
  const json = JSON.stringify(payloadFromNote(note))
  const { ivB64, ciphertextB64 } = await vault.encrypt(json)
  const rec: StoredNoteRecord = { id: note.id, ivB64, ciphertextB64 }
  try {
    await db.put(STORE_NOTES, rec)
  } catch (e) {
    throw new AppError(ErrorCodes.NOTE_SAVE_FAILED, 'Failed to save note', e)
  }
}

export async function loadNote(vault: Vault, id: string): Promise<Note | null> {
  const db = await getDb()
  const rec = (await db.get(STORE_NOTES, id)) as StoredNoteRecord | undefined
  if (!rec) return null
  let json: string
  try {
    json = await vault.decrypt(rec.ivB64, rec.ciphertextB64)
  } catch (e) {
    throw AppError.wrap(e, ErrorCodes.CRYPTO_DECRYPT_FAILED, 'Could not decrypt note')
  }
  try {
    const payload = JSON.parse(json) as StoredNotePayload
    return noteFromPayload(id, payload)
  } catch (e) {
    throw new AppError(ErrorCodes.STORAGE_CORRUPT, 'Note data is corrupted', e)
  }
}

export async function listSummaries(vault: Vault): Promise<NoteSummary[]> {
  const db = await getDb()
  const keys = await db.getAllKeys(STORE_NOTES)
  const summaries: NoteSummary[] = []
  for (const id of keys) {
    const note = await loadNote(vault, id as string)
    if (note) {
      summaries.push({
        id: note.id,
        title: note.title,
        updatedAt: note.updatedAt,
        archived: note.archived,
      })
    }
  }
  return summaries
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb()
  try {
    await db.delete(STORE_NOTES, id)
  } catch (e) {
    throw new AppError(ErrorCodes.NOTE_DELETE_FAILED, 'Failed to delete note', e)
  }
}

export async function clearAllNotes(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE_NOTES)
}
