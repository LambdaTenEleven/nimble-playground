import { useEffect, useRef, useState, type ReactNode } from 'react'
import { REQUEST_LIMIT_BYTES } from '../domain'
import { Meter } from './Meter'

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`

/** Bottom bar of the editor: request size, then the run controls passed as children. */
export function RunBar({
  requestBytes,
  message,
  error,
  children,
}: {
  requestBytes: number
  /** Why running is unavailable, if it is. */
  message?: ReactNode
  error: string | null
  children: ReactNode
}) {
  return (
    <div className="run-bar @container">
      {error && (
        <p role="alert" className="mb-2 basis-full text-sm text-error">
          {error}
        </p>
      )}
      {message && (
        <span className="text-xs text-base-content/75 max-sm:order-first max-sm:basis-full">
          {message}
        </span>
      )}
      <RequestSizeLine bytes={requestBytes} />
      <RequestSizeRing bytes={requestBytes} />
      <div className="ml-auto flex min-w-0 items-center justify-end gap-2 max-sm:flex-1">
        {children}
      </div>
    </div>
  )
}

const sizeText = (bytes: number) => `${kb(bytes)} of ${kb(REQUEST_LIMIT_BYTES)}`

/** The request size as a labelled bar, for bars with room to spare. */
function RequestSizeLine({ bytes }: { bytes: number }) {
  const ratio = Math.min(1, bytes / REQUEST_LIMIT_BYTES)
  return (
    <div className="hidden shrink-0 items-center gap-2 text-xs whitespace-nowrap text-base-content/75 @xl:flex">
      <Meter
        value={ratio}
        label="Request size"
        tone={ratio > 0.9 ? 'error' : 'muted'}
        className="h-1 w-20 shrink-0"
      />
      <span>{sizeText(bytes)}</span>
    </div>
  )
}

/** A small ring that fills as the request grows; hover or tap it for the exact size. */
function RequestSizeRing({ bytes }: { bytes: number }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const ratio = Math.min(1, bytes / REQUEST_LIMIT_BYTES)
  const text = sizeText(bytes)
  const radius = 7
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    if (!pinned) return
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)
      )
        setPinned(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [pinned])

  return (
    <div
      ref={root}
      className="relative flex shrink-0 @xl:hidden"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="btn btn-ghost btn-circle btn-sm"
        aria-label={`Request size: ${text}`}
        aria-expanded={pinned}
        onClick={() => setPinned((p) => !p)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="-rotate-90">
          <circle
            cx="9"
            cy="9"
            r={radius}
            fill="none"
            strokeWidth="2.5"
            className="stroke-base-300"
          />
          <circle
            cx="9"
            cy="9"
            r={radius}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(ratio * circumference, 0.01)} ${circumference}`}
            className={ratio > 0.9 ? 'stroke-error' : 'stroke-base-content/50'}
          />
        </svg>
      </button>
      {(hovered || pinned) && (
        <div
          role="status"
          className="absolute bottom-full left-0 z-10 mb-2 rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs whitespace-nowrap shadow-md"
        >
          <div className="text-base-content/75">Request size</div>
          <div className={`font-medium ${ratio > 0.9 ? 'text-error' : ''}`}>{text}</div>
        </div>
      )}
    </div>
  )
}
