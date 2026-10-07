import { kindNames } from './domain'
import type { Draft, Probability } from './domain'

/** Rule-based reading of a probability distribution; no language model involved. */
export type ConfidenceLevel = 'Decisive' | 'Leaning' | 'Close call'
export type Confidence = {
  top: Probability
  runnerUp: Probability | null
  margin: number
  level: ConfidenceLevel
}

export const points = (value: number) => Math.round(value * 100)

export function confidence(probabilities: Probability[]): Confidence {
  const [top, runnerUp = null] = [...probabilities].sort((a, b) => b.value - a.value)
  const margin = top.value - (runnerUp?.value ?? 0)
  const level = margin >= 0.5 ? 'Decisive' : margin >= 0.2 ? 'Leaning' : 'Close call'
  return { top, runnerUp, margin, level }
}

/** Change in points per current answer, or null for an answer the previous run did not have. */
export function probabilityChanges(current: Probability[], previous: Probability[]) {
  return current.map((row) => {
    const before = previous.find((p) => p.label === row.label)
    return before ? points(row.value) - points(before.value) : null
  })
}

export function closeCallHint(probabilities: Probability[]): string | null {
  const { top, runnerUp, margin, level } = confidence(probabilities)
  if (level !== 'Close call' || !runnerUp) return null
  return `Close call between ${top.label} and ${runnerUp.label}, ${points(margin)} pts apart. If their descriptions overlap, make them more distinct, then run again.`
}

export type Change = { field: string; before: string | null; after: string | null }

export function diffDrafts(before: Draft, after: Draft): Change[] {
  const changes: Change[] = []
  const text = (field: string, a: string, b: string) => {
    if (a !== b) changes.push({ field, before: a, after: b })
  }
  text('Input text', before.state, after.state)
  text('Question', before.question, after.question)
  text('Format', kindNames[before.kind], kindNames[after.kind])
  if (before.kind === 'noul' && after.kind === 'noul') return changes
  const describe = (o: Draft['options'][number]) =>
    o.description.trim() ? `${o.label.trim()}: ${o.description.trim()}` : o.label.trim()
  for (const option of before.options) {
    const match = after.options.find((o) => o.label.trim() === option.label.trim())
    if (!match)
      changes.push({
        field: `Answer “${option.label.trim()}”`,
        before: describe(option),
        after: null,
      })
    else
      text(
        `“${option.label.trim()}” description`,
        option.description.trim(),
        match.description.trim(),
      )
  }
  for (const option of after.options)
    if (!before.options.some((o) => o.label.trim() === option.label.trim()))
      changes.push({
        field: `Answer “${option.label.trim()}”`,
        before: null,
        after: describe(option),
      })
  const shared = (from: Draft, to: Draft) =>
    from.options
      .map((o) => o.label.trim())
      .filter((label) => to.options.some((o) => o.label.trim() === label))
  const order = [shared(before, after), shared(after, before)]
  if (order[0].join('\n') !== order[1].join('\n'))
    changes.push({
      field: 'Answer order',
      before: order[0].join(' · '),
      after: order[1].join(' · '),
    })
  return changes
}

/** One line for a history entry, e.g. "Added answer “Other” + 1 more". */
export function summarizeChanges(changes: Change[]): string {
  if (!changes.length) return 'No prompt changes'
  const [first] = changes
  const lead =
    first.before === null
      ? `Added ${lowerFirst(first.field)}`
      : first.after === null
        ? `Removed ${lowerFirst(first.field)}`
        : `Edited ${lowerFirst(first.field)}`
  return changes.length > 1 ? `${lead} + ${changes.length - 1} more` : lead
}

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1)

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}
