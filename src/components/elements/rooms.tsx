import { useMemo } from "react"
import { RoomsTable } from "@/components/elements/rooms-table"
import { RoomSearch } from "@/components/elements/room-search"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { collectRooms, type Lesson, type RoomAvailabilityMode } from "@/lib/schedule"

interface RoomsProps {
  mode: RoomAvailabilityMode
  onModeChange: (mode: RoomAvailabilityMode) => void
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
  selectedRooms: string[]
  query: string
  onQueryChange: (query: string) => void
  onRoomsChange: (rooms: string[]) => void
}

export function Rooms({
  mode,
  onModeChange,
  lessons,
  loading,
  error,
  onRetry,
  selectedRooms,
  query,
  onQueryChange,
  onRoomsChange,
}: RoomsProps) {
  const rooms = useMemo(() => collectRooms(lessons).map((room) => room.name), [lessons])

  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        aria-label="Занятость аудиторий"
        onValueChange={(value) => {
          if (value === "free" || value === "busy") onModeChange(value)
        }}
      >
        <ToggleGroupItem value="free">Свободные</ToggleGroupItem>
        <ToggleGroupItem value="busy">Занятые</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-sm text-muted-foreground">
        Чётность недели не учитывается: занятия чётных и нечётных недель объединены.
      </p>
      <RoomSearch
        rooms={rooms}
        selectedRooms={selectedRooms}
        query={query}
        onQueryChange={onQueryChange}
        disabled={loading || rooms.length === 0}
        onChange={onRoomsChange}
      />
      <RoomsTable
        mode={mode}
        lessons={lessons}
        loading={loading}
        error={error}
        onRetry={onRetry}
        selectedRooms={selectedRooms}
      />
    </>
  )
}
