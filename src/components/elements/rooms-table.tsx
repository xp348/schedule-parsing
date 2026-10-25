import type { WeekSelection } from "@/lib/week-parity"
import { useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  createAvailabilityTable,
  DAY_LABELS,
  DAYS,
  formatTime,
  type Lesson,
  type RoomAvailabilityMode,
} from "@/lib/schedule"

const SHORT_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

interface RoomsTableProps {
  week?: WeekSelection
  showEmptyRows?: boolean
  mode: RoomAvailabilityMode
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
  selectedRooms?: string[]
}

export function RoomsTable({
  week = "all",
  showEmptyRows = false,
  mode,
  lessons,
  loading,
  error,
  onRetry,
  selectedRooms,
}: RoomsTableProps) {
  const allDays = useMemo(() => createAvailabilityTable(lessons, mode, week), [lessons, mode, week])
  const days = useMemo(() => {
    return allDays
      .map((day) => ({
        ...day,
        intervals: day.intervals
          .map((interval) => ({
            ...interval,
            rooms: selectedRooms?.length
              ? interval.rooms.filter((room) => selectedRooms.includes(room))
              : interval.rooms,
          }))
          .filter((interval) => showEmptyRows || interval.rooms.length > 0),
      }))
      .filter((day) => day.intervals.length > 0)
  }, [allDays, selectedRooms, showEmptyRows])

  return (
    <Table className="table-fixed">
      <TableCaption className="sr-only">
        {mode === "free" ? "Свободные" : "Занятые"} аудитории по дням и времени. Учитываются
        выбранная чётность недели и только аудитории, встречающиеся в расписании. Время по
        Красноярску. Доступность зависит от полноты исходных данных.
      </TableCaption>
      <colgroup>
        <col className="w-11 sm:w-40" />
        <col className="w-[76px] sm:w-[148px]" />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">День</TableHead>
          <TableHead scope="col">Время</TableHead>
          <TableHead scope="col">Аудитории</TableHead>
        </TableRow>
      </TableHeader>

      {loading && lessons.length === 0 ? (
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="whitespace-normal">
              <span role="status">Загрузка расписания…</span>
            </TableCell>
          </TableRow>
        </TableBody>
      ) : error ? (
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="whitespace-normal">
              <div role="alert">
                <p>Не удалось загрузить расписание.</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void onRetry()}>
                Попробовать снова
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      ) : days.length === 0 ? (
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="whitespace-normal">
              {selectedRooms?.length
                ? mode === "free"
                  ? "Для выбранных аудиторий свободных интервалов не найдено."
                  : "Для выбранных аудиторий занятых интервалов не найдено."
                : allDays.length
                  ? mode === "free"
                    ? "Нет свободных аудиторий"
                    : "Нет занятых аудиторий"
                  : "В расписании нет распознанных интервалов времени."}
            </TableCell>
          </TableRow>
        </TableBody>
      ) : (
        days.map(({ day, intervals }) => {
          const dayIndex = DAYS.indexOf(day)
          return (
            <TableBody key={day} aria-label={DAY_LABELS[dayIndex]}>
              {intervals.map(({ start, end, rooms }, index) => (
                <TableRow key={`${start}-${end}`}>
                  {index === 0 && (
                    <TableHead
                      scope="rowgroup"
                      rowSpan={intervals.length}
                      className="align-top"
                      aria-label={DAY_LABELS[dayIndex]}
                    >
                      <span>
                        <span className="hidden sm:inline">{DAY_LABELS[dayIndex]}</span>
                        <abbr className="no-underline sm:hidden" title={DAY_LABELS[dayIndex]}>
                          {SHORT_DAYS[dayIndex]}
                        </abbr>
                      </span>
                    </TableHead>
                  )}
                  <TableCell className="align-top tabular-nums">
                    <span className="inline-flex flex-col flex-wrap gap-px leading-normal sm:flex-row sm:gap-1">
                      <time dateTime={formatTime(start)}>{formatTime(start)}</time>
                      <span className="hidden sm:inline" aria-hidden="true">
                        –
                      </span>
                      <span className="sr-only"> до </span>
                      <time dateTime={formatTime(end)}>{formatTime(end)}</time>
                    </span>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {rooms.length > 0 ? (
                      <ul
                        className="flex flex-wrap gap-2"
                        aria-label={mode === "free" ? "Свободные аудитории" : "Занятые аудитории"}
                      >
                        {rooms.map((room) => (
                          <li key={room}>{room}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">
                        {mode === "free" ? "Нет свободных аудиторий" : "Нет занятых аудиторий"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )
        })
      )}
    </Table>
  )
}
