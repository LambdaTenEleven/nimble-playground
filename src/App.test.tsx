import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { checkConnection, runDecision, unloadModel } from './ollama'
import { parseBundle, readLibrary } from './storage'
import { readResult, examples } from './domain'

vi.mock('./ollama', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ollama')>()),
  checkConnection: vi.fn(),
  runDecision: vi.fn(),
  unloadModel: vi.fn(),
}))
const ready = { version: '0.35.1', supported: true, models: ['nimble:latest'], running: [] }
beforeEach(() => {
  localStorage.clear()
  vi.mocked(checkConnection).mockResolvedValue(ready)
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

describe('playground workflows', () => {
  it('exports saved prompts as readable, importable JSON even without downloads', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Ollama connected')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Save prompt' }))
    await user.click(screen.getByRole('button', { name: 'Export' }))
    const exported = (screen.getByLabelText('Prompt library JSON') as HTMLTextAreaElement).value
    expect(parseBundle(exported)).toEqual(readLibrary().prompts)
    await user.click(screen.getByRole('button', { name: 'Copy JSON' }))
    expect(await navigator.clipboard.readText()).toBe(exported)
    expect(screen.getByText(/JSON copied/)).toBeTruthy()
  })
  it('saves the complete editor state, loads it later, and protects unsaved edits', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Ollama connected')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.clear(screen.getByLabelText('Prompt name'))
    await user.type(screen.getByLabelText('Prompt name'), 'My triage prompt')
    await user.click(screen.getByRole('button', { name: 'Save prompt' }))
    expect(readLibrary().prompts[0].draft).toEqual(examples[0].draft)
    await user.click(screen.getByRole('button', { name: /Assess urgency/ }))
    await user.click(screen.getByRole('button', { name: /My triage prompt/ }))
    expect((screen.getByLabelText('Input text') as HTMLTextAreaElement).value).toBe(
      examples[0].draft.state,
    )
    await user.type(screen.getByLabelText('Question'), ' Changed')
    await user.click(screen.getByRole('button', { name: 'New prompt' }))
    expect(screen.getByRole('dialog', { name: 'Replace the current draft?' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect((screen.getByLabelText('Question') as HTMLTextAreaElement).value).toContain('Changed')
  })
  it('runs a decision and marks the result stale after editing', async () => {
    const user = userEvent.setup()
    vi.mocked(runDecision).mockResolvedValue(
      readResult(
        {
          answers: {
            decision: {
              type: 'choice',
              choice: 'Billing',
              probabilities: { Billing: 0.98, Technical: 0.01, Other: 0.01 },
            },
          },
        },
        examples[0].draft,
        'nimble:latest',
        50,
      ),
    )
    render(<App />)
    await screen.findByText('Ollama connected')
    await user.selectOptions(screen.getByLabelText('Keep model in memory'), '0')
    await user.click(screen.getByRole('button', { name: 'Run decision' }))
    expect(runDecision).toHaveBeenCalledWith(
      examples[0].draft,
      'nimble:latest',
      0,
      expect.any(AbortSignal),
    )
    expect(await screen.findByRole('heading', { name: 'Billing' })).toBeTruthy()
    expect(
      screen.getByRole('meter', { name: 'Billing probability' }).getAttribute('aria-valuenow'),
    ).toBe('98')
    await user.type(screen.getByLabelText('Input text'), ' More context.')
    expect(screen.getByText(/belongs to the previous run/)).toBeTruthy()
  })
  it('shows installation instructions when the service is missing, and retries', async () => {
    const user = userEvent.setup()
    vi.mocked(checkConnection).mockRejectedValue(new Error('Cannot reach Ollama.'))
    render(<App />)
    await screen.findByRole('button', { name: 'View setup instructions' })
    expect(
      (screen.getByRole('button', { name: 'Run decision' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    await user.click(screen.getByRole('button', { name: 'View setup instructions' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('ollama pull nimble')).toBeTruthy()
    expect(
      within(dialog)
        .getByRole('link', { name: /Download Ollama/ })
        .getAttribute('href'),
    ).toBe('https://ollama.com/download')
    vi.mocked(checkConnection).mockResolvedValue(ready)
    await user.click(screen.getByRole('button', { name: 'Retry connection' }))
    await screen.findByText('Ollama connected')
  })
  it('offers the model download when Ollama exists but Nimble does not', async () => {
    vi.mocked(checkConnection).mockResolvedValue({ ...ready, models: [] })
    render(<App />)
    expect(await screen.findByText(/Download Nimble in a terminal/)).toBeTruthy()
  })
  it('unloads the selected model and refreshes memory status', async () => {
    const user = userEvent.setup()
    vi.mocked(checkConnection).mockResolvedValue({
      ...ready,
      running: [{ name: 'nimble:latest', sizeVram: 1024 ** 3 }],
    })
    vi.mocked(unloadModel).mockResolvedValue(undefined)
    render(<App />)
    await screen.findByText(/Model loaded/)
    vi.mocked(checkConnection).mockResolvedValue(ready)
    await user.click(screen.getByRole('button', { name: 'Unload model' }))
    await waitFor(() => expect(unloadModel).toHaveBeenCalledWith('nimble:latest'))
    expect(await screen.findByText(/Model unloaded/)).toBeTruthy()
  })
})
