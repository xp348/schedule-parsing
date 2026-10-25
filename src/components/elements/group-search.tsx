import { MultiSelectSearch } from "@/components/ui/multi-select-search"

interface GroupSearchProps {
  groups: string[]
  selectedGroups: string[]
  query: string
  onQueryChange: (query: string) => void
  onChange: (groups: string[]) => void
}

export function GroupSearch({ groups, selectedGroups, ...props }: GroupSearchProps) {
  return (
    <MultiSelectSearch
      {...props}
      items={groups}
      selectedValues={selectedGroups}
      normalizeQuery={(value) => value.toLocaleUpperCase("ru").replace(/[\s–—-]/g, "")}
      labels={{
        input: "Группы",
        options: "Учебные группы",
        placeholder: "Найти группы…",
        remove: (value) => `Убрать группу ${value}`,
        clear: "Очистить выбранные группы",
        clearTitle: "Очистить все группы",
        empty: "Группы не найдены",
        allSelected: "Все группы выбраны",
      }}
    />
  )
}
