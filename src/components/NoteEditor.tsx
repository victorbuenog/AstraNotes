import { useEffect, useMemo, useState } from 'react'
import type { Note } from '../types/note'
import { getPrimaryMarkdown } from '../types/note'
import { parseTagsFromInput } from '../types/tags'
import { BlockPreview } from './BlockPreview'
import { useNotes } from '../context/NotesContext'

type Props = {
  note: Note
}

export function NoteEditor({ note }: Props) {
  const { updateNote, flushSave } = useNotes()
  const [title, setTitle] = useState(note.title)
  const [markdown, setMarkdown] = useState(() => getPrimaryMarkdown(note))
  const [tagsField, setTagsField] = useState(() => note.tags.join(', '))
  const [mode, setMode] = useState<'edit' | 'split' | 'preview'>('split')
  // Parent uses `key={note.id}` so state resets when switching notes.

  const tagsJoined = note.tags.join(',')
  useEffect(() => {
    setTagsField(tagsJoined)
  }, [note.id, tagsJoined])

  const handleTitle = (v: string) => {
    setTitle(v)
    updateNote(note.id, { title: v })
  }

  const handleBody = (v: string) => {
    setMarkdown(v)
    updateNote(note.id, { markdown: v })
  }

  const commitTags = () => {
    updateNote(note.id, { tags: parseTagsFromInput(tagsField) })
  }

  const previews = useMemo(
    () =>
      note.document.blocks.map((b) => (
        <BlockPreview key={b.id} block={b} />
      )),
    [note.document.blocks],
  )

  return (
    <div className="editor">
      <header className="editor__toolbar">
        <div className="segmented" role="tablist" aria-label="View mode">
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? 'segmented__btn is-active' : 'segmented__btn'}
              onClick={() => setMode(m)}
            >
              {m === 'edit' ? 'Write' : m === 'split' ? 'Split' : 'Read'}
            </button>
          ))}
        </div>
      </header>
      <input
        className="editor__title"
        value={title}
        onChange={(e) => handleTitle(e.target.value)}
        onBlur={() => void flushSave()}
        placeholder="Title"
        aria-label="Note title"
      />
      <label className="editor__tags-label" htmlFor={`tags-${note.id}`}>
        Tags <span className="editor__tags-hint">(comma-separated; normalized lowercase)</span>
      </label>
      <input
        id={`tags-${note.id}`}
        className="editor__tags"
        value={tagsField}
        onChange={(e) => setTagsField(e.target.value)}
        onBlur={() => {
          commitTags()
          void flushSave()
        }}
        placeholder="e.g. work, course"
        aria-label="Tags"
        autoComplete="off"
      />
      <div
        className={
          mode === 'split'
            ? 'editor__body editor__body--split'
            : mode === 'edit'
              ? 'editor__body editor__body--edit'
              : 'editor__body editor__body--preview'
        }
      >
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            className="editor__textarea"
            value={markdown}
            onChange={(e) => handleBody(e.target.value)}
            onBlur={() => void flushSave()}
            placeholder="Write markdown…"
            aria-label="Markdown body"
            spellCheck
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="editor__preview-scroll">{previews}</div>
        )}
      </div>
    </div>
  )
}
