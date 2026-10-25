const DAY_MS = 24 * 60 * 60 * 1000

/** Первая учебная неделя включает 1 сентября; недели начинаются в понедельник. */
export function getAcademicWeek(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Krasnoyarsk",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)!.value)
  const year = part("year")
  const month = part("month")
  const today = Date.UTC(year, month - 1, part("day"))
  const septemberFirst = new Date(Date.UTC(month >= 9 ? year : year - 1, 8, 1))
  const daysSinceMonday = (septemberFirst.getUTCDay() + 6) % 7
  const firstMonday = septemberFirst.getTime() - daysSinceMonday * DAY_MS
  return Math.floor((today - firstMonday) / (7 * DAY_MS)) + 1
}
