import { getMe, login, patchEncryptionMeta, register } from '../api/authApi'
import type { AuthUser } from '../context/AuthContext'
import type { Vault } from '../crypto/vault'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'

export async function registerAndBootstrap(
  vault: Vault,
  username: string,
  password: string,
): Promise<AuthUser> {
  vault.lock()
  const encryptionMeta = await vault.create(password)
  const result = await register(username, password, encryptionMeta)
  return { username: result.username }
}

export async function loginAndBootstrap(
  vault: Vault,
  username: string,
  password: string,
): Promise<AuthUser> {
  const result = await login(username, password)
  vault.lock()
  if (!result.encryptionMeta) {
    const encryptionMeta = await vault.create(password)
    await patchEncryptionMeta(encryptionMeta)
  } else {
    await vault.unlock(password, result.encryptionMeta)
  }
  return { username: result.username }
}

export async function resumeSessionAndUnlock(vault: Vault, password: string): Promise<void> {
  const me = await getMe()
  if (!me) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, 'Session expired. Log in again.')
  }
  if (!me.encryptionMeta) {
    const encryptionMeta = await vault.create(password)
    await patchEncryptionMeta(encryptionMeta)
    return
  }
  vault.lock()
  await vault.unlock(password, me.encryptionMeta)
}
