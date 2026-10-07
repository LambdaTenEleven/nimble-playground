import { confidence, diffDrafts, summarizeChanges } from '../analysis'
import { percent } from '../domain'
import type { Run, RunHistory as History } from '../useRunHistory'

/** Runs of this session, newest first, each with what changed and a compare toggle. */
export function RunHistory({
  history,
  currentKey,
  currentRun,
}: {
  history: History
  currentKey: string
  currentRun: Run | null
}) {
  if (!history.runs.length)
    return <p className="px-2 text-sm text-base-content/70">Runs you make appear here.</p>
  return (
    <ol className="space-y-0.5">
      {history.runs.map((run) => {
        const previous = history.previousOf(run)
        const { top } = confidence(run.result.probabilities)
        const compared = history.isCompared(run.n)
        const change = previous
          ? summarizeChanges(diffDrafts(previous.result.draft, run.result.draft))
          : 'First run'
        return (
          <li
            key={run.n}
            className={`flex items-center gap-3 rounded-field px-3 py-2 ${run === currentRun ? 'bg-base-200' : ''}`}
          >
            <span className="w-6 font-mono text-xs text-base-content/70">{run.n}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {top.label} · {percent(top.value)}
              </span>
              <span className="block truncate text-xs text-base-content/70">
                {run.promptKey !== currentKey && `${run.promptName} · `}
                {change}
              </span>
            </span>
            {run === currentRun && (
              <span className="badge badge-soft badge-primary badge-xs">Current</span>
            )}
            <button
              type="button"
              className={`btn btn-xs ${compared ? 'btn-soft btn-primary' : ''}`}
              aria-pressed={compared}
              aria-label={`${compared ? 'Remove' : 'Add'} run ${run.n} ${compared ? 'from' : 'to'} compare`}
              disabled={!compared && !history.canCompareMore}
              onClick={() => history.toggleCompare(run.n)}
            >
              {compared ? '✓ Comparing' : '+ Compare'}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
