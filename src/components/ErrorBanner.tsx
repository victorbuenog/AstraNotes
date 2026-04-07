import { useNotes } from '../context/NotesContext'

export function ErrorBanner() {
  const { error, clearError } = useNotes()
  if (!error) return null
  return (
    <div className="error-banner" role="alert">
      <div className="error-banner__text">
        <strong>{error.message}</strong>
        <span className="error-banner__code">Code: {error.code}</span>
      </div>
      <button type="button" className="btn btn--ghost" onClick={clearError}>
        Dismiss
      </button>
    </div>
  )
}
