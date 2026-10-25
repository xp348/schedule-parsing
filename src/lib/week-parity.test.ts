import { expect, it } from "vitest"
import { filterLessonsByWeek, getLessonWeekParity } from "./week-parity"
import { createAvailabilityTable, type Lesson } from "./schedule"
import { createGroupingTable, filterGroupColumnsByWeek } from "./grouping"
import { createSubjectsTable } from "./subjects"

const base: Lesson = {
  group: "А-1",
  weekday: "ПОНЕДЕЛЬНИК",
  time: "8.40-10.10",
  lesson: "Предмет",
  classroom: "М-101",
}

it("uses the explicit field and leaves unknown records in both selections", () => {
  const rows: Lesson[] = [
    { ...base, week_parity: "odd" },
    { ...base, week_parity: "even" },
    { ...base, week_parity: null },
  ]
  expect(filterLessonsByWeek(rows, "odd")).toEqual([rows[0], rows[2]])
  expect(filterLessonsByWeek(rows, "even")).toEqual([rows[1], rows[2]])
  expect(filterLessonsByWeek(rows, "all")).toBe(rows)
  expect(getLessonWeekParity({ ...base, lesson: "н. Предмет", week_parity: null })).toBeNull()
  expect(getLessonWeekParity({ ...base, lesson: "н. Предмет", week_parity: "even" })).toBe("even")
})

it.each([
  ["н. Предмет", "odd"],
  ["ч.Предмет", "even"],
  [" Н. Предмет Иванов Н. Н.", "odd"],
  ["Предмет", null],
  ["н./ч. Предмет", null],
  ["н. ч. Предмет", null],
  ["н. Предмет; ч. Другой", null],
  ["Предмет (№н. 1-7)", null],
] as const)("supports old JSON with standard prefixes: %s", (lesson, expected) => {
  expect(getLessonWeekParity({ ...base, lesson })).toBe(expected)
})

it("calculates room occupancy for each week while retaining the full room registry and unknown-time restrictions", () => {
  const rows: Lesson[] = [
    { ...base, week_parity: "odd" },
    { ...base, classroom: "М-102", week_parity: "even" },
    { ...base, classroom: "М-103", week_parity: null },
    { ...base, classroom: "М-104", time: null, week_parity: null },
  ]
  expect(createAvailabilityTable(rows, "busy", "odd")[0].intervals[0].rooms).toEqual([
    "М-101",
    "М-103",
  ])
  expect(createAvailabilityTable(rows, "busy", "even")[0].intervals[0].rooms).toEqual([
    "М-102",
    "М-103",
  ])
  expect(createAvailabilityTable(rows, "free", "odd")[0].intervals[0].rooms).toEqual(["М-102"])
  expect(createAvailabilityTable(rows, "free", "even")[0].intervals[0].rooms).toEqual(["М-101"])
  expect(createAvailabilityTable(rows, "busy", "all")[0].intervals[0].rooms).toEqual([
    "М-101",
    "М-102",
    "М-103",
  ])
})

it("keeps distinct week variants during grouping and subject merging", () => {
  const rows: Lesson[] = [
    { ...base, week_parity: "odd" },
    { ...base, week_parity: "even" },
  ]
  const grouped = createGroupingTable(rows)
  expect([...grouped.columns[0].lessonsBySlot.values()][0]).toHaveLength(2)
  expect(
    [...filterGroupColumnsByWeek(grouped.columns, "odd")[0].lessonsBySlot.values()][0],
  ).toEqual([rows[0]])
  expect([...grouped.columns[0].lessonsBySlot.values()][0]).toHaveLength(2)
  const subjects = createSubjectsTable(rows)
  expect(subjects).toHaveLength(2)
  expect(subjects.map((row) => row.weekParity).sort()).toEqual(["even", "odd"])
})
