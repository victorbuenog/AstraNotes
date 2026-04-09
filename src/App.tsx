import { useCallback, useMemo, useState } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotesProvider, useNotes } from './context/NotesContext'
import { AuthScreen } from './components/AuthScreen'
import { UnlockScreen } from './components/UnlockScreen'
import { Sidebar, NoteActionsBar } from './components/Sidebar'
import { NoteEditor } from './components/NoteEditor'
import { ErrorBanner } from './components/ErrorBanner'
import { Vault } from './crypto/vault'

function MainChrome({ onLogout }: { onLogout: () => void }) {
  const { theme, toggle } = useTheme()
  const { notes, selectedId, saving, lastSavedAt } = useNotes()
  const { user } = useAuth()
  const selected = selectedId ? notes.find((n) => n.id === selectedId) : null

  const saveLabel = saving ? 'Saving…' : lastSavedAt ? 'Saved' : ''

  return (
    <div className="app-shell">
      <ErrorBanner />
      <div className="app-shell__body">
        <Sidebar username={user?.username} onLogout={() => void onLogout()} />
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

function AppGate() {
  const { user, loading, setUser, logout } = useAuth()
  const vault = useMemo(() => new Vault(), [])
  const [cryptoReady, setCryptoReady] = useState(false)

  const handleLogout = useCallback(async () => {
    vault.lock()
    setCryptoReady(false)
    await logout()
  }, [logout, vault])

  if (loading) {
    return (
      <div className="vault-screen">
        <p className="vault-screen__muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        vault={vault}
        onAuthed={(u, opts) => {
          setUser(u)
          setCryptoReady(opts?.skipVaultUnlock ?? false)
        }}
      />
    )
  }

  if (!cryptoReady) {
    return (
      <UnlockScreen
        vault={vault}
        onUnlocked={() => setCryptoReady(true)}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <NotesProvider vault={vault}>
      <MainChrome onLogout={handleLogout} />
    </NotesProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ThemeProvider>
  )
}
