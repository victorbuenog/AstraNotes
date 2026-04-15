import { describe, expect, it } from 'vitest'
import { newNote } from '../types/note'
import { buildVaultExport, parseVaultImportJson, serializeVaultExport } from './exportFormat'

describe('exportFormat', () => {
  it('round-trips v1 export', () => {
    const n = newNote({ title: 'Hi' })
    const exp = buildVaultExport([n])
    const text = serializeVaultExport(exp)
    const parsed = parseVaultImportJson(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.notes).toHaveLength(1)
    expect(parsed.data.notes[0].id).toBe(n.id)
    expect(parsed.data.notes[0].title).toBe('Hi')
  })

  it('rejects bad formatVersion', () => {
    const r = parseVaultImportJson('{"formatVersion":99,"app":"astranotes","notes":[]}')
    expect(r.ok).toBe(false)
  })
})
