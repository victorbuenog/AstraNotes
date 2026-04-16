import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useNotes } from '../context/NotesContext'
import { parseVaultImportJson } from '../vault/exportFormat'

type Props = {
  onLogout: () => void
}

export function SettingsMenu({ onLogout }: Props) {
  const { theme, toggle } = useTheme()
  const { exportVaultJson, importVaultFromText } = useNotes()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target
      if (t instanceof Node && rootRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onExportVault = () => {
    if (
      !window.confirm(
        'Export downloads a plaintext JSON file of all notes (decrypted on this device). Anyone with the file can read your notes. Continue?',
      )
    ) {
      return
    }
    setOpen(false)
    exportVaultJson()
  }

  const onImportPick = () => {
    importRef.current?.click()
  }

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
    setOpen(false)
    await importVaultFromText(text)
  }

  return (
    <div className="settings-menu" ref={rootRef}>
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="settings-menu__file"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void onImportFile(e)}
      />
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        Settings
      </button>
      {open && (
        <ul className="settings-menu__dropdown" role="menu" aria-label="App settings">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="settings-menu__item"
              onClick={() => {
                toggle()
              }}
            >
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </li>
          <li className="settings-menu__sep" role="separator" />
          <li role="none">
            <button type="button" role="menuitem" className="settings-menu__item" onClick={onExportVault}>
              Export vault (JSON)…
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" className="settings-menu__item" onClick={onImportPick}>
              Import vault…
            </button>
          </li>
          <li className="settings-menu__sep" role="separator" />
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="settings-menu__item"
              onClick={() => {
                setOpen(false)
                void onLogout()
              }}
            >
              Log out
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
