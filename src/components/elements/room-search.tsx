import { MultiSelectSearch } from "@/components/ui/multi-select-search"

interface RoomSearchProps {
  rooms: string[]
  selectedRooms: string[]
  query: string
  onQueryChange: (query: string) => void
  disabled?: boolean
  onChange: (rooms: string[]) => void
}

function normalizeQuery(value: string) {
  return value.toUpperCase().replace(/M/g, "М").replace(/Y/g, "У").replace(/[\s-]/g, "")
}

export function RoomSearch({ rooms, selectedRooms, ...props }: RoomSearchProps) {
  return (
    <MultiSelectSearch
      {...props}
      items={rooms}
      selectedValues={selectedRooms}
      normalizeQuery={normalizeQuery}
      labels={{
        input: "Аудитория",
        options: "Аудитории",
        placeholder: "Найти аудитории…",
        remove: (value) => `Убрать аудиторию ${value}`,
        clear: "Очистить поиск",
        clearTitle: "Очистить все аудитории",
        empty: "Аудитории не найдены",
        allSelected: "Все аудитории выбраны",
      }}
    />
  )
}
