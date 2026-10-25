import { expect, it } from "vitest"
import { createSubjectsTable, addEmptySubjectSlots } from "./subjects"
import type { Lesson } from "./schedule"

const lesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  group: "Группа-1",
  weekday: "ПОНЕДЕЛЬНИК",
  time: "8.40-10.10",
  lesson: "Математика (лек) Иванов И. И.",
  classroom: "М-101",
  ...overrides,
})

it("merges shared lessons and deduplicates naturally sorted group names", () => {
  const rows = createSubjectsTable([
    lesson({ group: "Группа-10" }),
    lesson({ group: "Группа-2", time: "08:40–10:10", classroom: "М101" }),
    lesson({ group: "Группа-10" }),
  ])
  expect(rows).toHaveLength(1)
  expect(rows[0].groups).toEqual(["Группа-2", "Группа-10"])
  expect(rows[0].classroom).toBe("М-101")
})

it("keeps distinct weekdays, intervals, subjects, week markers and classrooms separate", () => {
  const rows = createSubjectsTable([
    lesson(),
    lesson({ weekday: "ВТОРНИК" }),
    lesson({ time: "10.20-11.50" }),
    lesson({ lesson: "Физика" }),
    lesson({ classroom: "М-102" }),
    lesson({ lesson: "ч. Математика" }),
    lesson({ lesson: "н. Математика" }),
  ])
  expect(rows).toHaveLength(7)
  expect(rows.at(-1)?.weekday).toBe("ВТОРНИК")
  expect(rows.at(-2)?.time).toBe("10.20-11.50")
})

it("keeps lessons without time or classroom, orders them after known times, and skips empty markers", () => {
  const rows = createSubjectsTable([
    lesson({ time: null, classroom: null }),
    lesson({ time: "12.10-13.40" }),
    lesson(),
    lesson({ lesson: "н." }),
    lesson({ lesson: "ч." }),
    lesson({ lesson: "  " }),
  ])
  expect(rows).toHaveLength(3)
  expect(rows.map((row) => row.time)).toEqual(["8.40-10.10", "12.10-13.40", null])
  expect(rows[2].classroom).toBeNull()
  expect(createSubjectsTable([])).toEqual([])
})

it("adds one empty row per missing source slot, including aliases and times without subjects", () => {
  const source = [
    lesson(),
    lesson({ time: "08:40–10:10" }),
    lesson({ weekday: "ВТОРНИК", time: "10.20-11.50", lesson: "н." }),
    lesson({ time: null }),
  ]
  const matches = createSubjectsTable(source).filter((row) => row.time !== null)
  const displayed = addEmptySubjectSlots(source, matches)
  expect(displayed).toHaveLength(3)
  expect(displayed.filter((row) => row.isPlaceholder)).toHaveLength(2)
  expect(displayed.find((row) => row.weekday === "ВТОРНИК")).toMatchObject({
    subject: "",
    groups: [],
    classroom: null,
    isPlaceholder: true,
  })
  expect(matches).toHaveLength(1)
})
