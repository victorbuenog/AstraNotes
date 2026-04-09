import { useState } from 'react'
import * as api from '../api/client'
import type { Vault } from '../crypto/vault'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'

export function UnlockScreen({
  vault,
  onUnlocked,
  onLogout,
}: {
  vault: Vault
  onUnlocked: () => void
  onLogout: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ msg: string; code: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError({
        msg: 'Password must be at least 8 characters.',
        code: ErrorCodes.VALIDATION_INVALID_NOTE,
      })
      return
    }
    setBusy(true)
    try {
      const me = await api.getMe()
      if (!me) {
        setError({ msg: 'Session expired. Log in again.', code: ErrorCodes.AUTH_UNAUTHORIZED })
        return
      }
      if (!me.encryptionMeta) {
        const meta = await vault.create(password)
        await api.patchEncryptionMeta(meta)
      } else {
        vault.lock()
        await vault.unlock(password, me.encryptionMeta)
      }
      onUnlocked()
    } catch (e) {
      const msg = e instanceof AppError ? e.message : String(e)
      const code = e instanceof AppError ? e.code : ErrorCodes.UNKNOWN
      setError({ msg, code })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="vault-screen">
      <div className="vault-card">
        <h1 className="vault-card__title">Unlock notes</h1>
        <p className="vault-card__lede">
          Your session is still active (for example after refreshing the page), but the encryption key stays
          only in memory. Enter your password once to decrypt notes on this device. When you sign in from the
          log-in form, this step is skipped automatically.
        </p>
        {error && (
          <div className="vault-card__error" role="alert">
            {error.msg}
            <span className="vault-card__code">Code: {error.code}</span>
          </div>
        )}
        <form className="vault-form" onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button type="submit" className="btn btn--primary vault-form__submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Unlock'}
          </button>
          <button type="button" className="btn btn--ghost vault-form__submit" onClick={() => void onLogout()}>
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}
