import { describe, expect, it } from 'vitest'
import { blankDraft, examples } from './domain'
import type { SavedPrompt } from './domain'
import { mergeImport, parseBundle, readLibrary, serializeBundle, writeLibrary } from './storage'

const saved: SavedPrompt = {
  id: 'abc',
  name: 'Ticket triage',
  draft: examples[0].draft,
  updatedAt: '2026-10-06T12:00:00.000Z',
}

describe('prompt persistence and portable files', () => {
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
