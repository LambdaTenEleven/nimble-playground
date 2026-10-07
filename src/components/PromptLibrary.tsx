import { useState } from 'react'
import { kindNames } from '../domain'
import type { SavedPrompt } from '../domain'
import { Icon } from './Icon'

/** Searchable list of saved prompts with open, duplicate and delete, and the link to Settings. */
export function PromptLibrary({
  prompts,
  currentId,
  disabled,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
  settingsActive,
  onSettings,
}: {
  prompts: SavedPrompt[]
  currentId: string | null
  disabled: boolean
  onOpen: (prompt: SavedPrompt) => void
  onNew: () => void
  onDuplicate: (prompt: SavedPrompt) => void
  onDelete: (prompt: SavedPrompt) => void
  settingsActive: boolean
  onSettings: () => void
}) {
  const [search, setSearch] = useState('')
  const [actions, setActions] = useState<string | null>(null)
  const visible = prompts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <nav aria-label="Prompt library" className="flex h-full flex-col gap-3 p-3">
      <div className="flex gap-2">
        <label className="input input-sm min-w-0 flex-1">
          <span className="sr-only">Search prompts</span>
          <input
            type="search"
            placeholder="Search prompts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-sm btn-square"
          aria-label="New prompt"
          title="New prompt"
          disabled={disabled}
          onClick={onNew}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <h2 className="px-2 text-xs font-semibold tracking-wide text-base-content/70 uppercase">
        Your prompts
      </h2>
      <ul className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-auto px-1">
        {visible.map((prompt) => {
          const current = prompt.id === currentId
          return (
            <li key={prompt.id}>
              <div
                className={`flex items-center rounded-field ${current ? 'bg-primary/10 ring-1 ring-primary/25' : 'hover:bg-base-200'}`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 px-2 py-2 text-left"
                  aria-current={current ? 'page' : undefined}
                  aria-label={`Open ${prompt.name}`}
                  disabled={disabled}
                  onClick={() => onOpen(prompt)}
                >
                  <span className="block truncate text-sm font-medium">{prompt.name}</span>
                  <span className="block text-xs text-base-content/70">
                    {kindNames[prompt.draft.kind]}
                    {prompt.cases?.length ? ` · ${prompt.cases.length} cases` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square mr-1"
                  aria-label={`Actions for ${prompt.name}`}
                  aria-expanded={actions === prompt.id}
                  onClick={() => setActions(actions === prompt.id ? null : prompt.id)}
                >
                  <Icon name="more" size={14} strokeWidth={3} />
                </button>
              </div>
              {actions === prompt.id && (
                <div className="flex justify-end gap-1 px-1 py-1.5">
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={disabled}
                    onClick={() => {
                      setActions(null)
                      onDuplicate(prompt)
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs text-error"
                    disabled={disabled}
                    onClick={() => {
                      setActions(null)
                      onDelete(prompt)
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          )
        })}
        {!visible.length && (
          <li className="px-2 text-sm text-base-content/70">
            {prompts.length ? 'No matching prompts.' : 'No saved prompts.'}
          </li>
        )}
      </ul>
      <a
        href="#settings"
        onClick={onSettings}
        aria-current={settingsActive ? 'page' : undefined}
        className={`-mx-1 flex items-center gap-2 rounded-field border-t border-base-300 px-3 py-2 text-sm font-medium ${settingsActive ? 'bg-primary/10 ring-1 ring-primary/25' : 'hover:bg-base-200'}`}
      >
        <Icon name="settings" size={16} />
        Settings
      </a>
    </nav>
  )
}
