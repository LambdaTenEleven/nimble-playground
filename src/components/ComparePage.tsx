import { diffDrafts, points } from '../analysis'
import type { Change } from '../analysis'
import { percent } from '../domain'
import type { Run, RunHistory } from '../useRunHistory'
import { Icon } from './Icon'
import { Meter } from './Meter'
import { PointChange } from './PointChange'
import { ResultSummary } from './ResultSummary'

/** Series colors; they differ in lightness as well as hue. */
const SERIES = ['#B5540E', 'var(--color-primary)', '#6B4FBB', '#0F7B76']

/** Side-by-side view of the runs picked from history. */
export function ComparePage({ history }: { history: RunHistory }) {
  const runs = history.compared
  const addable = history.runs.filter((run) => !history.isCompared(run.n))
  const labels = [...new Set(runs.flatMap((run) => run.result.probabilities.map((p) => p.label)))]
  const [first] = runs
  return (
    <div className="compare-page">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-base-content/75">Comparing</span>
        {runs.map((run, index) => (
          <span key={run.n} className="badge badge-outline gap-1.5 py-3 pr-1">
            <span className="size-2.5 rounded-xs" style={{ background: SERIES[index] }} />
            Run {run.n}
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              aria-label={`Remove run ${run.n}`}
              onClick={() => history.toggleCompare(run.n)}
            >
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        {history.canCompareMore && addable.length > 0 && (
          <select
            aria-label="Add run"
            className="select select-sm w-auto"
            value=""
            onChange={(e) => history.toggleCompare(Number(e.target.value))}
          >
            <option value="">+ Add run</option>
            {addable.map((run) => (
              <option key={run.n} value={run.n}>
                Run {run.n} · {run.promptName}
              </option>
            ))}
          </select>
        )}
      </div>

      {runs.length < 2 ? (
        <p className="rounded-box bg-base-100 p-6 text-base-content/75">
          Pick at least two runs with <strong>+ Compare</strong> in the history to compare them.
        </p>
      ) : (
        <>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}
          >
            {runs.map((run, index) => (
              <section
                key={run.n}
                aria-label={`Run ${run.n}`}
                className="rounded-box border border-t-4 border-base-300 bg-base-100 p-5"
                style={{ borderTopColor: SERIES[index] }}
              >
                <div className="mb-2 flex justify-between gap-2 text-xs text-base-content/75">
                  <span className="truncate">
                    Run {run.n} · {run.promptName}
                  </span>
                  <span className="font-mono">{run.result.model}</span>
                </div>
                <ResultSummary result={run.result} size="md" />
              </section>
            ))}
          </div>

          <section aria-labelledby="compare-probabilities" className="compare-card">
            <h2 id="compare-probabilities" className="font-semibold">
              Probabilities
            </h2>
            {labels.map((label) => (
              <div key={label} className="compare-row">
                <span className="font-medium break-words">{label}</span>
                <div className="space-y-1">
                  {runs.map((run, index) => {
                    const row = run.result.probabilities.find((p) => p.label === label)
                    return (
                      <div key={run.n} className="flex items-center gap-2">
                        <Meter
                          value={row?.value ?? 0}
                          label={`Run ${run.n}: ${label}`}
                          color={SERIES[index]}
                        />
                        <span className="w-12 text-right font-mono text-xs">
                          {row ? percent(row.value) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {runs.length === 2 && <Delta label={label} runs={runs} />}
              </div>
            ))}
          </section>

          <section aria-labelledby="compare-changes" className="compare-card">
            <h2 id="compare-changes" className="font-semibold">
              What changed in the prompt
            </h2>
            {runs.slice(1).map((run) => {
              const changes: Change[] = diffDrafts(first.result.draft, run.result.draft)
              if (first.result.model !== run.result.model)
                changes.push({
                  field: 'Model',
                  before: first.result.model,
                  after: run.result.model,
                })
              return (
                <div key={run.n} className="space-y-2">
                  {runs.length > 2 && (
                    <h3 className="text-sm font-medium">
                      Run {first.n} → Run {run.n}
                    </h3>
                  )}
                  {changes.length ? (
                    <dl className="compare-diff">
                      {changes.map((change) => (
                        <div key={change.field} className="contents">
                          <dt className="text-base-content/75">{change.field}</dt>
                          <dd className="space-y-1">
                            {change.before !== null && (
                              <del className="block rounded-field bg-error/10 px-2 py-0.5 break-words text-error">
                                {change.before || '(empty)'}
                              </del>
                            )}
                            {change.after !== null && (
                              <ins className="block rounded-field bg-success/10 px-2 py-0.5 break-words text-success no-underline">
                                {change.after || '(empty)'}
                              </ins>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-base-content/75">
                      Same prompt and model. Differences come from the model itself.
                    </p>
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}

function Delta({ label, runs }: { label: string; runs: Run[] }) {
  const [before, after] = runs.map((run) => run.result.probabilities.find((p) => p.label === label))
  if (!after) return <span className="text-right text-xs text-base-content/70">Removed</span>
  if (!before)
    return (
      <span className="text-right">
        <PointChange value={null} />
      </span>
    )
  return (
    <span className="text-right">
      <PointChange value={points(after.value) - points(before.value)} unit=" pts" />
    </span>
  )
}
