import { Icon } from './Icon'

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const shortcut = (key: string) => `${mac ? '⌘' : 'Ctrl+'}${key}`

/** The primary action, which turns into Cancel while its run is in progress. */
export function RunButton({
  label,
  busy,
  disabled,
  onRun,
  onCancel,
  showShortcut = false,
  className = '',
}: {
  label: string
  busy: boolean
  disabled: boolean
  onRun: () => void
  onCancel: () => void
  showShortcut?: boolean
  className?: string
}) {
  return busy ? (
    <button type="button" className={`btn ${className}`} onClick={onCancel}>
      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
      Cancel
    </button>
  ) : (
    <button
      type="button"
      className={`btn btn-primary ${className}`}
      disabled={disabled}
      aria-keyshortcuts={showShortcut ? (mac ? 'Meta+Enter' : 'Control+Enter') : undefined}
      onClick={onRun}
    >
      <Icon name="play" size={14} />
      {label}
      {showShortcut && (
        <kbd
          aria-hidden="true"
          className="kbd kbd-xs border-0 bg-primary-content/15 text-primary-content max-sm:hidden"
        >
          {shortcut('↵')}
        </kbd>
      )}
    </button>
  )
}
