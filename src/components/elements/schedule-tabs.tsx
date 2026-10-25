import { FreeRooms } from "@/components/elements/free-rooms"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchedule } from "@/hooks/use-schedule"
import { useRoomSearch } from "@/hooks/use-room-search"

const sections = [
  { value: "groups", label: "Группировка" },
  { value: "search", label: "Поиск" },
  { value: "rooms", label: "Свободные аудитории" },
] as const

export function ScheduleTabs() {
  const { lessons, loading, error, reload } = useSchedule()
  const { selectedRooms, query, setSelectedRooms, setQuery } = useRoomSearch()

  return (
    <Tabs defaultValue="rooms">
      <TabsList aria-label="Разделы расписания">
        {sections.map(({ value, label }) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections
        .filter(({ value }) => value !== "rooms")
        .map(({ value, label }) => (
          <TabsContent key={value} value={value} className="m-0 min-w-0">
            <p className="py-4">Раздел «{label}» в разработке.</p>
          </TabsContent>
        ))}
      <TabsContent value="rooms" className="m-0 min-w-0">
        <FreeRooms
          lessons={lessons}
          loading={loading}
          error={error}
          onRetry={reload}
          selectedRooms={selectedRooms}
          query={query}
          onQueryChange={setQuery}
          onRoomsChange={setSelectedRooms}
        />
      </TabsContent>
    </Tabs>
  )
}
