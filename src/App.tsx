import { useEffect, useState } from 'react'
import { cloneDraft, draftError, requestBody, requestBytes } from './domain'
import type { KeepAlive, SavedPrompt, TestCase } from './domain'
import { normalizeOllamaUrl, OLLAMA_URL, unloadModel } from './ollama'
import { useConnection } from './useConnection'
import { useDecisionRunner } from './useDecisionRunner'
import type { DecisionJob } from './useDecisionRunner'
import { blankDocument, documentFrom, useEditorSession } from './useEditorSession'
import type { EditorDocument } from './useEditorSession'
import { useLibraryActions } from './useLibraryActions'
import { isPromptPage, usePage } from './usePage'
import type { Page, PromptPage } from './usePage'
import { usePreference } from './usePreference'
import { usePromptLibrary } from './usePromptLibrary'
import { useRunHistory } from './useRunHistory'
import { AppHeader } from './components/AppHeader'
import { ComparePage } from './components/ComparePage'
import { ExportDialog } from './components/ExportDialog'
import { ModelSelect } from './components/ModelSelect'
import { PageTabs } from './components/PageTabs'
import { PromptEditor } from './components/PromptEditor'
import { PromptLibrary } from './components/PromptLibrary'
import { PromptTitle } from './components/PromptTitle'
import { ResultPanel } from './components/ResultPanel'
import { RunBar } from './components/RunBar'
import { RunButton } from './components/RunButton'
import { SegmentedControl } from './components/SegmentedControl'
import { Settings } from './components/Settings'
import { SetupChecklist } from './components/SetupChecklist'
import { TestCases, caseDraft } from './components/TestCases'
import { Toast } from './components/Toast'
import type { CaseOutcome } from './components/TestCases'

type Theme = 'light' | 'dark'
type Panel = 'edit' | 'result' | 'history'
const PROMPT_JOB = 'prompt'
/** How long editing must pause before the open prompt is saved. */
const AUTOSAVE_MS = 500

const parseTheme = (value: string | null): Theme =>
  value === 'light' || value === 'dark'
    ? value
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
const parseKeepAlive = (value: string | null): KeepAlive =>
  value === '0' ? 0 : value === '30m' ? '30m' : '5m'
const parseOllamaUrl = (value: string | null) => normalizeOllamaUrl(value ?? '') ?? OLLAMA_URL
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Retry.')

export function App() {
  const library = usePromptLibrary()
  const session = useEditorSession(library.prompts[0])
  const history = useRunHistory()
  const [ollamaUrl, setOllamaUrl] = usePreference('nimble-playground.ollamaUrl', parseOllamaUrl)
  const { connection, ready, checking, error: connectionError, refresh } = useConnection(ollamaUrl)
  const runner = useDecisionRunner(() => void refresh(), ollamaUrl)
  const { page, navigate, promptPage } = usePage()
  const [theme, setTheme] = usePreference('nimble-playground.theme', parseTheme)
  const [keepAlive, setKeepAlive] = usePreference('nimble-playground.keepAlive', parseKeepAlive)
  const [preferredModel, setPreferredModel] = useState('')
  const [unloading, setUnloading] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [panel, setPanel] = useState<Panel>('edit')
  const [outcomes, setOutcomes] = useState<Record<string, CaseOutcome>>({})
  const notify = (text: string) => setNotice({ id: crypto.randomUUID(), text })
  const actions = useLibraryActions(library, session, notify)

  const { document, dirty } = session
  const models = connection?.models ?? []
  const model = models.includes(preferredModel) ? preferredModel : (models[0] ?? '')
  const promptKey = document.id
  const { current: currentRun, previous: previousRun } = history.latest(promptKey)
  const locked = runner.busy || !!unloading
  const canRun = ready && !locked
  const checked = !!connection || !!connectionError
  const connectionLabel = !connection
    ? checking
      ? 'Checking Ollama…'
      : 'Ollama unavailable'
    : !connection.supported
      ? 'Ollama update needed'
      : !models.length
        ? 'Nimble not installed'
        : 'Ollama connected'
  const showSetup =
    checked && !ready && !setupDismissed && (page === 'playground' || page === 'cases')

  // Compare and Settings lead back to the prompt page they were opened from.
  const back = isPromptPage(page)
    ? null
    : {
        label: promptPage === 'cases' ? 'Back to test cases' : `Back to ${document.name}`,
        onBack: () => go(promptPage),
      }

  useEffect(() => {
    globalThis.document.documentElement.dataset.theme = theme
  }, [theme])
  // A new prompt joins the library on its first edit, so an untouched one is never saved.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => actions.save(), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [document])
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) actions.save()
      if (!session.saveError && !library.volatile && !runner.busy) return
      e.preventDefault()
      e.returnValue = ''
    }
    // Ctrl+S saves right away instead of opening the browser's Save page dialog.
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty) actions.save()
      }
      // Esc leaves Compare and Settings, unless it is closing something else first.
      if (e.key === 'Escape' && !e.defaultPrevented && back && !exportOpen && !libraryOpen)
        back.onBack()
    }
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('keydown', onKey)
    }
  })

  function go(next: Page) {
    navigate(next)
    setLibraryOpen(false)
  }
  function goPrompt(next: PromptPage) {
    if (next === 'cases') openCases()
    else go(next)
  }
  function setDocument(patch: Partial<EditorDocument>) {
    session.setDocument({ ...document, ...patch })
  }
  function requestLoad(next: EditorDocument) {
    if (locked || (dirty && !actions.save())) return
    session.load(next)
    setLibraryOpen(false)
    setPanel('edit')
  }
  function duplicate(prompt: SavedPrompt) {
    if (locked) return
    // The open prompt may have edits that are not saved yet.
    const source = prompt.id === document.id ? document : documentFrom(prompt)
    const copy = {
      ...source,
      draft: cloneDraft(source.draft),
      id: crypto.randomUUID(),
      name: actions.copyName(source.name),
    }
    if (actions.save(copy)) requestLoad(copy)
  }
  function remove(prompt: SavedPrompt) {
    if (!locked) actions.remove(prompt)
  }
  function runPrompt() {
    if (!canRun) return
    const error = draftError(document.draft)
    session.setError(error)
    if (error) return
    const { name } = document
    void runner.run(
      [
        {
          key: PROMPT_JOB,
          draft: document.draft,
          onResult: (result) => {
            history.add({ promptKey, promptName: name, result })
            setPanel((current) => (current === 'edit' ? 'result' : current))
          },
          onError: session.setError,
        },
      ],
      model,
      keepAlive,
    )
  }
  function runCases(cases: TestCase[]) {
    if (!canRun) return
    const jobs: DecisionJob[] = []
    const invalid: Record<string, CaseOutcome> = {}
    for (const testCase of cases) {
      const draft = caseDraft(document.draft, testCase)
      const error = draftError(draft)
      if (error) invalid[testCase.id] = { error }
      else
        jobs.push({
          key: testCase.id,
          draft,
          onResult: (result) => setOutcomes((o) => ({ ...o, [testCase.id]: { result } })),
          onError: (message) => setOutcomes((o) => ({ ...o, [testCase.id]: { error: message } })),
        })
    }
    setOutcomes((o) => ({ ...o, ...invalid }))
    void runner.run(jobs, model, keepAlive)
  }
  function openCases() {
    // The single input becomes the first case, so testing more inputs does not start from scratch.
    if (!document.cases.length && document.draft.state.trim())
      setDocument({
        cases: [{ id: crypto.randomUUID(), input: document.draft.state, expected: '' }],
      })
    go('cases')
  }
  async function unload(name: string) {
    if (locked) return
    setUnloading(name)
    try {
      await unloadModel(name, ollamaUrl)
      await refresh()
      notify(`Unloaded ${name}.`)
    } catch (e) {
      notify(errorText(e))
    } finally {
      setUnloading(null)
    }
  }

  const modelSelect = (
    <ModelSelect
      connection={connection}
      value={model}
      onChange={setPreferredModel}
      disabled={locked}
    />
  )
  const title = (
    <PromptTitle
      name={document.name}
      onRename={(name) => {
        const error = actions.nameError(name)
        if (!error) setDocument({ name })
        return error
      }}
      saveError={session.saveError}
      notSaved={library.volatile}
      disabled={locked}
    />
  )

  return (
    <div className="app-shell bg-base-200 text-base-content">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-base-100 focus:p-3"
      >
        Skip to workspace
      </a>
      <h1 className="sr-only">Nimble Playground</h1>
      <AppHeader
        libraryOpen={libraryOpen}
        onToggleLibrary={() => setLibraryOpen(!libraryOpen)}
        warning={checked && !ready ? connectionLabel : null}
        onWarning={() => {
          setSetupDismissed(false)
          if (page !== 'cases') go('playground')
        }}
        onHome={() => go('playground')}
        back={back}
        onSettings={page === 'settings' ? null : () => go('settings')}
        tabs={
          isPromptPage(page) && (
            <PageTabs page={page} caseCount={document.cases.length} onChange={goPrompt} />
          )
        }
      >
        {page === 'compare' ? (
          <span className="font-semibold">Compare runs</span>
        ) : page === 'settings' ? (
          <span className="font-semibold">Settings</span>
        ) : (
          title
        )}
      </AppHeader>

      <div className="app-body" data-library={libraryOpen ? 'open' : 'closed'}>
        <div className="library-pane">
          <PromptLibrary
            prompts={library.prompts}
            currentId={page === 'settings' ? null : document.id}
            disabled={locked}
            onOpen={(prompt) => {
              requestLoad(documentFrom(prompt))
              if (page !== 'cases') go('playground')
            }}
            onNew={() => requestLoad(blankDocument(actions.newName()))}
            onDuplicate={duplicate}
            onDelete={remove}
            settingsActive={page === 'settings'}
            onSettings={() => go('settings')}
          />
        </div>
        {libraryOpen && (
          <button
            type="button"
            className="library-backdrop"
            aria-label="Close prompt library"
            onClick={() => setLibraryOpen(false)}
          />
        )}

        <main id="main-content" className="app-main">
          {library.error && (
            <div role="alert" className="alert alert-error alert-soft rounded-none text-sm">
              {library.error}
            </div>
          )}
          {showSetup && (
            <div className="setup-overlay">
              <SetupChecklist
                connection={connection}
                ollamaUrl={ollamaUrl}
                checking={checking}
                onCheck={() => void refresh()}
                onDismiss={() => setSetupDismissed(true)}
              />
            </div>
          )}

          <div hidden={page !== 'playground'} className="workspace" data-panel={panel}>
            <SegmentedControl<Panel>
              label="Workspace panel"
              className="workspace-tabs"
              value={panel}
              onChange={setPanel}
              options={[
                { value: 'edit', label: 'Edit' },
                { value: 'result', label: 'Result' },
                { value: 'history', label: `History · ${history.runs.length}` },
              ]}
            />
            <section
              aria-label="Prompt editor"
              className="editor-pane"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  runPrompt()
                }
              }}
            >
              <div className="editor-scroll">
                <PromptEditor
                  draft={document.draft}
                  onChange={(draft) => setDocument({ draft })}
                  caseCount={document.cases.length}
                  onOpenCases={openCases}
                  disabled={!!unloading}
                />
              </div>
              <RunBar
                requestBytes={requestBytes(requestBody(document.draft, model, keepAlive))}
                error={session.error}
                message={
                  !ready && (
                    <button type="button" className="link" onClick={() => setSetupDismissed(false)}>
                      Set up Ollama to run
                    </button>
                  )
                }
              >
                {modelSelect}
                <RunButton
                  label="Run"
                  busy={runner.active === PROMPT_JOB}
                  disabled={!canRun}
                  onRun={runPrompt}
                  onCancel={runner.cancel}
                  showShortcut
                  className="max-sm:flex-1"
                />
              </RunBar>
            </section>
            <ResultPanel
              draft={document.draft}
              model={model}
              current={currentRun}
              previous={previousRun}
              busy={runner.active === PROMPT_JOB}
              history={history}
              currentKey={promptKey}
              onOpenCompare={() => go('compare')}
            />
          </div>

          <div hidden={page !== 'cases'} className="page-scroll">
            <TestCases
              key={document.id}
              draft={document.draft}
              cases={document.cases}
              onCases={(cases) => setDocument({ cases })}
              outcomes={outcomes}
              pendingKey={runner.isPending}
              onRunCase={(testCase) => runCases([testCase])}
              onEditPrompt={() => go('playground')}
              disabled={!!unloading}
              runControls={
                <>
                  {modelSelect}
                  <RunButton
                    label={`Run all ${document.cases.length}`}
                    busy={runner.busy && runner.active !== PROMPT_JOB}
                    disabled={!canRun || !document.cases.length}
                    onRun={() => runCases(document.cases)}
                    onCancel={runner.cancel}
                  />
                </>
              }
            />
          </div>

          <div hidden={page !== 'compare'} className="page-scroll">
            <ComparePage history={history} />
          </div>

          <div hidden={page !== 'settings'} className="page-scroll">
            <Settings
              theme={theme}
              onTheme={setTheme}
              keepAlive={keepAlive}
              onKeepAlive={setKeepAlive}
              connection={connection}
              ollamaUrl={ollamaUrl}
              onOllamaUrl={setOllamaUrl}
              connectionLabel={connectionLabel}
              checking={checking}
              connectionError={connectionError}
              busy={runner.busy}
              unloading={unloading}
              onRefresh={() => void refresh()}
              onUnload={(name) => void unload(name)}
              onRestore={actions.restoreExamples}
              promptCount={library.prompts.length}
              onImport={(file) => void actions.importFile(file)}
              onExport={() => setExportOpen(true)}
            />
          </div>
        </main>
      </div>

      {(notice || actions.deleted.length > 0) && (
        <div className="toast toast-end z-50" aria-label="Notifications">
          {notice && (
            <Toast key={notice.id} onDismiss={() => setNotice(null)}>
              <span>{notice.text}</span>
            </Toast>
          )}
          {actions.deleted.length > 0 && (
            <Toast
              key={actions.deleted.length}
              duration={10000}
              onDismiss={actions.dismissDeleted}
              dismissLabel="Dismiss deletion notification"
            >
              <span>Deleted “{actions.deleted.at(-1)!.name}”.</span>
              <button
                type="button"
                className="btn btn-sm"
                disabled={locked}
                onClick={actions.undoDelete}
              >
                Undo{actions.deleted.length > 1 ? ` (${actions.deleted.length})` : ''}
              </button>
            </Toast>
          )}
        </div>
      )}
      {exportOpen && (
        <ExportDialog prompts={library.prompts} onClose={() => setExportOpen(false)} />
      )}
    </div>
  )
}
