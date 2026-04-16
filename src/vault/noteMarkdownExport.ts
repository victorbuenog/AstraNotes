import type { Note } from '../types/note'
import { getPrimaryMarkdown } from '../types/note'

/** Safe ASCII-ish filename stem from a note title. */
export function slugifyNoteFilename(title: string): string {
  const base = title.trim() || 'note'
  const slug = base
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
  return slug || 'note'
}

/**
 * Single-note export as Markdown with YAML front matter (title, tags, id, updated_at).
 */
export function noteToMarkdownExport(note: Note): string {
  const title = note.title?.trim() || 'Untitled'
  const body = getPrimaryMarkdown(note).trimEnd()
  const lines: string[] = ['---']
  lines.push(`title: ${JSON.stringify(title)}`)
  if (note.tags.length > 0) {
    lines.push('tags:')
    for (const t of note.tags) {
      lines.push(`  - ${JSON.stringify(t)}`)
    }
  }
  lines.push(`astranotes_id: ${JSON.stringify(note.id)}`)
  lines.push(`updated_at: ${JSON.stringify(new Date(note.updatedAt).toISOString())}`)
  lines.push('---')
  lines.push('')
  lines.push(body)
  lines.push('')
  return lines.join('\n')
}
