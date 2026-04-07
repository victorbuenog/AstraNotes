import { describe, expect, it } from 'vitest'
import { AppError, toUserMessage } from './AppError'
import { ErrorCodes } from './codes'

describe('AppError', () => {
  it('carries code and message', () => {
    const e = new AppError(ErrorCodes.NOTE_NOT_FOUND, 'missing')
    expect(e.code).toBe(ErrorCodes.NOTE_NOT_FOUND)
    expect(e.message).toBe('missing')
  })

  it('toUserMessage maps AppError', () => {
    const u = toUserMessage(new AppError(ErrorCodes.STORAGE_CORRUPT, 'bad'))
    expect(u.code).toBe(ErrorCodes.STORAGE_CORRUPT)
    expect(u.detail).toBe('bad')
  })
})
