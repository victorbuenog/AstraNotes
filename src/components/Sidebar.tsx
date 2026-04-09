import { useNotes } from '../context/NotesContext'

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

export function Sidebar({ username, onLogout }: SidebarProps) {
  const { notes, selectedId, selectNote, createNote, showArchived, setShowArchived } = useNotes()

  const visible = notes
    .filter((n) => (showArchived ? n.archived : !n.archived))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return (
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
          <p className="sidebar__empty">{showArchived ? 'No archived notes.' : 'No notes yet.'}</p>
        ) : (
          <ul>
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={selectedId === n.id ? 'note-row is-active' : 'note-row'}
                  onClick={() => void selectNote(n.id)}
                >
                  <span className="note-row__title">{n.title || 'Untitled'}</span>
                  <span className="note-row__time">{formatTime(n.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )
}

export function NoteActionsBar() {
  const { selectedId, notes, archiveNote, unarchiveNote, deleteNoteForever } = useNotes()
  const note = selectedId ? notes.find((n) => n.id === selectedId) : null
  if (!note) return null

  return (
    <div className="actions-bar">
      {note.archived ? (
        <button type="button" className="btn btn--ghost" onClick={() => void unarchiveNote(note.id)}>
          Restore
        </button>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => void archiveNote(note.id)}>
          Archive
        </button>
      )}
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => {
          if (
            window.confirm(
              'Permanently delete this note? This cannot be undone.',
            )
          ) {
            void deleteNoteForever(note.id)
          }
        }}
      >
        Delete
      </button>
    </div>
  )
}
