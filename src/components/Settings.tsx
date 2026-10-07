import { useEffect, useState } from 'react'
import type { KeepAlive } from '../domain'
import type { Connection } from '../ollama'
import { normalizeOllamaUrl, OLLAMA_URL } from '../ollama'
import { FileButton } from './FileButton'
import { Icon } from './Icon'
import { SetupGuide } from './SetupGuide'

export function Settings({
  theme,
  onTheme,
  keepAlive,
  onKeepAlive,
  connection,
  ollamaUrl,
  onOllamaUrl,
  connectionLabel,
  checking,
  connectionError,
  busy,
  unloading,
  onRefresh,
  onUnload,
  onRestore,
  promptCount,
  onImport,
  onExport,
}: {
  theme: 'light' | 'dark'
  onTheme: (value: 'light' | 'dark') => void
  keepAlive: KeepAlive
  onKeepAlive: (value: KeepAlive) => void
  connection: Connection | null
  ollamaUrl: string
  onOllamaUrl: (value: string) => void
  connectionLabel: string
  checking: boolean
  connectionError: string | null
  busy: boolean
  unloading: string | null
  onRefresh: () => void
  onUnload: (model: string) => void
  onRestore: () => void
  promptCount: number
  onImport: (file: File) => void
  onExport: () => void
}) {
  const [urlDraft, setUrlDraft] = useState(ollamaUrl)
  const [urlError, setUrlError] = useState<string | null>(null)
  useEffect(() => setUrlDraft(ollamaUrl), [ollamaUrl])
  function saveUrl(text: string) {
    const url = normalizeOllamaUrl(text)
    if (!url) {
      setUrlError('Enter an http:// or https:// address, such as http://127.0.0.1:11434.')
      return
    }
    setUrlError(null)
    setUrlDraft(url)
    onOllamaUrl(url)
  }
  return (
    <section className="settings-page panel-scroll" aria-label="Settings page">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        <h2 className="mb-7 text-xl font-semibold">Settings</h2>
        <section className="settings-section" aria-labelledby="appearance-title">
          <h3 id="appearance-title">Appearance</h3>
          <div>
            <label htmlFor="theme" className="sr-only">
              Appearance
            </label>
            <select
              id="theme"
              className="select select-sm w-full max-w-xs"
              value={theme}
              onChange={(e) => onTheme(e.target.value as 'light' | 'dark')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </section>
        <section className="settings-section" aria-labelledby="connection-title">
          <h3 id="connection-title">Ollama</h3>
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt>Status</dt>
                <dd>{connectionLabel}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Version</dt>
                <dd>{connection?.version ?? 'Unavailable'}</dd>
              </div>
            </dl>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveUrl(urlDraft)
              }}
            >
              <label htmlFor="ollama-url" className="mb-2 block text-sm">
                Address
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="ollama-url"
                  type="text"
                  inputMode="url"
                  className="input input-sm min-w-0 flex-1 font-mono text-xs"
                  value={urlDraft}
                  placeholder={OLLAMA_URL}
                  spellCheck={false}
                  disabled={busy}
                  aria-invalid={!!urlError}
                  aria-describedby="ollama-url-help"
                  onChange={(e) => {
                    setUrlDraft(e.target.value)
                    setUrlError(null)
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-sm"
                  disabled={busy || urlDraft.trim() === ollamaUrl}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy || ollamaUrl === OLLAMA_URL}
                  onClick={() => saveUrl(OLLAMA_URL)}
                >
                  Reset
                </button>
              </div>
              <p
                id="ollama-url-help"
                role={urlError ? 'alert' : undefined}
                className={`mt-1 text-xs ${urlError ? 'text-error' : 'text-base-content/75'}`}
              >
                {urlError ?? `Default: ${OLLAMA_URL}`}
              </p>
            </form>
            {connectionError && (
              <p role="alert" className="text-sm text-error">
                {connectionError}
              </p>
            )}
            <button type="button" className="btn btn-sm" disabled={checking} onClick={onRefresh}>
              {checking ? 'Checking…' : 'Refresh connection'}
            </button>
            <div>
              <label htmlFor="keep-alive" className="mb-2 block text-sm">
                Keep model in memory
              </label>
              <select
                id="keep-alive"
                className="select select-sm w-full"
                value={String(keepAlive)}
                disabled={busy || !!unloading}
                onChange={(e) =>
                  onKeepAlive(e.target.value === '0' ? 0 : (e.target.value as KeepAlive))
                }
              >
                <option value="5m">5 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="0">Unload after each run</option>
              </select>
            </div>
            {connection?.running
              .filter((m) => connection.models.includes(m.name))
              .map((model) => (
                <div
                  key={model.name}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {model.name}{' '}
                    <span className="text-xs text-base-content/75">
                      · {(model.sizeVram / 1024 ** 3).toFixed(1)} GiB VRAM
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy || !!unloading}
                    onClick={() => onUnload(model.name)}
                    aria-label={`Unload ${model.name}`}
                  >
                    {unloading === model.name ? 'Unloading…' : 'Unload model'}
                  </button>
                </div>
              ))}
          </div>
        </section>
        <section className="settings-section" aria-labelledby="library-title">
          <h3 id="library-title">Prompt library</h3>
          <div className="space-y-3">
            <p className="text-sm text-base-content/75">
              Saved in this browser · {promptCount} prompt{promptCount === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={!promptCount}
                onClick={onExport}
              >
                <Icon name="download" size={14} />
                Export…
              </button>
              <FileButton
                accept=".json,application/json"
                inputLabel="Import prompt file"
                onFile={onImport}
                disabled={busy}
              >
                <Icon name="upload" size={14} />
                Import…
              </FileButton>
              <button type="button" className="btn btn-sm" disabled={busy} onClick={onRestore}>
                Restore examples
              </button>
            </div>
            <p className="text-xs text-base-content/75">
              Export a backup before clearing browser data. Importing adds prompts and keeps the
              ones you have. Restoring adds missing original examples; your edited prompts are kept.
            </p>
          </div>
        </section>
        <section className="settings-section" aria-labelledby="setup-title">
          <h3 id="setup-title">Installation</h3>
          <SetupGuide connection={connection} ollamaUrl={ollamaUrl} />
        </section>
      </div>
    </section>
  )
}
