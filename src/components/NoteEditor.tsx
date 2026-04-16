import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { flushSync } from 'react-dom'
import type { Note } from '../types/note'
import { getPrimaryMarkdown } from '../types/note'
import { parseTagsFromInput } from '../types/tags'
import { collectAllTags } from '../search/noteSearch'
import { applyMarkdownListEnter } from '../utils/markdownListEnter'
import { BlockPreview } from './BlockPreview'
import { useNotes } from '../context/NotesContext'

type Props = {
  note: Note
}

const SPLIT_PCT_MIN = 22
const SPLIT_PCT_MAX = 78

export function NoteEditor({ note }: Props) {
  const { notes, updateNote, flushSave, saving, lastSavedAt } = useNotes()
  const [title, setTitle] = useState(note.title)
  const [markdown, setMarkdown] = useState(() => getPrimaryMarkdown(note))
  const [tagsField, setTagsField] = useState(() => note.tags.join(', '))
  const [mode, setMode] = useState<'edit' | 'split' | 'preview'>('split')
  const [splitPct, setSplitPct] = useState(50)
  const [splitDragging, setSplitDragging] = useState(false)
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false)
  const splitDragRef = useRef<{
    startX: number
    startPct: number
    width: number
  } | null>(null)
  const splitWrapRef = useRef<HTMLDivElement>(null)
  const tagsInputRef = useRef<HTMLInputElement>(null)
  const tagsWrapRef = useRef<HTMLDivElement>(null)

  const tagsJoined = note.tags.join(',')
  useEffect(() => {
    setTagsField(tagsJoined)
  }, [note.id, tagsJoined])

  const saveLabel = saving ? 'Saving…' : lastSavedAt ? 'Saved' : ''

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

  const allTags = useMemo(() => collectAllTags(notes), [notes])

  const tagSuggestions = useMemo(() => {
    const lastComma = tagsField.lastIndexOf(',')
    const tail = (lastComma === -1 ? tagsField : tagsField.slice(lastComma + 1)).trim()
    const lower = tail.toLowerCase()
    const already = new Set(parseTagsFromInput(tagsField))
    return allTags
      .filter((t) => !already.has(t) && (lower === '' || t.includes(lower)))
      .slice(0, 12)
  }, [allTags, tagsField])

  const previews = useMemo(
    () =>
      note.document.blocks.map((b) => (
        <BlockPreview key={b.id} block={b} />
      )),
    [note.document.blocks],
  )

  const onSplitPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'split') return
      e.preventDefault()
      const el = splitWrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      splitDragRef.current = {
        startX: e.clientX,
        startPct: splitPct,
        width: rect.width,
      }
      setSplitDragging(true)
    },
    [mode, splitPct],
  )

  useEffect(() => {
    if (!splitDragging) return
    const onMove = (e: PointerEvent) => {
      const drag = splitDragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const deltaPct = (dx / drag.width) * 100
      const next = Math.round(drag.startPct + deltaPct)
      setSplitPct(Math.min(SPLIT_PCT_MAX, Math.max(SPLIT_PCT_MIN, next)))
    }
    const onUp = () => {
      splitDragRef.current = null
      setSplitDragging(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [splitDragging])

  const applyTagSuggestion = (tag: string) => {
    const lastComma = tagsField.lastIndexOf(',')
    const head = lastComma === -1 ? '' : tagsField.slice(0, lastComma + 1) + ' '
    const next = `${head}${tag}, `
    setTagsField(next)
    updateNote(note.id, { tags: parseTagsFromInput(next) })
    setTagsMenuOpen(false)
    requestAnimationFrame(() => tagsInputRef.current?.focus())
  }

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return
    const ta = e.currentTarget
    const applied = applyMarkdownListEnter(ta.value, ta.selectionStart, ta.selectionEnd)
    if (!applied) return
    e.preventDefault()
    flushSync(() => {
      handleBody(applied.value)
    })
    ta.selectionStart = applied.selectionStart
    ta.selectionEnd = applied.selectionEnd
  }

  useEffect(() => {
    if (!tagsMenuOpen) return
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target
      if (t instanceof Node && tagsWrapRef.current?.contains(t)) return
      setTagsMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [tagsMenuOpen])

  const showSplitResizer = mode === 'split'

  const splitGridStyle: CSSProperties | undefined =
    mode === 'split'
      ? {
          gridTemplateColumns: `minmax(0,${splitPct}fr) 6px minmax(0,${100 - splitPct}fr)`,
        }
      : undefined

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

      <div className="editor__head">
        <input
          className="editor__title"
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          onBlur={() => void flushSave()}
          placeholder="Title"
          aria-label="Note title"
        />
        <div className="editor__tags-field-wrap" ref={tagsWrapRef}>
          <label className="editor__tags-inline-label" htmlFor={`tags-${note.id}`}>
            Tags
          </label>
          <input
            ref={tagsInputRef}
            id={`tags-${note.id}`}
            className="editor__tags"
            value={tagsField}
            onChange={(e) => {
              setTagsField(e.target.value)
              setTagsMenuOpen(true)
            }}
            onFocus={() => setTagsMenuOpen(true)}
            onBlur={() => {
              commitTags()
              void flushSave()
            }}
            placeholder="Comma-separated"
            aria-label="Tags"
            aria-autocomplete="list"
            aria-expanded={tagsMenuOpen}
            autoComplete="off"
          />
          {tagsMenuOpen && tagSuggestions.length > 0 && (
            <ul className="editor__tags-suggestions" role="listbox" aria-label="Existing tags">
              {tagSuggestions.map((t) => (
                <li key={t} role="option">
                  <button
                    type="button"
                    className="editor__tags-suggestion"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      applyTagSuggestion(t)
                    }}
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {saveLabel ? <span className="save-pill editor__save-pill">{saveLabel}</span> : null}
      </div>
      <p className="editor__tags-hint-line">
        Normalized lowercase; use commas between tags.
      </p>

      <div
        ref={splitWrapRef}
        className={
          mode === 'split'
            ? 'editor__body editor__body--split'
            : mode === 'edit'
              ? 'editor__body editor__body--edit'
              : 'editor__body editor__body--preview'
        }
        style={splitGridStyle}
      >
        {(mode === 'edit' || mode === 'split') && (
          <>
            <textarea
              className="editor__textarea"
              value={markdown}
              onChange={(e) => handleBody(e.target.value)}
              onKeyDown={onBodyKeyDown}
              onBlur={() => void flushSave()}
              placeholder="Write markdown…"
              aria-label="Markdown body"
              spellCheck
            />
            {showSplitResizer && (
              <div
                className="editor__splitter"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize editor and preview"
                tabIndex={0}
                onPointerDown={onSplitPointerDown}
              />
            )}
          </>
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="editor__preview-scroll">{previews}</div>
        )}
      </div>
    </div>
  )
}
