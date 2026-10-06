import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    if (!dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose} onClose={onClose}>
      <div className="modal-box max-w-xl">
        <h2 className="mb-5 text-xl font-semibold">{title}</h2>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close dialog">Close</button>
      </form>
    </dialog>
  )
}
