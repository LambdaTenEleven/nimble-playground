import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Top bar: library toggle, back button on pages outside the prompt, brand, page breadcrumb,
 * page tabs, and a setup warning when needed.
 */
export function AppHeader({
  children,
  tabs,
  libraryOpen,
  onToggleLibrary,
  back,
  onSettings,
  warning,
  onWarning,
  onHome,
}: {
  children: ReactNode
  /** Navigation between the open prompt's pages; on phones it gets a row of its own. */
  tabs?: ReactNode
  libraryOpen: boolean
  onToggleLibrary: () => void
  /** Where the back button leads, on pages that leave the open prompt. */
  back: { label: string; onBack: () => void } | null
  /** Opens Settings from the header on screens where the library is collapsed. */
  onSettings: (() => void) | null
  warning: string | null
  onWarning: () => void
  onHome: () => void
}) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square lg:hidden"
        aria-label="Prompt library"
        aria-expanded={libraryOpen}
        onClick={onToggleLibrary}
      >
        <Icon name="menu" size={18} />
      </button>
      {back && (
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label={back.label}
          title={`${back.label} (Esc)`}
          onClick={back.onBack}
        >
          <Icon name="back" size={18} />
        </button>
      )}
      <a
        href="#playground"
        onClick={onHome}
        className="flex items-center gap-2 font-semibold"
        aria-label="Nimble Playground home"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="text-primary"
        >
          <path d="M4 18V8l8 10V6" />
          <circle cx="18.5" cy="7" r="2.5" />
        </svg>
        <span className="max-sm:sr-only">Nimble</span>
      </a>
      <span className="text-base-content/40" aria-hidden="true">
        /
      </span>
      <div className="flex min-w-0 items-center gap-2 max-sm:flex-1">{children}</div>
      {tabs && <div className="header-tabs">{tabs}</div>}
      <div className="flex-1 max-sm:hidden" />
      {warning && (
        <button type="button" className="btn btn-sm btn-soft btn-warning" onClick={onWarning}>
          <Icon name="alert" size={14} />
          <span className="max-sm:sr-only">{warning}</span>
        </button>
      )}
      {onSettings && (
        <a
          href="#settings"
          className="btn btn-ghost btn-sm btn-square lg:hidden"
          aria-label="Open settings"
          onClick={onSettings}
        >
          <Icon name="settings" size={18} />
        </a>
      )}
    </header>
  )
}
