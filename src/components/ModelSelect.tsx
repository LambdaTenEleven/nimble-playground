import type { Connection } from '../ollama'

/** Model picker that also shows whether the model is loaded and how much memory it uses. */
export function ModelSelect({
  connection,
  value,
  onChange,
  disabled,
}: {
  connection: Connection | null
  value: string
  onChange: (model: string) => void
  disabled: boolean
}) {
  const models = connection?.models ?? []
  const running = connection?.running.find((m) => m.name === value)
  const status = !models.length
    ? { dot: 'status-warning', text: connection ? 'not installed' : 'unavailable' }
    : running
      ? { dot: 'status-success', text: `loaded · ${(running.sizeVram / 1024 ** 3).toFixed(1)} GB` }
      : { dot: 'status-neutral', text: 'not loaded' }
  return (
    <label className="select select-sm w-auto max-w-full min-w-0" title={status.text}>
      <span className={`status ${status.dot}`} aria-hidden="true" />
      <select
        aria-label="Model"
        className="ms-0 min-w-0 ps-1 font-mono text-xs"
        value={value}
        disabled={disabled || !models.length}
        onChange={(e) => onChange(e.target.value)}
      >
        {models.length ? (
          models.map((m) => <option key={m}>{m}</option>)
        ) : (
          <option value="">nimble</option>
        )}
      </select>
      <span className="label whitespace-nowrap text-xs max-sm:sr-only @max-lg:sr-only">
        {status.text}
      </span>
    </label>
  )
}
