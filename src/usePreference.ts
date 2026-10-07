import { useEffect, useState } from 'react'

/** A small setting kept in localStorage; it still applies in this tab when storage is blocked. */
export function usePreference<T>(key: string, parse: (stored: string | null) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return parse(localStorage.getItem(key))
    } catch {
      return parse(null)
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      /* Applies in this tab only. */
    }
  }, [key, value])
  return [value, setValue] as const
}
