import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { createAvailabilityTable, DAY_LABELS, DAYS, formatTime, type Lesson } from "@/lib/schedule"

const SHORT_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

interface FreeRoomsTableProps {
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
  selectedRooms?: string[]
}

export function FreeRoomsTable({
  lessons,
  loading,
  error,
  onRetry,
  selectedRooms,
}: FreeRoomsTableProps) {
  const allDays = useMemo(() => createAvailabilityTable(lessons), [lessons])
  const days = useMemo(() => {
    if (!selectedRooms?.length) return allDays
    return allDays
      .map((day) => ({
        ...day,
        intervals: day.intervals
          .map((interval) => ({
            ...interval,
            rooms: interval.rooms.filter((room) => selectedRooms.includes(room)),
          }))
          .filter((interval) => interval.rooms.length > 0),
      }))
      .filter((day) => day.intervals.length > 0)
  }, [allDays, selectedRooms])

  return (
    <table className="availability-table">
      <caption className="sr-only">
        Свободные аудитории по дням и времени. Учитываются обе недели и только аудитории,
        встречающиеся в расписании. Время по Красноярску. Доступность зависит от полноты исходных
        данных.
      </caption>
      <colgroup>
        <col className="day-column" />
        <col className="time-column" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">День</th>
          <th scope="col">Время</th>
          <th scope="col">Аудитории</th>
        </tr>
      </thead>

      {loading && lessons.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={3} className="table-message">
              <span role="status">Загрузка расписания…</span>
            </td>
          </tr>
        </tbody>
      ) : error ? (
        <tbody>
          <tr>
            <td colSpan={3} className="table-message">
              <div role="alert">
                <p>Не удалось загрузить расписание.</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void onRetry()}>
                Попробовать снова
              </Button>
            </td>
          </tr>
        </tbody>
      ) : days.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={3} className="table-message">
              {selectedRooms?.length
                ? "Для выбранных аудиторий свободных интервалов не найдено."
                : "В расписании нет распознанных интервалов времени."}
            </td>
          </tr>
        </tbody>
      ) : (
        days.map(({ day, intervals }) => {
          const dayIndex = DAYS.indexOf(day)
          return (
            <tbody key={day} aria-label={DAY_LABELS[dayIndex]}>
              {intervals.map(({ start, end, rooms }, index) => (
                <tr key={`${start}-${end}`}>
                  {index === 0 && (
                    <th
                      scope="rowgroup"
                      rowSpan={intervals.length}
                      className="weekday-cell"
                      aria-label={DAY_LABELS[dayIndex]}
                    >
                      <span className="weekday-label">
                        <span className="full-day">{DAY_LABELS[dayIndex]}</span>
                        <abbr className="short-day" title={DAY_LABELS[dayIndex]}>
                          {SHORT_DAYS[dayIndex]}
                        </abbr>
                      </span>
                    </th>
                  )}
                  <td className="time-cell">
                    <span className="time-range">
                      <time dateTime={formatTime(start)}>{formatTime(start)}</time>
                      <span className="time-separator" aria-hidden="true">
                        –
                      </span>
                      <span className="sr-only"> до </span>
                      <time dateTime={formatTime(end)}>{formatTime(end)}</time>
                    </span>
                  </td>
                  <td className="rooms-cell">
                    {rooms.length > 0 ? (
                      <ul className="room-list" aria-label="Свободные аудитории">
                        {rooms.map((room) => (
                          <li key={room}>{room}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="no-rooms">Нет свободных аудиторий</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          )
        })
      )}
    </table>
  )
}
