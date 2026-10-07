import { useEffect, useRef, useState } from 'react'
import { cloneDraft } from './domain'
import type { DecisionResult, Draft, KeepAlive } from './domain'
import { OLLAMA_URL, runDecision } from './ollama'

export type DecisionJob = {
  key: string
  draft: Draft
  onResult: (result: DecisionResult) => void
  onError: (message: string) => void
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Retry.')

/** Runs decisions one at a time. Cancelling aborts the active request and skips queued ones. */
export function useDecisionRunner(onSettled?: () => void, baseUrl = OLLAMA_URL) {
  const controller = useRef<AbortController | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [queued, setQueued] = useState<string[]>([])
  useEffect(() => () => controller.current?.abort(), [])

  async function run(jobs: DecisionJob[], model: string, keepAlive: KeepAlive) {
    if (controller.current || !jobs.length) return
    const abort = new AbortController()
    controller.current = abort
    // Snapshot drafts so later edits cannot change a queued request.
    const snapshots = jobs.map((job) => ({ ...job, draft: cloneDraft(job.draft) }))
    setQueued(snapshots.map((job) => job.key))
    try {
      for (const job of snapshots) {
        if (abort.signal.aborted) break
        setActive(job.key)
        setQueued((keys) => keys.filter((key) => key !== job.key))
        try {
          const result = await runDecision(job.draft, model, keepAlive, abort.signal, baseUrl)
          if (!abort.signal.aborted) job.onResult(result)
        } catch (e) {
          job.onError(message(e))
        }
      }
    } finally {
      controller.current = null
      setActive(null)
      setQueued([])
      onSettled?.()
    }
  }

  return {
    run,
    cancel: () => controller.current?.abort(),
    busy: active !== null,
    active,
    isPending: (key: string) => active === key || queued.includes(key),
  }
}
