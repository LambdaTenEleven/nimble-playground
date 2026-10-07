import { useId } from 'react'

export type Segment<T extends string> = { value: T; label: string }

/** A small set of mutually exclusive options, rendered as daisyUI box tabs. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className = '',
}: {
  label: string
  options: Segment<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className={`tabs tabs-box tabs-sm ${className}`}>
      {options.map((option) => (
        <input
          key={option.value}
          type="radio"
          name={name}
          className="tab"
          aria-label={option.label}
          checked={value === option.value}
          disabled={disabled}
          onChange={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}
