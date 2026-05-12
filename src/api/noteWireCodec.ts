import type { Vault } from '../crypto/vault'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import type { Note } from '../types/note'
import { migrateNoteShape } from '../types/note'
import { NOTE_PAYLOAD_VERSION, isEncryptedPayload } from '../types/noteWire'

export type NoteWireRow = {
  id: string
  updatedAt: number
  payload: unknown
}

export type EncodedEncryptedNote = {
  v: typeof NOTE_PAYLOAD_VERSION
  ivB64: string
  ciphertextB64: string
  updatedAt: number
}

function isLegacyPlainNote(payload: unknown): payload is Note {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    candidate.document !== undefined
  )
}

export async function decodeNoteWireRow(
  vault: Vault,
  row: NoteWireRow,
): Promise<{ note: Note; legacy: boolean } | null> {
  if (isEncryptedPayload(row.payload)) {
    let json: string
    try {
      json = await vault.decrypt(row.payload.ivB64, row.payload.ciphertextB64)
    } catch (cause) {
      throw new AppError(
        ErrorCodes.CRYPTO_DECRYPT_FAILED,
        'Could not decrypt a note. Wrong password, corrupt data, or ciphertext from another vault.',
        cause,
      )
    }

    let note: Note
    try {
      note = migrateNoteShape(JSON.parse(json) as Note)
    } catch (cause) {
      throw new AppError(ErrorCodes.STORAGE_CORRUPT, 'Could not parse decrypted note JSON', cause)
    }

    return {
      note: note.updatedAt === row.updatedAt ? note : { ...note, updatedAt: row.updatedAt },
      legacy: false,
    }
  }

  if (isLegacyPlainNote(row.payload)) {
    const note = migrateNoteShape(row.payload)
    return {
      note: note.updatedAt === row.updatedAt ? note : { ...note, updatedAt: row.updatedAt },
      legacy: true,
    }
  }

  return null
}

export async function encodeEncryptedNote(vault: Vault, note: Note): Promise<EncodedEncryptedNote> {
  const json = JSON.stringify(note)
  const { ivB64, ciphertextB64 } = await vault.encrypt(json)
  return {
    v: NOTE_PAYLOAD_VERSION,
    ivB64,
    ciphertextB64,
    updatedAt: note.updatedAt,
  }
}
