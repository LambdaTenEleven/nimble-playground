import type { Connection } from '../ollama'
import { OLLAMA_URL } from '../ollama'
import { useState } from 'react'

function Command({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-200 p-2 pl-3">
        <code className="break-all text-sm">{children}</code>
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(children)
              setCopied(true)
              setError(false)
            } catch {
              setError(true)
            }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {error && (
        <p role="status" className="mt-1 text-xs">
          Copy is unavailable. Select the command above to copy it manually.
        </p>
      )}
    </div>
  )
}

export function SetupGuide({ connection }: { connection: Connection | null }) {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <p className="text-base-content/70">
        Nimble runs on your computer through Ollama. This page cannot install or start it for you.
      </p>
      <ol className="space-y-5">
        <li>
          <h3 className="font-semibold">1. Install or update Ollama</h3>
          <p className="mt-1 text-base-content/70">
            Use Ollama 0.35 or newer for decision models.
            {connection && ` Your version: ${connection.version}.`}
          </p>
          <a
            className="btn btn-sm mt-2"
            href="https://ollama.com/download"
            target="_blank"
            rel="noreferrer"
          >
            Download Ollama ↗
          </a>
        </li>
        <li>
          <h3 className="font-semibold">2. Start Ollama</h3>
          <p className="mt-1 text-base-content/70">
            Open the Ollama desktop app. For a CLI installation, run this in a terminal and leave it
            running:
          </p>
          <Command>ollama serve</Command>
          <p className="mt-2 text-xs text-base-content/65">
            If the port is already in use, Ollama may already be running.
          </p>
        </li>
        <li>
          <h3 className="font-semibold">3. Download Nimble</h3>
          <p className="mt-1 text-base-content/70">
            Run this in another terminal. Wait for the model download to finish, then retry the
            connection.
          </p>
          <Command>ollama pull nimble</Command>
        </li>
      </ol>
      <details className="rounded-lg border border-base-300 p-3">
        <summary className="cursor-pointer font-medium">Still cannot connect?</summary>
        <div className="mt-3 space-y-2 text-base-content/70">
          <p>
            Open this playground on <code>http://127.0.0.1:5173</code> or{' '}
            <code>http://localhost:5173</code>. It connects directly to{' '}
            <code className="break-all">{OLLAMA_URL}</code>.
          </p>
          <p>
            Allow local-network access if your browser asks. Check that Ollama uses its default
            port, 11434, and that your firewall allows local connections.
          </p>
          <p>
            If you changed Ollama’s allowed origins, add this page’s exact origin to{' '}
            <code>OLLAMA_ORIGINS</code> and restart Ollama. Standard localhost origins are allowed
            by default.
          </p>
          <p>
            The frontend cannot tell whether Ollama is missing, stopped, or blocked by the browser.
          </p>
        </div>
      </details>
      <p className="text-xs text-base-content/65">
        Once downloaded, decisions run locally. The first run loads Nimble into memory and may take
        longer. Use “Unload model” to release memory without deleting the download.
      </p>
    </div>
  )
}
