import { describe, expect, it } from 'vitest'
import { closeCallHint, confidence, diffDrafts, moveItem, summarizeChanges } from './analysis'
import { cloneDraft, examples } from './domain'

describe('result analysis', () => {
  it('labels confidence by the gap between the top two answers', () => {
    const rows = (a: number, b: number) => [
      { label: 'A', value: a },
      { label: 'B', value: b },
    ]
    expect(confidence(rows(0.9, 0.1)).level).toBe('Decisive')
    expect(confidence(rows(0.38, 0.62))).toMatchObject({ level: 'Leaning', top: { label: 'B' } })
    expect(closeCallHint(rows(0.48, 0.41))).toContain('Close call between A and B, 7 pts apart')
    expect(closeCallHint(rows(0.9, 0.1))).toBeNull()
  })
  it('describes prompt changes by answer name, not position', () => {
    const before = examples[0].draft
    const after = cloneDraft(before)
    after.options = moveItem(after.options, 0, 2)
    after.options.push({ label: 'Sales', description: '' })
    const changes = diffDrafts(before, after)
    expect(changes.map((c) => c.field)).toEqual(['Answer “Sales”', 'Answer order'])
    expect(summarizeChanges(changes)).toBe('Added answer “Sales” + 1 more')
    expect(summarizeChanges(diffDrafts(before, before))).toBe('No prompt changes')
  })
})
