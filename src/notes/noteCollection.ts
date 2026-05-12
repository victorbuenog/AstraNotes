import type { Note } from '../types/note'

export function sortNotesByUpdatedAt(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function upsertSortedNote(notes: Note[], note: Note): Note[] {
  const index = notes.findIndex((entry) => entry.id === note.id)
  if (index < 0) return sortNotesByUpdatedAt([...notes, note])
  const next = [...notes]
  next[index] = note
  return sortNotesByUpdatedAt(next)
}

export function removeNoteById(notes: Note[], id: string): Note[] {
  return notes.filter((note) => note.id !== id)
}
