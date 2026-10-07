import type { ConfidenceLevel } from '../analysis'

const variants: Record<ConfidenceLevel, string> = {
  Decisive: 'badge-primary',
  Leaning: '',
  'Close call': 'badge-warning',
}

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={`badge badge-soft badge-sm whitespace-nowrap ${variants[level]}`}
      title="Gap between the top two answers: 50+ pts decisive, 20+ leaning, otherwise a close call."
    >
      {level}
    </span>
  )
}
