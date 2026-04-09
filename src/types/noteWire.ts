/** Wire format stored in SQLite — server never sees plaintext note JSON when v is 2 */
export const NOTE_PAYLOAD_VERSION = 2 as const

export type EncryptedNotePayloadV2 = {
  v: typeof NOTE_PAYLOAD_VERSION
  ivB64: string
  ciphertextB64: string
}

export function isEncryptedPayload(
  x: unknown,
): x is EncryptedNotePayloadV2 {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.v === NOTE_PAYLOAD_VERSION &&
    typeof o.ivB64 === 'string' &&
    typeof o.ciphertextB64 === 'string'
  )
}
