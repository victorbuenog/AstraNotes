import { useState } from 'react'
import * as api from '../api/client'
import type { Vault } from '../crypto/vault'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'
import type { AuthUser } from '../context/AuthContext'

type Mode = 'login' | 'register'

export function AuthScreen({
  vault,
  onAuthed,
}: {
  vault: Vault
  onAuthed: (user: AuthUser, opts?: { skipVaultUnlock?: boolean }) => void
}) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<{ msg: string; code: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const u = username.trim()
    if (u.length < 3) {
      setError({ msg: 'Username must be at least 3 characters.', code: ErrorCodes.VALIDATION_INVALID_NOTE })
      return
    }
    if (password.length < 8) {
      setError({ msg: 'Password must be at least 8 characters.', code: ErrorCodes.VALIDATION_INVALID_NOTE })
      return
    }
    if (mode === 'register' && password !== password2) {
      setError({ msg: 'Passwords do not match.', code: ErrorCodes.VALIDATION_INVALID_NOTE })
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        vault.lock()
        const encryptionMeta = await vault.create(password)
        const result = await api.register(u, password, encryptionMeta)
        onAuthed({ username: result.username }, { skipVaultUnlock: true })
      } else {
        const result = await api.login(u, password)
        vault.lock()
        if (!result.encryptionMeta) {
          const meta = await vault.create(password)
          await api.patchEncryptionMeta(meta)
        } else {
          await vault.unlock(password, result.encryptionMeta)
        }
        onAuthed({ username: result.username }, { skipVaultUnlock: true })
      }
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
        <h1 className="vault-card__title">AstraNotes</h1>
        <p className="vault-card__lede">
          Sign in to sync encrypted notes. Passwords are hashed on the server; note contents are encrypted
          with your password (Web Crypto) before upload — the API only stores ciphertext.
        </p>
        {error && (
          <div className="vault-card__error" role="alert">
            {error.msg}
            <span className="vault-card__code">Code: {error.code}</span>
          </div>
        )}
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'login' ? 'auth-tabs__btn is-active' : 'auth-tabs__btn'}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
          >
            Log in
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'auth-tabs__btn is-active' : 'auth-tabs__btn'}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
          >
            Register
          </button>
        </div>
        <form className="vault-form" onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, numbers, underscores, and hyphens only"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          {mode === 'register' && (
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={8}
              />
            </label>
          )}
          <button type="submit" className="btn btn--primary vault-form__submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}
