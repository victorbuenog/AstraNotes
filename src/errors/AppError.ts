import { ErrorCodes, type ErrorCode } from './codes'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly cause?: unknown

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }

  static wrap(err: unknown, code: ErrorCode, message: string): AppError {
    if (err instanceof AppError) return err
    return new AppError(code, message, err)
  }
}

export function toUserMessage(err: unknown): { title: string; detail: string; code: ErrorCode } {
  if (err instanceof AppError) {
    return { title: 'Something went wrong', detail: err.message, code: err.code }
  }
  if (err instanceof Error) {
    return {
      title: 'Unexpected error',
      detail: err.message,
      code: ErrorCodes.UNKNOWN,
    }
  }
  return {
    title: 'Unexpected error',
    detail: String(err),
    code: ErrorCodes.UNKNOWN,
  }
}
