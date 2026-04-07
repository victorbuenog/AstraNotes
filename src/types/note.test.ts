import { describe, expect, it } from 'vitest'
import { newNote, setPrimaryMarkdown, getPrimaryMarkdown, createEmptyDocument } from './note'

describe('note helpers', () => {
  it('creates empty document with markdown block', () => {
    const d = createEmptyDocument()
    expect(d.version).toBe(1)
    expect(d.blocks.some((b) => b.type === 'markdown')).toBe(true)
  })

  it('newNote has timestamps and title', () => {
    const n = newNote({ title: '  Hello  ' })
    expect(n.title).toBe('Hello')
    expect(n.createdAt).toBeLessThanOrEqual(Date.now())
  })

  it('setPrimaryMarkdown updates primary text', () => {
    let n = newNote()
    n = setPrimaryMarkdown(n, '# Hi')
    expect(getPrimaryMarkdown(n)).toBe('# Hi')
  })
})
