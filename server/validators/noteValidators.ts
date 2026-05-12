export const NOTE_PAYLOAD_V2 = 2 as const

export type EncryptedNotePutBody = {
  v: typeof NOTE_PAYLOAD_V2
  ivB64: string
  ciphertextB64: string
  updatedAt: number
}

export function isEncryptedNotePutBody(value: unknown): value is EncryptedNotePutBody {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.v === NOTE_PAYLOAD_V2 &&
    typeof candidate.ivB64 === 'string' &&
    typeof candidate.ciphertextB64 === 'string' &&
    typeof candidate.updatedAt === 'number'
  )
}
