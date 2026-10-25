import { expect, it } from "vitest"
import { getAcademicWeek } from "./academic-week"

it.each([
  ["2026-09-01T00:00:00+07:00", 1],
  ["2026-09-06T23:59:59+07:00", 1],
  ["2026-09-07T00:00:00+07:00", 2],
  ["2026-10-25T23:59:59+07:00", 8],
  ["2026-10-25T17:00:00Z", 9],
  ["2027-01-01T12:00:00+07:00", 18],
  ["2027-09-01T00:00:00+07:00", 1],
])("calculates the academic week for %s in Krasnoyarsk", (date, expected) => {
  expect(getAcademicWeek(new Date(date))).toBe(expected)
})
