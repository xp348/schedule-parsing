import { useEffect, useState, type SetStateAction } from "react"
import { INITIAL_GROUPING_SEARCH, type GroupingSearchState } from "@/lib/grouping"
import type { RoomAvailabilityMode } from "@/lib/schedule"

import { restoreWeekSelection, type WeekSelection } from "@/lib/week-parity"

type ScheduleTab = "groups" | "subjects" | "rooms"

interface SchedulePreferences {
  activeTab: ScheduleTab | "other"
  weekSelection: Record<ScheduleTab, WeekSelection>
  showEmptyRows: Record<ScheduleTab, boolean>
  subjectQuery: string
  roomMode: RoomAvailabilityMode
  groupingSearch: GroupingSearchState
  excludedValues: string[][]
}

export const SCHEDULE_PREFERENCES_STORAGE_KEY = `campus:${import.meta.env.BASE_URL}:preferences:v1`

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : []
}

function restorePreferences(value: unknown): SchedulePreferences {
  const saved = record(value)
  const emptyRows = record(saved.showEmptyRows)
  const weeks = record(saved.weekSelection)
  const grouping = record(saved.groupingSearch)
  const excluded = Array.isArray(saved.excludedValues) ? saved.excludedValues : []

  return {
    activeTab:
      saved.activeTab === "groups" || saved.activeTab === "subjects" || saved.activeTab === "other"
        ? saved.activeTab
        : "rooms",
    weekSelection: {
      groups: restoreWeekSelection(weeks.groups),
      subjects: restoreWeekSelection(weeks.subjects),
      rooms: restoreWeekSelection(weeks.rooms),
    },
    showEmptyRows: {
      groups: emptyRows.groups === true,
      subjects: emptyRows.subjects === true,
      rooms: emptyRows.rooms === true,
    },
    subjectQuery: typeof saved.subjectQuery === "string" ? saved.subjectQuery : "",
    roomMode: saved.roomMode === "busy" ? "busy" : "free",
    groupingSearch: {
      ...INITIAL_GROUPING_SEARCH,
      selectedGroups: strings(grouping.selectedGroups),
      groupQuery: typeof grouping.groupQuery === "string" ? grouping.groupQuery : "",
      excludeGroups: grouping.excludeGroups === true,
      cellQuery: typeof grouping.cellQuery === "string" ? grouping.cellQuery : "",
    },
    excludedValues: Array.from({ length: 4 }, (_, index) => strings(excluded[index])),
  }
}

function readPreferences(): SchedulePreferences {
  try {
    const saved = localStorage.getItem(SCHEDULE_PREFERENCES_STORAGE_KEY)
    return restorePreferences(saved ? JSON.parse(saved) : null)
  } catch {
    return restorePreferences(null)
  }
}

export function useSchedulePreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Интерфейс работает в памяти, если браузер запрещает хранение или место закончилось.
    }
  }, [preferences])

  function updatePreference<Key extends keyof SchedulePreferences>(
    key: Key,
    update: SetStateAction<SchedulePreferences[Key]>,
  ) {
    setPreferences((previous) => ({
      ...previous,
      [key]: typeof update === "function" ? update(previous[key]) : update,
    }))
  }

  return { preferences, updatePreference }
}
