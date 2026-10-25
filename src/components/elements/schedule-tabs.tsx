import { EmptyRowsToggle } from "@/components/elements/empty-rows-toggle"
import { GroupingTable } from "@/components/elements/grouping-table"
import { SubjectsTable } from "@/components/elements/subjects-table"
import { Rooms } from "@/components/elements/rooms"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchedule } from "@/hooks/use-schedule"
import { useRoomSearch } from "@/hooks/use-room-search"
import { useSchedulePreferences } from "@/hooks/use-schedule-preferences"

const sections = [
  { value: "groups", label: "Группы" },
  { value: "subjects", label: "Предметы" },
  { value: "rooms", label: "Аудитории" },
] as const

export function ScheduleTabs() {
  const { preferences, updatePreference } = useSchedulePreferences()
  const { activeTab, showEmptyRows, subjectQuery, roomMode, groupingSearch, excludedValues } =
    preferences
  const { lessons, loading, error, reload } = useSchedule()
  const { selectedRooms, query, setSelectedRooms, setQuery } = useRoomSearch()

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value === "groups" || value === "subjects" || value === "rooms")
          updatePreference("activeTab", value)
      }}
    >
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
            updatePreference("showEmptyRows", (previous) => ({ ...previous, groups: checked }))
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
            updatePreference("groupingSearch", (previous) => ({ ...previous, ...updates }))
          }
          excludedValues={excludedValues}
          onExcludedChange={(level, excluded) =>
            updatePreference("excludedValues", (previous) =>
              previous.map((values, index) => (index === level ? excluded : values)),
            )
          }
        />
      </TabsContent>
      <TabsContent value="subjects" className="m-0 min-w-0">
        <EmptyRowsToggle
          checked={showEmptyRows.subjects}
          onCheckedChange={(checked) =>
            updatePreference("showEmptyRows", (previous) => ({ ...previous, subjects: checked }))
          }
        />
        <SubjectsTable
          showEmptyRows={showEmptyRows.subjects}
          lessons={lessons}
          loading={loading}
          error={error}
          onRetry={reload}
          query={subjectQuery}
          onQueryChange={(value) => updatePreference("subjectQuery", value)}
        />
      </TabsContent>
      <TabsContent value="rooms" className="m-0 min-w-0">
        <EmptyRowsToggle
          checked={showEmptyRows.rooms}
          onCheckedChange={(checked) =>
            updatePreference("showEmptyRows", (previous) => ({ ...previous, rooms: checked }))
          }
        />
        <Rooms
          showEmptyRows={showEmptyRows.rooms}
          mode={roomMode}
          onModeChange={(value) => updatePreference("roomMode", value)}
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
