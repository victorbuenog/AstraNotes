import { describe, expect, it } from 'vitest'
import { newNote, setPrimaryMarkdown, type Note } from '../types/note'
import { getSelectedVisibleNoteId, getVisibleNotes } from './notesViewState'

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

describe('notesViewState', () => {
  it('filters notes by archive state, vault state, tags, and search query', () => {
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

  it('reconciles selection to the first visible note when the current selection is hidden', () => {
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
})
