import { confidence, points } from '../analysis'
import type { DecisionResult } from '../domain'
import { ConfidenceBadge } from './ConfidenceBadge'

/** The headline answer, how sure the model is, and the lead over the runner-up. */
export function ResultSummary({
  result,
  size = 'lg',
}: {
  result: DecisionResult
  size?: 'md' | 'lg'
}) {
  const { runnerUp, margin, level } = confidence(result.probabilities)
  return (
    <div aria-live="polite">
      <h3
        className={`break-words font-semibold leading-tight tracking-tight ${size === 'lg' ? 'text-4xl' : 'text-3xl'}`}
      >
        {result.headline}
      </h3>
      <p className="mt-1 text-sm text-base-content/70">{result.subtitle}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <ConfidenceBadge level={level} />
        {runnerUp && (
          <span className="text-base-content/75">
            +{points(margin)} pts over {runnerUp.label}
          </span>
        )}
      </div>
    </div>
  )
}
