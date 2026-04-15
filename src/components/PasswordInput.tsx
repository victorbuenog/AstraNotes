import { useId, useState } from 'react'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  id?: string
  required?: boolean
  minLength?: number
}

/** When `concealed` is true, password is masked — show open eye (action: reveal). When false, show slashed eye (action: hide). */
function EyeIcon({ concealed }: { concealed: boolean }) {
  if (concealed) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/** Password field with optional visibility toggle (eye icon). */
export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  id: idProp,
  required = true,
  minLength = 8,
}: Props) {
  const rid = useId()
  const id = idProp ?? `password-${rid}`
  const [visible, setVisible] = useState(false)

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="field__password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          spellCheck={false}
        />
        <button
          type="button"
          className="field__toggle-pw"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <EyeIcon concealed={!visible} />
        </button>
      </div>
    </label>
  )
}
