import { afterEach, describe, expect, it, vi } from 'vitest'
import { examples } from './domain'
import { checkConnection, OLLAMA_URL, runDecision, supportsDecisions, unloadModel } from './ollama'

afterEach(() => vi.unstubAllGlobals())
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('direct Ollama connection', () => {
  it.each([
    ['0.34.9', false],
    ['0.35.0', true],
    ['0.35.1-rc1', true],
    ['1.0.0', true],
    ['unknown', false],
  ])('checks the API version %s', (version, expected) =>
    expect(supportsDecisions(version)).toBe(expected),
  )
  it('discovers only installed local Nimble tags and reports VRAM', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({ version: '0.35.1' }))
        .mockResolvedValueOnce(
          json({
            models: [{ name: 'nimble:latest' }, { name: 'nimble:cloud' }, { name: 'other:latest' }],
          }),
        )
        .mockResolvedValueOnce(json({ models: [{ name: 'nimble:latest', size_vram: 123 }] })),
    )
    expect(await checkConnection()).toEqual({
      version: '0.35.1',
      models: ['nimble:latest'],
      running: [{ name: 'nimble:latest', sizeVram: 123 }],
      supported: true,
    })
  })
  it('posts a real decision body and no SDK or proxy is required', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(json({ answers: { decision: { type: 'noul', noul: 0.99 } } }))
    vi.stubGlobal('fetch', fetch)
    const answer = await runDecision(
      examples[1].draft,
      'nimble:latest',
      0,
      new AbortController().signal,
    )
    expect(answer.headline).toBe('Yes')
    expect(fetch).toHaveBeenCalledWith(
      `${OLLAMA_URL}/v1/systemone`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'nimble:latest',
          state: examples[1].draft.state,
          questions: { decision: { type: 'noul', instructions: examples[1].draft.question } },
          keep_alive: 0,
        }),
      }),
    )
  })
  it('unloads with the empty generate API instead of deleting model files', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ done: true }))
    vi.stubGlobal('fetch', fetch)
    await unloadModel('nimble:latest')
    expect(fetch).toHaveBeenCalledWith(
      `${OLLAMA_URL}/api/generate`,
      expect.objectContaining({
        body: JSON.stringify({ model: 'nimble:latest', keep_alive: 0, stream: false }),
      }),
    )
  })
  it('surfaces errors and gives specific update guidance for a missing decision endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'not found' }, 404)))
    await expect(
      runDecision(examples[1].draft, 'nimble', '5m', new AbortController().signal),
    ).rejects.toThrow('Update Ollama')
  })
  it('distinguishes cancelled requests from an unreachable service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const controller = new AbortController()
    controller.abort()
    await expect(runDecision(examples[1].draft, 'nimble', 0, controller.signal)).rejects.toThrow(
      'cancelled',
    )
    await expect(checkConnection()).rejects.toThrow('Cannot reach Ollama')
  })
})
