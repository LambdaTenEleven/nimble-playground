import { describe, expect, it } from 'vitest'
import { blankDraft, buildRequest, cloneDraft, draftError, examples, readResult } from './domain'

describe('decision protocol', () => {
  it('checks the UTF-8 size of the whole request, including multibyte input', () => {
    const draft = { ...examples[1].draft, state: '😀'.repeat(17_000) }
    expect(() => buildRequest(draft, 'nimble', 0)).toThrow('64 KiB')
  })
  it('serializes each supported question type without chat messages', () => {
    const choice = buildRequest(examples[0].draft, 'nimble:latest', '5m')
    expect(choice).toMatchObject({
      model: 'nimble:latest',
      questions: {
        decision: { type: 'choice', criteria: { Billing: 'Payments, subscriptions, and refunds' } },
      },
      keep_alive: '5m',
    })
    expect(buildRequest(examples[1].draft, 'nimble', 0).questions.decision).not.toHaveProperty(
      'criteria',
    )
    expect(buildRequest(examples[2].draft, 'nimble', '30m').questions.decision.criteria).toEqual([
      'Routine: Can wait for normal prioritization',
      'Soon: Significant issue, but a workaround exists',
      'Urgent: Critical service is unavailable; immediate attention needed',
    ])
    expect(choice).not.toHaveProperty('messages')
  })
  it('rejects empty input, duplicate trimmed names, and missing answers before fetching', () => {
    expect(draftError(blankDraft())).toContain('input text')
    const draft = cloneDraft(examples[0].draft)
    draft.options[1].label = ' Billing '
    expect(() => buildRequest(draft, 'nimble', 0)).toThrow('unique')
    draft.options = []
    expect(draftError(draft)).toContain('2 and 26')
  })
  it('preserves reserved object names as safe JSON keys', () => {
    const draft = cloneDraft(examples[0].draft)
    draft.options[0].label = '__proto__'
    const request = buildRequest(draft, 'nimble', 0)
    expect(JSON.parse(JSON.stringify(request)).questions.decision.criteria.__proto__).toBe(
      'Payments, subscriptions, and refunds',
    )
    expect({}).not.toHaveProperty('polluted')
  })
  it('uses the score returned by Ollama, rather than rounding it to a label', () => {
    const result = readResult(
      {
        answers: {
          decision: {
            type: 'score',
            score: 0.815,
            probabilities: { '0': 0.378, '1': 0.429, '2': 0.193 },
          },
        },
        usage: { input_tokens: 841, output_tokens: 4 },
      },
      examples[2].draft,
      'nimble',
      20,
    )
    expect(result.headline).toBe('0.81 / 2')
    expect(result.subtitle).toContain('most likely: Soon')
    expect(result.probabilities[0].label).toBe('Routine')
    expect(result.inputTokens).toBe(841)
  })
  it('preserves zero and one probabilities, including a no decision', () => {
    const result = readResult(
      { answers: { decision: { type: 'noul', noul: 0 } } },
      examples[1].draft,
      'nimble',
      20,
    )
    expect(result.headline).toBe('No')
    expect(result.probabilities).toEqual([
      { label: 'Yes', value: 0 },
      { label: 'No', value: 1 },
    ])
  })
  it.each([
    null,
    {},
    { answers: { decision: { type: 'noul', noul: 1.4 } } },
    { answers: { decision: { type: 'choice', choice: 'unknown', probabilities: {} } } },
  ])('rejects malformed or mismatched responses: %j', (raw) => {
    expect(() => readResult(raw, examples[1].draft, 'nimble', 1)).toThrow('unexpected')
  })
})
