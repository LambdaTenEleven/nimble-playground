import { useEffect, useRef, useState } from 'react'
import { blankDraft, cloneDraft, draftError, examples, LIMITS } from './domain'
import type { DecisionResult, Draft, KeepAlive, SavedPrompt } from './domain'
import { mergeImport, parseBundle, readLibrary, serializeBundle, writeLibrary } from './storage'
import { OLLAMA_URL, runDecision, unloadModel } from './ollama'
import { useConnection } from './useConnection'
import { Icon } from './components/Icon'
import { Library } from './components/Library'
import { Modal } from './components/Modal'
import { PromptEditor } from './components/PromptEditor'
import { Results } from './components/Results'
import { SetupGuide } from './components/SetupGuide'
import { ExportDialog } from './components/ExportDialog'

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please retry.'
function initialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('nimble-playground.theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* Theme still works without storage. */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function App() {
  const [initialLibrary] = useState(() => readLibrary())
  const [prompts, setPrompts] = useState(initialLibrary.prompts)
  const promptsRef = useRef(prompts)
  const [volatileLibrary, setVolatileLibrary] = useState(false)
  const [draft, setDraft] = useState(() => cloneDraft(examples[0].draft))
  const [baseline, setBaseline] = useState(() => JSON.stringify(examples[0].draft))
  const [promptName, setPromptName] = useState(examples[0].name)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preferredModel, setPreferredModel] = useState('')
  const [keepAlive, setKeepAlive] = useState<KeepAlive>('5m')
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [unloading, setUnloading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(initialLibrary.error)
  const [setupOpen, setSetupOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [pendingLoad, setPendingLoad] = useState<{
    draft: Draft
    name: string
    id: string | null
  } | null>(null)
  const [theme, setTheme] = useState(initialTheme)
  const runController = useRef<AbortController | null>(null)
  const { connection, checking, error: connectionError, refresh } = useConnection()
  const model = connection?.models.includes(preferredModel)
    ? preferredModel
    : (connection?.models[0] ?? '')
  const ready = !!connection?.supported && !!model
  const runningModel = connection?.running.find((m) => m.name === model)
  const dirty = JSON.stringify(draft) !== baseline
  const stale =
    !!result && (JSON.stringify(result.draft) !== JSON.stringify(draft) || result.model !== model)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('nimble-playground.theme', theme)
    } catch {
      /* Preference applies in this tab. */
    }
  }, [theme])
  useEffect(() => {
    if (!dirty && !volatileLibrary) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, volatileLibrary])
  useEffect(
    () => () => {
      runController.current?.abort()
    },
    [],
  )

  function commitLibrary(next: SavedPrompt[]) {
    if (next.length > LIMITS.prompts || new Blob([serializeBundle(next)]).size > LIMITS.fileBytes)
      throw new Error(
        'The library is full. Export and remove prompts to make room (100 prompts / 2 MB).',
      )
    setPrompts(next)
    promptsRef.current = next
    if (initialLibrary.error) {
      setVolatileLibrary(true)
      setNotice(
        'The original unreadable library has been preserved. New changes are in this tab only; export them before leaving.',
      )
      return false
    }
    try {
      writeLibrary(next)
      setVolatileLibrary(false)
      return true
    } catch (error) {
      setVolatileLibrary(true)
      setNotice(errorText(error))
      return false
    }
  }
  function load(next: { draft: Draft; name: string; id: string | null }) {
    setDraft(cloneDraft(next.draft))
    setBaseline(JSON.stringify(next.draft))
    setPromptName(next.name)
    setSelectedId(next.id)
    setRunError(null)
    setPendingLoad(null)
  }
  function requestLoad(next: { draft: Draft; name: string; id: string | null }) {
    if (dirty) setPendingLoad(next)
    else load(next)
  }
  function openSave() {
    setSaveName(promptName)
    setSaveError(null)
    setDeleteConfirm(false)
    setSaveOpen(true)
  }
  function save(copy: boolean) {
    const name = saveName.trim()
    if (!name || name.length > 100) {
      setSaveError('Enter a name of up to 100 characters.')
      return
    }
    const id = copy || !selectedId ? crypto.randomUUID() : selectedId
    if (prompts.some((p) => p.name === name && p.id !== id)) {
      setSaveError('A prompt already has that name. Choose a different name.')
      return
    }
    const prompt: SavedPrompt = {
      id,
      name,
      draft: cloneDraft(draft),
      updatedAt: new Date().toISOString(),
    }
    try {
      const persisted = commitLibrary([prompt, ...prompts.filter((p) => p.id !== id)])
      setSelectedId(id)
      setPromptName(name)
      setBaseline(JSON.stringify(draft))
      setSaveOpen(false)
      if (persisted) setNotice(`Saved “${name}” in this browser.`)
    } catch (error) {
      setSaveError(errorText(error))
    }
  }
  async function importFile(file: File) {
    try {
      if (file.size > LIMITS.fileBytes) throw new Error('Choose a JSON file smaller than 2 MB.')
      const imported = parseBundle(await file.text())
      if (!imported.length) throw new Error('This export contains no prompts.')
      const persisted = commitLibrary(mergeImport(promptsRef.current, imported))
      if (persisted)
        setNotice(
          `Imported ${imported.length} prompt${imported.length === 1 ? '' : 's'}. Existing prompts were kept.`,
        )
    } catch (error) {
      setNotice(errorText(error))
    }
  }
  async function run() {
    if (busy || unloading || !ready) return
    const error = draftError(draft)
    if (error) {
      setRunError(error)
      return
    }
    const controller = new AbortController()
    runController.current = controller
    setBusy(true)
    setRunError(null)
    try {
      const answer = await runDecision(cloneDraft(draft), model, keepAlive, controller.signal)
      if (!controller.signal.aborted) setResult(answer)
    } catch (error) {
      setRunError(errorText(error))
    } finally {
      setBusy(false)
      runController.current = null
      void refresh()
    }
  }
  async function unload() {
    if (busy || unloading || !model) return
    setUnloading(true)
    try {
      await unloadModel(model)
      setNotice('Unload requested. The model stays downloaded; the next run will load it again.')
      await refresh()
    } catch (error) {
      setNotice(errorText(error))
    } finally {
      setUnloading(false)
    }
  }
  const connectionLabel = !connection
    ? checking
      ? 'Checking Ollama…'
      : 'Ollama unavailable'
    : !connection.supported
      ? 'Ollama update needed'
      : !model
        ? 'Nimble not installed'
        : 'Ollama connected'

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-base-100 focus:p-3"
      >
        Skip to workspace
      </a>
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <a
            href="#workspace"
            className="flex items-center gap-3"
            aria-label="Nimble Playground home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-content text-lg font-bold text-base-100">
              n.
            </span>
            <span className="text-lg font-semibold tracking-tight">
              nimble <span className="font-normal text-base-content/55">/ playground</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <span className="mr-2 hidden text-xs text-base-content/60 sm:inline">
              Local models. Clear decisions.
            </span>
            <button type="button" className="btn btn-sm" onClick={() => setSetupOpen(true)}>
              Setup guide
            </button>
            <button
              type="button"
              className="btn btn-sm btn-square"
              aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
            </button>
          </div>
        </div>
      </header>
      <main id="workspace" className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8 sm:py-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-base-content/60 uppercase">
              The decision workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Give your context a clear answer.
            </h1>
            <p className="mt-3 text-sm text-base-content/65">
              Choose, classify, or score. Experiment with Nimble, one prompt at a time.
            </p>
          </div>
        </div>
        <section
          aria-label="Ollama connection"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-100 px-4 py-3"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-2 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {connectionLabel}
            </span>
            <span className="font-mono text-[11px] text-base-content/60">
              {connection ? `v${connection.version}` : OLLAMA_URL}
            </span>
            {ready && (
              <span className="text-base-content/65">
                {runningModel
                  ? `Model loaded · ${(runningModel.sizeVram / 1024 ** 3).toFixed(1)} GiB VRAM`
                  : 'Model unloaded · loads on first run'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void refresh()}
              disabled={checking}
            >
              <Icon name="refresh" size={14} />
              {checking ? 'Checking…' : 'Refresh'}
            </button>
            {ready && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={!runningModel || busy || unloading}
                onClick={() => void unload()}
              >
                {unloading ? 'Unloading…' : 'Unload model'}
              </button>
            )}
          </div>
        </section>
        {!ready && !checking && (
          <section
            className="card mb-6 border border-base-300 bg-base-100 p-5"
            aria-label="Connection help"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{connectionLabel}</h2>
                <p className="mt-1 text-sm text-base-content/70">
                  {connectionError ??
                    (!connection?.supported
                      ? 'Update Ollama to version 0.35 or newer to use the decision API.'
                      : 'Download Nimble in a terminal: ollama pull nimble')}
                </p>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setSetupOpen(true)}>
                View setup instructions
              </button>
            </div>
          </section>
        )}
        {notice && (
          <div role="status" className="alert mb-5 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{notice}</span>
            <button
              type="button"
              className="btn btn-sm btn-square shrink-0"
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
          <div className="order-2 xl:order-1">
            <Library
              prompts={prompts}
              selectedId={selectedId}
              busy={busy || unloading}
              onLoad={(prompt) =>
                requestLoad({ draft: prompt.draft, name: prompt.name, id: prompt.id })
              }
              onExample={(draft, name) => requestLoad({ draft, name, id: null })}
              onNew={() => requestLoad({ draft: blankDraft(), name: 'Untitled prompt', id: null })}
              onImport={importFile}
              onExport={() => setExportOpen(true)}
            />
          </div>
          <div className="order-1 grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)] xl:order-2">
            <PromptEditor
              draft={draft}
              onChange={setDraft}
              name={promptName}
              dirty={dirty}
              model={model}
              models={connection?.models ?? []}
              onModel={setPreferredModel}
              keepAlive={keepAlive}
              onKeepAlive={setKeepAlive}
              busy={busy}
              unloading={unloading}
              ready={ready}
              onRun={() => void run()}
              onCancel={() => runController.current?.abort()}
              onSave={openSave}
              error={runError}
            />
            <Results result={result} busy={busy} stale={stale} />
          </div>
        </div>
        <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-base-300 pt-4 text-[11px] text-base-content/60">
          <p>Nimble Playground · Built for a little experimentation.</p>
          <p>Local inference · Browser prompt storage · No account needed</p>
        </footer>
      </main>
      {exportOpen && <ExportDialog prompts={prompts} onClose={() => setExportOpen(false)} />}
      {setupOpen && (
        <Modal title="Get ready to run Nimble" onClose={() => setSetupOpen(false)}>
          <SetupGuide connection={connection} />
          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={() => {
                void refresh()
                setSetupOpen(false)
              }}
            >
              Retry connection
            </button>
            <button type="button" className="btn" onClick={() => setSetupOpen(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}
      {saveOpen && (
        <Modal
          title={deleteConfirm ? 'Delete saved prompt?' : 'Save to your library'}
          onClose={() => setSaveOpen(false)}
        >
          {deleteConfirm ? (
            <>
              <p className="text-sm">
                Remove “{promptName}” from this browser’s library? The current draft will stay in
                the editor.
              </p>
              <div className="modal-action">
                <button className="btn" onClick={() => setDeleteConfirm(false)}>
                  Keep prompt
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    try {
                      const persisted = commitLibrary(prompts.filter((p) => p.id !== selectedId))
                      setSelectedId(null)
                      setSaveOpen(false)
                      if (persisted) setNotice(`Deleted “${promptName}” from the library.`)
                    } catch (error) {
                      setSaveError(errorText(error))
                    }
                  }}
                >
                  Delete prompt
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                save(false)
              }}
            >
              <label htmlFor="prompt-name" className="mb-2 block text-sm font-medium">
                Prompt name
              </label>
              <input
                id="prompt-name"
                autoFocus
                className="input w-full"
                maxLength={100}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <p className="mt-3 text-sm leading-relaxed text-base-content/65">
                Saves the input text, question, format, and answer definitions in this browser.
                Export your library for a portable backup.
              </p>
              {saveError && (
                <p role="alert" className="mt-3 text-sm">
                  {saveError}
                </p>
              )}
              <div className="modal-action flex-wrap">
                {selectedId && (
                  <button
                    type="button"
                    className="btn mr-auto"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete…
                  </button>
                )}
                <button type="button" className="btn" onClick={() => setSaveOpen(false)}>
                  Cancel
                </button>
                {selectedId && (
                  <button type="button" className="btn" onClick={() => save(true)}>
                    Save a copy
                  </button>
                )}
                <button type="submit" className="btn">
                  {selectedId ? 'Update prompt' : 'Save prompt'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
      {pendingLoad && (
        <Modal title="Replace the current draft?" onClose={() => setPendingLoad(null)}>
          <p className="text-sm leading-relaxed">
            Your unsaved edits will be lost when you open “{pendingLoad.name}”. Save the current
            prompt first if you want to keep them.
          </p>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setPendingLoad(null)}>
              Keep editing
            </button>
            <button type="button" className="btn" onClick={() => load(pendingLoad)}>
              Replace draft
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
