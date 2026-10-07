import { useState } from 'react'

/** Copies text, and says how to copy manually when the clipboard is blocked. */
export function CopyButton({
  text,
  label = 'Copy',
  className = 'btn btn-sm',
}: {
  text: string
  label?: string
  className?: string
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setStatus('copied')
          } catch {
            setStatus('failed')
          }
        }}
      >
        {status === 'copied' ? 'Copied' : label}
      </button>
      {status === 'failed' && (
        <span role="status" className="text-xs">
          Copy is unavailable. Select the text and copy it manually.
        </span>
      )}
    </>
  )
}
