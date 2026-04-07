import { describe, expect, it } from 'vitest'
import { Vault } from './vault'
import { ErrorCodes } from '../errors/codes'

describe('Vault', () => {
  it('create and unlock roundtrip', async () => {
    const v = new Vault()
    const meta = await v.create('test-passphrase-ok')
    v.lock()
    const v2 = new Vault()
    await v2.unlock('test-passphrase-ok', meta)
    const { ivB64, ciphertextB64 } = await v2.encrypt('hello world')
    const plain = await v2.decrypt(ivB64, ciphertextB64)
    expect(plain).toBe('hello world')
  })

  it('wrong passphrase fails unlock', async () => {
    const v = new Vault()
    const meta = await v.create('correct-horse-battery')
    v.lock()
    const v2 = new Vault()
    await expect(v2.unlock('wrong-passphrase-here', meta)).rejects.toMatchObject({
      code: ErrorCodes.VAULT_WRONG_PASSPHRASE,
    })
  })
})
