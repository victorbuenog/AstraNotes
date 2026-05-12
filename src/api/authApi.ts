import type { VaultMeta } from '../crypto/vault'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import { apiFetch, mapStatusToError, parseJson } from './httpClient'

export type MeResponse = {
  username: string
  encryptionMeta: VaultMeta | null
}

function isMeResponse(body: unknown): body is MeResponse {
  if (!body || typeof body !== 'object') return false
  return typeof (body as { username?: unknown }).username === 'string'
}

export async function getMe(): Promise<MeResponse | null> {
  const res = await apiFetch('/api/me')
  if (res.status === 401) return null
  const body = await parseJson<MeResponse | { error?: string }>(res)
  if (!res.ok) {
    throw mapStatusToError(res.status, body as { error?: string } | null)
  }
  if (!isMeResponse(body)) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Invalid response from server')
  }
  return body
}

export async function register(
  username: string,
  password: string,
  encryptionMeta: VaultMeta,
): Promise<MeResponse> {
  const res = await apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, encryptionMeta }),
  })
  const body = await parseJson<MeResponse | { error?: string }>(res)
  if (!res.ok) {
    throw mapStatusToError(res.status, body as { error?: string } | null)
  }
  if (!isMeResponse(body)) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Invalid response from server')
  }
  return body
}

export async function login(username: string, password: string): Promise<MeResponse> {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  const body = await parseJson<MeResponse | { error?: string }>(res)
  if (!res.ok) {
    throw mapStatusToError(res.status, body as { error?: string } | null)
  }
  if (!isMeResponse(body)) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Invalid response from server')
  }
  return body
}

export async function patchEncryptionMeta(encryptionMeta: VaultMeta): Promise<void> {
  const res = await apiFetch('/api/me/encryption-meta', {
    method: 'PATCH',
    body: JSON.stringify({ encryptionMeta }),
  })
  if (res.status === 401) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Not logged in')
  }
  if (!res.ok && res.status !== 204) {
    const body = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, body)
  }
}

export async function logout(): Promise<void> {
  const res = await apiFetch('/api/logout', { method: 'POST' })
  if (!res.ok && res.status !== 204) {
    const body = await parseJson<{ error?: string }>(res)
    throw mapStatusToError(res.status, body)
  }
}
