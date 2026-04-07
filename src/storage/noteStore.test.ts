import { describe, expect, it, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { Vault } from '../crypto/vault'
import { newNote } from '../types/note'
import * as store from './noteStore'
import { DB_NAME } from './schema'

beforeEach(async () => {
  await deleteDB(DB_NAME).catch(() => undefined)
  store.resetDbConnectionForTests()
})

describe('noteStore', () => {
  it('saves and loads encrypted note', async () => {
    const vault = new Vault()
    const meta = await vault.create('integration-test-pass')
    await store.setVaultMeta(meta)

    const note = newNote({ title: 'T1' })
    await store.saveNote(vault, note)

    const loaded = await store.loadNote(vault, note.id)
    expect(loaded?.title).toBe('T1')

    const summaries = await store.listSummaries(vault)
    expect(summaries.some((s) => s.id === note.id)).toBe(true)

    await store.deleteNote(note.id)
    expect(await store.loadNote(vault, note.id)).toBeNull()
  })
})
