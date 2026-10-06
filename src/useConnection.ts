import { useCallback, useEffect, useRef, useState } from 'react'
import { checkConnection } from './ollama'
import type { Connection } from './ollama'

export function useConnection() {
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
      const result = await checkConnection(controller.signal)
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
  }, [])
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 15_000)
    return () => {
      clearInterval(timer)
      active.current?.abort()
    }
  }, [refresh])
  return { connection, checking, error, refresh }
}
