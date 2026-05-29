import { describe, expect, it } from 'vitest'
import { Vault } from '../crypto/vault'
import { newNote } from '../types/note'
import { ErrorCodes } from '../errors/codes'
import { decodeNoteWireRow, encodeEncryptedNote, type NoteWireRow } from './noteWireCodec'

describe('noteWireCodec', () => {
  it('encodes and decodes round-trip', async () => {
    const vault = new Vault()
    await vault.create('test-pw')
    const note = newNote({ title: 'Roundtrip' })
    const encoded = await encodeEncryptedNote(vault, note)
    expect(encoded.v).toBe(2)
    expect(typeof encoded.ivB64).toBe('string')
    expect(typeof encoded.ciphertextB64).toBe('string')
    expect(encoded.updatedAt).toBe(note.updatedAt)

    const row: NoteWireRow = { id: note.id, updatedAt: note.updatedAt, payload: encoded }
    const result = await decodeNoteWireRow(vault, row)
    expect(result).not.toBeNull()
    expect(result!.legacy).toBe(false)
    expect(result!.note.id).toBe(note.id)
    expect(result!.note.title).toBe('Roundtrip')
  })

  it('decodes legacy plain note', async () => {
    const vault = new Vault()
    await vault.create('test-pw')
    const note = newNote({ title: 'Legacy' })
    const row: NoteWireRow = {
      id: note.id,
      updatedAt: note.updatedAt,
      payload: { ...note },
    }
    const result = await decodeNoteWireRow(vault, row)
    expect(result).not.toBeNull()
    expect(result!.legacy).toBe(true)
    expect(result!.note.title).toBe('Legacy')
  })

  it('throws CRYPTO_DECRYPT_FAILED on wrong vault key', async () => {
    const vault = new Vault()
    await vault.create('correct-pw')
    const note = newNote({ title: 'Secret' })
    const encoded = await encodeEncryptedNote(vault, note)

    const wrongVault = new Vault()
    await wrongVault.create('wrong-pw')
    const row: NoteWireRow = { id: note.id, updatedAt: note.updatedAt, payload: encoded }
    await expect(decodeNoteWireRow(wrongVault, row)).rejects.toMatchObject({
      code: ErrorCodes.CRYPTO_DECRYPT_FAILED,
    })
  })

  it('throws STORAGE_CORRUPT on invalid decrypted JSON', async () => {
    const vault = new Vault()
    const meta = await vault.create('test-pw')
    vault.lock()

    const attacker = new Vault()
    await attacker.unlock('test-pw', meta)
    const badIv = 'AAAAAAAAAAAAAAAAAAAAAA=='
    const badCt = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    const row: NoteWireRow = {
      id: 'id',
      updatedAt: 1,
      payload: { v: 2, ivB64: badIv, ciphertextB64: badCt },
    }
    await expect(decodeNoteWireRow(attacker, row)).rejects.toMatchObject({
      code: ErrorCodes.CRYPTO_DECRYPT_FAILED,
    })
  })

  it('returns null for unknown payload shape', async () => {
    const vault = new Vault()
    await vault.create('test-pw')
    const row: NoteWireRow = { id: 'id', updatedAt: 1, payload: { foo: 'bar' } }
    const result = await decodeNoteWireRow(vault, row)
    expect(result).toBeNull()
  })

  it('reconciles updatedAt when row and decrypted note differ', async () => {
    const vault = new Vault()
    await vault.create('test-pw')
    const note = newNote({ title: 'Time reconcile' })
    const encoded = await encodeEncryptedNote(vault, note)
    const row: NoteWireRow = { id: note.id, updatedAt: note.updatedAt + 999, payload: encoded }
    const result = await decodeNoteWireRow(vault, row)
    expect(result!.note.updatedAt).toBe(note.updatedAt + 999)
  })
})
