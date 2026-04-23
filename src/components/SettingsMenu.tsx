import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useNotes } from '../context/NotesContext'
import { parseVaultImportJson } from '../vault/exportFormat'
import {
  noteFontFamilyToCssValue,
  readEditorAppearance,
  type NoteFontFamily,
  writeEditorAppearance,
} from '../preferences/editorAppearance'

type Props = {
  onLogout: () => void
}

export function SettingsMenu({ onLogout }: Props) {
  const { theme, toggle } = useTheme()
  const {
    exportVaultJson,
    importVaultFromText,
    hasPrivatePin,
    setPrivatePin,
    resetPrivatePinAndWipe,
  } = useNotes()
  const [open, setOpen] = useState(false)
  const [noteFontFamily, setNoteFontFamily] = useState<NoteFontFamily>(() => readEditorAppearance().noteFontFamily)
  const [noteFontSizePx, setNoteFontSizePx] = useState(() => readEditorAppearance().noteFontSizePx)
  const rootRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const next = { noteFontFamily, noteFontSizePx }
    writeEditorAppearance(next)
    document.documentElement.style.setProperty('--note-font-family', noteFontFamilyToCssValue(noteFontFamily))
    document.documentElement.style.setProperty('--note-font-size', `${noteFontSizePx}px`)
  }, [noteFontFamily, noteFontSizePx])

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

  const onSetPrivatePin = async () => {
    const pin = window.prompt('Set private vault PIN (4-12 digits):')
    if (pin === null) return
    const ok = await setPrivatePin(pin)
    if (!ok) window.alert('PIN must be 4-12 digits.')
    else window.alert('Private vault PIN set.')
  }

  const onResetPrivatePin = async () => {
    if (
      !window.confirm(
        'Resetting the private vault PIN permanently deletes all existing private notes. Continue?',
      )
    ) {
      return
    }
    const pin = window.prompt('Enter new private vault PIN (4-12 digits):')
    if (pin === null) return
    const ok = await resetPrivatePinAndWipe(pin)
    if (!ok) {
      window.alert('Reset failed. PIN must be 4-12 digits, and private notes must be removable.')
      return
    }
    window.alert('Private vault PIN reset. Existing private notes were deleted.')
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
          <li role="none" className="settings-menu__section">
            <label className="settings-menu__field">
              Note font
              <select
                className="settings-menu__select"
                value={noteFontFamily}
                onChange={(e) => setNoteFontFamily(e.target.value as NoteFontFamily)}
              >
                <option value="mono">Monospace</option>
                <option value="sans">Sans-serif</option>
                <option value="serif">Serif</option>
              </select>
            </label>
            <label className="settings-menu__field">
              Note size ({noteFontSizePx}px)
              <input
                className="settings-menu__range"
                type="range"
                min={12}
                max={22}
                step={1}
                value={noteFontSizePx}
                onChange={(e) => setNoteFontSizePx(Number(e.target.value))}
              />
            </label>
          </li>
          <li className="settings-menu__sep" role="separator" />
          <li role="none">
            <button type="button" role="menuitem" className="settings-menu__item" onClick={() => void onSetPrivatePin()}>
              {hasPrivatePin ? 'Change private PIN…' : 'Set private PIN…'}
            </button>
          </li>
          {hasPrivatePin && (
            <li role="none">
              <button type="button" role="menuitem" className="settings-menu__item" onClick={() => void onResetPrivatePin()}>
                Reset private PIN (wipe private notes)…
              </button>
            </li>
          )}
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
