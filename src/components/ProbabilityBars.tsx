import { confidence } from '../analysis'
import { percent } from '../domain'
import type { Probability } from '../domain'
import { Meter } from './Meter'
import { PointChange } from './PointChange'
import type { MeterTone } from './Meter'

/** Probabilities in answer order; the leading answer is emphasized. */
export function ProbabilityBars({
  probabilities,
  changes,
  leaderTone = 'primary',
  empty = false,
}: {
  probabilities: Probability[]
  /** Points gained or lost per answer since the previous run. */
  changes?: (number | null)[]
  leaderTone?: MeterTone
  /** Show the answers with empty bars before the first run. */
  empty?: boolean
}) {
  const leader = empty || !probabilities.length ? null : confidence(probabilities).top.label
  return (
    <ul className="space-y-3.5">
      {probabilities.map((row, index) => (
        <li key={`${row.label}-${index}`}>
          <div className="mb-1.5 flex items-baseline gap-2 text-sm">
            <span
              className={`min-w-0 flex-1 break-words ${row.label === leader ? 'font-semibold' : ''}`}
            >
              {row.label || <span className="text-base-content/60">Unnamed answer</span>}
            </span>
            {changes && <PointChange value={changes[index]} />}
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums">
              {empty ? '—' : percent(row.value)}
            </span>
          </div>
          <Meter
            value={empty ? 0 : row.value}
            label={`${row.label} probability`}
            tone={row.label === leader ? leaderTone : 'muted'}
          />
        </li>
      ))}
    </ul>
  )
}
