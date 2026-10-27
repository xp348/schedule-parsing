// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useScheduleClock } from "./use-schedule-clock"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it("updates on minute boundaries and on returning to the page, then clears its timer", () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-26T03:09:59Z"))
  const { result, unmount } = renderHook(useScheduleClock)
  expect(result.current.minute).toBe(609)
  act(() => vi.advanceTimersByTime(1000))
  expect(result.current.minute).toBe(610)
  vi.setSystemTime(new Date("2026-10-27T02:00:00Z"))
  act(() => document.dispatchEvent(new Event("visibilitychange")))
  expect(result.current).toEqual({ weekday: "ВТОРНИК", minute: 540 })
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
