import { describe, expect, it } from 'vitest'
import { blankDraft, examples, defaultPrompts } from './domain'
import type { SavedPrompt } from './domain'
import {
  mergeImport,
  parseBundle,
  readLibrary,
  serializeBundle,
  writeLibrary,
  seedExamples,
} from './storage'

const saved: SavedPrompt = {
  id: 'abc',
  name: 'Ticket triage',
  draft: examples[0].draft,
  updatedAt: '2026-10-06T12:00:00.000Z',
}

describe('prompt persistence and portable files', () => {
  it('seeds once and never resurrects deleted examples', () => {
    const seeded = seedExamples({ prompts: [], seededExampleIds: [] })
    expect(seeded.prompts).toEqual(defaultPrompts)
    const deleted = { ...seeded, prompts: seeded.prompts.slice(1) }
    expect(seedExamples(deleted)).toEqual(deleted)
    expect(seedExamples(seeded)).toEqual(seeded)
    expect(parseBundle(serializeBundle(defaultPrompts))).toEqual(defaultPrompts)
  })
  it('migrates an existing library and restores originals without overwriting edits', () => {
    const existing = { ...defaultPrompts[0], name: 'Customized', draft: blankDraft() }
    const seeded = seedExamples({ prompts: [existing, saved], seededExampleIds: [] })
    expect(seeded.prompts[0]).toEqual(existing)
    expect(seeded.prompts[1]).toEqual(saved)
    const restored = seedExamples(seeded, true)
    expect(restored.prompts).toContainEqual(existing)
    expect(restored.prompts).toContainEqual(
      expect.objectContaining({ name: defaultPrompts[0].name, draft: defaultPrompts[0].draft }),
    )
    expect(new Set(restored.prompts.map((p) => p.id)).size).toBe(restored.prompts.length)
    expect(seedExamples(restored, true)).toEqual(restored)
  })
  it('does not duplicate legacy examples or exceed a full library', () => {
    const legacy = { ...defaultPrompts[0], id: 'old-saved-id', exampleId: undefined }
    const seeded = seedExamples({ prompts: [legacy], seededExampleIds: [] })
    expect(seeded.prompts).toHaveLength(3)
    expect(seeded.prompts[0]).toEqual(legacy)
    const full = {
      prompts: Array.from({ length: 100 }, (_, i) => ({ ...saved, id: String(i) })),
      seededExampleIds: [],
    }
    expect(seedExamples(full)).toEqual(full)
    expect(() => seedExamples(full, true)).toThrow('Make room')
  })
  it('persists example history atomically with prompt records while exports stay portable', () => {
    let json = ''
    const seeded = seedExamples({ prompts: [], seededExampleIds: [] })
    writeLibrary(
      [],
      {
        setItem: (_key, value) => {
          json = value
        },
      },
      seeded.seededExampleIds,
    )
    const read = readLibrary({ getItem: () => json })
    expect(seedExamples(read).prompts).toEqual([])
    expect(serializeBundle(seeded.prompts)).not.toContain('seededExampleIds')
  })
  it('round trips all user input and incomplete drafts', () => {
    const items = [saved, { ...saved, id: 'new', name: 'Draft', draft: blankDraft() }]
    expect(parseBundle(serializeBundle(items))).toEqual(items)
  })
  it('adds imported prompts with fresh IDs and unique names without replacing existing data', () => {
    const result = mergeImport([saved], [saved])
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Ticket triage (2)')
    expect(result[0].id).not.toBe(saved.id)
    expect(result[1]).toEqual(saved)
  })
  it.each([
    'not json',
    '{"version":2,"format":"nimble-playground","prompts":[]}',
    serializeBundle([{ ...saved, draft: { ...saved.draft, kind: 'chat' as never } }]),
    serializeBundle([saved, saved]),
  ])('rejects malformed imports atomically', (value) => {
    expect(() => parseBundle(value)).toThrow()
  })
  it('rejects oversized input and a combined library over 100 entries', () => {
    expect(() => parseBundle('x'.repeat(2 * 1024 * 1024 + 1))).toThrow('2 MB')
    expect(() =>
      mergeImport(
        Array.from({ length: 100 }, () => saved),
        [saved],
      ),
    ).toThrow('100-prompt')
  })
  it('reports storage failures rather than claiming a persisted save', () => {
    expect(
      readLibrary({
        getItem: () => {
          throw new Error('blocked')
        },
      }),
    ).toMatchObject({ prompts: [], error: expect.stringContaining('could not be read') })
    expect(() =>
      writeLibrary([saved], {
        setItem: () => {
          throw new Error('quota')
        },
      }),
    ).toThrow('this tab only')
  })
  it('leaves a corrupt library untouched on read', () => {
    const storage = { getItem: () => 'broken json' }
    expect(readLibrary(storage).error).toBeTruthy()
    expect(storage.getItem()).toBe('broken json')
  })
})
