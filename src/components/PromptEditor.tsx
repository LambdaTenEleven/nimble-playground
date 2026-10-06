import { LIMITS, kindNames } from '../domain'
import type { Draft, DecisionKind, KeepAlive } from '../domain'
import { Icon } from './Icon'

type Props = {
  draft: Draft
  onChange: (draft: Draft) => void
  name: string
  dirty: boolean
  model: string
  models: string[]
  onModel: (model: string) => void
  keepAlive: KeepAlive
  onKeepAlive: (value: KeepAlive) => void
  busy: boolean
  unloading: boolean
  ready: boolean
  onRun: () => void
  onCancel: () => void
  onSave: () => void
  error: string | null
}

export function PromptEditor({
  draft,
  onChange,
  name,
  dirty,
  model,
  models,
  onModel,
  keepAlive,
  onKeepAlive,
  busy,
  unloading,
  ready,
  onRun,
  onCancel,
  onSave,
  error,
}: Props) {
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
    <section
      aria-labelledby="editor-title"
      className="card min-w-0 border border-base-300 bg-base-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-base-content/60 uppercase">
            Prompt editor
          </p>
          <h2 id="editor-title" className="break-words text-base font-semibold">
            {name}
            {dirty && (
              <span className="ml-2 inline-block text-xs font-normal text-base-content/60">
                Unsaved edits
              </span>
            )}
          </h2>
        </div>
        <button type="button" className="btn btn-sm" onClick={onSave} disabled={busy || unloading}>
          <Icon name="save" size={15} />
          Save
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onRun()
        }}
        className="p-5 sm:p-6"
      >
        <fieldset disabled={busy || unloading} className="min-w-0 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="input-text" className="text-sm font-semibold">
                Input text
              </label>
              <span className="text-xs tabular-nums text-base-content/60">
                {draft.state.length.toLocaleString()} characters
              </span>
            </div>
            <textarea
              id="input-text"
              className="textarea min-h-32 w-full resize-y bg-base-100 text-sm"
              placeholder="Paste the text or situation you want Nimble to evaluate…"
              value={draft.state}
              maxLength={LIMITS.state}
              onChange={(e) => onChange({ ...draft, state: e.target.value })}
            />
            <p className="mt-1 text-xs text-base-content/65">
              The context Nimble will use to make its decision.
            </p>
          </div>
          <div>
            <label htmlFor="question" className="mb-2 block text-sm font-semibold">
              Question
            </label>
            <textarea
              id="question"
              className="textarea min-h-20 w-full resize-y text-sm"
              placeholder="What should Nimble decide?"
              value={draft.question}
              maxLength={LIMITS.question}
              onChange={(e) => onChange({ ...draft, question: e.target.value })}
            />
          </div>
          <fieldset className="fieldset gap-2 p-0">
            <legend className="fieldset-legend pt-0 text-sm">Answer format</legend>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Answer format">
              {(['choice', 'noul', 'score'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`btn min-w-0 px-1 text-xs sm:text-sm ${draft.kind === kind ? 'btn-active' : ''}`}
                  aria-pressed={draft.kind === kind}
                  onClick={() => changeKind(kind)}
                >
                  {kindNames[kind]}
                </button>
              ))}
            </div>
            <p className="text-xs text-base-content/65">
              {draft.kind === 'choice'
                ? 'Pick the best match from your answers.'
                : draft.kind === 'noul'
                  ? 'Estimate the probability that the answer is yes.'
                  : 'Estimate a score along an ordered scale, starting at zero.'}
            </p>
          </fieldset>
          {draft.kind !== 'noul' && (
            <fieldset className="fieldset min-w-0 gap-3 p-0">
              <legend className="fieldset-legend pt-0 text-sm">
                {draft.kind === 'score' ? 'Scale · lowest to highest' : 'Possible answers'}
              </legend>
              <div className="space-y-3">
                {draft.options.map((option, index) => (
                  <div key={index} className="flex min-w-0 items-start gap-2">
                    <span className="mt-9 w-5 shrink-0 text-center font-mono text-xs text-base-content/55">
                      {draft.kind === 'score' ? index : String.fromCharCode(65 + index)}
                    </span>
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
                      <div>
                        <label
                          htmlFor={`answer-${index}`}
                          className="mb-1.5 block text-[11px] text-base-content/70"
                        >
                          Name <span className="sr-only">for answer {index + 1}</span>
                        </label>
                        <input
                          id={`answer-${index}`}
                          aria-label={`Answer ${index + 1} name`}
                          className="input w-full text-sm"
                          value={option.label}
                          maxLength={LIMITS.label}
                          placeholder="Answer name"
                          onChange={(e) =>
                            onChange({
                              ...draft,
                              options: draft.options.map((o, i) =>
                                i === index ? { ...o, label: e.target.value } : o,
                              ),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`description-${index}`}
                          className="mb-1.5 block text-[11px] text-base-content/70"
                        >
                          Description <span className="font-normal">(optional)</span>
                        </label>
                        <textarea
                          id={`description-${index}`}
                          aria-label={`Answer ${index + 1} description`}
                          rows={1}
                          className="textarea min-h-10 w-full resize-y text-xs"
                          value={option.description}
                          maxLength={LIMITS.description}
                          placeholder="Description (optional)"
                          onChange={(e) =>
                            onChange({
                              ...draft,
                              options: draft.options.map((o, i) =>
                                i === index ? { ...o, description: e.target.value } : o,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-square mt-7"
                      aria-label={`Remove answer ${index + 1}`}
                      disabled={draft.options.length <= 2}
                      onClick={() =>
                        onChange({ ...draft, options: draft.options.filter((_, i) => i !== index) })
                      }
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm mt-1 w-fit"
                disabled={draft.options.length >= LIMITS.options}
                onClick={() =>
                  onChange({
                    ...draft,
                    options: [...draft.options, { label: '', description: '' }],
                  })
                }
              >
                <Icon name="plus" size={14} />
                Add answer
              </button>
            </fieldset>
          )}
          <div className="grid gap-3 border-t border-base-300 pt-5 sm:grid-cols-2">
            <div>
              <label htmlFor="model" className="mb-2 block text-xs font-medium">
                Model
              </label>
              <select
                id="model"
                className="select w-full text-sm"
                value={model}
                onChange={(e) => onModel(e.target.value)}
                disabled={!models.length}
              >
                {models.length ? (
                  models.map((m) => <option key={m}>{m}</option>)
                ) : (
                  <option value="">Nimble not available</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="keep-alive" className="mb-2 block text-xs font-medium">
                Keep model in memory
              </label>
              <select
                id="keep-alive"
                className="select w-full text-sm"
                value={String(keepAlive)}
                onChange={(e) =>
                  onKeepAlive(e.target.value === '0' ? 0 : (e.target.value as KeepAlive))
                }
              >
                <option value="5m">5 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="0">Unload after each run</option>
              </select>
            </div>
          </div>
        </fieldset>
        {error && (
          <div role="alert" className="alert mt-4 text-sm">
            {error}
          </div>
        )}
        <div className="sticky bottom-0 z-10 -mx-5 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-100 px-5 py-4 sm:-mx-6 sm:px-6">
          <p className="max-w-60 text-xs leading-relaxed text-base-content/65">
            {busy
              ? 'Loading the model can take a moment on the first run.'
              : ready
                ? 'Processed locally by Ollama on your PC.'
                : 'Connect Ollama and install Nimble to run.'}
          </p>
          {busy ? (
            <button type="button" className="btn" onClick={onCancel}>
              Cancel run
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!ready || unloading}>
              <Icon name="play" size={16} />
              {unloading ? 'Unloading…' : 'Run decision'}
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
