import { useState } from 'react'
import type { DecisionResult } from './domain'

/** A finished run. `promptKey` groups runs of the same prompt, even after a rename. */
export type Run = { n: number; promptKey: string; promptName: string; result: DecisionResult }

export const MAX_RUNS = 50
export const MAX_COMPARED = 4

/** Session-only run history, newest first, and the runs picked for comparison. */
export function useRunHistory() {
  const [runs, setRuns] = useState<Run[]>([])
  const [compared, setCompared] = useState<number[]>([])

  function add(run: Omit<Run, 'n'>) {
    setRuns((previous) =>
      [{ ...run, n: (previous[0]?.n ?? 0) + 1 }, ...previous].slice(0, MAX_RUNS),
    )
  }
  function toggleCompare(n: number) {
    setCompared((previous) =>
      previous.includes(n)
        ? previous.filter((item) => item !== n)
        : previous.length < MAX_COMPARED
          ? [...previous, n]
          : previous,
    )
  }
  return {
    runs,
    add,
    /** Most recent run of a prompt, and the one before it. */
    latest(promptKey: string) {
      const [current = null, previous = null] = runs.filter((run) => run.promptKey === promptKey)
      return { current, previous }
    },
    previousOf(run: Run) {
      return runs.find((other) => other.promptKey === run.promptKey && other.n < run.n) ?? null
    },
    compared: compared.flatMap((n) => runs.filter((run) => run.n === n)),
    isCompared: (n: number) => compared.includes(n),
    canCompareMore: compared.length < MAX_COMPARED,
    toggleCompare,
    clearCompare: () => setCompared([]),
    clear() {
      setRuns([])
      setCompared([])
    },
  }
}
export type RunHistory = ReturnType<typeof useRunHistory>
