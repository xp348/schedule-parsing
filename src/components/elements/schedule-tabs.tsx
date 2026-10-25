import { useState } from "react"
import { EmptyRowsToggle } from "@/components/elements/empty-rows-toggle"
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
  const [showEmptyRows, setShowEmptyRows] = useState({
    groups: false,
    subjects: false,
    rooms: false,
  })
  const [subjectQuery, setSubjectQuery] = useState("")
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
        <EmptyRowsToggle
          checked={showEmptyRows.groups}
          onCheckedChange={(checked) =>
            setShowEmptyRows((previous) => ({ ...previous, groups: checked }))
          }
        />
        <GroupingTable
          showEmptyRows={showEmptyRows.groups}
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
        <EmptyRowsToggle
          checked={showEmptyRows.subjects}
          onCheckedChange={(checked) =>
            setShowEmptyRows((previous) => ({ ...previous, subjects: checked }))
          }
        />
        <SubjectsTable
          showEmptyRows={showEmptyRows.subjects}
          lessons={lessons}
          loading={loading}
          error={error}
          onRetry={reload}
          query={subjectQuery}
          onQueryChange={setSubjectQuery}
        />
      </TabsContent>
      <TabsContent value="rooms" className="m-0 min-w-0">
        <EmptyRowsToggle
          checked={showEmptyRows.rooms}
          onCheckedChange={(checked) =>
            setShowEmptyRows((previous) => ({ ...previous, rooms: checked }))
          }
        />
        <Rooms
          showEmptyRows={showEmptyRows.rooms}
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
