import { useId } from "react"
import { GroupSearch } from "@/components/elements/group-search"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GROUPING_LEVELS, type GroupingSearchState } from "@/lib/grouping"

interface GroupingFiltersProps {
  groups: string[]
  search: GroupingSearchState
  onSearchChange: (updates: Partial<GroupingSearchState>) => void
  options: string[][]
  excludedValues: string[][]
  onChange: (level: number, excluded: string[]) => void
}

export function GroupingFilters({
  options,
  excludedValues,
  onChange,
  groups,
  search,
  onSearchChange,
}: GroupingFiltersProps) {
  const id = useId()

  return (
    <div className="mb-4 space-y-3">
      {options.map((values, level) => (
        <div key={GROUPING_LEVELS[level]} className="space-y-2">
          <p id={`${id}-${level}`} className="text-sm font-medium">
            {GROUPING_LEVELS[level]}
          </p>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            spacing={2}
            className="flex-wrap"
            aria-labelledby={`${id}-${level}`}
            value={values.filter((value) => !excludedValues[level]?.includes(value))}
            onValueChange={(selected) =>
              onChange(
                level,
                values.filter((value) => !selected.includes(value)),
              )
            }
          >
            {values.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ))}
      <div>
        <p className="text-sm font-medium">Группы</p>
        <GroupSearch
          groups={groups}
          selectedGroups={search.selectedGroups}
          query={search.groupQuery}
          onQueryChange={(groupQuery) => onSearchChange({ groupQuery })}
          onChange={(selectedGroups) => onSearchChange({ selectedGroups })}
        />
        <div className="flex items-center gap-2">
          <Switch
            id={`${id}-exclude`}
            checked={search.excludeGroups}
            onCheckedChange={(excludeGroups) => onSearchChange({ excludeGroups })}
          />
          <label htmlFor={`${id}-exclude`} className="text-sm">
            Исключать выбранные группы
          </label>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {search.selectedGroups.length === 0
            ? "Группы не выбраны — показаны все группы, подходящие под остальные фильтры."
            : search.excludeGroups
              ? "Выбранные группы скрыты."
              : "Показаны только выбранные группы."}
        </p>
      </div>
      <div className="w-[27.5rem] max-w-full space-y-2">
        <label htmlFor={`${id}-cells`} className="text-sm font-medium">
          Поиск по ячейкам
        </label>
        <Input
          id={`${id}-cells`}
          type="search"
          placeholder="Пара, преподаватель или аудитория…"
          value={search.cellQuery}
          onChange={(event) => onSearchChange({ cellQuery: event.target.value })}
        />
      </div>
    </div>
  )
}
