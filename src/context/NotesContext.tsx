import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api/client'
import type { Vault } from '../crypto/vault'
import type { Note } from '../types/note'
import { migrateNoteShape, newNote, setPrimaryMarkdown } from '../types/note'
import { normalizeTags } from '../types/tags'
import {
  buildVaultExport,
  parseVaultImportJson,
  serializeVaultExport,
} from '../vault/exportFormat'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'

export type AppErrorState = { message: string; code: string } | null

type NotesContextValue = {
  notes: Note[]
  selectedId: string | null
  selectNote: (id: string | null) => void
  createNote: () => Promise<void>
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, 'title' | 'tags'>> & { markdown?: string },
  ) => void
  flushSave: () => Promise<void>
  archiveNote: (id: string) => Promise<void>
  unarchiveNote: (id: string) => Promise<void>
  deleteNoteForever: (id: string) => Promise<void>
  exportVaultJson: () => void
  importVaultFromText: (text: string) => Promise<void>
  searchQuery: string
  setSearchQuery: (q: string) => void
  tagFilter: string | null
  setTagFilter: (t: string | null) => void
  saving: boolean
  lastSavedAt: number | null
  error: AppErrorState
  clearError: () => void
  showArchived: boolean
  setShowArchived: (v: boolean) => void
}

const NotesContext = createContext<NotesContextValue | null>(null)

const AUTOSAVE_MS = 450

export function NotesProvider({ vault, children }: { vault: Vault; children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorState>(null)
  const pendingRef = useRef<Map<string, Note>>(new Map())
  const notesRef = useRef<Note[]>([])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const report = useCallback((message: string, code: string) => {
    setError({ message, code })
  }, [])

  const reload = useCallback(async () => {
    if (!vault.isUnlocked()) return
    try {
      const { notes: initialNotes, legacyIds } = await api.listNotes(vault)
      let loaded = initialNotes
      if (legacyIds.length > 0) {
        for (const id of legacyIds) {
          const n = loaded.find((x) => x.id === id)
          if (n) await api.upgradeLegacyNote(vault, n)
        }
        const again = await api.listNotes(vault)
        loaded = again.notes
      }
      const sorted = loaded.sort((a, b) => b.updatedAt - a.updatedAt)
      setNotes(sorted)
      setSelectedId((cur) => {
        if (cur && sorted.some((n) => n.id === cur)) return cur
        return sorted[0]?.id ?? null
      })
    } catch (e) {
      const msg = e instanceof AppError ? e.message : String(e)
      const code = e instanceof AppError ? e.code : ErrorCodes.NOTE_LIST_FAILED
      report(msg, code)
    }
  }, [vault, report])

  useEffect(() => {
    void reload()
  }, [reload])

  const persistNote = useCallback(
    async (note: Note) => {
      if (!vault.isUnlocked()) return
      setSaving(true)
      try {
        await api.saveNote(vault, note)
        setLastSavedAt(Date.now())
      } catch (e) {
        const msg = e instanceof AppError ? e.message : String(e)
        const code = e instanceof AppError ? e.code : ErrorCodes.NOTE_SAVE_FAILED
        const friendly =
          e instanceof AppError && e.code === ErrorCodes.AUTH_UNAUTHORIZED
            ? 'Your session ended or you were logged out; this note could not be saved. Copy any important text, then sign in again.'
            : msg
        report(friendly, code)
      } finally {
        setSaving(false)
      }
    },
    [vault, report],
  )

  const [debouncedPersist, cancelDebounce] = useDebouncedCallback(persistNote, AUTOSAVE_MS)

  const queueSave = useCallback(
    (note: Note) => {
      pendingRef.current.set(note.id, note)
      setNotes((prev) => {
        const i = prev.findIndex((n) => n.id === note.id)
        if (i < 0) return [...prev, note].sort((a, b) => b.updatedAt - a.updatedAt)
        const next = [...prev]
        next[i] = note
        return next.sort((a, b) => b.updatedAt - a.updatedAt)
      })
      debouncedPersist(note)
    },
    [debouncedPersist],
  )

  const flushSave = useCallback(async () => {
    cancelDebounce()
    const pending = [...pendingRef.current.values()]
    pendingRef.current.clear()
    for (const n of pending) {
      await persistNote(n)
    }
  }, [cancelDebounce, persistNote])

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flushSave()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [flushSave])

  const selectNote = useCallback(
    async (id: string | null) => {
      await flushSave()
      setSelectedId(id)
    },
    [flushSave],
  )

  const createNote = useCallback(async () => {
    if (!vault.isUnlocked()) return
    const note = newNote()
    try {
      await api.saveNote(vault, note)
      setNotes((prev) => [note, ...prev].sort((a, b) => b.updatedAt - a.updatedAt))
      setSelectedId(note.id)
      setLastSavedAt(Date.now())
    } catch (e) {
      const msg = e instanceof AppError ? e.message : String(e)
      const code = e instanceof AppError ? e.code : ErrorCodes.NOTE_SAVE_FAILED
      report(msg, code)
    }
  }, [vault, report])

  const updateNote = useCallback(
    (
      id: string,
      patch: Partial<Pick<Note, 'title' | 'tags'>> & { markdown?: string },
    ) => {
      const current = notesRef.current.find((n) => n.id === id)
      if (!current) {
        report('Note not found in session', ErrorCodes.NOTE_NOT_FOUND)
        return
      }
      let next = current
      if (patch.title !== undefined) {
        next = { ...next, title: patch.title || 'Untitled', updatedAt: Date.now() }
      }
      if (patch.tags !== undefined) {
        next = { ...next, tags: normalizeTags(patch.tags), updatedAt: Date.now() }
      }
      if (patch.markdown !== undefined) {
        next = setPrimaryMarkdown(next, patch.markdown)
      }
      queueSave(next)
    },
    [queueSave, report],
  )

  const archiveNote = useCallback(
    async (id: string) => {
      await flushSave()
      const current = notesRef.current.find((n) => n.id === id)
      if (!current) return
      const next = { ...current, archived: true, updatedAt: Date.now() }
      await persistNote(next)
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? next : n)).sort((a, b) => b.updatedAt - a.updatedAt),
      )
      setSelectedId((sel) => (sel === id ? null : sel))
    },
    [flushSave, persistNote],
  )

  const unarchiveNote = useCallback(
    async (id: string) => {
      await flushSave()
      const current = notesRef.current.find((n) => n.id === id)
      if (!current) return
      const next = { ...current, archived: false, updatedAt: Date.now() }
      await persistNote(next)
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? next : n)).sort((a, b) => b.updatedAt - a.updatedAt),
      )
    },
    [flushSave, persistNote],
  )

  const deleteNoteForever = useCallback(
    async (id: string) => {
      await flushSave()
      try {
        await api.deleteNote(id)
        setNotes((prev) => {
          const filtered = prev.filter((n) => n.id !== id)
          setSelectedId((sel) => {
            if (sel !== id) return sel
            return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null
          })
          return filtered
        })
      } catch (e) {
        const msg = e instanceof AppError ? e.message : String(e)
        const code = e instanceof AppError ? e.code : ErrorCodes.NOTE_DELETE_FAILED
        report(msg, code)
      }
    },
    [flushSave, report],
  )

  const clearError = useCallback(() => setError(null), [])

  const exportVaultJson = useCallback(() => {
    const data = buildVaultExport(notesRef.current)
    const blob = new Blob([serializeVaultExport(data)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `astranotes-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importVaultFromText = useCallback(
    async (text: string) => {
      const result = parseVaultImportJson(text)
      if (!result.ok) {
        report(result.error, ErrorCodes.VALIDATION_INVALID_NOTE)
        return
      }
      setSaving(true)
      try {
        for (const note of result.data.notes) {
          await api.saveNote(vault, migrateNoteShape(note))
        }
        setLastSavedAt(Date.now())
        await reload()
      } catch (e) {
        const msg = e instanceof AppError ? e.message : String(e)
        const code = e instanceof AppError ? e.code : ErrorCodes.NOTE_SAVE_FAILED
        const friendly =
          e instanceof AppError && e.code === ErrorCodes.AUTH_UNAUTHORIZED
            ? 'Your session ended or you were logged out; import could not finish. Sign in and try again.'
            : msg
        report(friendly, code)
      } finally {
        setSaving(false)
      }
    },
    [vault, reload, report],
  )

  const value = useMemo(
    (): NotesContextValue => ({
      notes,
      selectedId,
      selectNote,
      createNote,
      updateNote,
      flushSave,
      archiveNote,
      unarchiveNote,
      deleteNoteForever,
      exportVaultJson,
      importVaultFromText,
      searchQuery,
      setSearchQuery,
      tagFilter,
      setTagFilter,
      saving,
      lastSavedAt,
      error,
      clearError,
      showArchived,
      setShowArchived,
    }),
    [
      notes,
      selectedId,
      selectNote,
      createNote,
      updateNote,
      flushSave,
      archiveNote,
      unarchiveNote,
      deleteNoteForever,
      exportVaultJson,
      importVaultFromText,
      searchQuery,
      tagFilter,
      saving,
      lastSavedAt,
      error,
      clearError,
      showArchived,
    ],
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within NotesProvider')
  return ctx
}
