import { useMemo } from "react"
import { FreeRoomsTable } from "@/components/elements/free-rooms-table"
import { RoomSearch } from "@/components/elements/room-search"
import { collectRooms, type Lesson } from "@/lib/schedule"

interface FreeRoomsProps {
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
  selectedRooms: string[]
  query: string
  onQueryChange: (query: string) => void
  onRoomsChange: (rooms: string[]) => void
}

export function FreeRooms({
  lessons,
  loading,
  error,
  onRetry,
  selectedRooms,
  query,
  onQueryChange,
  onRoomsChange,
}: FreeRoomsProps) {
  const rooms = useMemo(() => collectRooms(lessons).map((room) => room.name), [lessons])

  return (
    <>
      <RoomSearch
        rooms={rooms}
        selectedRooms={selectedRooms}
        query={query}
        onQueryChange={onQueryChange}
        disabled={loading || rooms.length === 0}
        onChange={onRoomsChange}
      />
      <FreeRoomsTable
        lessons={lessons}
        loading={loading}
        error={error}
        onRetry={onRetry}
        selectedRooms={selectedRooms}
      />
    </>
  )
}
