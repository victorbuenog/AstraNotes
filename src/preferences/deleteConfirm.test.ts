import { describe, expect, it, beforeEach } from 'vitest'
import {
  setSkipDeleteConfirm,
  shouldSkipDeleteConfirm,
} from './deleteConfirm'

describe('deleteConfirm preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is per username', () => {
    expect(shouldSkipDeleteConfirm('alice')).toBe(false)
    setSkipDeleteConfirm('alice', true)
    expect(shouldSkipDeleteConfirm('alice')).toBe(true)
    expect(shouldSkipDeleteConfirm('bob')).toBe(false)
  })

  it('treats unset as false', () => {
    expect(shouldSkipDeleteConfirm(undefined)).toBe(false)
  })
})
