import { useEffect, useRef, useState } from 'react'
import type { SavedPrompt } from './domain'
import { LIMITS } from './domain'
import { readLibrary, seedExamples, serializeBundle, writeLibrary } from './storage'
import type { LibraryData } from './storage'

export function usePromptLibrary() {
  const [initial] = useState(() => {
    const read = readLibrary()
    return { ...(!read.error ? seedExamples(read) : read), error: read.error }
  })
  const [library, setLibrary] = useState<LibraryData>(initial)
  const current = useRef<LibraryData>(initial)
  const [error, setError] = useState<string | null>(initial.error)
  const [volatile, setVolatile] = useState(false)
  const initialized = useRef(false)

  function persist(next: LibraryData) {
    if (
      next.prompts.length > LIMITS.prompts ||
      new Blob([serializeBundle(next.prompts)]).size > LIMITS.fileBytes
    )
      throw new Error(
        'The library is full (100 prompts / 2 MB). Export and remove prompts to make room.',
      )
    current.current = next
    setLibrary(next)
    try {
      if (initial.error)
        throw new Error(
          'The unreadable library was preserved. Export your changes before leaving this page.',
        )
      writeLibrary(next.prompts, undefined, next.seededExampleIds)
      setError(null)
      setVolatile(false)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the library.')
      setVolatile(true)
      return false
    }
  }
  useEffect(() => {
    if (initialized.current || initial.error) return
    initialized.current = true
    persist(initial)
  }, [])

  return {
    prompts: library.prompts,
    current,
    error,
    volatile,
    commit: (prompts: SavedPrompt[]) => persist({ ...current.current, prompts }),
    restore: () => persist(seedExamples(current.current, true)),
  }
}
