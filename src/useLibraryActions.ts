import { useState } from 'react'
import { LIMITS, cloneDraft } from './domain'
import type { SavedPrompt } from './domain'
import { mergeImport, parseBundle, uniqueName } from './storage'
import { blankDocument, documentFrom } from './useEditorSession'
import type { EditorDocument, EditorSession } from './useEditorSession'
import type { usePromptLibrary } from './usePromptLibrary'

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Retry.')

/** Save, delete with undo, and import, keeping the open editor consistent with the library. */
export function useLibraryActions(
  library: ReturnType<typeof usePromptLibrary>,
  session: EditorSession,
  notify: (message: string) => void,
) {
  const [deleted, setDeleted] = useState<SavedPrompt[]>([])
  const current = () => library.current.current.prompts

  /** Writes a document to the library. False when it could not be added at all. */
  function save(document: EditorDocument = session.document): boolean {
    const existing = current().find((p) => p.id === document.id)
    const prompt: SavedPrompt = {
      id: document.id,
      name: document.name,
      draft: cloneDraft(document.draft),
      updatedAt: new Date().toISOString(),
      ...(existing?.exampleId ? { exampleId: existing.exampleId } : {}),
      ...(document.cases.length ? { cases: structuredClone(document.cases) } : {}),
    }
    try {
      library.commit([prompt, ...current().filter((p) => p.id !== document.id)])
      if (document.id === session.document.id) session.saved(prompt)
      return true
    } catch (e) {
      session.setSaveError(errorText(e))
      return false
    }
  }

  /** Why a name cannot be used for the open prompt, if it cannot. */
  function nameError(name: string): string | null {
    if (name.length > 100) return 'Enter a name of up to 100 characters.'
    if (current().some((p) => p.name === name && p.id !== session.document.id))
      return 'A prompt already has that name. Choose another name.'
    return null
  }

  function remove(prompt: SavedPrompt) {
    try {
      const remaining = current().filter((p) => p.id !== prompt.id)
      library.commit(remaining)
      // The open prompt would be saved again on its next edit, so open another one instead.
      if (session.document.id === prompt.id)
        session.load(
          remaining[0]
            ? documentFrom(remaining[0])
            : blankDocument(uniqueName('Untitled prompt', remaining)),
        )
      setDeleted((previous) => [...previous, prompt])
    } catch (e) {
      notify(errorText(e))
    }
  }

  function undoDelete() {
    const prompt = deleted.at(-1)
    if (!prompt) return
    try {
      const restored = {
        ...prompt,
        name: uniqueName(prompt.name, current()),
        id: current().some((p) => p.id === prompt.id) ? crypto.randomUUID() : prompt.id,
      }
      library.commit([restored, ...current()])
      setDeleted((previous) => previous.slice(0, -1))
      notify(`Restored “${restored.name}”.`)
    } catch (e) {
      notify(errorText(e))
    }
  }

  async function importFile(file: File) {
    try {
      if (file.size > LIMITS.fileBytes) throw new Error('Choose a JSON file smaller than 2 MB.')
      const imported = parseBundle(await file.text())
      if (!imported.length) throw new Error('This export contains no prompts.')
      if (library.commit(mergeImport(current(), imported)))
        notify(`Imported ${imported.length} prompt${imported.length === 1 ? '' : 's'}.`)
    } catch (e) {
      notify(errorText(e))
    }
  }

  function restoreExamples() {
    try {
      if (library.restore()) notify('Original examples restored. Your edited prompts were kept.')
    } catch (e) {
      notify(errorText(e))
    }
  }

  return {
    save,
    nameError,
    remove,
    undoDelete,
    importFile,
    restoreExamples,
    deleted,
    dismissDeleted: () => setDeleted([]),
    copyName: (name: string) => uniqueName(`${name} (copy)`, current()),
    newName: () => uniqueName('Untitled prompt', current()),
  }
}
