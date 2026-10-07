import { useCallback, useEffect, useRef, useState } from 'react'
import { checkConnection, OLLAMA_URL } from './ollama'
import type { Connection } from './ollama'

export function useConnection(baseUrl = OLLAMA_URL) {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const active = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setChecking(true)
    try {
      const result = await checkConnection(controller.signal, baseUrl)
      if (!controller.signal.aborted) {
        setConnection(result)
        setError(null)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setConnection(null)
        setError(error instanceof Error ? error.message : 'Could not check Ollama.')
      }
    } finally {
      if (!controller.signal.aborted) setChecking(false)
    }
  }, [baseUrl])
  const ready = !!connection?.supported && connection.models.length > 0
  useEffect(() => {
    void refresh()
    return () => active.current?.abort()
  }, [refresh])
  // Poll faster while setup is incomplete, so the checklist updates on its own.
  useEffect(() => {
    const timer = setInterval(
      () => {
        if (document.visibilityState === 'visible') void refresh()
      },
      ready ? 15_000 : 5_000,
    )
    return () => clearInterval(timer)
  }, [refresh, ready])
  return { connection, ready, checking, error, refresh }
}
