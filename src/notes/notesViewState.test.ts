import { describe, expect, it } from 'vitest'
import { newNote, setPrimaryMarkdown, type Note } from '../types/note'
import { getSelectedVisibleNote, getSelectedVisibleNoteId, getVisibleNotes } from './notesViewState'

function makeNote(
  partial?: Partial<Pick<Note, 'title' | 'tags' | 'archived' | 'private' | 'updatedAt'>>,
): Note {
  let note = newNote({ title: partial?.title, tags: partial?.tags })
  note = setPrimaryMarkdown(note, `${partial?.title ?? 'note'} body`)
  return {
    ...note,
    archived: partial?.archived ?? false,
    private: partial?.private ?? false,
    updatedAt: partial?.updatedAt ?? note.updatedAt,
  }
}

const defaultState = () => ({
  selectedId: null,
  searchQuery: '',
  tagFilter: null as string | null,
  showArchived: false,
  privateVaultOpen: false,
})

describe('getVisibleNotes', () => {
  it('returns empty list for empty notes', () => {
    expect(getVisibleNotes([], defaultState())).toEqual([])
  })

  it('returns only public non-archived notes by default', () => {
    const pub = makeNote({ title: 'Public' })
    const priv = makeNote({ title: 'Private', private: true })
    const archived = makeNote({ title: 'Archived', archived: true })
    expect(getVisibleNotes([pub, priv, archived], defaultState())).toEqual([pub])
  })

  it('returns archived notes when showArchived is true', () => {
    const pub = makeNote({ title: 'Public' })
    const archived = makeNote({ title: 'Archived', archived: true })
    expect(getVisibleNotes([pub, archived], { ...defaultState(), showArchived: true })).toEqual([archived])
  })

  it('returns private notes when privateVaultOpen is true', () => {
    const pub = makeNote({ title: 'Public' })
    const priv = makeNote({ title: 'Private', private: true })
    expect(getVisibleNotes([pub, priv], { ...defaultState(), privateVaultOpen: true })).toEqual([priv])
  })

  it('filters by tagFilter', () => {
    const tagged = makeNote({ title: 'Tagged', tags: ['school'] })
    const untagged = makeNote({ title: 'Untagged' })
    expect(getVisibleNotes([tagged, untagged], { ...defaultState(), tagFilter: 'school' })).toEqual([tagged])
  })

  it('returns empty when tagFilter matches nothing', () => {
    const tagged = makeNote({ title: 'Work note', tags: ['work'] })
    expect(getVisibleNotes([tagged], { ...defaultState(), tagFilter: 'missing' })).toEqual([])
  })

  it('filters by search query', () => {
    const match = makeNote({ title: 'Meeting notes' })
    const nomatch = makeNote({ title: 'Shopping list' })
    expect(getVisibleNotes([match, nomatch], { ...defaultState(), searchQuery: 'meeting' })).toEqual([match])
  })

  it('applies archive + vault + tag + search filters together', () => {
    const publicTagged = makeNote({ title: 'Class notes', tags: ['school'], updatedAt: 10 })
    const publicArchived = makeNote({ title: 'Archived note', archived: true, updatedAt: 9 })
    const privateTagged = makeNote({
      title: 'Private school note',
      tags: ['school'],
      private: true,
      updatedAt: 8,
    })

    const visible = getVisibleNotes([publicTagged, publicArchived, privateTagged], {
      selectedId: null,
      searchQuery: 'class',
      tagFilter: 'school',
      showArchived: false,
      privateVaultOpen: false,
    })

    expect(visible.map((note) => note.id)).toEqual([publicTagged.id])
  })
})

describe('getSelectedVisibleNoteId', () => {
  it('returns null when no notes are visible', () => {
    expect(getSelectedVisibleNoteId([], defaultState())).toBeNull()
  })

  it('returns first visible note id when selectedId is null', () => {
    const a = makeNote({ title: 'A', updatedAt: 20 })
    const b = makeNote({ title: 'B', updatedAt: 10 })
    expect(getSelectedVisibleNoteId([a, b], defaultState())).toBe(a.id)
  })

  it('preserves selectedId when note is visible', () => {
    const a = makeNote({ title: 'A', updatedAt: 20 })
    const b = makeNote({ title: 'B', updatedAt: 10 })
    expect(getSelectedVisibleNoteId([a, b], { ...defaultState(), selectedId: b.id })).toBe(b.id)
  })

  it('falls back to first visible when selected note is hidden', () => {
    const publicNote = makeNote({ title: 'Public note', updatedAt: 20 })
    const privateNote = makeNote({ title: 'Private note', private: true, updatedAt: 10 })

    const selectedId = getSelectedVisibleNoteId([publicNote, privateNote], {
      selectedId: publicNote.id,
      searchQuery: '',
      tagFilter: null,
      showArchived: false,
      privateVaultOpen: true,
    })

    expect(selectedId).toBe(privateNote.id)
  })

  it('falls back to null when selected is hidden and nothing visible', () => {
    const priv = makeNote({ title: 'Private', private: true })
    expect(getSelectedVisibleNoteId([priv], { ...defaultState(), selectedId: priv.id })).toBeNull()
  })
})

describe('getSelectedVisibleNote', () => {
  it('returns null when no notes are visible', () => {
    expect(getSelectedVisibleNote([], defaultState())).toBeNull()
  })

  it('returns the selected note', () => {
    const a = makeNote({ title: 'A' })
    const b = makeNote({ title: 'B' })
    const result = getSelectedVisibleNote([a, b], { ...defaultState(), selectedId: b.id })
    expect(result?.id).toBe(b.id)
  })
})
