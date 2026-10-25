// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import {
  SCHEDULE_PREFERENCES_STORAGE_KEY,
  useSchedulePreferences,
} from "./use-schedule-preferences"

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

it("restores every preference after unmounting, including unfinished queries and explicit false values", () => {
  const first = renderHook(useSchedulePreferences)
  act(() => {
    first.result.current.updatePreference("activeTab", "groups")
    first.result.current.updatePreference("subjectQuery", "  Математика  ")
    first.result.current.updatePreference("roomMode", "busy")
    first.result.current.updatePreference("showEmptyRows", {
      groups: true,
      subjects: false,
      rooms: true,
    })
    first.result.current.updatePreference("groupingSearch", {
      selectedGroups: ["ИС-23", "ИЭ-23"],
      groupQuery: "ещё группа",
      excludeGroups: true,
      cellQuery: "Громов",
    })
    first.result.current.updatePreference("excludedValues", [
      ["ГТФ"],
      ["магистратура"],
      ["заочная"],
      ["1 курс", "2 курс"],
    ])
    first.result.current.updatePreference(
      "subjectQuery",
      (previous) => previous + "незавершённый запрос",
    )
  })
  const expected = first.result.current.preferences
  expect(JSON.parse(localStorage.getItem(SCHEDULE_PREFERENCES_STORAGE_KEY)!)).toEqual(expected)
  first.unmount()
  const second = renderHook(useSchedulePreferences)
  expect(second.result.current.preferences).toEqual(expected)
})

it.each(["invalid JSON", "null", "[]", "42"])(
  "uses defaults for invalid saved state: %s",
  (saved) => {
    localStorage.setItem(SCHEDULE_PREFERENCES_STORAGE_KEY, saved)
    const { result } = renderHook(useSchedulePreferences)
    expect(result.current.preferences.activeTab).toBe("rooms")
    expect(result.current.preferences.roomMode).toBe("free")
    expect(result.current.preferences.excludedValues).toEqual([[], [], [], []])
  },
)

it("keeps valid fields and sanitizes corrupted fields and duplicate selections", () => {
  localStorage.setItem(
    SCHEDULE_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      activeTab: "removed-tab",
      subjectQuery: "Физика",
      roomMode: "unknown",
      showEmptyRows: { groups: true, subjects: "true", rooms: false },
      groupingSearch: {
        selectedGroups: ["ИС-23", null, "ИС-23", "ИЭ-23"],
        groupQuery: 42,
        excludeGroups: "false",
        cellQuery: "М-309",
      },
      excludedValues: [["ГТФ", "ГТФ", 3], null, "очная", ["1 курс"], ["лишний уровень"]],
    }),
  )
  const { result } = renderHook(useSchedulePreferences)
  expect(result.current.preferences).toEqual({
    activeTab: "rooms",
    subjectQuery: "Физика",
    roomMode: "free",
    showEmptyRows: { groups: true, subjects: false, rooms: false },
    groupingSearch: {
      selectedGroups: ["ИС-23", "ИЭ-23"],
      groupQuery: "",
      excludeGroups: false,
      cellQuery: "М-309",
    },
    excludedValues: [["ГТФ"], [], [], ["1 курс"]],
  })
})

it("keeps updates working when reading or writing browser storage fails", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked")
  })
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota exceeded")
  })
  const { result } = renderHook(useSchedulePreferences)
  act(() => {
    result.current.updatePreference("subjectQuery", "Физика")
    result.current.updatePreference("showEmptyRows", (previous) => ({
      ...previous,
      subjects: true,
    }))
  })
  expect(result.current.preferences.subjectQuery).toBe("Физика")
  expect(result.current.preferences.showEmptyRows.subjects).toBe(true)
})
