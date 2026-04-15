import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNotes } from '../context/NotesContext'
import {
  MAX_SEARCH_QUERY_LENGTH,
  collectAllTags,
  noteMatchesSearch,
} from '../search/noteSearch'
import { parseVaultImportJson } from '../vault/exportFormat'
import {
  setSkipDeleteConfirm,
  shouldSkipDeleteConfirm,
} from '../preferences/deleteConfirm'
import type { Note } from '../types/note'

type SidebarProps = {
  username?: string
  onLogout?: () => void
}

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts))
  } catch {
    return String(ts)
  }
}

type DeleteDialogState = { id: string; title: string }

export function Sidebar({ username, onLogout }: SidebarProps) {
  const {
    notes,
    selectedId,
    selectNote,
    createNote,
    showArchived,
    setShowArchived,
    searchQuery,
    setSearchQuery,
    tagFilter,
    setTagFilter,
    exportVaultJson,
    importVaultFromText,
    archiveNote,
    unarchiveNote,
    deleteNoteForever,
  } = useNotes()

  const importRef = useRef<HTMLInputElement>(null)
  const allTags = useMemo(() => collectAllTags(notes), [notes])

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [neverAskAgain, setNeverAskAgain] = useState(false)

  const visible = useMemo(() => {
    return notes
      .filter((n) => (showArchived ? n.archived : !n.archived))
      .filter((n) => (tagFilter ? n.tags.includes(tagFilter) : true))
      .filter((n) => noteMatchesSearch(n, searchQuery))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, showArchived, tagFilter, searchQuery])

  useEffect(() => {
    if (!menuOpenId) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target
      if (t instanceof Element && t.closest('[data-note-menu-root]')) return
      setMenuOpenId(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpenId])

  useEffect(() => {
    if (!deleteDialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteDialog(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [deleteDialog])

  useEffect(() => {
    if (deleteDialog) setNeverAskAgain(false)
  }, [deleteDialog])

  const requestDelete = useCallback(
    (note: Note) => {
      setMenuOpenId(null)
      if (shouldSkipDeleteConfirm(username)) {
        void deleteNoteForever(note.id)
        return
      }
      setDeleteDialog({ id: note.id, title: note.title || 'Untitled' })
    },
    [username, deleteNoteForever],
  )

  const confirmDelete = useCallback(() => {
    if (!deleteDialog) return
    if (neverAskAgain) setSkipDeleteConfirm(username, true)
    void deleteNoteForever(deleteDialog.id)
    setDeleteDialog(null)
  }, [deleteDialog, neverAskAgain, username, deleteNoteForever])

  const onExportClick = () => {
    if (
      !window.confirm(
        'Export downloads a plaintext JSON file of all notes (decrypted on this device). Anyone with the file can read your notes. Continue?',
      )
    ) {
      return
    }
    exportVaultJson()
  }

  const onImportPick = () => importRef.current?.click()

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    const parsed = parseVaultImportJson(text)
    if (!parsed.ok) {
      window.alert(parsed.error)
      return
    }
    if (
      !window.confirm(
        `Import ${parsed.data.notes.length} note(s)? Existing notes with the same id will be replaced (upsert); other notes are unchanged.`,
      )
    ) {
      return
    }
    await importVaultFromText(text)
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__title-row">
            <h1 className="sidebar__brand">AstraNotes</h1>
            {username && onLogout && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onLogout}>
                Log out
              </button>
            )}
          </div>
          {username && <p className="sidebar__user">{username}</p>}
          <button type="button" className="btn btn--primary" onClick={() => void createNote()}>
            New note
          </button>
          <div className="sidebar__search">
            <label className="sidebar__label" htmlFor="note-search">
              Search
            </label>
            <input
              id="note-search"
              type="search"
              className="sidebar__input"
              placeholder="Title or body…"
              maxLength={MAX_SEARCH_QUERY_LENGTH}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="sidebar__filter">
            <label className="sidebar__label" htmlFor="tag-filter">
              Tag filter
            </label>
            <select
              id="tag-filter"
              className="sidebar__select"
              value={tagFilter ?? ''}
              onChange={(e) => setTagFilter(e.target.value || null)}
            >
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sidebar__vault-actions">
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sidebar__file"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => void onImportFile(e)}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={onExportClick}>
              Export vault
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onImportPick}>
              Import…
            </button>
          </div>
        </div>
        <label className="sidebar__toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        <nav className="sidebar__list" aria-label="Notes">
          {visible.length === 0 ? (
            <p className="sidebar__empty">
              {notes.filter((n) => (showArchived ? n.archived : !n.archived)).length === 0
                ? showArchived
                  ? 'No archived notes.'
                  : 'No notes yet.'
                : 'No notes match search or tag filter.'}
            </p>
          ) : (
            <ul>
              {visible.map((n) => (
                <li
                  key={n.id}
                  className={
                    selectedId === n.id ? 'note-row__outer is-active' : 'note-row__outer'
                  }
                >
                  <button
                    type="button"
                    className="note-row note-row--main"
                    onClick={() => void selectNote(n.id)}
                  >
                    <span className="note-row__title">{n.title || 'Untitled'}</span>
                    <span className="note-row__time">{formatTime(n.updatedAt)}</span>
                  </button>
                  <div className="note-row__menu-wrap" data-note-menu-root>
                    <button
                      type="button"
                      className="note-row__kebab"
                      aria-label="Note actions"
                      aria-haspopup="menu"
                      aria-expanded={menuOpenId === n.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId((cur) => (cur === n.id ? null : n.id))
                      }}
                    >
                      ⋮
                    </button>
                    {menuOpenId === n.id && (
                      <ul className="note-row__menu" role="menu" aria-label="Note actions">
                        {n.archived ? (
                          <li role="none">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenuOpenId(null)
                                void unarchiveNote(n.id)
                              }}
                            >
                              Restore
                            </button>
                          </li>
                        ) : (
                          <li role="none">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenuOpenId(null)
                                void archiveNote(n.id)
                              }}
                            >
                              Archive
                            </button>
                          </li>
                        )}
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="is-danger"
                            onClick={() => requestDelete(n)}
                          >
                            Delete…
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      {deleteDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setDeleteDialog(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className="modal__title">
              Delete note?
            </h2>
            <p className="modal__body">
              <strong>{deleteDialog.title}</strong> will be removed permanently. This cannot be
              undone.
            </p>
            <label className="modal__checkbox">
              <input
                type="checkbox"
                checked={neverAskAgain}
                onChange={(e) => setNeverAskAgain(e.target.checked)}
              />
              Never ask again
            </label>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setDeleteDialog(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={() => void confirmDelete()}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
