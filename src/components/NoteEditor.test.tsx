import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { newNote, setPrimaryMarkdown } from '../types/note'
import { NoteEditor } from './NoteEditor'

const mockGetScrollPos = vi.fn()
const mockSetScrollPos = vi.fn()

vi.mock('../context/NotesContext', () => ({
  useNotes: () => ({
    allTags: [],
    updateNote: vi.fn(),
    flushSave: vi.fn(),
    saving: false,
    lastSavedAt: null,
    getNoteScrollPosition: mockGetScrollPos,
    setNoteScrollPosition: mockSetScrollPos,
  }),
}))

function makeNote(id: string, title?: string) {
  let n = newNote({ title: title ?? id })
  n = setPrimaryMarkdown(n, `# ${title ?? id}\n\n` + 'line\n'.repeat(200))
  return { ...n, id }
}

beforeEach(() => {
  mockGetScrollPos.mockReset()
  mockSetScrollPos.mockReset()
})

describe('NoteEditor scroll position', () => {
  it('restores saved scroll position on mount', () => {
    mockGetScrollPos.mockReturnValue({ textarea: 150, preview: 300 })
    render(<NoteEditor note={makeNote('note-1')} />)
    const ta = screen.getByLabelText<HTMLTextAreaElement>('Markdown body')
    expect(ta.scrollTop).toBe(150)
  })

  it('does not restore when no saved position exists', () => {
    mockGetScrollPos.mockReturnValue(null)
    render(<NoteEditor note={makeNote('note-2')} />)
    const ta = screen.getByLabelText<HTMLTextAreaElement>('Markdown body')
    expect(ta.scrollTop).toBe(0)
  })

  it('saves scroll position on textarea scroll', () => {
    render(<NoteEditor note={makeNote('note-3')} />)
    const ta = screen.getByLabelText<HTMLTextAreaElement>('Markdown body')
    Object.defineProperty(ta, 'scrollTop', { value: 200, writable: true })
    ta.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(mockSetScrollPos).toHaveBeenCalledWith('note-3', { textarea: 200, preview: 0 })
  })
})
