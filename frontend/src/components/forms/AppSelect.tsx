import { ListBox, Select } from '@heroui/react'
import { useId } from 'react'

export type AppSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export function AppSelect({
  value,
  options,
  onChange,
  label,
  placeholder,
  disabled = false,
  className = '',
  showLabel = false,
}: {
  value: string
  options: AppSelectOption[]
  onChange: (value: string) => void
  label: string
  placeholder?: string
  disabled?: boolean
  className?: string
  showLabel?: boolean
}) {
  const labelId = useId()
  const select = (
    <Select
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
      className={showLabel ? '' : className}
      fullWidth
      isDisabled={disabled}
      onSelectionChange={(key) => onChange(key == null ? '' : String(key))}
      placeholder={placeholder}
      selectedKey={value || null}
    >
      <Select.Trigger className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 shadow-none">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={options}>
          {(option) => (
            <ListBox.Item
              id={option.value}
              isDisabled={option.disabled}
              textValue={option.label}
            >
              {option.label}
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  )

  if (!showLabel) return select

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-slate-600" id={labelId}>
        {label}
      </label>
      {select}
    </div>
  )
}
