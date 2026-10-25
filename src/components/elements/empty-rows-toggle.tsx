import { useId } from "react"
import { Switch } from "@/components/ui/switch"

interface EmptyRowsToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function EmptyRowsToggle({ checked, onCheckedChange }: EmptyRowsToggleProps) {
  const id = useId()
  return (
    <div className="my-4 flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id} className="text-sm">
        Показывать пустые дни и время
      </label>
    </div>
  )
}
