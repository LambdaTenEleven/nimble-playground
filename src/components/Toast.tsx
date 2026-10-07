import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * A notification that dismisses itself after `duration`, with a bar showing the time left.
 * The timer pauses while the pointer is over the toast or focus is inside it.
 */
export function Toast({
  children,
  duration = 6000,
  onDismiss,
  dismissLabel = 'Dismiss notification',
}: {
  children: ReactNode
  duration?: number
  onDismiss: () => void
  dismissLabel?: string
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused
  const remaining = useRef(duration)
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = setTimeout(() => dismiss.current(), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [paused])

  return (
    <div
      className="alert relative overflow-hidden py-2 text-sm"
      role="status"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
    >
      {children}
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square"
        aria-label={dismissLabel}
        onClick={onDismiss}
      >
        <Icon name="close" size={13} />
      </button>
      <span
        aria-hidden="true"
        className="toast-timer motion-reduce:hidden"
        style={{
          animationDuration: `${duration}ms`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  )
}
