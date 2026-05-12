const USERNAME_MIN = 3
const USERNAME_MAX = 32
const PASSWORD_MIN = 8

export type VaultMetaJson = {
  saltB64: string
  iterations: number
  verifierIvB64: string
  verifierCiphertextB64: string
}

export function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string') return null
  const trimmed = username.trim()
  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null
  return trimmed
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return null
  if (password.length < PASSWORD_MIN) return null
  return password
}

export function isVaultMeta(value: unknown): value is VaultMetaJson {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.saltB64 === 'string' &&
    typeof candidate.iterations === 'number' &&
    typeof candidate.verifierIvB64 === 'string' &&
    typeof candidate.verifierCiphertextB64 === 'string'
  )
}
