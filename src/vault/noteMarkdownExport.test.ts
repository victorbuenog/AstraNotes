import { describe, expect, it } from 'vitest'
import { newNote, setPrimaryMarkdown } from '../types/note'
import { noteToMarkdownExport, slugifyNoteFilename } from './noteMarkdownExport'

describe('noteMarkdownExport', () => {
  it('slugifyNoteFilename produces a safe stem', () => {
    expect(slugifyNoteFilename('Hello World!')).toBe('hello-world')
    expect(slugifyNoteFilename('   ')).toBe('note')
  })

  it('noteToMarkdownExport includes front matter and body', () => {
    let n = newNote({ title: 'T1', tags: ['a', 'b'] })
    n = setPrimaryMarkdown(n, '# Hi\n\nx')
    const md = noteToMarkdownExport(n)
    expect(md).toContain('title: "T1"')
    expect(md).toContain('- "a"')
    expect(md).toContain('astranotes_id:')
    expect(md).toContain('# Hi')
  })
})
