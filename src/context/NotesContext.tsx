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
import { noteToMarkdownExport, slugifyNoteFilename } from '../vault/noteMarkdownExport'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import { useAuth } from './AuthContext'
import {
  hasPrivatePin as hasStoredPrivatePin,
  isPrivatePinFormat,
  setPrivatePin as storePrivatePin,
  verifyPrivatePin,
} from '../preferences/privatePin'

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
  setNotePrivate: (id: string, isPrivate: boolean) => Promise<void>
  deleteNoteForever: (id: string) => Promise<void>
  exportVaultJson: () => void
  importVaultFromText: (text: string) => Promise<void>
  exportNoteMarkdown: (note: Note) => void
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
  privateVaultOpen: boolean
  openPrivateVault: (pin: string) => Promise<boolean>
  closePrivateVault: () => void
  hasPrivatePin: boolean
  setPrivatePin: (pin: string) => Promise<boolean>
  resetPrivatePinAndWipe: (nextPin: string) => Promise<boolean>
}

const NotesContext = createContext<NotesContextValue | null>(null)

const AUTOSAVE_MS = 450

export function NotesProvider({ vault, children }: { vault: Vault; children: ReactNode }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorState>(null)
  const [privateVaultOpen, setPrivateVaultOpen] = useState(false)
  const [privatePinVersion, setPrivatePinVersion] = useState(0)
  const [hasPrivatePin, setHasPrivatePinState] = useState(() => hasStoredPrivatePin(user?.username))
  const pendingRef = useRef<Map<string, Note>>(new Map())
  const notesRef = useRef<Note[]>([])
  const username = user?.username

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
      const nextSelected = id ? notesRef.current.find((n) => n.id === id) : null
      if (privateVaultOpen && (!nextSelected || !nextSelected.private)) {
        setPrivateVaultOpen(false)
      }
      setSelectedId(id)
    },
    [flushSave, privateVaultOpen],
  )

  const createNote = useCallback(async () => {
    if (!vault.isUnlocked()) return
    setPrivateVaultOpen(false)
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

  const setNotePrivate = useCallback(
    async (id: string, isPrivate: boolean) => {
      await flushSave()
      const current = notesRef.current.find((n) => n.id === id)
      if (!current) return
      const next = { ...current, private: isPrivate, updatedAt: Date.now() }
      await persistNote(next)
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? next : n)).sort((a, b) => b.updatedAt - a.updatedAt),
      )
      if (isPrivate) {
        setSelectedId((sel) => (sel === id ? null : sel))
      } else if (privateVaultOpen) {
        setPrivateVaultOpen(false)
      }
    },
    [flushSave, persistNote, privateVaultOpen],
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

  const closePrivateVault = useCallback(() => {
    setPrivateVaultOpen(false)
  }, [])

  const openPrivateVault = useCallback(async (pin: string): Promise<boolean> => {
    if (!hasStoredPrivatePin(username)) return false
    const ok = await verifyPrivatePin(username, pin)
    if (!ok) return false
    setPrivateVaultOpen(true)
    return true
  }, [username])

  const setPrivatePin = useCallback(
    async (pin: string): Promise<boolean> => {
      const ok = await storePrivatePin(username, pin)
      if (ok) setPrivatePinVersion((v) => v + 1)
      return ok
    },
    [username],
  )

  const resetPrivatePinAndWipe = useCallback(
    async (nextPin: string): Promise<boolean> => {
      if (!isPrivatePinFormat(nextPin.trim())) return false
      await flushSave()
      const ids = notesRef.current.filter((n) => n.private).map((n) => n.id)
      try {
        for (const id of ids) {
          await api.deleteNote(id)
        }
      } catch (e) {
        const msg = e instanceof AppError ? e.message : String(e)
        const code = e instanceof AppError ? e.code : ErrorCodes.NOTE_DELETE_FAILED
        report(msg, code)
        return false
      }
      setNotes((prev) => prev.filter((n) => !n.private))
      setPrivateVaultOpen(false)
      const ok = await storePrivatePin(username, nextPin)
      if (!ok) return false
      setPrivatePinVersion((v) => v + 1)
      setSelectedId(null)
      return true
    },
    [flushSave, username, report],
  )

  useEffect(() => {
    setPrivateVaultOpen(false)
  }, [username])

  useEffect(() => {
    setHasPrivatePinState(hasStoredPrivatePin(username))
  }, [username, privatePinVersion])

  useEffect(() => {
    if (!selectedId) return
    const selected = notes.find((n) => n.id === selectedId)
    if (!selected) return
    if (privateVaultOpen && !selected.private) {
      setSelectedId(notes.filter((n) => n.private).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null)
      return
    }
    if (!privateVaultOpen && selected.private) {
      setSelectedId(notes.filter((n) => !n.private).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null)
    }
  }, [privateVaultOpen, notes, selectedId])

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

  const exportNoteMarkdown = useCallback((note: Note) => {
    const text = noteToMarkdownExport(note)
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugifyNoteFilename(note.title)}.md`
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
      setNotePrivate,
      deleteNoteForever,
      exportVaultJson,
      importVaultFromText,
      exportNoteMarkdown,
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
      privateVaultOpen,
      openPrivateVault,
      closePrivateVault,
      hasPrivatePin,
      setPrivatePin,
      resetPrivatePinAndWipe,
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
      setNotePrivate,
      deleteNoteForever,
      exportVaultJson,
      importVaultFromText,
      exportNoteMarkdown,
      searchQuery,
      tagFilter,
      saving,
      lastSavedAt,
      error,
      clearError,
      showArchived,
      privateVaultOpen,
      openPrivateVault,
      closePrivateVault,
      hasPrivatePin,
      setPrivatePin,
      resetPrivatePinAndWipe,
    ],
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within NotesProvider')
  return ctx
}
