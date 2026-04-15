import type { Note } from '../types/note'
import { getPrimaryMarkdown } from '../types/note'

/** FR2a: avoid pathological queries (edge-case review). */
export const MAX_SEARCH_QUERY_LENGTH = 500

export function clampSearchQuery(raw: string): string {
  return raw.length > MAX_SEARCH_QUERY_LENGTH ? raw.slice(0, MAX_SEARCH_QUERY_LENGTH) : raw
}

/** Search title + primary markdown body (client-side; server never sees query). */
export function noteMatchesSearch(note: Note, queryRaw: string): boolean {
  const q = clampSearchQuery(queryRaw).trim().toLowerCase()
  if (!q) return true
  const title = note.title.toLowerCase()
  const body = getPrimaryMarkdown(note).toLowerCase()
  return title.includes(q) || body.includes(q)
}

export function collectAllTags(notes: Note[]): string[] {
  const s = new Set<string>()
  for (const n of notes) {
    for (const t of n.tags) s.add(t)
  }
  return [...s].sort((a, b) => a.localeCompare(b))
}
