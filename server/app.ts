import express from 'express'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import type { Database } from 'better-sqlite3'

const BCRYPT_ROUNDS = 10
const USERNAME_MIN = 3
const USERNAME_MAX = 32
const PASSWORD_MIN = 8
const NOTE_PAYLOAD_V2 = 2

type VaultMetaJson = {
  saltB64: string
  iterations: number
  verifierIvB64: string
  verifierCiphertextB64: string
}

function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string') return null
  const t = username.trim()
  if (t.length < USERNAME_MIN || t.length > USERNAME_MAX) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(t)) return null
  return t
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return null
  if (password.length < PASSWORD_MIN) return null
  return password
}

function isVaultMeta(x: unknown): x is VaultMetaJson {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.saltB64 === 'string' &&
    typeof o.iterations === 'number' &&
    typeof o.verifierIvB64 === 'string' &&
    typeof o.verifierCiphertextB64 === 'string'
  )
}

function isEncryptedNotePutBody(x: unknown): x is {
  v: number
  ivB64: string
  ciphertextB64: string
  updatedAt: number
} {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.v === NOTE_PAYLOAD_V2 &&
    typeof o.ivB64 === 'string' &&
    typeof o.ciphertextB64 === 'string' &&
    typeof o.updatedAt === 'number'
  )
}

export function createApp(db: Database, sessionSecret: string): express.Application {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '2mb' }))
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'astranotes.sid',
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ ok: true })
  })

  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const uid = req.session.userId
    if (typeof uid !== 'number') {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    next()
  }

  app.post('/api/register', (req, res) => {
    const username = validateUsername(req.body?.username)
    const password = validatePassword(req.body?.password)
    const encryptionMeta = req.body?.encryptionMeta
    if (!username || !password) {
      res.status(400).json({ error: 'Invalid username or password' })
      return
    }
    if (!isVaultMeta(encryptionMeta)) {
      res.status(400).json({ error: 'Invalid encryption metadata' })
      return
    }
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
    const now = Date.now()
    const metaJson = JSON.stringify(encryptionMeta)
    try {
      const info = db
        .prepare(
          'INSERT INTO users (username, password_hash, created_at, encryption_meta) VALUES (?, ?, ?, ?)',
        )
        .run(username, hash, now, metaJson)
      const userId = Number(info.lastInsertRowid)
      req.session.userId = userId
      req.session.username = username
      res.status(201).json({ username, encryptionMeta })
    } catch {
      res.status(409).json({ error: 'Username already taken' })
    }
  })

  app.post('/api/login', (req, res) => {
    const username = validateUsername(req.body?.username)
    const password = validatePassword(req.body?.password)
    if (!username || !password) {
      res.status(400).json({ error: 'Invalid username or password' })
      return
    }
    const row = db
      .prepare('SELECT id, password_hash, encryption_meta FROM users WHERE username = ?')
      .get(username) as
      | { id: number; password_hash: string; encryption_meta: string | null }
      | undefined
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    let encryptionMeta: VaultMetaJson | null = null
    if (row.encryption_meta) {
      try {
        const parsed = JSON.parse(row.encryption_meta) as unknown
        if (isVaultMeta(parsed)) encryptionMeta = parsed
      } catch {
        /* leave null */
      }
    }
    req.session.userId = row.id
    req.session.username = username
    res.json({ username, encryptionMeta })
  })

  app.patch('/api/me/encryption-meta', requireAuth, (req, res) => {
    const encryptionMeta = req.body?.encryptionMeta
    if (!isVaultMeta(encryptionMeta)) {
      res.status(400).json({ error: 'Invalid encryption metadata' })
      return
    }
    const userId = req.session.userId!
    const row = db.prepare('SELECT encryption_meta FROM users WHERE id = ?').get(userId) as
      | { encryption_meta: string | null }
      | undefined
    if (row?.encryption_meta) {
      res.status(409).json({ error: 'Encryption already configured' })
      return
    }
    db.prepare('UPDATE users SET encryption_meta = ? WHERE id = ?').run(
      JSON.stringify(encryptionMeta),
      userId,
    )
    res.status(204).end()
  })

  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'Could not log out' })
        return
      }
      res.status(204).end()
    })
  })

  app.get('/api/me', (req, res) => {
    if (typeof req.session.userId !== 'number' || !req.session.username) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const userId = req.session.userId
    const row = db.prepare('SELECT encryption_meta FROM users WHERE id = ?').get(userId) as
      | { encryption_meta: string | null }
      | undefined
    let encryptionMeta: VaultMetaJson | null = null
    if (row?.encryption_meta) {
      try {
        const parsed = JSON.parse(row.encryption_meta) as unknown
        if (isVaultMeta(parsed)) encryptionMeta = parsed
      } catch {
        /* leave null */
      }
    }
    res.json({ username: req.session.username, encryptionMeta })
  })

  app.get('/api/notes', requireAuth, (req, res) => {
    const userId = req.session.userId!
    const rows = db
      .prepare('SELECT id, payload, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as { id: string; payload: string; updated_at: number }[]
    const out: { id: string; updatedAt: number; payload: unknown }[] = []
    for (const r of rows) {
      try {
        const payload = JSON.parse(r.payload) as unknown
        out.push({ id: r.id, updatedAt: r.updated_at, payload })
      } catch {
        /* skip corrupt row */
      }
    }
    res.json(out)
  })

  app.put('/api/notes/:id', requireAuth, (req, res) => {
    const userId = req.session.userId!
    const id = req.params.id
    const body = req.body as unknown
    if (!isEncryptedNotePutBody(body)) {
      res.status(400).json({ error: 'Expected encrypted note payload (v2)' })
      return
    }
    const existing = db.prepare('SELECT user_id FROM notes WHERE id = ?').get(id) as
      | { user_id: number }
      | undefined
    if (existing && existing.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const stored = {
      v: NOTE_PAYLOAD_V2,
      ivB64: body.ivB64,
      ciphertextB64: body.ciphertextB64,
    }
    const payload = JSON.stringify(stored)
    db.prepare(
      'INSERT OR REPLACE INTO notes (id, user_id, payload, updated_at) VALUES (?, ?, ?, ?)',
    ).run(id, userId, payload, body.updatedAt)
    res.status(204).end()
  })

  app.delete('/api/notes/:id', requireAuth, (req, res) => {
    const userId = req.session.userId!
    const id = req.params.id
    const info = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId)
    if (info.changes === 0) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.status(204).end()
  })

  return app
}
