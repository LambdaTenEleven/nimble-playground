import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { checkConnection, OLLAMA_URL, runDecision, unloadModel } from './ollama'
import { parseBundle, readLibrary, STORAGE_KEY } from './storage'
import { readResult, examples, defaultPrompts } from './domain'

vi.mock('./ollama', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ollama')>()),
  checkConnection: vi.fn(),
  runDecision: vi.fn(),
  unloadModel: vi.fn(),
}))
const ready = { version: '0.35.1', supported: true, models: ['nimble:latest'], running: [] }
const response = {
  answers: {
    decision: {
      type: 'choice',
      choice: 'Billing',
      probabilities: { Billing: 0.98, Technical: 0.01, Other: 0.01 },
    },
  },
}
const editor = () => within(screen.getByRole('region', { name: 'Prompt editor' }))
const results = () => within(screen.getByRole('complementary', { name: 'Results' }))
// The model picker appears on both the workspace and the test cases page.
const connected = () => screen.findAllByText('not loaded')

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.history.replaceState(null, '', '#playground')
  vi.mocked(checkConnection).mockResolvedValue(ready)
  vi.mocked(runDecision).mockImplementation(async (draft, model) =>
    readResult(response, draft, model, 50),
  )
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('workspace workflows', () => {
  it('seeds examples, renames inline, and autosaves edits', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    expect(readLibrary().prompts).toHaveLength(3)
    const saved = () => readLibrary().prompts.find((p) => p.id === defaultPrompts[0].id)
    await user.clear(screen.getByLabelText('Prompt name'))
    await user.type(screen.getByLabelText('Prompt name'), 'My triage')
    // The name is committed on Enter or blur, not on every keystroke.
    expect(saved()?.name).toBe(examples[0].name)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(saved()?.name).toBe('My triage'))
    await user.type(editor().getByLabelText('Question'), ' Be brief.')
    await waitFor(() => expect(saved()?.draft.question).toContain('Be brief.'))
  })
  it('keeps the previous name when the new one is taken', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.clear(screen.getByLabelText('Prompt name'))
    await user.type(screen.getByLabelText('Prompt name'), `${examples[1].name}{Enter}`)
    expect(screen.getByRole('alert').textContent).toContain('already has that name')
    expect(readLibrary().prompts.find((p) => p.id === defaultPrompts[0].id)?.name).toBe(
      examples[0].name,
    )
  })
  it('saves pending edits before opening another prompt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.type(editor().getByLabelText('Question'), ' Changed')
    await user.click(screen.getByRole('button', { name: 'Open Assess urgency' }))
    expect(screen.getByLabelText<HTMLInputElement>('Prompt name').value).toBe('Assess urgency')
    expect(
      readLibrary().prompts.find((p) => p.id === defaultPrompts[0].id)?.draft.question,
    ).toContain('Changed')
  })
  it('adds a new prompt to the library only once it is edited', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.click(screen.getByRole('button', { name: 'New prompt' }))
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(readLibrary().prompts).toHaveLength(3)
    await user.type(editor().getByLabelText('Question'), 'Is this urgent?')
    await waitFor(() => expect(readLibrary().prompts).toHaveLength(4))
  })
  it('opens another prompt when the open one is deleted, and supports Undo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.click(screen.getByRole('button', { name: 'Actions for Route a support ticket' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(readLibrary().prompts).toHaveLength(2)
    expect(screen.getByLabelText<HTMLInputElement>('Prompt name').value).toBe(
      readLibrary().prompts[0].name,
    )
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(readLibrary().prompts).toHaveLength(3)
  })
  it('runs with the memory setting, marks stale results, and compares runs from history', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.selectOptions(screen.getByLabelText('Keep model in memory'), '0')
    await user.click(screen.getByRole('link', { name: 'Nimble Playground home' }))
    await user.click(await editor().findByLabelText('Question'))
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(runDecision).toHaveBeenCalledWith(
      examples[0].draft,
      'nimble:latest',
      0,
      expect.any(AbortSignal),
      OLLAMA_URL,
    )
    expect(await results().findByRole('heading', { name: 'Billing' })).toBeTruthy()
    expect(results().getByLabelText('Response JSON').textContent).toContain('"choice": "Billing"')
    await user.type(editor().getByLabelText('Question'), ' Be brief.')
    expect(results().getByText(/belongs to the previous run/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Run' }))
    await results().findByText('Edited question')
    await user.click(screen.getByRole('button', { name: 'Add run 1 to compare' }))
    await user.click(screen.getByRole('button', { name: 'Add run 2 to compare' }))
    await user.click(screen.getByRole('button', { name: 'Compare' }))
    const changes = await screen.findByRole('region', { name: 'What changed in the prompt' })
    expect(within(changes).getByText(/Be brief\./)).toBeTruthy()
  })
  it('reorders answers from the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    editor().getByRole('button', { name: 'Reorder Billing, position 1 of 3' }).focus()
    await user.keyboard('{ArrowDown}')
    expect((editor().getByLabelText('Answer 1 name') as HTMLInputElement).value).toBe('Technical')
    expect(document.activeElement?.getAttribute('aria-label')).toContain('Billing, position 2')
  })
  it('runs every test case and summarizes matches against expected answers', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.click(editor().getByRole('link', { name: 'Test 5 inputs' }))
    await user.click(await screen.findByRole('button', { name: 'Run all 5' }))
    expect(await screen.findByRole('radio', { name: 'Mismatches · 3' })).toBeTruthy()
    expect(runDecision).toHaveBeenCalledTimes(5)
    expect(vi.mocked(runDecision).mock.calls[1][0].state).toBe(defaultPrompts[0].cases![1].input)
  })
  it('keeps a way back from every page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    const tabs = () => within(screen.getByRole('navigation', { name: 'Prompt pages' }))
    await user.click(tabs().getByRole('link', { name: 'Test cases · 5' }))
    expect(tabs().getByRole('link', { name: 'Test cases · 5' }).getAttribute('aria-current')).toBe(
      'page',
    )
    // Settings returns to the prompt page it was opened from, by button or Esc.
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(screen.queryByRole('navigation', { name: 'Prompt pages' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Back to test cases' }))
    expect(location.hash).toBe('#cases')
    await user.click(tabs().getByRole('link', { name: 'Editor' }))
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.keyboard('{Escape}')
    expect(location.hash).toBe('#playground')
    expect(tabs().getByRole('link', { name: 'Editor' }).getAttribute('aria-current')).toBe('page')
  })
  it('shows a live setup checklist and recovers when Ollama starts', async () => {
    const user = userEvent.setup()
    vi.mocked(checkConnection).mockRejectedValue(new Error('Cannot reach Ollama.'))
    render(<App />)
    const checklist = await screen.findByRole('region', { name: '3 steps left' })
    expect(within(checklist).getByText('ollama serve')).toBeTruthy()
    vi.mocked(checkConnection).mockResolvedValue(ready)
    await user.click(screen.getByRole('button', { name: 'Check now' }))
    await connected()
    expect(screen.queryByText(/steps? left/)).toBeNull()
  })
  it('exports the library from Settings as importable JSON', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Saved in this browser · 3 prompts')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Export…' }))
    const exported = (screen.getByLabelText('Prompt library JSON') as HTMLTextAreaElement).value
    expect(parseBundle(exported)).toEqual(readLibrary().prompts)
  })
  it('unloads a loaded model from Settings', async () => {
    const user = userEvent.setup()
    vi.mocked(checkConnection).mockResolvedValue({
      ...ready,
      running: [{ name: 'nimble:latest', sizeVram: 1024 ** 3 }],
    })
    vi.mocked(unloadModel).mockResolvedValue(undefined)
    render(<App />)
    await screen.findAllByText('loaded · 1.0 GB')
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Unload nimble:latest' }))
    expect(unloadModel).toHaveBeenCalledWith('nimble:latest', OLLAMA_URL)
  })
  it('connects to a custom Ollama address from Settings and remembers it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await connected()
    expect(checkConnection).toHaveBeenLastCalledWith(expect.any(AbortSignal), OLLAMA_URL)
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    const address = screen.getByLabelText<HTMLInputElement>('Address')
    expect(address.value).toBe(OLLAMA_URL)
    await user.clear(address)
    await user.type(address, 'ftp://example{Enter}')
    expect(screen.getByRole('alert').textContent).toContain('http://')
    await user.clear(address)
    await user.type(address, '192.168.1.20:11434/{Enter}')
    await waitFor(() =>
      expect(checkConnection).toHaveBeenLastCalledWith(
        expect.any(AbortSignal),
        'http://192.168.1.20:11434',
      ),
    )
    expect(localStorage.getItem('nimble-playground.ollamaUrl')).toBe('http://192.168.1.20:11434')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(address.value).toBe(OLLAMA_URL)
    await waitFor(() =>
      expect(checkConnection).toHaveBeenLastCalledWith(expect.any(AbortSignal), OLLAMA_URL),
    )
  })
  it('does not replace a damaged library during initialization or a save', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY, 'broken json')
    render(<App />)
    await connected()
    await user.type(editor().getByLabelText('Question'), ' Changed')
    await user.keyboard('{Control>}s{/Control}')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken json')
    expect(screen.getAllByRole('alert').some((a) => a.textContent?.includes('preserved'))).toBe(
      true,
    )
  })
})
