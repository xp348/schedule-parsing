import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DAYS, DAY_LABELS, formatTime, parseTime, type Lesson } from "@/lib/schedule"
import { createSubjectsTable } from "@/lib/subjects"

interface SubjectsTableProps {
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
}

export function SubjectsTable({ lessons, loading, error, onRetry }: SubjectsTableProps) {
  const rows = useMemo(() => createSubjectsTable(lessons), [lessons])

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        В исходном расписании указаны дни недели, без календарных дат.
      </p>
      <Table>
        <TableCaption className="sr-only">
          Предметы по дням и времени, с группами и аудиториями.
        </TableCaption>
        <TableHeader>
          <TableRow>
            {["Дата", "Время", "Предмет", "Группы", "Аудитория"].map((label) => (
              <TableHead key={label} scope="col">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !lessons.length ? (
            <TableRow>
              <TableCell colSpan={5}>
                <span role="status">Загрузка расписания…</span>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={5} className="whitespace-normal">
                <div role="alert">
                  <p>Не удалось загрузить расписание.</p>
                  <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => void onRetry()}>
                  Попробовать снова
                </Button>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>В расписании нет предметов.</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const interval = parseTime(row.time)
              const dayIndex = DAYS.findIndex((day) => day === row.weekday)
              return (
                <TableRow key={row.id}>
                  <TableCell className="align-top">
                    {dayIndex >= 0 ? DAY_LABELS[dayIndex] : row.weekday || "Дата не указана"}
                  </TableCell>
                  <TableCell className="align-top tabular-nums">
                    {interval ? (
                      <>
                        <time dateTime={formatTime(interval.start)}>
                          {formatTime(interval.start)}
                        </time>
                        {" – "}
                        <time dateTime={formatTime(interval.end)}>{formatTime(interval.end)}</time>
                      </>
                    ) : (
                      row.time || "Время не указано"
                    )}
                  </TableCell>
                  <TableCell className="min-w-64 align-top whitespace-normal wrap-anywhere">
                    {row.subject}
                  </TableCell>
                  <TableCell className="min-w-40 align-top whitespace-normal">
                    {row.groups.length ? (
                      <ul className="flex flex-wrap gap-2" aria-label="Группы занятия">
                        {row.groups.map((group) => (
                          <li key={group}>{group}</li>
                        ))}
                      </ul>
                    ) : (
                      "Группы не указаны"
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {row.classroom && /^https?:\/\//i.test(row.classroom) ? (
                      <a
                        href={row.classroom}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        Онлайн-занятие
                      </a>
                    ) : (
                      row.classroom || "Не указана"
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </>
  )
}
