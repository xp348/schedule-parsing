import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { WeekSelection } from "@/lib/week-parity"

interface WeekSelectorProps {
  value: WeekSelection
  onChange: (value: WeekSelection) => void
}

export function WeekSelector({ value, onChange }: WeekSelectorProps) {
  return (
    <div className="my-4 space-y-2">
      <ToggleGroup
        className="max-w-full flex-wrap"
        type="single"
        variant="outline"
        value={value}
        aria-label="Неделя расписания"
        onValueChange={(next) => {
          if (next === "all" || next === "even" || next === "odd") onChange(next)
        }}
      >
        <ToggleGroupItem value="all">Обе недели</ToggleGroupItem>
        <ToggleGroupItem value="even">Чётная</ToggleGroupItem>
        <ToggleGroupItem value="odd">Нечётная</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-sm text-muted-foreground">
        Занятия без определённой чётности показываются в обоих вариантах.
      </p>
    </div>
  )
}
