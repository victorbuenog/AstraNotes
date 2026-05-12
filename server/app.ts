import express from 'express'
import type { Database } from 'better-sqlite3'
import { createAuthRouter } from './routers/authRouter.js'
import { createNotesRouter } from './routers/notesRouter.js'
import { createSessionMiddleware } from './sessionConfig.js'

export function createApp(db: Database, sessionSecret: string): express.Application {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '2mb' }))
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use(createSessionMiddleware(sessionSecret))

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ ok: true })
  })
  app.use('/api', createAuthRouter(db))
  app.use('/api', createNotesRouter(db))

  return app
}
