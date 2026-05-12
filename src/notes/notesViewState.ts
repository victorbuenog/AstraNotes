import { collectAllTags, noteMatchesSearch } from '../search/noteSearch'
import type { Note } from '../types/note'

export type NotesViewState = {
  selectedId: string | null
  searchQuery: string
  tagFilter: string | null
  showArchived: boolean
  privateVaultOpen: boolean
}

export function getVisibleNotes(notes: Note[], state: NotesViewState): Note[] {
  return notes
    .filter((note) => (state.showArchived ? note.archived : !note.archived))
    .filter((note) => note.private === state.privateVaultOpen)
    .filter((note) => (state.tagFilter ? note.tags.includes(state.tagFilter) : true))
    .filter((note) => noteMatchesSearch(note, state.searchQuery))
}

export function getSelectedVisibleNoteId(notes: Note[], state: NotesViewState): string | null {
  const visibleNotes = getVisibleNotes(notes, state)
  if (state.selectedId && visibleNotes.some((note) => note.id === state.selectedId)) {
    return state.selectedId
  }
  return visibleNotes[0]?.id ?? null
}

export function getSelectedVisibleNote(notes: Note[], state: NotesViewState): Note | null {
  const selectedId = getSelectedVisibleNoteId(notes, state)
  if (!selectedId) return null
  return getVisibleNotes(notes, state).find((note) => note.id === selectedId) ?? null
}

export function getAllNoteTags(notes: Note[]): string[] {
  return collectAllTags(notes)
}
