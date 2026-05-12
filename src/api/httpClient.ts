import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'

export async function parseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function responseMessage(status: number): string {
  if (status === 401) return 'Unauthorized'
  if (status === 403) return 'Forbidden'
  if (status === 404) return 'Not found'
  if (status === 409) return 'Conflict'
  return `Request failed (${status})`
}

export function mapStatusToError(status: number, body: { error?: string } | null): AppError {
  const message = body?.error ?? responseMessage(status)
  if (status === 401) {
    if (message.toLowerCase().includes('credential')) {
      return new AppError(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid username or password. Passwords must be at least 8 characters. ' +
          'Use Register if you have not created an account on this server yet (the database is local to this machine).',
      )
    }
    return new AppError(ErrorCodes.AUTH_UNAUTHORIZED, message)
  }
  if (status === 403) return new AppError(ErrorCodes.AUTH_FORBIDDEN, message)
  if (status === 409) {
    if (message.includes('Encryption already')) {
      return new AppError(ErrorCodes.AUTH_CRYPTO_ALREADY_SET, message)
    }
    return new AppError(ErrorCodes.AUTH_USERNAME_TAKEN, message)
  }
  if (status >= 400 && status < 500) {
    const loginHint =
      /invalid username or password/i.test(message) && status === 400
        ? ' Username must be 3-32 characters (letters, digits, _, -); password at least 8 characters.'
        : ''
    return new AppError(ErrorCodes.VALIDATION_INVALID_NOTE, message + loginHint)
  }
  return new AppError(ErrorCodes.AUTH_NETWORK, message)
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch (cause) {
    throw new AppError(ErrorCodes.AUTH_NETWORK, 'Network error — is the API running?', cause)
  }
}
