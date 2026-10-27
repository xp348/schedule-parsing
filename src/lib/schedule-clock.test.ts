import { describe, expect, it } from "vitest"
import { getScheduleClock, getScheduleHighlight, getNextScheduleStart } from "./schedule-clock"

describe("current schedule slot", () => {
  it("selects the next interval only during a break and stays within today", () => {
    const slots = [
      { weekday: "ПОНЕДЕЛЬНИК", interval: { start: 520, end: 610 } },
      { weekday: "ПОНЕДЕЛЬНИК", interval: { start: 620, end: 710 } },
      { weekday: "ВТОРНИК", interval: { start: 720, end: 810 } },
      { weekday: "ПОНЕДЕЛЬНИК", interval: null },
    ]
    const clock = (minute: number) => ({ weekday: "ПОНЕДЕЛЬНИК", minute })
    expect(getNextScheduleStart(clock(500), slots)).toBe(520)
    expect(getNextScheduleStart(clock(550), slots)).toBeNull()
    expect(getNextScheduleStart(clock(610), slots)).toBe(620)
    expect(getNextScheduleStart(clock(710), slots)).toBeNull()
    expect(getNextScheduleStart(clock(610), [])).toBeNull()
    const nextStart = getNextScheduleStart(clock(615), slots)
    expect(getScheduleHighlight(clock(615), "ПОНЕДЕЛЬНИК", slots[0].interval, nextStart).time).toBe(
      false,
    )
    expect(getScheduleHighlight(clock(615), "ПОНЕДЕЛЬНИК", slots[1].interval, nextStart).time).toBe(
      true,
    )
  })

  it("uses Krasnoyarsk time, including a different weekday from UTC", () => {
    expect(getScheduleClock(new Date("2026-10-25T17:00:00Z"))).toEqual({
      weekday: "ПОНЕДЕЛЬНИК",
      minute: 0,
    })
    expect(getScheduleClock(new Date("2026-10-25T16:59:00Z")).weekday).toBe("ВОСКРЕСЕНЬЕ")
  })

  it("includes the start and excludes the end of a lesson", () => {
    const interval = { start: 520, end: 610 }
    const highlight = (minute: number, day = "ПОНЕДЕЛЬНИК") =>
      getScheduleHighlight({ weekday: "ПОНЕДЕЛЬНИК", minute }, day, interval)
    expect(highlight(519)).toEqual({ day: true, time: false })
    expect(highlight(520)).toEqual({ day: true, time: true })
    expect(highlight(609)).toEqual({ day: true, time: true })
    expect(highlight(610)).toEqual({ day: true, time: false })
    expect(highlight(550, "ВТОРНИК")).toEqual({ day: false, time: false })
  })

  it("does not mark unknown times as current", () => {
    expect(
      getScheduleHighlight({ weekday: "ПОНЕДЕЛЬНИК", minute: 550 }, "ПОНЕДЕЛЬНИК", null),
    ).toEqual({ day: true, time: false })
  })
})
