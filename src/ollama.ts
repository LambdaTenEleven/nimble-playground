import { buildRequest, isRecord, readResult } from './domain'
import type { Draft, KeepAlive } from './domain'

export const OLLAMA_URL = 'http://127.0.0.1:11434'

/** Returns a normalized http(s) base URL, or null when the text is not one. */
export function normalizeOllamaUrl(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.search || url.hash || url.username || url.password) return null
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return null
  }
}

export type RunningModel = { name: string; sizeVram: number }
export type Connection = {
  version: string
  models: string[]
  running: RunningModel[]
  supported: boolean
}

export class OllamaError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'OllamaError'
  }
}

async function request(
  baseUrl: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  timeout = 8_000,
): Promise<unknown> {
  const timeoutSignal = AbortSignal.timeout(timeout)
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      signal: combined,
    })
  } catch {
    if (signal?.aborted)
      throw new OllamaError('Run cancelled. Ollama may take a moment to stop processing.')
    if (timeoutSignal.aborted)
      throw new OllamaError(
        'Ollama took too long to respond. Check its status and available memory, then retry.',
      )
    throw new OllamaError(
      'Cannot reach Ollama. Open the Ollama app, allow local-network access if your browser asks, and retry.',
    )
  }
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new OllamaError(
      'Ollama returned an unreadable response. Check that it is up to date.',
      response.status,
    )
  }
  if (!response.ok) {
    const detail =
      isRecord(value) && typeof value.error === 'string'
        ? value.error.slice(0, 700)
        : `HTTP ${response.status}`
    throw new OllamaError(
      response.status === 404 && path === '/v1/systemone'
        ? 'The decision API was not found. Update Ollama to version 0.35 or newer and check that Nimble is installed.'
        : `Ollama: ${detail}`,
      response.status,
    )
  }
  return value
}

export function supportsDecisions(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  return !!match && (Number(match[1]) > 0 || Number(match[2]) >= 35)
}

export async function checkConnection(
  signal?: AbortSignal,
  baseUrl = OLLAMA_URL,
): Promise<Connection> {
  const [versionData, tags, ps] = await Promise.all([
    request(baseUrl, '/api/version', undefined, signal),
    request(baseUrl, '/api/tags', undefined, signal),
    request(baseUrl, '/api/ps', undefined, signal),
  ])
  if (
    !isRecord(versionData) ||
    typeof versionData.version !== 'string' ||
    !isRecord(tags) ||
    !Array.isArray(tags.models) ||
    !isRecord(ps) ||
    !Array.isArray(ps.models)
  )
    throw new OllamaError('This endpoint did not return a valid Ollama status.')
  const isNimble = (name: string) =>
    /^nimble(?::[^\s]+)?$/.test(name) && !name.toLowerCase().includes('cloud')
  const models = tags.models.flatMap((m) =>
    isRecord(m) && typeof m.name === 'string' && isNimble(m.name) ? [m.name] : [],
  )
  const running = ps.models.flatMap((m) =>
    isRecord(m) && typeof m.name === 'string' && typeof m.size_vram === 'number'
      ? [{ name: m.name, sizeVram: m.size_vram }]
      : [],
  )
  return {
    version: versionData.version,
    models,
    running,
    supported: supportsDecisions(versionData.version),
  }
}

export async function runDecision(
  draft: Draft,
  model: string,
  keepAlive: KeepAlive,
  signal: AbortSignal,
  baseUrl = OLLAMA_URL,
) {
  const start = performance.now()
  const raw = await request(
    baseUrl,
    '/v1/systemone',
    buildRequest(draft, model, keepAlive),
    signal,
    180_000,
  )
  return readResult(raw, draft, model, performance.now() - start)
}

export async function unloadModel(model: string, baseUrl = OLLAMA_URL) {
  await request(
    baseUrl,
    '/api/generate',
    { model, keep_alive: 0, stream: false },
    undefined,
    30_000,
  )
}
