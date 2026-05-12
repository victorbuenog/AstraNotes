import express from 'express'
import type { Database } from 'better-sqlite3'
import { requireAuth } from '../middleware/auth.js'
import {
  deleteNoteForUser,
  listNotesByUser,
  saveEncryptedNoteForUser,
} from '../repositories/noteRepository.js'
import { isEncryptedNotePutBody } from '../validators/noteValidators.js'

export function createNotesRouter(db: Database): express.Router {
  const router = express.Router()

  router.get('/notes', requireAuth, (req, res) => {
    res.json(listNotesByUser(db, req.session.userId!))
  })

  router.put('/notes/:id', requireAuth, (req, res) => {
    const body = req.body as unknown
    if (!isEncryptedNotePutBody(body)) {
      res.status(400).json({ error: 'Expected encrypted note payload (v2)' })
      return
    }

    const result = saveEncryptedNoteForUser(db, {
      id: req.params.id,
      userId: req.session.userId!,
      body,
    })

    if (result === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    res.status(204).end()
  })

  router.delete('/notes/:id', requireAuth, (req, res) => {
    const deleted = deleteNoteForUser(db, {
      id: req.params.id,
      userId: req.session.userId!,
    })
    if (!deleted) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.status(204).end()
  })

  return router
}
