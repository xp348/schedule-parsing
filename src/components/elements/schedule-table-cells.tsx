import { DAYS, DAY_LABELS, formatTime, parseTime } from "@/lib/schedule"

export const scheduleTableLayout =
  "border-separate border-spacing-0 text-xs sm:text-sm [--schedule-day-width:2.75rem] [--schedule-time-width:4.75rem] [--schedule-frozen-width:calc(var(--schedule-day-width)+var(--schedule-time-width))] [--schedule-group-width:12rem] sm:[--schedule-day-width:10rem] sm:[--schedule-time-width:9.25rem] sm:[--schedule-group-width:16rem] [&_th]:border-b [&_td]:border-b [&_th]:px-1.5 [&_td]:px-1.5 sm:[&_th]:px-4 sm:[&_td]:px-4"
export const pinnedDayCell = "sticky left-0 z-20 border-r bg-background align-top"
export const pinnedTimeCell =
  "sticky left-(--schedule-day-width) z-20 border-r bg-background align-top tabular-nums whitespace-normal"
export const shortDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

export function ScheduleDay({ weekday }: { weekday: string }) {
  const index = DAYS.findIndex((day) => day === weekday)
  if (index < 0)
    return <span className="whitespace-normal wrap-anywhere">{weekday || "Дата не указана"}</span>
  return (
    <>
      <span className="hidden sm:inline">{DAY_LABELS[index]}</span>
      <abbr className="no-underline sm:hidden" title={DAY_LABELS[index]}>
        {shortDayLabels[index]}
      </abbr>
    </>
  )
}

export function ScheduleTime({ start, end }: { start: number; end: number }) {
  return (
    <span className="inline-flex flex-col flex-wrap gap-px leading-normal sm:flex-row sm:gap-1">
      <time dateTime={formatTime(start)}>{formatTime(start)}</time>
      <span className="hidden sm:inline" aria-hidden="true">
        –
      </span>
      <span className="sr-only"> до </span>
      <time dateTime={formatTime(end)}>{formatTime(end)}</time>
    </span>
  )
}

export function ScheduleTimeValue({ value }: { value: string | null }) {
  const interval = parseTime(value)
  return interval ? <ScheduleTime {...interval} /> : <span>{value || "Время не указано"}</span>
}
