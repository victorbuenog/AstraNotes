import { normalizeTags } from './tags.js'

/**
 * Extensible note document: new block types (image, audio, latex) add fields
 * without migrating the whole storage format — bump `document.version` only when needed.
 */
export const NOTE_DOCUMENT_VERSION = 1 as const

export type MarkdownBlock = {
  id: string
  type: 'markdown'
  /** Markdown source */
  text: string
}

/** Placeholder for future image attachments (blob refs / URLs in private store) */
export type ImageBlock = {
  id: string
  type: 'image'
  ref: string
  alt?: string
}

/** Placeholder for future voice notes */
export type AudioBlock = {
  id: string
  type: 'audio'
  ref: string
}

/** Placeholder for inline LaTeX */
export type LatexBlock = {
  id: string
  type: 'latex'
  expression: string
}

export type NoteBlock = MarkdownBlock | ImageBlock | AudioBlock | LatexBlock

export type NoteDocument = {
  version: typeof NOTE_DOCUMENT_VERSION
  blocks: NoteBlock[]
}

export type Note = {
  id: string
  title: string
  /** Normalized lowercase tags (see `src/types/tags.ts`). */
  tags: string[]
  archived: boolean
  private: boolean
  createdAt: number
  updatedAt: number
  document: NoteDocument
}

export function createEmptyDocument(): NoteDocument {
  return {
    version: NOTE_DOCUMENT_VERSION,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: 'markdown',
        text: '',
      },
    ],
  }
}

export function newNote(partial?: Partial<Pick<Note, 'title' | 'tags'>>): Note {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: partial?.title?.trim() || 'Untitled',
    tags: partial?.tags !== undefined ? normalizeTags(partial.tags) : [],
    archived: false,
    private: false,
    createdAt: now,
    updatedAt: now,
    document: createEmptyDocument(),
  }
}

/** Ensure tags exist on notes loaded from older payloads. */
export function migrateNoteShape(raw: Note): Note {
  const tags = Array.isArray(raw.tags) ? normalizeTags(raw.tags.map(String)) : []
  const isPrivate = typeof raw.private === 'boolean' ? raw.private : false
  return { ...raw, tags, private: isPrivate }
}

/** Single markdown block text helper for MVP editor */
export function getPrimaryMarkdown(note: Note): string {
  const md = note.document.blocks.find((b): b is MarkdownBlock => b.type === 'markdown')
  return md?.text ?? ''
}

export function setPrimaryMarkdown(note: Note, text: string): Note {
  const blocks = note.document.blocks.map((b) =>
    b.type === 'markdown' ? { ...b, text } : b,
  )
  const hasMd = blocks.some((b) => b.type === 'markdown')
  const nextBlocks = hasMd
    ? blocks
    : [{ id: crypto.randomUUID(), type: 'markdown' as const, text }, ...blocks]
  return {
    ...note,
    updatedAt: Date.now(),
    document: { ...note.document, blocks: nextBlocks },
  }
}
