import { LIMITS, isRecord, defaultPrompts } from './domain'
import type { Draft, SavedPrompt, TestCase } from './domain'

export const STORAGE_KEY = 'nimble-playground.prompts.v1'
export const BUNDLE_FORMAT = 'nimble-playground'
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max

function readDraft(value: unknown): Draft {
  if (
    !isRecord(value) ||
    !text(value.state, LIMITS.state) ||
    !text(value.question, LIMITS.question) ||
    !['choice', 'noul', 'score'].includes(String(value.kind)) ||
    !Array.isArray(value.options) ||
    value.options.length > LIMITS.options
  ) {
    throw new Error('A prompt contains invalid input, question, or answer settings.')
  }
  // Incomplete drafts can be saved. Running a decision applies stricter validation.
  const options = value.options.map((option) => {
    if (
      !isRecord(option) ||
      !text(option.label, LIMITS.label) ||
      !text(option.description, LIMITS.description)
    )
      throw new Error('A prompt contains an invalid answer definition.')
    return { label: option.label, description: option.description }
  })
  return {
    state: value.state,
    question: value.question,
    kind: value.kind as Draft['kind'],
    options,
  }
}

function readCases(value: unknown): TestCase[] {
  if (!Array.isArray(value) || value.length > LIMITS.cases)
    throw new Error('A prompt contains invalid test cases.')
  const ids = new Set<string>()
  return value.map((item) => {
    if (
      !isRecord(item) ||
      !text(item.id, 100) ||
      !item.id ||
      ids.has(item.id) ||
      !text(item.input, LIMITS.state) ||
      !text(item.expected, LIMITS.label)
    )
      throw new Error('A prompt contains an invalid test case.')
    ids.add(item.id)
    return { id: item.id, input: item.input, expected: item.expected }
  })
}

export function parseBundle(json: string): SavedPrompt[] {
  if (new Blob([json]).size > LIMITS.fileBytes)
    throw new Error('Choose a JSON file smaller than 2 MB.')
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (
    !isRecord(value) ||
    value.format !== BUNDLE_FORMAT ||
    value.version !== 1 ||
    !Array.isArray(value.prompts)
  )
    throw new Error('Choose a Nimble Playground prompt export (version 1).')
  if (value.prompts.length > LIMITS.prompts)
    throw new Error('An import can contain at most 100 prompts.')
  const ids = new Set<string>()
  return value.prompts.map((prompt) => {
    if (
      !isRecord(prompt) ||
      !text(prompt.id, 100) ||
      !prompt.id ||
      ids.has(prompt.id) ||
      !text(prompt.name, 100) ||
      !prompt.name.trim() ||
      !text(prompt.updatedAt, 40) ||
      (prompt.exampleId !== undefined && !text(prompt.exampleId, 100)) ||
      !Number.isFinite(Date.parse(prompt.updatedAt))
    )
      throw new Error('A saved prompt has invalid or duplicate metadata.')
    ids.add(prompt.id)
    return {
      id: prompt.id,
      name: prompt.name.trim(),
      updatedAt: prompt.updatedAt,
      draft: readDraft(prompt.draft),
      ...(typeof prompt.exampleId === 'string' ? { exampleId: prompt.exampleId } : {}),
      ...(prompt.cases !== undefined ? { cases: readCases(prompt.cases) } : {}),
    }
  })
}

export function serializeBundle(prompts: SavedPrompt[]): string {
  return JSON.stringify({ format: BUNDLE_FORMAT, version: 1, prompts }, null, 2)
}

export type LibraryData = { prompts: SavedPrompt[]; seededExampleIds: string[] }

export function readLibrary(storage?: Pick<Storage, 'getItem'>): LibraryData & {
  error: string | null
} {
  try {
    const json = (storage ?? localStorage).getItem(STORAGE_KEY)
    const prompts = json ? parseBundle(json) : []
    const seededExampleIds: unknown = json ? (JSON.parse(json).seededExampleIds ?? []) : []
    if (!Array.isArray(seededExampleIds) || !seededExampleIds.every((id) => text(id, 100)))
      throw new Error('Invalid example history')
    return { prompts, seededExampleIds, error: null }
  } catch {
    return {
      prompts: [],
      seededExampleIds: [],
      error:
        'Your saved library could not be read. Browser storage may be unavailable or damaged. Export new prompts before leaving this page.',
    }
  }
}

export function writeLibrary(
  prompts: SavedPrompt[],
  storage?: Pick<Storage, 'setItem'>,
  seededExampleIds: string[] = [],
): void {
  if (prompts.length > LIMITS.prompts)
    throw new Error(
      'The library holds up to 100 prompts. Export and remove a few before adding more.',
    )
  const json = JSON.stringify({ format: BUNDLE_FORMAT, version: 1, prompts, seededExampleIds })
  if (new Blob([json]).size > LIMITS.fileBytes)
    throw new Error('The library is full (2 MB). Export and remove a few prompts to make room.')
  try {
    ;(storage ?? localStorage).setItem(STORAGE_KEY, json)
  } catch {
    throw new Error(
      'Browser storage is unavailable or full. Your changes are kept in this tab only; export your library to keep them.',
    )
  }
}

export function uniqueName(name: string, prompts: SavedPrompt[]): string {
  const names = new Set(prompts.map((prompt) => prompt.name))
  let candidate = name.slice(0, 100)
  let index = 2
  while (names.has(candidate)) candidate = `${name.slice(0, 88)} (${index++})`
  return candidate
}

// History is stored with the library so a deleted example is not seeded again.
export function seedExamples(library: LibraryData, restore = false): LibraryData {
  const prompts = [...library.prompts]
  const seeded = new Set(library.seededExampleIds)
  for (const example of defaultPrompts) {
    if (!restore && seeded.has(example.id)) continue
    const existing = prompts.find(
      (p) =>
        (p.exampleId === example.id || p.id === example.id || p.name === example.name) &&
        JSON.stringify(p.draft) === JSON.stringify(example.draft),
    )
    if (existing) {
      seeded.add(example.id)
      continue
    }
    // Imported or edited records with the same ID always win during migration.
    if (!restore && prompts.some((p) => p.id === example.id)) {
      seeded.add(example.id)
      continue
    }
    const prompt = {
      ...structuredClone(example),
      name: uniqueName(example.name, prompts),
      id: prompts.some((p) => p.id === example.id) ? crypto.randomUUID() : example.id,
    }
    const candidate = [...prompts, prompt]
    if (
      candidate.length > LIMITS.prompts ||
      new Blob([serializeBundle(candidate)]).size > LIMITS.fileBytes
    ) {
      if (restore) throw new Error('Make room in the prompt library before restoring examples.')
      continue
    }
    prompts.push(prompt)
    seeded.add(example.id)
  }
  return { prompts, seededExampleIds: [...seeded] }
}

export function mergeImport(current: SavedPrompt[], incoming: SavedPrompt[]): SavedPrompt[] {
  if (current.length + incoming.length > LIMITS.prompts)
    throw new Error('Import would exceed the 100-prompt library limit.')
  const names = new Set(current.map((p) => p.name))
  const added = incoming.map((prompt) => {
    let name = prompt.name
    let index = 2
    while (names.has(name)) name = `${prompt.name.slice(0, 88)} (${index++})`
    names.add(name)
    return { ...prompt, name, id: crypto.randomUUID(), updatedAt: new Date().toISOString() }
  })
  const merged = [...added, ...current]
  if (new Blob([serializeBundle(merged)]).size > LIMITS.fileBytes)
    throw new Error('Import would exceed the 2 MB library limit.')
  return merged
}

export function downloadLibrary(prompts: SavedPrompt[]) {
  const url = URL.createObjectURL(
    new Blob([serializeBundle(prompts)], { type: 'application/json' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `nimble-prompts-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
