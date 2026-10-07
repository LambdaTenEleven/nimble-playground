import { useState } from 'react'
import { blankDraft, cloneDraft } from './domain'
import type { Draft, SavedPrompt, TestCase } from './domain'

/** A prompt open in the editor. Its id is fixed up front; it joins the library on its first save. */
export type EditorDocument = { draft: Draft; name: string; id: string; cases: TestCase[] }

const snapshot = (document: EditorDocument) =>
  JSON.stringify([document.name, document.draft, document.cases])
const copy = (document: EditorDocument): EditorDocument => ({
  ...document,
  draft: cloneDraft(document.draft),
  cases: structuredClone(document.cases),
})

export const documentFrom = (prompt: SavedPrompt): EditorDocument =>
  copy({ draft: prompt.draft, name: prompt.name, id: prompt.id, cases: prompt.cases ?? [] })
export const blankDocument = (name: string): EditorDocument => ({
  draft: blankDraft(),
  name,
  id: crypto.randomUUID(),
  cases: [],
})

/** The prompt open in the editor, the version last written to the library, and its messages. */
export function useEditorSession(initial?: SavedPrompt) {
  const [document, setDocument] = useState<EditorDocument>(() =>
    initial ? documentFrom(initial) : blankDocument('Untitled prompt'),
  )
  const [baseline, setBaseline] = useState(() => snapshot(document))
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  return {
    document,
    setDocument,
    /** Whether the editor has changes the library does not have yet. */
    dirty: snapshot(document) !== baseline,
    error,
    setError,
    saveError,
    setSaveError,
    load(next: EditorDocument) {
      setDocument(copy(next))
      setBaseline(snapshot(next))
      setSaveError(null)
      setError(null)
    },
    saved(prompt: SavedPrompt) {
      setBaseline(snapshot(documentFrom(prompt)))
      setSaveError(null)
    },
  }
}
export type EditorSession = ReturnType<typeof useEditorSession>
