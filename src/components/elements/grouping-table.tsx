import type { WeekSelection } from "@/lib/week-parity"
import { useMemo } from "react"
import { GroupingFilters } from "@/components/elements/grouping-filters"
import { GroupLesson } from "@/components/elements/group-lesson"
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
import {
  createGroupingTable,
  createGroupingHeaders,
  getGroupingFilterOptions,
  filterGroupColumns,
  filterGroupColumnsByWeek,
  searchGroupColumns,
  type GroupingSearchState,
  groupingSlotKey,
  GROUPING_LEVELS,
} from "@/lib/grouping"
import { DAYS, DAY_LABELS, formatTime, type Lesson } from "@/lib/schedule"

interface GroupingTableProps {
  week?: WeekSelection
  showEmptyRows?: boolean
  lessons: Lesson[]
  loading: boolean
  error: string | null
  onRetry: () => Promise<void>
  search: GroupingSearchState
  onSearchChange: (updates: Partial<GroupingSearchState>) => void
  excludedValues: string[][]
  onExcludedChange: (level: number, excluded: string[]) => void
}

export function GroupingTable({
  week = "all",
  showEmptyRows = false,
  lessons,
  loading,
  error,
  onRetry,
  excludedValues,
  onExcludedChange,
  search,
  onSearchChange,
}: GroupingTableProps) {
  const all = useMemo(() => createGroupingTable(lessons), [lessons])
  const options = useMemo(() => getGroupingFilterOptions(all.columns), [all.columns])
  const columns = useMemo(
    () =>
      searchGroupColumns(
        filterGroupColumnsByWeek(filterGroupColumns(all.columns, excludedValues), week),
        search,
        showEmptyRows,
      ),
    [all.columns, excludedValues, search, showEmptyRows, week],
  )
  const headers = useMemo(() => createGroupingHeaders(columns), [columns])
  const groups = useMemo(
    () =>
      [...new Set(all.columns.map((column) => column.path[4]))].sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true }),
      ),
    [all.columns],
  )
  const days = useMemo(
    () =>
      !showEmptyRows
        ? all.days
            .map(({ day, intervals }) => ({
              day,
              intervals: intervals.filter(({ start, end }) =>
                columns.some((column) =>
                  column.lessonsBySlot.has(groupingSlotKey(day, start, end)),
                ),
              ),
            }))
            .filter(({ intervals }) => intervals.length > 0)
        : all.days,
    [all.days, columns, showEmptyRows],
  )

  const headerRows = columns.length ? headers : [[]]

  if (loading && !lessons.length)
    return (
      <p role="status" className="py-4">
        Загрузка расписания…
      </p>
    )
  if (error)
    return (
      <div className="space-y-2 py-4">
        <div role="alert">
          <p>Не удалось загрузить расписание.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void onRetry()}>
          Попробовать снова
        </Button>
      </div>
    )
  if (!all.columns.length) return <p className="py-4">В расписании нет групп.</p>

  return (
    <>
      <GroupingFilters
        groups={groups}
        search={search}
        onSearchChange={onSearchChange}
        options={options}
        excludedValues={excludedValues}
        onChange={onExcludedChange}
      />
      {columns.length === 0 && !showEmptyRows ? (
        <p role="status" className="py-4 text-sm text-muted-foreground">
          {search.cellQuery.trim()
            ? "Занятия по запросу не найдены с учётом выбранных фильтров."
            : "Нет групп, соответствующих выбранным фильтрам."}
        </p>
      ) : (
        <Table>
          <TableCaption className="sr-only">
            Расписание по дням, времени и группам: факультет, уровень обучения, форма обучения,
            курс, группа.
          </TableCaption>
          <TableHeader>
            {headerRows.map((row, level) => (
              <TableRow key={GROUPING_LEVELS[level]}>
                {level === 0 && (
                  <>
                    <TableHead scope="col" rowSpan={headerRows.length} className="border-r">
                      День
                    </TableHead>
                    <TableHead scope="col" rowSpan={headerRows.length} className="border-r">
                      Время
                    </TableHead>
                  </>
                )}
                {row.map(({ id, label, span }) => (
                  <TableHead
                    key={id}
                    colSpan={span}
                    scope={level === GROUPING_LEVELS.length - 1 ? "col" : "colgroup"}
                    className="min-w-28 border-r text-center"
                    aria-label={`${GROUPING_LEVELS[level]}: ${label}`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          {days.length ? (
            days.map(({ day, intervals }) => (
              <TableBody key={day}>
                {intervals.map(({ start, end }, index) => (
                  <TableRow key={`${start}-${end}`}>
                    {index === 0 && (
                      <TableHead
                        scope="rowgroup"
                        rowSpan={intervals.length}
                        className="border-r align-top"
                      >
                        {DAY_LABELS[DAYS.indexOf(day)]}
                      </TableHead>
                    )}
                    <TableCell className="border-r align-top tabular-nums">
                      <time dateTime={formatTime(start)}>{formatTime(start)}</time>
                      {" – "}
                      <time dateTime={formatTime(end)}>{formatTime(end)}</time>
                    </TableCell>
                    {columns.map(({ id, lessonsBySlot }) => {
                      const entries = lessonsBySlot.get(groupingSlotKey(day, start, end)) ?? []
                      return (
                        <TableCell
                          key={id}
                          className="w-64 min-w-64 max-w-64 border-r align-top whitespace-normal wrap-anywhere"
                        >
                          {entries.length > 0 && (
                            <ul className="space-y-3" aria-label="Занятия группы">
                              {entries.map((lesson, lessonIndex) => (
                                <li key={lessonIndex}>
                                  <GroupLesson lesson={lesson} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            ))
          ) : (
            <TableBody>
              <TableRow>
                <TableCell colSpan={columns.length + 2}>
                  {all.days.length
                    ? "Нет занятий, соответствующих выбранным фильтрам."
                    : "В расписании нет распознанных интервалов времени."}
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      )}
    </>
  )
}
