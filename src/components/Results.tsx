import { kindNames, percent } from '../domain'
import type { DecisionResult } from '../domain'
import { Icon } from './Icon'

export function Results({
  result,
  busy,
  stale,
}: {
  result: DecisionResult | null
  busy: boolean
  stale: boolean
}) {
  return (
    <section
      aria-labelledby="result-title"
      aria-busy={busy}
      className="card min-w-0 self-start border border-base-300 bg-base-100 lg:sticky lg:top-5"
    >
      <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
        <h2 id="result-title" className="font-semibold">
          Decision result
        </h2>
        <span className="badge badge-sm">
          {busy ? 'Running' : result ? 'Complete' : 'Ready when you are'}
        </span>
      </div>
      {busy ? (
        <div
          className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center"
          role="status"
        >
          <span className="loading loading-spinner loading-lg" aria-hidden="true" />
          <p className="font-medium">Nimble is deciding…</p>
          <p className="text-sm text-base-content/65">Your input stays on this computer.</p>
        </div>
      ) : result ? (
        <div className="p-5">
          {stale && (
            <p role="status" className="mb-4 rounded-lg bg-base-200 p-3 text-xs leading-relaxed">
              The prompt or model has changed. This result belongs to the previous run.
            </p>
          )}
          <div aria-live="polite" className="py-3">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.13em] text-base-content/60 uppercase">
              {kindNames[result.kind]}
            </p>
            <h3 className="break-words text-4xl leading-tight font-semibold tracking-tight">
              {result.headline}
            </h3>
            <p className="mt-2 break-words text-sm text-base-content/70">{result.subtitle}</p>
          </div>
          <div className="mt-6 space-y-5">
            <h4 className="text-xs font-medium text-base-content/70">Answer probabilities</h4>
            {result.probabilities.map((row, index) => (
              <div key={row.label}>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words">
                    {result.kind === 'score' && (
                      <span className="mr-2 font-mono text-xs text-base-content/55">{index}</span>
                    )}
                    {row.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">
                    {percent(row.value)}
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label={`${row.label} probability`}
                  aria-valuenow={row.value * 100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={percent(row.value)}
                  className="h-2 overflow-hidden rounded-full bg-base-200"
                >
                  <div
                    className="h-full rounded-full bg-base-content/65"
                    style={{ width: `${row.value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-base-300 pt-5 text-xs">
            <div>
              <dt className="text-base-content/60">Round trip</dt>
              <dd className="mt-1 font-mono">
                {result.elapsedMs < 1000
                  ? `${Math.round(result.elapsedMs)} ms`
                  : `${(result.elapsedMs / 1000).toFixed(2)} s`}
              </dd>
            </div>
            <div>
              <dt className="text-base-content/60">Tokens · input / output</dt>
              <dd className="mt-1 font-mono">
                {result.inputTokens ?? '—'} / {result.outputTokens ?? '—'}
              </dd>
            </div>
          </dl>
          <details className="mt-5 border-t border-base-300 pt-4 text-xs">
            <summary className="cursor-pointer text-base-content/70">Inspect response JSON</summary>
            <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-base-200 p-3 text-[11px]">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          </details>
          <p className="mt-5 text-xs leading-relaxed text-base-content/60">
            Probabilities are model estimates, not guarantees. Scores use a zero-based scale.
          </p>
        </div>
      ) : (
        <div className="flex min-h-96 flex-col items-center justify-center px-7 py-10 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-base-300 bg-base-200">
            <Icon name="arrow" size={27} />
          </div>
          <h3 className="text-lg font-medium">From context to clarity.</h3>
          <p className="mt-3 max-w-60 text-sm leading-relaxed text-base-content/65">
            Add your input, ask a question, and run a decision to see the answer and its
            probabilities.
          </p>
          <div className="mt-8 w-full max-w-48 space-y-3" aria-hidden="true">
            {[80, 45, 25].map((width) => (
              <div key={width} className="h-1.5 rounded-full bg-base-200">
                <div className="h-1.5 rounded-full bg-base-300" style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
