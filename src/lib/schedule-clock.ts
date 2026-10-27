import type { Interval } from "@/lib/schedule"

const formatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Krasnoyarsk",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

export function getScheduleClock(now = new Date()) {
  const parts = formatter.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value
  return {
    weekday: part("weekday").toLocaleUpperCase("ru"),
    minute: Number(part("hour")) * 60 + Number(part("minute")),
  }
}

export function getNextScheduleStart(
  clock: ReturnType<typeof getScheduleClock>,
  slots: { weekday: string; interval: Interval | null }[],
): number | null {
  const today = slots
    .filter(({ weekday }) => weekday.trim().toLocaleUpperCase("ru") === clock.weekday)
    .map(({ interval }) => interval)
    .filter((interval): interval is Interval => interval !== null)
  if (today.some(({ start, end }) => clock.minute >= start && clock.minute < end)) return null
  const next = today.filter(({ start }) => start > clock.minute).map(({ start }) => start)
  return next.length ? Math.min(...next) : null
}

export function getScheduleHighlight(
  clock: ReturnType<typeof getScheduleClock>,
  weekday: string,
  interval: Interval | null,
  nextStart: number | null = null,
) {
  const day = weekday.trim().toLocaleUpperCase("ru") === clock.weekday
  return {
    day,
    time:
      day &&
      interval !== null &&
      ((clock.minute >= interval.start && clock.minute < interval.end) ||
        interval.start === nextStart),
  }
}
