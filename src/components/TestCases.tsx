import { useState } from 'react'
import type { ReactNode } from 'react'
import { closeCallHint, confidence } from '../analysis'
import { LIMITS, answerLabels, kindNames, percent } from '../domain'
import type { DecisionResult, Draft, TestCase } from '../domain'
import { ConfidenceBadge } from './ConfidenceBadge'
import { Meter } from './Meter'
import { Modal } from './Modal'
import { ProbabilityBars } from './ProbabilityBars'
import { SegmentedControl } from './SegmentedControl'

export type CaseOutcome = { result?: DecisionResult; error?: string }
type Filter = 'all' | 'mismatch' | 'close'

/** The draft a case runs with: the prompt's question and answers, the case's input. */
export const caseDraft = (draft: Draft, testCase: TestCase): Draft => ({
  ...draft,
  state: testCase.input,
})

function evaluate(draft: Draft, testCase: TestCase, outcome: CaseOutcome | undefined) {
  const result = outcome?.result
  if (!result) return { result: undefined, stale: false, top: null, match: null, close: false }
  const { top, level } = confidence(result.probabilities)
  return {
    result,
    stale: JSON.stringify(result.draft) !== JSON.stringify(caseDraft(draft, testCase)),
    top,
    match: testCase.expected ? top.label === testCase.expected : null,
    close: level === 'Close call',
  }
}

/** One prompt run against many inputs, with expected answers and a summary. */
export function TestCases({
  draft,
  cases,
  onCases,
  outcomes,
  pendingKey,
  runControls,
  onRunCase,
  onEditPrompt,
  disabled,
}: {
  draft: Draft
  cases: TestCase[]
  onCases: (cases: TestCase[]) => void
  outcomes: Record<string, CaseOutcome>
  /** Whether a case is running or queued. */
  pendingKey: (id: string) => boolean
  /** Model picker and Run all / Cancel. */
  runControls: ReactNode
  onRunCase: (testCase: TestCase) => void
  onEditPrompt: () => void
  disabled: boolean
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(cases[0]?.id ?? null)
  const [pasting, setPasting] = useState(false)
  const rows = cases.map((testCase, index) => ({
    testCase,
    index,
    ...evaluate(draft, testCase, outcomes[testCase.id]),
  }))
  const checked = rows.filter((row) => row.match !== null && !row.stale)
  const mismatches = rows.filter((row) => row.match === false && !row.stale)
  const closeCalls = rows.filter((row) => row.close && !row.stale)
  const totalMs = rows.reduce((sum, row) => sum + (row.stale ? 0 : (row.result?.elapsedMs ?? 0)), 0)
  const visible = filter === 'mismatch' ? mismatches : filter === 'close' ? closeCalls : rows
  const selected = rows.find((row) => row.testCase.id === selectedId) ?? null
  const full = cases.length >= LIMITS.cases

  function add(inputs: string[]) {
    const added = inputs
      .slice(0, LIMITS.cases - cases.length)
      .map((input) => ({ id: crypto.randomUUID(), input, expected: '' }))
    if (!added.length) return
    onCases([...cases, ...added])
    setSelectedId(added[0].id)
  }
  const update = (id: string, patch: Partial<TestCase>) =>
    onCases(cases.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  return (
    <div className="cases-page">
      <main className="cases-main">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-64 flex-1">
            <p className="text-xs text-base-content/75">
              {kindNames[draft.kind]}
              {draft.kind !== 'noul' &&
                ` · ${answerLabels(draft).filter(Boolean).join(', ')}`} ·{' '}
              <button type="button" className="link link-primary" onClick={onEditPrompt}>
                Edit prompt
              </button>
            </p>
            <h2 className="mt-1 text-xl font-semibold">{draft.question || 'No question yet'}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">{runControls}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Match expected">
            {checked.length ? (
              <>
                {checked.length - mismatches.length}
                <span className="text-base text-base-content/70"> / {checked.length}</span>
              </>
            ) : (
              '—'
            )}
          </SummaryCard>
          <SummaryCard label="Close calls">{closeCalls.length}</SummaryCard>
          <SummaryCard label="Total time">
            {totalMs ? `${(totalMs / 1000).toFixed(1)} s` : '—'}
          </SummaryCard>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<Filter>
            label="Show cases"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All · ${rows.length}` },
              { value: 'mismatch', label: `Mismatches · ${mismatches.length}` },
              { value: 'close', label: `Close calls · ${closeCalls.length}` },
            ]}
          />
          <span className="flex-1" />
          <button
            type="button"
            className="btn btn-ghost btn-sm text-primary"
            disabled={disabled || full}
            onClick={() => add([''])}
          >
            + Add case
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-primary"
            disabled={disabled || full}
            onClick={() => setPasting(true)}
          >
            Paste many
          </button>
        </div>

        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm min-w-[720px]">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>Input</th>
                <th className="w-28">Expected</th>
                <th className="w-56">Nimble says</th>
                <th className="w-28">Confidence</th>
                <th className="w-10">
                  <span className="sr-only">Match</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.testCase.id}
                  className={`${row.testCase.id === selectedId ? 'bg-primary/5' : ''} ${row.stale ? 'opacity-60' : ''}`}
                >
                  <td className="font-mono text-base-content/70">{row.index + 1}</td>
                  <td className="max-w-0">
                    <button
                      type="button"
                      className="block w-full truncate text-left hover:underline"
                      aria-label={`Open case ${row.index + 1}`}
                      onClick={() => setSelectedId(row.testCase.id)}
                    >
                      {row.testCase.input || (
                        <span className="text-base-content/60">Empty input</span>
                      )}
                    </button>
                  </td>
                  <td>
                    {row.testCase.expected || <span className="text-base-content/60">—</span>}
                  </td>
                  <td>
                    {pendingKey(row.testCase.id) ? (
                      <span className="loading loading-dots loading-sm" aria-label="Running" />
                    ) : row.top ? (
                      <div className="flex items-center gap-2">
                        <span className="w-20 truncate font-medium">{row.top.label}</span>
                        <Meter
                          value={row.top.value}
                          label={`${row.top.label} probability`}
                          tone={row.match === false ? 'error' : 'primary'}
                          className="h-1.5 flex-1"
                        />
                        <span className="w-10 text-right font-mono text-xs">
                          {percent(row.top.value)}
                        </span>
                      </div>
                    ) : outcomes[row.testCase.id]?.error ? (
                      <span className="text-xs text-error">Failed</span>
                    ) : (
                      <span className="text-base-content/60">Not run</span>
                    )}
                  </td>
                  <td>
                    {row.result && (
                      <ConfidenceBadge level={confidence(row.result.probabilities).level} />
                    )}
                  </td>
                  <td className="text-center font-semibold">
                    {row.match === true && (
                      <span className="text-success" aria-label="Matches expected">
                        ✓
                      </span>
                    )}
                    {row.match === false && (
                      <span className="text-error" aria-label="Does not match expected">
                        ✕
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-base-content/70">
                    {rows.length ? 'No cases match this filter.' : 'Add a case to start testing.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <CaseDetail
          key={selected.testCase.id}
          draft={draft}
          number={selected.index + 1}
          testCase={selected.testCase}
          outcome={outcomes[selected.testCase.id]}
          stale={selected.stale}
          match={selected.match}
          running={pendingKey(selected.testCase.id)}
          disabled={disabled}
          onChange={(patch) => update(selected.testCase.id, patch)}
          onRun={() => onRunCase(selected.testCase)}
          onDelete={() => {
            onCases(cases.filter((c) => c.id !== selected.testCase.id))
            setSelectedId(null)
          }}
        />
      )}
      {pasting && (
        <PasteCases
          onClose={() => setPasting(false)}
          onAdd={(inputs) => {
            add(inputs)
            setPasting(false)
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-xs text-base-content/75">{label}</div>
      <div className="font-mono text-2xl font-semibold">{children}</div>
    </div>
  )
}

function CaseDetail({
  draft,
  number,
  testCase,
  outcome,
  stale,
  match,
  running,
  disabled,
  onChange,
  onRun,
  onDelete,
}: {
  draft: Draft
  number: number
  testCase: TestCase
  outcome: CaseOutcome | undefined
  stale: boolean
  match: boolean | null
  running: boolean
  disabled: boolean
  onChange: (patch: Partial<TestCase>) => void
  onRun: () => void
  onDelete: () => void
}) {
  const labels = answerLabels(draft).filter(Boolean)
  const hint = outcome?.result && !stale ? closeCallHint(outcome.result.probabilities) : null
  return (
    <aside aria-label={`Case ${number}`} className="cases-detail">
      <div className="flex items-center justify-between text-xs">
        <span className="text-base-content/75">Case {number}</span>
        {match === false && !stale && <span className="font-medium text-error">Mismatch</span>}
        {stale && <span className="text-base-content/75">Outdated result</span>}
      </div>
      <fieldset disabled={disabled} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Input</span>
          <textarea
            className="textarea h-32 w-full resize-y"
            value={testCase.input}
            maxLength={LIMITS.state}
            onChange={(e) => onChange({ input: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Expected answer</span>
          <select
            className="select select-sm w-full"
            value={testCase.expected}
            onChange={(e) => onChange({ expected: e.target.value })}
          >
            <option value="">Not set</option>
            {testCase.expected && !labels.includes(testCase.expected) && (
              <option value={testCase.expected}>{testCase.expected} (removed answer)</option>
            )}
            {labels.map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </label>
      </fieldset>
      {outcome?.error && (
        <p role="alert" className="text-sm text-error">
          {outcome.error}
        </p>
      )}
      {outcome?.result && (
        <div className={stale ? 'opacity-60' : ''}>
          <ProbabilityBars
            probabilities={outcome.result.probabilities}
            leaderTone={match === false ? 'error' : 'primary'}
          />
        </div>
      )}
      {hint && <p className="rounded-box bg-base-200 p-3 text-sm">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" disabled={disabled || running} onClick={onRun}>
          {running ? 'Running…' : 'Run this case'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm text-error"
          disabled={disabled}
          onClick={onDelete}
        >
          Delete case
        </button>
      </div>
    </aside>
  )
}

function PasteCases({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (inputs: string[]) => void
}) {
  const [text, setText] = useState('')
  const inputs = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return (
    <Modal title="Paste test cases" onClose={onClose}>
      <label htmlFor="paste-cases" className="mb-2 block text-sm">
        One input per line.
      </label>
      <textarea
        id="paste-cases"
        className="textarea h-52 w-full"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="modal-action">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!inputs.length}
          onClick={() => onAdd(inputs)}
        >
          Add {inputs.length || ''} case{inputs.length === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  )
}
