import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'

const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const AES_KEY_BITS = 256

function getSubtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle
  if (!s) throw new AppError(ErrorCodes.CRYPTO_UNAVAILABLE, 'Web Crypto API is not available')
  return s
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle()
  const enc = new TextEncoder().encode(passphrase)
  const baseKey = await subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits', 'deriveKey'])
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

const VERIFIER_PLAINTEXT = 'astranotes-vault-v1'

export type VaultMeta = {
  saltB64: string
  iterations: number
  verifierIvB64: string
  verifierCiphertextB64: string
}

export class Vault {
  private key: CryptoKey | null = null

  isUnlocked(): boolean {
    return this.key !== null
  }

  lock(): void {
    this.key = null
  }

  async create(passphrase: string): Promise<VaultMeta> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
    this.key = await deriveKey(passphrase, salt)
    const v = await this.encrypt(VERIFIER_PLAINTEXT)
    return {
      saltB64: bufToB64(salt.buffer),
      iterations: PBKDF2_ITERATIONS,
      verifierIvB64: v.ivB64,
      verifierCiphertextB64: v.ciphertextB64,
    }
  }

  async unlock(passphrase: string, meta: VaultMeta): Promise<void> {
    const salt = new Uint8Array(b64ToBuf(meta.saltB64))
    const key = await deriveKey(passphrase, salt)
    this.key = key
    try {
      const plain = await this.decrypt(meta.verifierIvB64, meta.verifierCiphertextB64)
      if (plain !== VERIFIER_PLAINTEXT) {
        this.key = null
        throw new AppError(ErrorCodes.VAULT_WRONG_PASSPHRASE, 'Incorrect passphrase')
      }
    } catch (e) {
      this.key = null
      if (e instanceof AppError && e.code === ErrorCodes.VAULT_WRONG_PASSPHRASE) throw e
      throw new AppError(ErrorCodes.VAULT_WRONG_PASSPHRASE, 'Incorrect passphrase', e)
    }
  }

  async encrypt(plaintext: string): Promise<{ ivB64: string; ciphertextB64: string }> {
    if (!this.key) throw new AppError(ErrorCodes.VAULT_LOCKED, 'Vault is locked')
    const subtle = getSubtle()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = new TextEncoder().encode(plaintext)
    try {
      const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, this.key, data)
      return { ivB64: bufToB64(iv.buffer), ciphertextB64: bufToB64(ct) }
    } catch (e) {
      throw new AppError(ErrorCodes.CRYPTO_ENCRYPT_FAILED, 'Encryption failed', e)
    }
  }

  async decrypt(ivB64: string, ciphertextB64: string): Promise<string> {
    if (!this.key) throw new AppError(ErrorCodes.VAULT_LOCKED, 'Vault is locked')
    const subtle = getSubtle()
    const iv = new Uint8Array(b64ToBuf(ivB64))
    const ciphertext = new Uint8Array(b64ToBuf(ciphertextB64))
    try {
      const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, this.key, ciphertext)
      return new TextDecoder().decode(pt)
    } catch (e) {
      throw new AppError(ErrorCodes.CRYPTO_DECRYPT_FAILED, 'Wrong passphrase or corrupted data', e)
    }
  }
}
