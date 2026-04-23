const STORAGE_PREFIX = 'astranotes.privatePin.v1'
const ITERATIONS = 120_000

type StoredPin = {
  v: 1
  iterations: number
  saltB64: string
  digestB64: string
}

function storageKey(username: string | undefined): string {
  return `${STORAGE_PREFIX}:${username?.trim() || '_'}`
}

function toB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(v: string): Uint8Array {
  const s = atob(v)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function normalizePin(pin: string): string {
  return pin.trim()
}

export function isPrivatePinFormat(pin: string): boolean {
  return /^\d{4,12}$/.test(pin)
}

function readStored(username: string | undefined): StoredPin | null {
  try {
    const raw = localStorage.getItem(storageKey(username))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPin>
    if (
      parsed.v !== 1 ||
      typeof parsed.iterations !== 'number' ||
      typeof parsed.saltB64 !== 'string' ||
      typeof parsed.digestB64 !== 'string'
    ) {
      return null
    }
    return {
      v: 1,
      iterations: parsed.iterations,
      saltB64: parsed.saltB64,
      digestB64: parsed.digestB64,
    }
  } catch {
    return null
  }
}

async function deriveDigest(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  )
  return new Uint8Array(bits)
}

export function hasPrivatePin(username: string | undefined): boolean {
  return readStored(username) !== null
}

export function clearPrivatePin(username: string | undefined): void {
  try {
    localStorage.removeItem(storageKey(username))
  } catch {
    /* ignore */
  }
}

export async function setPrivatePin(username: string | undefined, rawPin: string): Promise<boolean> {
  const pin = normalizePin(rawPin)
  if (!isPrivatePinFormat(pin)) return false
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const digest = await deriveDigest(pin, salt, ITERATIONS)
  const stored: StoredPin = {
    v: 1,
    iterations: ITERATIONS,
    saltB64: toB64(salt),
    digestB64: toB64(digest),
  }
  try {
    localStorage.setItem(storageKey(username), JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

export async function verifyPrivatePin(username: string | undefined, rawPin: string): Promise<boolean> {
  const stored = readStored(username)
  if (!stored) return false
  const pin = normalizePin(rawPin)
  if (!isPrivatePinFormat(pin)) return false
  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = fromB64(stored.saltB64)
    expected = fromB64(stored.digestB64)
  } catch {
    return false
  }
  const actual = await deriveDigest(pin, salt, stored.iterations)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}
