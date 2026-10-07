import type { ReactNode } from 'react'
import type { Connection } from '../ollama'
import { CopyCommand } from './CopyCommand'
import { Icon } from './Icon'

type Step = { title: string; done: boolean; detail: string; action: ReactNode }

function steps(connection: Connection | null, ollamaUrl: string): Step[] {
  const reachable = !!connection
  const supported = !!connection?.supported
  return [
    {
      title: 'Ollama is running',
      done: reachable,
      detail: reachable
        ? `Found at ${ollamaUrl.replace(/^https?:\/\//, '')}`
        : 'Open the Ollama app, or run this in a terminal and leave it running.',
      action: <CopyCommand command="ollama serve" />,
    },
    {
      title: 'Version supports decisions',
      done: supported,
      detail: connection
        ? `${connection.version} — needs 0.35 or newer`
        : 'Needs Ollama 0.35 or newer',
      action: (
        <a
          className="btn btn-sm mt-2"
          href="https://ollama.com/download"
          target="_blank"
          rel="noreferrer"
        >
          Download Ollama ↗
        </a>
      ),
    },
    {
      title: 'Download the Nimble model',
      done: !!connection?.models.length,
      detail: 'Run this in a terminal. Keep this tab open.',
      action: <CopyCommand command="ollama pull nimble" />,
    },
  ]
}

/** Live setup checklist; the connection hook re-checks every few seconds while it is shown. */
export function SetupChecklist({
  connection,
  ollamaUrl,
  checking,
  onCheck,
  onDismiss,
}: {
  connection: Connection | null
  ollamaUrl: string
  checking: boolean
  onCheck: () => void
  onDismiss: () => void
}) {
  const list = steps(connection, ollamaUrl)
  const next = list.findIndex((step) => !step.done)
  const left = list.filter((step) => !step.done).length
  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="card card-border m-auto w-full max-w-xl bg-base-100 shadow-lg"
    >
      <div className="card-body gap-5">
        <div>
          <h2 id="setup-checklist-title" className="text-xl font-semibold">
            {left === 1 ? 'One step left' : `${left} steps left`}
          </h2>
          <p className="mt-1 text-base-content/75">
            Nimble runs on your computer through Ollama. This list updates as each step finishes.
          </p>
        </div>
        <ol className="space-y-1">
          {list.map((step, index) => (
            <li key={step.title} className="flex gap-3 border-b border-base-300 py-3 last:border-0">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.done ? 'bg-success/15 text-success' : index === next ? 'border-2 border-primary text-primary' : 'border border-base-300 text-base-content/60'}`}
              >
                {step.done ? <Icon name="check" size={14} strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {step.title}
                  <span className="sr-only">{step.done ? ' (done)' : ' (to do)'}</span>
                </p>
                <p className="text-sm text-base-content/75">{step.detail}</p>
                {index === next && step.action}
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 text-sm text-base-content/75">
            <span className="status status-warning" aria-hidden="true" />
            {checking ? 'Checking…' : 'Checking automatically'}
          </span>
          <a href="#settings" className="link link-primary ml-auto text-sm">
            Can’t connect?
          </a>
          <button type="button" className="btn btn-sm" disabled={checking} onClick={onCheck}>
            Check now
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
            Explore without running
          </button>
        </div>
      </div>
    </section>
  )
}
