/** A change in probability points: ▲ 8, ▼ 3, ±0, or "New" for an answer that did not exist. */
export function PointChange({ value, unit = '' }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="text-xs text-info">New</span>
  const tone = value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-base-content/70'
  const text = value === 0 ? '±0' : `${value > 0 ? '▲' : '▼'} ${Math.abs(value)}${unit}`
  return (
    <span className={`font-mono text-xs ${tone}`} title={`${value} points`}>
      {text}
    </span>
  )
}
