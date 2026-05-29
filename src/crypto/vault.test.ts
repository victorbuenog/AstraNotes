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

  it('isUnlocked reflects key state', async () => {
    const v = new Vault()
    expect(v.isUnlocked()).toBe(false)
    await v.create('pw')
    expect(v.isUnlocked()).toBe(true)
    v.lock()
    expect(v.isUnlocked()).toBe(false)
  })

  it('encrypt while locked throws VAULT_LOCKED', async () => {
    const v = new Vault()
    await expect(v.encrypt('data')).rejects.toMatchObject({
      code: ErrorCodes.VAULT_LOCKED,
    })
  })

  it('decrypt while locked throws VAULT_LOCKED', async () => {
    const v = new Vault()
    await expect(v.decrypt('iv', 'ct')).rejects.toMatchObject({
      code: ErrorCodes.VAULT_LOCKED,
    })
  })

  it('decrypt corrupted ciphertext throws CRYPTO_DECRYPT_FAILED', async () => {
    const v = new Vault()
    await v.create('pw')
    const { ivB64 } = await v.encrypt('hello')
    await expect(v.decrypt(ivB64, 'AAAA')) // garbage ciphertext
      .rejects.toMatchObject({
        code: ErrorCodes.CRYPTO_DECRYPT_FAILED,
      })
  })

  it('decrypt wrong iv throws CRYPTO_DECRYPT_FAILED', async () => {
    const v = new Vault()
    await v.create('pw')
    const { ciphertextB64 } = await v.encrypt('hello')
    await expect(v.decrypt('AAAA', ciphertextB64)).rejects.toMatchObject({
      code: ErrorCodes.CRYPTO_DECRYPT_FAILED,
    })
  })
})
