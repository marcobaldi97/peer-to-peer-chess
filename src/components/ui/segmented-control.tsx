import { cn } from 'lib/utils'

export type SegmentedControlOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  name: string
  value: T
  onChange: (value: T) => void
  options: SegmentedControlOption<T>[]
  className?: string
}

export function SegmentedControl<T extends string>({
  name,
  value,
  onChange,
  options,
  className
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded border border-divider',
        className
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'relative flex flex-1 cursor-pointer items-center justify-center gap-1.5',
            'border-l border-divider px-3 font-heading text-sm font-semibold first:border-l-0',
            'has-[:checked]:text-accent has-[:checked]:ring-1 has-[:checked]:ring-inset has-[:checked]:ring-accent',
            'has-[:not(:checked)]:hover:bg-text/5'
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="absolute size-0 opacity-0"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
