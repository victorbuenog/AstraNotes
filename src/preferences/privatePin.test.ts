import { beforeEach, describe, expect, it } from 'vitest'
import { hasPrivatePin, setPrivatePin, verifyPrivatePin } from './privatePin'

describe('private PIN preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('rejects invalid PIN formats', async () => {
    await expect(setPrivatePin('alice', '12')).resolves.toBe(false)
    await expect(setPrivatePin('alice', 'abcd')).resolves.toBe(false)
    expect(hasPrivatePin('alice')).toBe(false)
  })

  it('stores and verifies valid PIN', async () => {
    await expect(setPrivatePin('alice', '1234')).resolves.toBe(true)
    expect(hasPrivatePin('alice')).toBe(true)
    await expect(verifyPrivatePin('alice', '1234')).resolves.toBe(true)
    await expect(verifyPrivatePin('alice', '0000')).resolves.toBe(false)
  })
})
