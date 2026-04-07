import { useEffect, useState } from 'react'
import { Vault } from '../crypto/vault'
import { getVaultMeta, setVaultMeta } from '../storage/noteStore'
import { AppError } from '../errors/AppError'
import { ErrorCodes } from '../errors/codes'

type Mode = 'loading' | 'create' | 'unlock'

export function VaultScreen({
  vault,
  onReady,
}: {
  vault: Vault
  onReady: () => void
}) {
  const [mode, setMode] = useState<Mode>('loading')
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [unlockPass, setUnlockPass] = useState('')
  const [error, setError] = useState<{ msg: string; code: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const meta = await getVaultMeta()
        setMode(meta ? 'unlock' : 'create')
      } catch (e) {
        const msg = e instanceof AppError ? e.message : String(e)
        const code = e instanceof AppError ? e.code : ErrorCodes.STORAGE_OPEN_FAILED
        setError({ msg, code })
        setMode('create')
      }
    })()
  }, [])

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pass1.length < 8) {
      setError({ msg: 'Use at least 8 characters.', code: ErrorCodes.VALIDATION_INVALID_NOTE })
      return
    }
    if (pass1 !== pass2) {
      setError({ msg: 'Passphrases do not match.', code: ErrorCodes.VALIDATION_INVALID_NOTE })
      return
    }
    try {
      vault.lock()
      const meta = await vault.create(pass1)
      await setVaultMeta(meta)
      onReady()
    } catch (e) {
      const msg = e instanceof AppError ? e.message : String(e)
      const code = e instanceof AppError ? e.code : ErrorCodes.VAULT_INIT_FAILED
      setError({ msg, code })
    }
  }

  const submitUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const meta = await getVaultMeta()
      if (!meta) {
        setError({ msg: 'No vault found.', code: ErrorCodes.STORAGE_OPEN_FAILED })
        return
      }
      vault.lock()
      await vault.unlock(unlockPass, meta)
      onReady()
    } catch (e) {
      const msg = e instanceof AppError ? e.message : String(e)
      const code = e instanceof AppError ? e.code : ErrorCodes.VAULT_WRONG_PASSPHRASE
      setError({ msg, code })
    }
  }

  if (mode === 'loading') {
    return (
      <div className="vault-screen">
        <p className="vault-screen__muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="vault-screen">
      <div className="vault-card">
        <h1 className="vault-card__title">AstraNotes</h1>
        <p className="vault-card__lede">
          Your notes are encrypted on this device. Only your passphrase can decrypt them.
        </p>
        {error && (
          <div className="vault-card__error" role="alert">
            {error.msg}
            <span className="vault-card__code">Code: {error.code}</span>
          </div>
        )}
        {mode === 'create' ? (
          <form className="vault-form" onSubmit={submitCreate}>
            <label className="field">
              <span>Create passphrase</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pass1}
                onChange={(e) => setPass1(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label className="field">
              <span>Confirm passphrase</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="btn btn--primary vault-form__submit">
              Create encrypted vault
            </button>
          </form>
        ) : (
          <form className="vault-form" onSubmit={submitUnlock}>
            <label className="field">
              <span>Passphrase</span>
              <input
                type="password"
                autoComplete="current-password"
                value={unlockPass}
                onChange={(e) => setUnlockPass(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn btn--primary vault-form__submit">
              Unlock
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
