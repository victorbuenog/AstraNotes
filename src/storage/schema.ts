import type { NoteDocument } from '../types/note'

/** Encrypted blob contents (JSON) — mirrors Note minus id (id is the store key) */
export type StoredNotePayload = {
  title: string
  archived: boolean
  createdAt: number
  updatedAt: number
  document: NoteDocument
}

export type StoredNoteRecord = {
  id: string
  ivB64: string
  ciphertextB64: string
}

export const DB_NAME = 'astranotes-v1'
export const DB_VERSION = 1
