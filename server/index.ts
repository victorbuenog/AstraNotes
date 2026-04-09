import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb } from './db.js'
import { createApp } from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const defaultDbPath = path.join(root, 'data', 'astranotes.db')
const dbPath = process.env.ASTRANOTES_DB_PATH ?? defaultDbPath
const sessionSecret =
  process.env.SESSION_SECRET ?? 'dev-only-set-SESSION_SECRET-in-production'

if (sessionSecret === 'dev-only-set-SESSION_SECRET-in-production' && process.env.NODE_ENV === 'production') {
  console.error('Refusing to start: set SESSION_SECRET in production')
  process.exit(1)
}

const db = openDb(dbPath)
const app = createApp(db, sessionSecret)
const port = Number(process.env.PORT ?? 3001)

app.listen(port, () => {
  console.log(`AstraNotes API listening on http://127.0.0.1:${port}`)
})
