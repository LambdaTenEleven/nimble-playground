import { useState } from 'react'
import type { SavedPrompt } from '../domain'
import { downloadLibrary, serializeBundle } from '../storage'
import { Modal } from './Modal'

export function ExportDialog({
  prompts,
  onClose,
}: {
  prompts: SavedPrompt[]
  onClose: () => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const json = serializeBundle(prompts)
  return (
    <Modal title="Export your prompt library" onClose={onClose}>
      <p className="mb-4 text-sm leading-relaxed text-base-content/70">
        Download {prompts.length} saved prompt{prompts.length === 1 ? '' : 's'} as a JSON file. You
        can also copy the JSON into a text file and save it with a <code>.json</code> extension.
      </p>
      <label htmlFor="export-json" className="mb-2 block text-sm font-medium">
        Prompt library JSON
      </label>
      <textarea
        id="export-json"
        readOnly
        className="textarea h-52 w-full font-mono text-xs"
        value={json}
      />
      <p className="mt-2 text-xs text-base-content/65">
        Includes the saved input text. Review it before sharing.
      </p>
      {status && (
        <p role="status" className="mt-3 text-sm">
          {status}
        </p>
      )}
      <div className="modal-action flex-wrap">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json)
              setStatus('JSON copied. Paste it into a text file to keep a backup.')
            } catch {
              setStatus(
                'Clipboard access is unavailable. Select the JSON above and copy it manually.',
              )
            }
          }}
        >
          Copy JSON
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            try {
              downloadLibrary(prompts)
              setStatus(
                'Download requested. If your browser does not save the file, use Copy JSON instead.',
              )
            } catch {
              setStatus('Download is unavailable in this browser. Use Copy JSON instead.')
            }
          }}
        >
          Download JSON
        </button>
      </div>
    </Modal>
  )
}
