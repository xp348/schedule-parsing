import { useState } from "react"
import { INITIAL_GROUPING_SEARCH } from "@/lib/grouping"
import { GroupingTable } from "@/components/elements/grouping-table"
import { SubjectsTable } from "@/components/elements/subjects-table"
import { Rooms } from "@/components/elements/rooms"
import type { RoomAvailabilityMode } from "@/lib/schedule"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchedule } from "@/hooks/use-schedule"
import { useRoomSearch } from "@/hooks/use-room-search"

const sections = [
  { value: "groups", label: "Группы" },
  { value: "subjects", label: "Предметы" },
  { value: "rooms", label: "Аудитории" },
] as const

export function ScheduleTabs() {
  const [roomMode, setRoomMode] = useState<RoomAvailabilityMode>("free")
  const [groupingSearch, setGroupingSearch] = useState(INITIAL_GROUPING_SEARCH)
  const [excludedValues, setExcludedValues] = useState<string[][]>([[], [], [], []])
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
      <TabsContent value="groups" className="m-0 min-w-0">
        <GroupingTable
          lessons={lessons}
          loading={loading}
          error={error}
          onRetry={reload}
          search={groupingSearch}
          onSearchChange={(updates) =>
            setGroupingSearch((previous) => ({ ...previous, ...updates }))
          }
          excludedValues={excludedValues}
          onExcludedChange={(level, excluded) =>
            setExcludedValues((previous) =>
              previous.map((values, index) => (index === level ? excluded : values)),
            )
          }
        />
      </TabsContent>
      <TabsContent value="subjects" className="m-0 min-w-0">
        <SubjectsTable lessons={lessons} loading={loading} error={error} onRetry={reload} />
      </TabsContent>
      <TabsContent value="rooms" className="m-0 min-w-0">
        <Rooms
          mode={roomMode}
          onModeChange={setRoomMode}
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
