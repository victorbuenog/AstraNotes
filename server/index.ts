import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { openDb, type SqliteJournalMode } from './db.js'
import { createApp } from './app.js'
import { suggestedSqliteJournalMode } from './journalMode.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const defaultDbPath = path.join(root, 'data', 'astranotes.db')
const dbPath = process.env.ASTRANOTES_DB_PATH ?? defaultDbPath
const resolvedDbPath = path.resolve(dbPath)

function readJournalMode(dbFilePath: string): SqliteJournalMode {
  const fromEnv = process.env.ASTRANOTES_SQLITE_JOURNAL_MODE?.trim()
  if (fromEnv) {
    const raw = fromEnv.toUpperCase()
    if (raw === 'WAL' || raw === 'DELETE' || raw === 'TRUNCATE') return raw
    console.warn(
      `[AstraNotes API] Invalid ASTRANOTES_SQLITE_JOURNAL_MODE=${JSON.stringify(raw)} — using WAL. ` +
        'Use WAL, DELETE, or TRUNCATE.',
    )
    return 'WAL'
  }
  const suggested = suggestedSqliteJournalMode(dbFilePath)
  if (suggested === 'DELETE') {
    console.warn(
      '[AstraNotes API] Database is on a network path (SMB/NAS, UNC, or mapped network drive) or a ' +
        'known cloud folder — using journal_mode=DELETE because SQLite WAL is unreliable there. ' +
        'Override with ASTRANOTES_SQLITE_JOURNAL_MODE=WAL only if the file is definitely on a local disk.',
    )
  }
  return suggested
}

const sessionSecret =
  process.env.SESSION_SECRET ?? 'dev-only-set-SESSION_SECRET-in-production'

if (sessionSecret === 'dev-only-set-SESSION_SECRET-in-production' && process.env.NODE_ENV === 'production') {
  console.error('Refusing to start: set SESSION_SECRET in production')
  process.exit(1)
}

const db = openDb(resolvedDbPath, { journalMode: readJournalMode(resolvedDbPath) })
const journalActual = db.pragma('journal_mode', { simple: true }) as string
const app = createApp(db, sessionSecret)

const distPath = path.join(root, 'dist')
const distIndex = path.join(distPath, 'index.html')
if (process.env.NODE_ENV === 'production' && fs.existsSync(distIndex)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    if (req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(distIndex, (err) => {
      if (err) next(err)
    })
  })
}

const port = Number(process.env.PORT ?? 3001)

app.listen(port, '0.0.0.0', () => {
  console.log(`AstraNotes listening on http://0.0.0.0:${port}`)
  console.log(`[AstraNotes API] SQLite database: ${resolvedDbPath}`)
  console.log(`[AstraNotes API] SQLite journal_mode (effective): ${journalActual}`)
})
