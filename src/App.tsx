import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FreeRoomsTable } from "@/components/free-rooms-table"
import { RoomSearch } from "@/components/room-search"
import { useSchedule } from "@/hooks/use-schedule"
import { useRoomSearch } from "@/hooks/use-room-search"
import { collectRooms } from "@/lib/schedule"

export default function App() {
  const { lessons, loading, error, reload } = useSchedule()
  const { selectedRooms, query, setSelectedRooms, setQuery } = useRoomSearch()
  const rooms = useMemo(() => collectRooms(lessons).map((room) => room.name), [lessons])

  return (
    <main className="schedule-page">
      <Tabs defaultValue="rooms" className="schedule-tabs">
        <TabsList className="page-tabs" aria-label="Разделы расписания">
          <TabsTrigger value="groups" className="page-tab">
            Группировка
          </TabsTrigger>
          <TabsTrigger value="search" className="page-tab">
            Поиск
          </TabsTrigger>
          <TabsTrigger value="rooms" className="page-tab">
            Свободные аудитории
          </TabsTrigger>
        </TabsList>
        <TabsContent value="groups" className="page-panel">
          <p className="placeholder">Раздел «Группировка» в разработке.</p>
        </TabsContent>
        <TabsContent value="search" className="page-panel">
          <p className="placeholder">Раздел «Поиск» в разработке.</p>
        </TabsContent>
        <TabsContent value="rooms" className="page-panel">
          <RoomSearch
            rooms={rooms}
            selectedRooms={selectedRooms}
            query={query}
            onQueryChange={setQuery}
            disabled={loading || rooms.length === 0}
            onChange={setSelectedRooms}
          />
          <FreeRoomsTable
            lessons={lessons}
            loading={loading}
            error={error}
            onRetry={reload}
            selectedRooms={selectedRooms}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
