/** Appears once runs are picked for comparison, like a shop's compare bar. */
export function CompareTray({
  count,
  onClear,
  onOpen,
}: {
  count: number
  onClear: () => void
  onOpen: () => void
}) {
  if (!count) return null
  return (
    <div role="region" aria-label="Compare tray" className="alert bg-neutral text-neutral-content">
      <span className="flex-1 text-sm">
        {count === 1 ? 'Pick one more run to compare' : `${count} runs in compare`}
      </span>
      <button type="button" className="btn btn-ghost btn-xs text-neutral-content" onClick={onClear}>
        Clear
      </button>
      <button type="button" className="btn btn-sm" disabled={count < 2} onClick={onOpen}>
        Compare
      </button>
    </div>
  )
}
