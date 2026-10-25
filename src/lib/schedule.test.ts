import { describe, expect, it } from "vitest"
import {
  collectRooms,
  createAvailabilityTable,
  getRoomState,
  normalizeRoom,
  overlaps,
  parseTime,
  validateSchedule,
  type Lesson,
} from "./schedule"

const lesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  group: "ИЭ-26",
  time: "8.40 - 10.10",
  weekday: "ПОНЕДЕЛЬНИК",
  lesson: "Программирование",
  classroom: "М-101",
  ...overrides,
})

describe("reading timetable data", () => {
  it("parses formats actually produced by the parser", () => {
    expect(parseTime("8.40 - 10.10")).toEqual({ start: 520, end: 610 })
    expect(parseTime("15.30.- 17.00")).toEqual({ start: 930, end: 1020 })
    expect(parseTime("18:50:00 — 22:00:00")).toEqual({ start: 1130, end: 1320 })
  })
  it("rejects invalid and missing times", () => {
    for (const value of [null, "unknown", "25:00-26:00", "12:60-13:00", "17:00-15:00"])
      expect(parseTime(value)).toBeNull()
  })
  it("normalizes room typos and excludes remote classes and unnamed venues", () => {
    for (const name of ["М -101", "М101", "М--101", "M-101"])
      expect(normalizeRoom(name)?.name).toBe("М-101")
    for (const name of [null, "ЭИОС", "Айка", "https://teams.live.com/meet/123", "Математика"])
      expect(normalizeRoom(name)).toBeNull()
  })
  it("requires a non-empty, valid data array", () => {
    expect(validateSchedule([lesson()])).toHaveLength(1)
    for (const value of [[], {}, null, [{ group: "ИЭ" }]])
      expect(() => validateSchedule(value)).toThrow()
  })
})

describe("room availability", () => {
  it("builds a week table using each day's own intervals and all known rooms", () => {
    const table = createAvailabilityTable([
      lesson(),
      lesson({ classroom: "М-102", time: "10.20-11.50" }),
      lesson({ weekday: "ВТОРНИК", classroom: "М-102", time: "12.10-13.40" }),
    ])
    expect(table.map((entry) => entry.day)).toEqual(["ПОНЕДЕЛЬНИК", "ВТОРНИК"])
    expect(table[0].intervals).toEqual([
      { start: 520, end: 610, rooms: ["М-102"] },
      { start: 620, end: 710, rooms: ["М-101"] },
    ])
    expect(table[1].intervals).toEqual([{ start: 730, end: 820, rooms: ["М-101"] }])
    expect(createAvailabilityTable([])).toEqual([])
  })
  it("does not count touching interval boundaries as an overlap", () => {
    expect(overlaps({ start: 520, end: 610 }, { start: 610, end: 700 })).toBe(false)
    expect(overlaps({ start: 520, end: 610 }, { start: 600, end: 700 })).toBe(true)
  })
  it("merges aliases and keeps all groups occupying a room", () => {
    const rooms = collectRooms([
      lesson(),
      lesson({ classroom: "М101", group: "ИС-26" }),
      lesson({ classroom: "ЭИОС" }),
    ])
    expect(rooms).toHaveLength(1)
    expect(rooms[0].lessons).toHaveLength(2)
  })
  it("checks the entire requested interval and selected weekday", () => {
    const [room] = collectRooms([lesson(), lesson({ time: "12.10-13.40" })])
    expect(getRoomState(room, "ПОНЕДЕЛЬНИК", { start: 500, end: 900 }).status).toBe("busy")
    const free = getRoomState(room, "ПОНЕДЕЛЬНИК", { start: 610, end: 730 })
    expect(free.status).toBe("free")
    expect(free.nextBooking?.start).toBe(730)
    expect(getRoomState(room, "ВТОРНИК", { start: 520, end: 610 }).status).toBe("free")
  })
  it("includes both weeks conservatively", () => {
    const [room] = collectRooms([lesson({ lesson: "ч. Математика" })])
    expect(getRoomState(room, "ПОНЕДЕЛЬНИК", { start: 520, end: 610 }).status).toBe("busy")
  })
  it("never marks a room free if a lesson on that day has unknown time", () => {
    const [room] = collectRooms([lesson({ time: null })])
    expect(getRoomState(room, "ПОНЕДЕЛЬНИК", { start: 520, end: 610 }).status).toBe("unknown")
  })
})

it("lists occupied rooms by overlapping time, excluding unknown availability and touching boundaries", () => {
  const rows = [
    lesson({ classroom: "М-101" }),
    lesson({ classroom: "М-102", time: "9.00-10.00" }),
    lesson({ classroom: "М-103", time: "10.10-11.00" }),
    lesson({ classroom: "М-104", time: null }),
  ]
  const busy = createAvailabilityTable(rows, "busy")
  expect(busy[0].intervals.find(({ start, end }) => start === 520 && end === 610)?.rooms).toEqual([
    "М-101",
    "М-102",
  ])
  expect(busy[0].intervals.find(({ start }) => start === 610)?.rooms).toEqual(["М-103"])
  expect(busy[0].intervals.every(({ rooms }) => !rooms.includes("М-104"))).toBe(true)
  const free = createAvailabilityTable(rows, "free")
  expect(free[0].intervals.find(({ start }) => start === 520)?.rooms).toEqual(["М-103"])
  expect(free[0].intervals.every(({ rooms }) => !rooms.includes("М-104"))).toBe(true)
})
