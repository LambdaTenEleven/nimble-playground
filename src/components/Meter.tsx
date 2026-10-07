import { percent } from '../domain'

export type MeterTone = 'primary' | 'muted' | 'error'
const tones: Record<MeterTone, string> = {
  primary: 'bg-primary',
  muted: 'bg-base-content/30',
  error: 'bg-error',
}

/** A horizontal bar for a 0–1 value. `color` overrides the tone, e.g. for comparison series. */
export function Meter({
  value,
  label,
  tone = 'primary',
  color,
  className = 'h-2 w-full',
}: {
  value: number
  label: string
  tone?: MeterTone
  color?: string
  className?: string
}) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value * 1000) / 10}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={percent(value)}
      className={`overflow-hidden rounded-full bg-base-300 ${className}`}
    >
      <div
        className={`h-full rounded-full ${color ? '' : tones[tone]}`}
        style={{ width: `${value * 100}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  )
}
