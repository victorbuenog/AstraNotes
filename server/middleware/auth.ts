import type express from 'express'

export function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const userId = req.session.userId
  if (typeof userId !== 'number') {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
