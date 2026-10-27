import { WeekSelector } from "@/components/elements/week-selector"
import { EmptyRowsToggle } from "@/components/elements/empty-rows-toggle"
import { GroupingTable } from "@/components/elements/grouping-table"
import { SubjectsTable } from "@/components/elements/subjects-table"
import { Rooms } from "@/components/elements/rooms"
import { Other } from "@/components/elements/other"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSchedule } from "@/hooks/use-schedule"
import { useRoomSearch } from "@/hooks/use-room-search"
import { useSchedulePreferences } from "@/hooks/use-schedule-preferences"

const sections = [
  { value: "groups", label: "Группы" },
  { value: "subjects", label: "Предметы" },
  { value: "rooms", label: "Аудитории" },
  { value: "other", label: "Прочее" },
] as const

export function ScheduleTabs() {
  const { preferences, updatePreference } = useSchedulePreferences()
  const {
    activeTab,
    weekSelection,
    showEmptyRows,
    subjectQuery,
    roomMode,
    groupingSearch,
    excludedValues,
  } = preferences
  const { lessons, metadata, loading, error, reload } = useSchedule()
  const { selectedRooms, query, setSelectedRooms, setQuery } = useRoomSearch()

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value === "groups" || value === "subjects" || value === "rooms" || value === "other")
          updatePreference("activeTab", value)
      }}
    >
      <TabsList aria-label="Разделы расписания" className="w-full sm:w-fit">
        {sections.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="px-1 text-xs sm:px-2 sm:text-sm">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="groups" className="m-0 min-w-0">
        <WeekSelector
          value={weekSelection.groups}
          onChange={(value) =>
            updatePreference("weekSelection", (previous) => ({ ...previous, groups: value }))
          }
        />
        <EmptyRowsToggle
          checked={showEmptyRows.groups}
          onCheckedChange={(checked) =>
            updatePreference("showEmptyRows", (previous) => ({ ...previous, groups: checked }))
          }
        />
        <GroupingTable
          week={weekSelection.groups}
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
        <WeekSelector
          value={weekSelection.subjects}
          onChange={(value) =>
            updatePreference("weekSelection", (previous) => ({ ...previous, subjects: value }))
          }
        />
        <EmptyRowsToggle
          checked={showEmptyRows.subjects}
          onCheckedChange={(checked) =>
            updatePreference("showEmptyRows", (previous) => ({ ...previous, subjects: checked }))
          }
        />
        <SubjectsTable
          week={weekSelection.subjects}
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
        <WeekSelector
          value={weekSelection.rooms}
          onChange={(value) =>
            updatePreference("weekSelection", (previous) => ({ ...previous, rooms: value }))
          }
        />
        <EmptyRowsToggle
          checked={showEmptyRows.rooms}
          onCheckedChange={(checked) =>
            updatePreference("showEmptyRows", (previous) => ({ ...previous, rooms: checked }))
          }
        />
        <Rooms
          week={weekSelection.rooms}
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
      <TabsContent value="other" className="m-0 min-w-0">
        <Other metadata={metadata} loading={loading} />
      </TabsContent>
    </Tabs>
  )
}
