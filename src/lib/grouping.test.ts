import { describe, expect, it } from "vitest"
import {
  createGroupingTable,
  groupingSlotKey,
  searchGroupColumns,
  INITIAL_GROUPING_SEARCH,
} from "./grouping"
import type { Lesson } from "./schedule"

const lesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  group: "Группа-1",
  time: "8.40-10.10",
  weekday: "ПОНЕДЕЛЬНИК",
  lesson: "Занятие",
  classroom: null,
  faculty: "Факультет А",
  program: "магистратура",
  education_form: "очная",
  course: 1,
  ...overrides,
})

describe("grouping timetable structure", () => {
  it("merges all five header levels only within the same parent and deduplicates group columns", () => {
    const result = createGroupingTable([
      lesson(),
      lesson({ lesson: "Другое занятие" }),
      lesson({ group: "Группа-2" }),
      lesson({ faculty: "Факультет Б" }),
      lesson({ education_form: "заочная" }),
      lesson({ course: 2 }),
      lesson({ program: "бакалавриат" }),
    ])
    expect(result.columns).toHaveLength(6)
    expect(result.headers[0].map(({ label, span }) => [label, span])).toEqual([
      ["Факультет А", 5],
      ["Факультет Б", 1],
    ])
    expect(
      result.headers[1].filter(({ label }) => label === "магистратура").map(({ span }) => span),
    ).toEqual([4, 1])
    expect(result.headers[4].every(({ span }) => span === 1)).toBe(true)
    for (const row of result.headers) expect(row.reduce((sum, cell) => sum + cell.span, 0)).toBe(6)
  })

  it("preserves missing education levels without guessing and sorts courses numerically", () => {
    const result = createGroupingTable([
      lesson({ program: null, course: 10 }),
      lesson({ program: null, course: 2 }),
    ])
    expect(result.headers[1][0].label).toBe("Уровень не указан")
    expect(result.headers[3].map(({ label }) => label)).toEqual(["2 курс", "10 курс"])
  })

  it("orders days and unique intervals and retains groups with unrecognized times", () => {
    const result = createGroupingTable([
      lesson({ weekday: "ВТОРНИК", time: "12.10-13.40" }),
      lesson({ time: "10.20-11.50" }),
      lesson(),
      lesson(),
      lesson({ group: "Группа-2", time: null }),
    ])
    expect(result.columns).toHaveLength(2)
    expect(result.days.map(({ day }) => day)).toEqual(["ПОНЕДЕЛЬНИК", "ВТОРНИК"])
    expect(result.days[0].intervals).toEqual([
      { start: 520, end: 610 },
      { start: 620, end: 710 },
    ])
    expect(createGroupingTable([])).toEqual({
      columns: [],
      headers: [[], [], [], [], []],
      days: [],
    })
  })
})

it("assigns lessons to the exact group hierarchy, weekday and normalized time, keeping distinct entries", () => {
  const first = lesson({ lesson: "Математика", classroom: "М-101" })
  const second = lesson({ lesson: "Физика", classroom: "М-102" })
  const otherFaculty = lesson({ faculty: "Факультет Б", lesson: "Химия" })
  const tuesday = lesson({ weekday: "ВТОРНИК", lesson: "История" })
  const later = lesson({ time: "10.20-11.50", lesson: "Информатика" })
  const result = createGroupingTable([
    first,
    { ...first, time: "08:40–10:10" },
    second,
    otherFaculty,
    tuesday,
    later,
    lesson({ time: null, lesson: "Без времени" }),
  ])
  const monday = groupingSlotKey("ПОНЕДЕЛЬНИК", 520, 610)
  expect(result.columns[0].lessonsBySlot.get(monday)).toEqual([first, second])
  expect(result.columns[1].lessonsBySlot.get(monday)).toEqual([otherFaculty])
  expect(result.columns[0].lessonsBySlot.get(groupingSlotKey("вторник", 520, 610))).toEqual([
    tuesday,
  ])
  expect(result.columns[0].lessonsBySlot.get(groupingSlotKey("ПОНЕДЕЛЬНИК", 620, 710))).toEqual([
    later,
  ])
  expect(result.columns[0].lessonsBySlot.size).toBe(3)
})

it("filters matching cell records without mutating the original table", () => {
  const first = lesson({ lesson: "Теория вероятностей, Семёнов", classroom: "М-101" })
  const second = lesson({ lesson: "Физика", classroom: "М-102" })
  const columns = createGroupingTable([
    first,
    second,
    lesson({ group: "Группа-2", time: "10.20-11.50", lesson: "Химия" }),
  ]).columns
  const filtered = searchGroupColumns(columns, {
    ...INITIAL_GROUPING_SEARCH,
    cellQuery: "  СЕМЕНОВ  ",
  })
  expect(filtered).toHaveLength(1)
  expect([...filtered[0].lessonsBySlot.values()]).toEqual([[first]])
  expect([...columns[0].lessonsBySlot.values()]).toEqual([[first, second]])
  expect(
    searchGroupColumns(columns, { ...INITIAL_GROUPING_SEARCH, cellQuery: "М-102" })[0]
      .lessonsBySlot.values()
      .next().value,
  ).toEqual([second])
  expect(
    searchGroupColumns(columns, {
      ...INITIAL_GROUPING_SEARCH,
      selectedGroups: ["Группа-2"],
      cellQuery: "Физика",
    }),
  ).toEqual([])
  expect(
    searchGroupColumns(columns, {
      ...INITIAL_GROUPING_SEARCH,
      selectedGroups: ["Группа-2"],
      excludeGroups: true,
    }).map((column) => column.path[4]),
  ).toEqual(["Группа-1"])
  expect(
    searchGroupColumns(columns, { ...INITIAL_GROUPING_SEARCH, excludeGroups: true }),
  ).toHaveLength(2)
})
