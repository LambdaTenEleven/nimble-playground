import { useState } from 'react'

/**
 * Editable prompt name, shown in the header. The name is committed when the field loses focus
 * or on Enter, so a half-typed name never clashes with another prompt's name.
 */
export function PromptTitle({
  name,
  onRename,
  saveError,
  notSaved,
  disabled,
}: {
  name: string
  /** Applies a trimmed, non-empty name, or returns why it cannot be used. */
  onRename: (name: string) => string | null
  /** Why the latest changes could not be saved, if they could not. */
  saveError: string | null
  /** Whether the library could not be written, e.g. because browser storage is unavailable. */
  notSaved: boolean
  disabled: boolean
}) {
  // The typed value, while it differs from the committed name.
  const [typed, setTyped] = useState<{ for: string; value: string } | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const value = typed?.for === name ? typed.value : name

  function commit() {
    const next = value.trim()
    if (!next || next === name) {
      setTyped(null)
      setNameError(null)
      return
    }
    const error = onRename(next)
    setNameError(error)
    if (!error) setTyped(null)
  }

  const error = nameError ?? saveError
  return (
    <>
      <input
        aria-label="Prompt name"
        className="input input-ghost input-sm min-w-0 px-2 text-[15px] font-semibold"
        // `size` keeps the field as wide as its text in every browser.
        size={Math.min(Math.max(value.length, 8), 48)}
        value={value}
        maxLength={100}
        placeholder="Untitled prompt"
        disabled={disabled}
        aria-invalid={!!nameError}
        aria-describedby={error ? 'save-error' : undefined}
        onChange={(e) => {
          setTyped({ for: name, value: e.target.value })
          setNameError(null)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setTyped(null)
            setNameError(null)
          }
        }}
      />
      {(saveError || notSaved) && !nameError && (
        <span className="badge badge-sm badge-soft badge-error whitespace-nowrap">Not saved</span>
      )}
      {error && (
        <span id="save-error" role="alert" className="truncate text-xs text-error">
          {error}
        </span>
      )}
    </>
  )
}
