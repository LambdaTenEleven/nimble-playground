import { CopyButton } from './CopyButton'

/** A terminal command with a copy button. */
export function CopyCommand({ command }: { command: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-box bg-neutral p-2 pl-3 text-neutral-content">
      <code className="min-w-0 flex-1 break-all font-mono text-sm">{command}</code>
      <CopyButton text={command} className="btn btn-sm btn-ghost text-neutral-content" />
    </div>
  )
}
