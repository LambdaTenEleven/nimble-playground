export type DecisionKind = 'choice' | 'noul' | 'score'
export type AnswerOption = { label: string; description: string }
export type Draft = { state: string; question: string; kind: DecisionKind; options: AnswerOption[] }
export type SavedPrompt = { id: string; name: string; draft: Draft; updatedAt: string }
export type KeepAlive = '5m' | '30m' | 0
export type Probability = { label: string; value: number }
export type DecisionResult = {
  kind: DecisionKind
  headline: string
  subtitle: string
  probabilities: Probability[]
  elapsedMs: number
  model: string
  inputTokens?: number
  outputTokens?: number
  raw: unknown
  draft: Draft
}

export const LIMITS = {
  state: 100_000,
  question: 8_000,
  label: 100,
  description: 4_000,
  options: 26,
  prompts: 100,
  fileBytes: 2 * 1024 * 1024,
}
export const kindNames: Record<DecisionKind, string> = {
  choice: 'Choose one',
  noul: 'Yes / no',
  score: 'Score',
}
export const blankDraft = (): Draft => ({
  state: '',
  question: '',
  kind: 'choice',
  options: [
    { label: '', description: '' },
    { label: '', description: '' },
  ],
})
export const cloneDraft = (draft: Draft): Draft => structuredClone(draft)

export const examples: { name: string; detail: string; draft: Draft }[] = [
  {
    name: 'Route a support ticket',
    detail: 'Choose one · 3 teams',
    draft: {
      state:
        'I upgraded to the annual plan yesterday, but I was charged twice. Could you refund the extra payment?',
      question: 'Which team should handle this support ticket?',
      kind: 'choice',
      options: [
        { label: 'Billing', description: 'Payments, subscriptions, and refunds' },
        { label: 'Technical', description: 'Bugs, errors, and integrations' },
        { label: 'Other', description: 'Anything outside billing or technical support' },
      ],
    },
  },
  {
    name: 'Spot a refund request',
    detail: 'Yes / no · intent detection',
    draft: {
      state: 'The headphones arrived broken. Please return my money; I do not want a replacement.',
      question: 'Does the customer explicitly request a refund?',
      kind: 'noul',
      options: [],
    },
  },
  {
    name: 'Assess urgency',
    detail: 'Score · 3 levels',
    draft: {
      state:
        'Our production checkout has been down for 20 minutes. No customers can complete a purchase.',
      question: 'How urgently does this issue need attention?',
      kind: 'score',
      options: [
        { label: 'Routine', description: 'Can wait for normal prioritization' },
        { label: 'Soon', description: 'Significant issue, but a workaround exists' },
        {
          label: 'Urgent',
          description: 'Critical service is unavailable; immediate attention needed',
        },
      ],
    },
  },
]

export function draftError(draft: Draft): string | null {
  if (!draft.state.trim()) return 'Add some input text to evaluate.'
  if (draft.state.length > LIMITS.state) return 'Input text must be at most 100,000 characters.'
  if (!draft.question.trim()) return 'Add a question for Nimble to answer.'
  if (draft.question.length > LIMITS.question)
    return 'The question must be at most 8,000 characters.'
  if (draft.kind === 'noul') return null
  if (draft.options.length < 2 || draft.options.length > LIMITS.options)
    return 'Use between 2 and 26 answers.'
  const names = new Set<string>()
  for (const option of draft.options) {
    const label = option.label.trim()
    if (!label || label.length > LIMITS.label)
      return 'Give every answer a name of at most 100 characters.'
    if (names.has(label)) return 'Answer names must be unique.'
    if (option.description.length > LIMITS.description)
      return 'Answer descriptions must be at most 4,000 characters.'
    names.add(label)
  }
  return null
}

export function buildRequest(draft: Draft, model: string, keepAlive: KeepAlive) {
  const error = draftError(draft)
  if (error) throw new Error(error)
  const question = {
    type: draft.kind,
    instructions: draft.question.trim(),
    ...(draft.kind === 'choice'
      ? {
          criteria: Object.fromEntries(
            draft.options.map((o) => [o.label.trim(), o.description.trim() || null]),
          ),
        }
      : {}),
    ...(draft.kind === 'score'
      ? {
          criteria: draft.options.map((o) =>
            [o.label.trim(), o.description.trim()].filter(Boolean).join(': '),
          ),
        }
      : {}),
  }
  const request = {
    model,
    state: draft.state,
    questions: { decision: question },
    keep_alive: keepAlive,
  }
  if (new TextEncoder().encode(JSON.stringify(request)).byteLength > 64 * 1024) {
    throw new Error(
      'This decision exceeds Ollama’s 64 KiB text request limit. Shorten the input or answer descriptions.',
    )
  }
  return request
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const probability = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
export const percent = (value: number) => `${(value * 100).toFixed(1)}%`

export function readResult(
  raw: unknown,
  draft: Draft,
  model: string,
  elapsedMs: number,
): DecisionResult {
  const invalid = () =>
    new Error(
      'Ollama returned an unexpected decision response. Check that Ollama is up to date, then retry.',
    )
  if (!isRecord(raw) || !isRecord(raw.answers) || !isRecord(raw.answers.decision)) throw invalid()
  const answer = raw.answers.decision
  if (answer.type !== draft.kind) throw invalid()
  let headline: string
  let subtitle: string
  let probabilities: Probability[]
  if (draft.kind === 'noul') {
    if (!probability(answer.noul)) throw invalid()
    headline = answer.noul >= 0.5 ? 'Yes' : 'No'
    subtitle = `${percent(answer.noul)} probability of yes`
    probabilities = [
      { label: 'Yes', value: answer.noul },
      { label: 'No', value: 1 - answer.noul },
    ]
  } else {
    const values = answer.probabilities
    if (!isRecord(values)) throw invalid()
    probabilities = draft.options.map((o, index) => {
      const value = values[draft.kind === 'choice' ? o.label.trim() : String(index)]
      if (!probability(value)) throw invalid()
      return { label: o.label.trim(), value }
    })
    if (draft.kind === 'choice') {
      if (
        typeof answer.choice !== 'string' ||
        !probabilities.some((p) => p.label === answer.choice)
      )
        throw invalid()
      headline = answer.choice
      subtitle = `${percent(probabilities.find((p) => p.label === answer.choice)!.value)} probability`
    } else {
      if (
        typeof answer.score !== 'number' ||
        !Number.isFinite(answer.score) ||
        answer.score < 0 ||
        answer.score > draft.options.length - 1
      )
        throw invalid()
      headline = `${answer.score.toFixed(2)} / ${draft.options.length - 1}`
      subtitle = `Weighted score · most likely: ${[...probabilities].sort((a, b) => b.value - a.value)[0].label}`
    }
  }
  const usage = isRecord(raw.usage) ? raw.usage : {}
  const tokenCount = (value: unknown) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
  return {
    kind: draft.kind,
    headline,
    subtitle,
    probabilities,
    elapsedMs,
    model,
    raw,
    draft: cloneDraft(draft),
    inputTokens: tokenCount(usage.input_tokens),
    outputTokens: tokenCount(usage.output_tokens),
  }
}
