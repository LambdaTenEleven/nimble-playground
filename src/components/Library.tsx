import { useRef, useState } from 'react'
import { examples, kindNames, LIMITS } from '../domain'
import type { Draft, SavedPrompt } from '../domain'
import { Icon } from './Icon'

type Props = {
  prompts: SavedPrompt[]
  selectedId: string | null
  busy: boolean
  onLoad: (prompt: SavedPrompt) => void
  onExample: (draft: Draft, name: string) => void
  onNew: () => void
  onImport: (file: File) => Promise<void>
  onExport: () => void
}
export function Library({
  prompts,
  selectedId,
  busy,
  onLoad,
  onExample,
  onNew,
  onImport,
  onExport,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const visible = prompts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <aside aria-label="Prompt library" className="min-w-0 space-y-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Your prompts{' '}
            <span className="ml-1 text-xs font-normal text-base-content/55">{prompts.length}</span>
          </h2>
          <button
            type="button"
            className="btn btn-sm btn-square"
            aria-label="New prompt"
            onClick={onNew}
            disabled={busy}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        {prompts.length > 4 && (
          <>
            <label htmlFor="search-prompts" className="sr-only">
              Search saved prompts
            </label>
            <input
              id="search-prompts"
              className="input input-sm mb-3 w-full"
              placeholder="Find a prompt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </>
        )}
        {prompts.length === 0 ? (
          <div className="py-4 text-sm leading-relaxed text-base-content/65">
            <Icon name="file" size={23} />
            <p className="mt-3">Make a prompt worth keeping.</p>
            <p className="mt-1 text-xs">Save it from the editor and it will appear here.</p>
          </div>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {visible.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-base-200 ${selectedId === prompt.id ? 'border-base-300 bg-base-200' : 'border-transparent'}`}
                onClick={() => onLoad(prompt)}
                disabled={busy}
                aria-current={selectedId === prompt.id ? 'true' : undefined}
              >
                <span className="block break-words text-sm font-medium">{prompt.name}</span>
                <span className="mt-1 block text-xs text-base-content/60">
                  {kindNames[prompt.draft.kind]}
                </span>
              </button>
            ))}
            {!visible.length && (
              <p className="py-4 text-xs text-base-content/60">No prompts match your search.</p>
            )}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-base-300 pt-4">
          <button
            type="button"
            className="btn btn-sm px-2"
            disabled={busy || importing}
            onClick={() => fileInput.current?.click()}
          >
            <Icon name="upload" size={14} />
            {importing ? 'Reading…' : 'Import'}
          </button>
          <button
            type="button"
            className="btn btn-sm px-2"
            disabled={!prompts.length}
            onClick={onExport}
          >
            <Icon name="download" size={14} />
            Export
          </button>
          <input
            ref={fileInput}
            className="hidden"
            type="file"
            accept=".json,application/json"
            aria-label="Import prompt file"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) {
                setImporting(true)
                try {
                  await onImport(file)
                } finally {
                  setImporting(false)
                }
              }
            }}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-base-content/60">
          Saved in this browser. Export a backup to keep or share. Up to {LIMITS.prompts} prompts.
        </p>
      </div>
      <div className="px-1">
        <p className="mb-3 text-[11px] font-semibold tracking-[0.13em] text-base-content/60 uppercase">
          Start with an example
        </p>
        <div className="space-y-1">
          {examples.map((example) => (
            <button
              key={example.name}
              type="button"
              disabled={busy}
              className="group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left hover:bg-base-300/40"
              onClick={() => onExample(example.draft, example.name)}
            >
              <span>
                <span className="block text-sm font-medium">{example.name}</span>
                <span className="mt-1 block text-xs text-base-content/60">{example.detail}</span>
              </span>
              <Icon name="arrow" size={15} />
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
