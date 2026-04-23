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

type PrivatePinModalState = {
  mode: 'set' | 'reset'
  pin: string
  error: string | null
  success: string | null
  busy: boolean
}

type InfoModalState = {
  title: string
  message: string
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
  const [privatePinModal, setPrivatePinModal] = useState<PrivatePinModalState | null>(null)
  const [infoModal, setInfoModal] = useState<InfoModalState | null>(null)
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
      setInfoModal({
        title: 'Import failed',
        message: parsed.error,
      })
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

  const openSetPrivatePinModal = () => {
    setOpen(false)
    setPrivatePinModal({ mode: 'set', pin: '', error: null, success: null, busy: false })
  }

  const openResetPrivatePinModal = () => {
    setOpen(false)
    setPrivatePinModal({ mode: 'reset', pin: '', error: null, success: null, busy: false })
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
              Read view font
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
              Read view size ({noteFontSizePx}px)
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
            <button
              type="button"
              role="menuitem"
              className="settings-menu__item"
              onClick={openSetPrivatePinModal}
            >
              {hasPrivatePin ? 'Change private PIN…' : 'Set private PIN…'}
            </button>
          </li>
          {hasPrivatePin && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="settings-menu__item"
                onClick={openResetPrivatePinModal}
              >
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
      {privatePinModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!privatePinModal.busy) setPrivatePinModal(null)
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="private-pin-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="private-pin-modal-title" className="modal__title">
              {privatePinModal.mode === 'set' ? 'Set private vault PIN' : 'Reset private vault PIN'}
            </h2>
            <p className="modal__body">
              {privatePinModal.mode === 'set'
                ? 'Choose a PIN with 4 to 12 digits.'
                : 'Resetting the PIN permanently deletes existing private notes. Enter your new PIN to continue.'}
            </p>
            {privatePinModal.error && (
              <div className="vault-card__error" role="alert">
                {privatePinModal.error}
              </div>
            )}
            {privatePinModal.success && (
              <div className="vault-card__error" role="status">
                {privatePinModal.success}
              </div>
            )}
            <form
              className="vault-form"
              onSubmit={(e) => {
                e.preventDefault()
                void (async () => {
                  const pin = privatePinModal.pin.trim()
                  if (!pin) {
                    setPrivatePinModal((cur) => (cur ? { ...cur, error: 'PIN is required.' } : cur))
                    return
                  }
                  setPrivatePinModal((cur) =>
                    cur ? { ...cur, busy: true, error: null, success: null } : cur,
                  )
                  const ok =
                    privatePinModal.mode === 'set'
                      ? await setPrivatePin(pin)
                      : await resetPrivatePinAndWipe(pin)
                  if (!ok) {
                    setPrivatePinModal((cur) =>
                      cur
                        ? {
                            ...cur,
                            busy: false,
                            error:
                              cur.mode === 'set'
                                ? 'PIN must be 4-12 digits.'
                                : 'Reset failed. PIN must be 4-12 digits, and private notes must be removable.',
                          }
                        : cur,
                    )
                    return
                  }
                  setPrivatePinModal((cur) =>
                    cur
                      ? {
                          ...cur,
                          busy: false,
                          pin: '',
                          error: null,
                          success:
                            cur.mode === 'set'
                              ? 'Private vault PIN saved.'
                              : 'Private vault PIN reset. Existing private notes were deleted.',
                        }
                      : cur,
                  )
                })()
              }}
            >
              <label className="field">
                <span>PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={privatePinModal.pin}
                  onChange={(e) =>
                    setPrivatePinModal((cur) =>
                      cur
                        ? { ...cur, pin: e.target.value.replace(/\D+/g, '').slice(0, 12), error: null }
                        : cur,
                    )
                  }
                  required
                  minLength={4}
                  maxLength={12}
                />
              </label>
              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setPrivatePinModal(null)}
                  disabled={privatePinModal.busy}
                >
                  Close
                </button>
                <button type="submit" className="btn btn--primary" disabled={privatePinModal.busy}>
                  {privatePinModal.busy
                    ? 'Please wait…'
                    : privatePinModal.mode === 'set'
                      ? 'Save PIN'
                      : 'Reset PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {infoModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setInfoModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-info-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="settings-info-modal-title" className="modal__title">
              {infoModal.title}
            </h2>
            <p className="modal__body">{infoModal.message}</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--primary" onClick={() => setInfoModal(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
