import { probabilityChanges } from '../analysis'
import { answerLabels } from '../domain'
import type { Draft } from '../domain'
import type { Run, RunHistory as History } from '../useRunHistory'
import { CompareTray } from './CompareTray'
import { CopyButton } from './CopyButton'
import { ProbabilityBars } from './ProbabilityBars'
import { ResultSummary } from './ResultSummary'
import { RunHistory } from './RunHistory'

const seconds = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`)

/** The latest result of the open prompt, plus the session's run history. */
export function ResultPanel({
  draft,
  model,
  current,
  previous,
  busy,
  history,
  currentKey,
  onOpenCompare,
}: {
  draft: Draft
  model: string
  current: Run | null
  previous: Run | null
  busy: boolean
  history: History
  currentKey: string
  onOpenCompare: () => void
}) {
  const result = current?.result
  const stale =
    !!result && (JSON.stringify(result.draft) !== JSON.stringify(draft) || result.model !== model)
  return (
    <aside aria-label="Results" className="result-panel">
      <section aria-label="Result" className="result-section" aria-busy={busy}>
        <div className="mb-3 flex justify-between gap-3 text-xs text-base-content/70">
          <span>
            {current ? `Run ${current.n} · ${seconds(current.result.elapsedMs)}` : 'Result'}
          </span>
          {current && previous && <span>Change vs. run {previous.n}</span>}
        </div>
        {busy ? (
          <p role="status" className="flex items-center gap-3 py-6 text-sm">
            <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            Running decision…
          </p>
        ) : result ? (
          <div className="space-y-6">
            {stale && (
              <p role="status" className="alert alert-soft alert-warning py-2 text-xs">
                The prompt or model changed. This result belongs to the previous run.
              </p>
            )}
            <ResultSummary result={result} />
            <ProbabilityBars
              probabilities={result.probabilities}
              changes={
                previous
                  ? probabilityChanges(result.probabilities, previous.result.probabilities)
                  : undefined
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3 text-xs text-base-content/70">
              <span>
                {result.inputTokens ?? '—'} in · {result.outputTokens ?? '—'} out tokens
              </span>
              <span className="font-mono">{result.model}</span>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-primary">View JSON</summary>
              <div className="mt-2 flex justify-end">
                <CopyButton
                  text={JSON.stringify(result.raw, null, 2)}
                  label="Copy JSON"
                  className="btn btn-xs"
                />
              </div>
              <pre
                tabIndex={0}
                aria-label="Response JSON"
                className="mt-2 overflow-auto rounded-box bg-base-200 p-3 font-mono leading-relaxed"
              >
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-base-content/75">Run a decision to see probabilities.</p>
            <ProbabilityBars
              empty
              probabilities={answerLabels(draft).map((label) => ({ label, value: 0 }))}
            />
          </div>
        )}
      </section>
      <section aria-label="History" className="history-section">
        <div className="mb-2 flex items-baseline justify-between px-2">
          <h2 className="font-semibold">History</h2>
          {history.runs.length > 0 && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={history.clear}>
              Clear
            </button>
          )}
        </div>
        <RunHistory history={history} currentKey={currentKey} currentRun={current} />
        <div className="sticky bottom-0 mt-3">
          <CompareTray
            count={history.compared.length}
            onClear={history.clearCompare}
            onOpen={onOpenCompare}
          />
        </div>
      </section>
    </aside>
  )
}
