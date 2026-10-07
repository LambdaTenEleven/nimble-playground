import { useId } from 'react'
import { LIMITS, kindNames } from '../domain'
import type { DecisionKind, Draft } from '../domain'
import { AnswerList } from './AnswerList'
import { Icon } from './Icon'
import { SegmentedControl } from './SegmentedControl'

const kinds = (['choice', 'noul', 'score'] as const).map((value) => ({
  value,
  label: kindNames[value],
}))

/** Input, question and answer definitions of one prompt. */
export function PromptEditor({
  draft,
  onChange,
  caseCount,
  onOpenCases,
  disabled,
}: {
  draft: Draft
  onChange: (draft: Draft) => void
  caseCount: number
  onOpenCases: () => void
  disabled: boolean
}) {
  const uid = useId()
  const changeKind = (kind: DecisionKind) =>
    onChange({
      ...draft,
      kind,
      options:
        kind !== 'noul' && draft.options.length < 2
          ? [
              { label: '', description: '' },
              { label: '', description: '' },
            ]
          : draft.options,
    })
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-7">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${uid}-input`} className="font-semibold">
            Input text
          </label>
          <a
            href="#cases"
            className="btn btn-ghost btn-xs"
            onClick={(e) => {
              e.preventDefault()
              onOpenCases()
            }}
          >
            {caseCount ? `Test ${caseCount} inputs` : 'Test more inputs'}
            <Icon name="arrow" size={14} />
          </a>
        </div>
        <textarea
          id={`${uid}-input`}
          className="textarea textarea-lg h-36 min-h-24 w-full resize-y text-base"
          placeholder="Text or context to evaluate"
          value={draft.state}
          maxLength={LIMITS.state}
          onChange={(e) => onChange({ ...draft, state: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${uid}-question`} className="font-semibold">
          Question
        </label>
        <textarea
          id={`${uid}-question`}
          className="textarea textarea-lg min-h-20 w-full resize-y text-base"
          placeholder="Question or decision instructions"
          value={draft.question}
          maxLength={LIMITS.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={`${uid}-format`} className="font-semibold">
            Answer as
          </span>
          <SegmentedControl
            label="Answer format"
            options={kinds}
            value={draft.kind}
            onChange={changeKind}
          />
        </div>
        {draft.kind === 'noul' ? (
          <p className="text-sm text-base-content/75">
            Returns the probability that the answer is yes, from 0 to 1.
          </p>
        ) : (
          <>
            {draft.kind === 'score' && (
              <p className="text-sm text-base-content/75">
                Ordered from lowest to highest, starting at 0. Drag to reorder.
              </p>
            )}
            <AnswerList
              kind={draft.kind}
              options={draft.options}
              onChange={(options) => onChange({ ...draft, options })}
            />
          </>
        )}
      </div>
    </fieldset>
  )
}
