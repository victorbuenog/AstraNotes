import bcrypt from 'bcryptjs'
import express from 'express'
import type { Database } from 'better-sqlite3'
import { requireAuth } from '../middleware/auth.js'
import {
  createUser,
  findUserAuthByUsername,
  getUserEncryptionMeta,
  setUserEncryptionMeta,
  userHasEncryptionMeta,
} from '../repositories/userRepository.js'
import {
  isVaultMeta,
  validatePassword,
  validateUsername,
} from '../validators/authValidators.js'

const BCRYPT_ROUNDS = 10

export function createAuthRouter(db: Database): express.Router {
  const router = express.Router()

  router.post('/register', (req, res) => {
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

    try {
      const userId = createUser(db, {
        username,
        passwordHash: bcrypt.hashSync(password, BCRYPT_ROUNDS),
        createdAt: Date.now(),
        encryptionMeta,
      })
      req.session.userId = userId
      req.session.username = username
      res.status(201).json({ username, encryptionMeta })
    } catch {
      res.status(409).json({ error: 'Username already taken' })
    }
  })

  router.post('/login', (req, res) => {
    const username = validateUsername(req.body?.username)
    const password = validatePassword(req.body?.password)

    if (!username || !password) {
      res.status(400).json({ error: 'Invalid username or password' })
      return
    }

    const user = findUserAuthByUsername(db, username)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    req.session.userId = user.id
    req.session.username = username
    res.json({ username, encryptionMeta: user.encryptionMeta })
  })

  router.patch('/me/encryption-meta', requireAuth, (req, res) => {
    const encryptionMeta = req.body?.encryptionMeta
    if (!isVaultMeta(encryptionMeta)) {
      res.status(400).json({ error: 'Invalid encryption metadata' })
      return
    }

    const userId = req.session.userId!
    if (userHasEncryptionMeta(db, userId)) {
      res.status(409).json({ error: 'Encryption already configured' })
      return
    }

    setUserEncryptionMeta(db, userId, encryptionMeta)
    res.status(204).end()
  })

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'Could not log out' })
        return
      }
      res.status(204).end()
    })
  })

  router.get('/me', (req, res) => {
    if (typeof req.session.userId !== 'number' || !req.session.username) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const encryptionMeta = getUserEncryptionMeta(db, req.session.userId)
    res.json({ username: req.session.username, encryptionMeta })
  })

  return router
}
