import { useEffect, useRef, useState } from 'react'
import { moveItem } from '../analysis'
import { LIMITS } from '../domain'
import type { AnswerOption, DecisionKind } from '../domain'
import { Icon } from './Icon'

const answerKey = (kind: DecisionKind, index: number) =>
  kind === 'score' ? String(index) : String.fromCharCode(65 + index)

/** Editable answers that can be reordered by dragging the handle or with ↑ / ↓ on it. */
export function AnswerList({
  kind,
  options,
  onChange,
}: {
  kind: DecisionKind
  options: AnswerOption[]
  onChange: (options: AnswerOption[]) => void
}) {
  const [grabbed, setGrabbed] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const handles = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (focusIndex === null) return
    handles.current[focusIndex]?.focus()
    setFocusIndex(null)
  }, [focusIndex])

  const update = (index: number, patch: Partial<AnswerOption>) =>
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  function move(from: number, to: number) {
    if (to < 0 || to >= options.length || from === to) return
    onChange(moveItem(options, from, to))
    setFocusIndex(to)
    setAnnouncement(
      `Moved ${options[from].label || 'answer'} to position ${to + 1} of ${options.length}.`,
    )
  }
  function endDrag() {
    setGrabbed(null)
    setDragging(null)
    setDropAt(null)
  }
  // A drop between rows is an insertion point 0…length; skip points that would not move the row.
  const showDropLine = (point: number) =>
    dragging !== null && dropAt === point && point !== dragging && point !== dragging + 1

  return (
    <div>
      <ul className="rounded-box border border-base-300 bg-base-100">
        {options.map((option, index) => (
          <li key={index} className="relative">
            {showDropLine(index) && <DropLine />}
            <div
              draggable={grabbed === index}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', option.label)
                setDragging(index)
              }}
              onDragOver={(e) => {
                if (dragging === null) return
                e.preventDefault()
                const box = e.currentTarget.getBoundingClientRect()
                setDropAt(e.clientY < box.top + box.height / 2 ? index : index + 1)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging !== null && dropAt !== null)
                  move(dragging, dropAt > dragging ? dropAt - 1 : dropAt)
                endDrag()
              }}
              onDragEnd={endDrag}
              className={`answer-row border-b border-base-300 ${dragging === index ? 'opacity-50' : ''}`}
            >
              <button
                ref={(element) => {
                  handles.current[index] = element
                }}
                type="button"
                className="btn btn-ghost btn-xs btn-square cursor-grab"
                aria-label={`Reorder ${option.label || `answer ${index + 1}`}, position ${index + 1} of ${options.length}`}
                title="Drag to reorder, or use ↑ ↓"
                onPointerDown={() => setGrabbed(index)}
                onPointerUp={() => dragging === null && setGrabbed(null)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
                  e.preventDefault()
                  move(index, index + (e.key === 'ArrowUp' ? -1 : 1))
                }}
              >
                <Icon name="grip" size={14} strokeWidth={3} />
              </button>
              <span className="text-center font-mono text-xs text-base-content/70">
                {answerKey(kind, index)}
              </span>
              <input
                aria-label={`Answer ${index + 1} name`}
                className="input input-ghost input-sm w-full min-w-0 font-medium"
                value={option.label}
                maxLength={LIMITS.label}
                placeholder="Name"
                onChange={(e) => update(index, { label: e.target.value })}
              />
              <textarea
                aria-label={`Answer ${index + 1} description`}
                rows={1}
                className="textarea textarea-ghost textarea-sm min-h-8 w-full min-w-0 resize-y"
                value={option.description}
                maxLength={LIMITS.description}
                placeholder="Optional description"
                onChange={(e) => update(index, { description: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label={`Remove answer ${index + 1}`}
                disabled={options.length <= 2}
                onClick={() => onChange(options.filter((_, i) => i !== index))}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
            {index === options.length - 1 && showDropLine(options.length) && <DropLine end />}
          </li>
        ))}
        <li>
          <button
            type="button"
            className="btn btn-ghost btn-sm m-1 text-primary"
            disabled={options.length >= LIMITS.options}
            onClick={() => onChange([...options, { label: '', description: '' }])}
          >
            <Icon name="plus" size={14} />
            Add answer
          </button>
        </li>
      </ul>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}

function DropLine({ end = false }: { end?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-x-3 z-10 h-0.5 rounded-full bg-primary ${end ? '-bottom-px' : '-top-px'}`}
    />
  )
}
