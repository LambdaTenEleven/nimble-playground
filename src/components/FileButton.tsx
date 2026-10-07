import { useRef } from 'react'
import type { ReactNode } from 'react'

/** A button that opens the file picker and hands over the chosen file. */
export function FileButton({
  accept,
  inputLabel,
  onFile,
  disabled,
  className = 'btn btn-sm',
  children,
}: {
  accept: string
  inputLabel: string
  onFile: (file: File) => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        className="hidden"
        aria-label={inputLabel}
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </>
  )
}
