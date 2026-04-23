import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotesProvider, useNotes } from './context/NotesContext'
import { AuthScreen } from './components/AuthScreen'
import { UnlockScreen } from './components/UnlockScreen'
import { Sidebar } from './components/Sidebar'
import { NoteEditor } from './components/NoteEditor'
import { ErrorBanner } from './components/ErrorBanner'
import { Vault } from './crypto/vault'

function MainChrome({ onLogout }: { onLogout: () => void }) {
  const { notes, selectedId } = useNotes()
  const { user } = useAuth()
  const selected = selectedId ? notes.find((n) => n.id === selectedId) : null

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [overlayMode, setOverlayMode] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 840px)')
    const sync = () => setOverlayMode(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const workspaceClass =
    'app-shell__workspace' +
    (overlayMode ? ' app-shell__workspace--overlay' : '') +
    (!overlayMode && !sidebarOpen ? ' app-shell__workspace--sidebar-closed' : '')

  const closeDrawerOnSelect = useCallback(() => {
    if (overlayMode) setSidebarOpen(false)
  }, [overlayMode])

  return (
    <div className="app-shell">
      <ErrorBanner />
      <div className="app-shell__body">
        {overlayMode && sidebarOpen && (
          <div
            className="sidebar-backdrop"
            role="presentation"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className={workspaceClass}>
          <Sidebar
            username={user?.username}
            onLogout={() => void onLogout()}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            overlayMode={overlayMode}
            onAfterSelectNote={closeDrawerOnSelect}
          />
          <main className="main">
            {!sidebarOpen && (
              <button
                type="button"
                className="btn btn--ghost btn--sm main__sidebar-reopen"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                ☰
              </button>
            )}
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
