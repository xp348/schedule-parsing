import { useMemo } from "react"
import { BroomIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { createSubjectsTable, addEmptySubjectSlots, getSubjectRowSpans } from "@/lib/subjects"

interface SubjectsTableProps {
  showEmptyRows?: boolean
  query: string
  onQueryChange: (query: string) => void
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
}

function normalizeSubject(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim()
}

export function SubjectsTable({
  showEmptyRows = false,
  lessons,
  loading,
  error,
  onRetry,
  query,
  onQueryChange,
}: SubjectsTableProps) {
  const allRows = useMemo(() => createSubjectsTable(lessons), [lessons])
  const rows = useMemo(() => {
    const normalized = normalizeSubject(query)
    const matches = normalized
      ? allRows.filter((row) => normalizeSubject(row.subject).includes(normalized))
      : allRows
    return showEmptyRows ? addEmptySubjectSlots(lessons, matches) : matches
  }, [allRows, query, showEmptyRows, lessons])

  const rowSpans = useMemo(() => getSubjectRowSpans(rows), [rows])

  return (
    <>
      <div className="relative my-4 w-[27.5rem] max-w-full">
        <Input
          type="search"
          aria-label="Поиск по предмету"
          placeholder="Найти предмет…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pr-11 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            aria-label="Очистить поиск по предмету"
            onClick={() => onQueryChange("")}
          >
            <BroomIcon />
          </Button>
        )}
      </div>
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
              <TableCell colSpan={5}>
                <span role="status">
                  {allRows.length && normalizeSubject(query)
                    ? "Предметы по запросу не найдены."
                    : "В расписании нет предметов."}
                </span>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const interval = parseTime(row.time)
              const dayIndex = DAYS.findIndex((day) => day === row.weekday)
              return (
                <TableRow key={row.id}>
                  {rowSpans[index].day > 0 && (
                    <TableCell rowSpan={rowSpans[index].day} className="align-top">
                      {dayIndex >= 0 ? DAY_LABELS[dayIndex] : row.weekday || "Дата не указана"}
                    </TableCell>
                  )}
                  {rowSpans[index].time > 0 && (
                    <TableCell rowSpan={rowSpans[index].time} className="align-top tabular-nums">
                      {interval ? (
                        <>
                          <time dateTime={formatTime(interval.start)}>
                            {formatTime(interval.start)}
                          </time>
                          {" – "}
                          <time dateTime={formatTime(interval.end)}>
                            {formatTime(interval.end)}
                          </time>
                        </>
                      ) : (
                        row.time || "Время не указано"
                      )}
                    </TableCell>
                  )}
                  <TableCell className="min-w-64 align-top whitespace-normal wrap-anywhere">
                    {row.subject}
                  </TableCell>
                  <TableCell className="min-w-40 align-top whitespace-normal">
                    {row.isPlaceholder ? null : row.groups.length ? (
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
                    {row.isPlaceholder ? null : row.classroom &&
                      /^https?:\/\//i.test(row.classroom) ? (
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
