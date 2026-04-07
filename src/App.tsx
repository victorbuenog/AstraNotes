import { useMemo, useState } from 'react'
import { Vault } from './crypto/vault'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { NotesProvider, useNotes } from './context/NotesContext'
import { VaultScreen } from './components/VaultScreen'
import { Sidebar, NoteActionsBar } from './components/Sidebar'
import { NoteEditor } from './components/NoteEditor'
import { ErrorBanner } from './components/ErrorBanner'

function MainChrome() {
  const { theme, toggle } = useTheme()
  const { notes, selectedId, saving, lastSavedAt } = useNotes()
  const selected = selectedId ? notes.find((n) => n.id === selectedId) : null

  const saveLabel = saving ? 'Saving…' : lastSavedAt ? 'Saved' : ''

  return (
    <div className="app-shell">
      <ErrorBanner />
      <div className="app-shell__body">
        <Sidebar />
        <main className="main">
        <header className="main__top">
          <NoteActionsBar />
          <div className="main__meta">
            {saveLabel && <span className="save-pill">{saveLabel}</span>}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={toggle}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>
        {selected ? (
          <NoteEditor key={selected.id} note={selected} />
        ) : (
          <div className="empty-main">
            <p>Select a note or create a new one.</p>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}

function AppInner() {
  const vault = useMemo(() => new Vault(), [])
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return <VaultScreen vault={vault} onReady={() => setUnlocked(true)} />
  }

  return (
    <NotesProvider vault={vault}>
      <MainChrome />
    </NotesProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
