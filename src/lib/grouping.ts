import { DAYS, getTimeSlots, parseTime, type Lesson } from "@/lib/schedule"

const collator = new Intl.Collator("ru", { numeric: true })
export const GROUPING_LEVELS = [
  "Факультет",
  "Уровень обучения",
  "Форма обучения",
  "Курс",
  "Группа",
] as const

export interface GroupColumn {
  id: string
  path: [string, string, string, string, string]
  lessonsBySlot: Map<string, Lesson[]>
}

export interface GroupHeader {
  id: string
  label: string
  span: number
}

function label(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback
}

export function groupingSlotKey(day: string, start: number, end: number): string {
  return JSON.stringify([day.trim().toUpperCase(), start, end])
}

export function createGroupingTable(lessons: Lesson[]) {
  const unique = new Map<string, GroupColumn>()
  for (const lesson of lessons) {
    const path: GroupColumn["path"] = [
      label(lesson.faculty, "Факультет не указан"),
      label(lesson.program, "Уровень не указан"),
      label(lesson.education_form, "Форма не указана"),
      lesson.course != null ? `${lesson.course} курс` : "Курс не указан",
      label(lesson.group, "Группа не указана"),
    ]
    const id = JSON.stringify(path)
    let column = unique.get(id)
    if (!column) {
      column = { id, path, lessonsBySlot: new Map() }
      unique.set(id, column)
    }
    const interval = parseTime(lesson.time)
    if (interval) {
      const slotKey = groupingSlotKey(lesson.weekday, interval.start, interval.end)
      const entries = column.lessonsBySlot.get(slotKey) ?? []
      if (
        !entries.some(
          (entry) =>
            entry.lesson.trim() === lesson.lesson.trim() &&
            (entry.classroom?.trim() || "") === (lesson.classroom?.trim() || ""),
        )
      ) {
        entries.push(lesson)
      }
      column.lessonsBySlot.set(slotKey, entries)
    }
  }
  const columns = [...unique.values()].sort((a, b) => {
    for (let level = 0; level < GROUPING_LEVELS.length; level++) {
      const result = collator.compare(a.path[level], b.path[level])
      if (result) return result
    }
    return 0
  })
  const headers = createGroupingHeaders(columns)
  const days = DAYS.map((day) => ({
    day,
    intervals: getTimeSlots(
      lessons.filter((lesson) => lesson.weekday.trim().toUpperCase() === day),
    ),
  })).filter(({ intervals }) => intervals.length > 0)

  return { columns, headers, days }
}

export function createGroupingHeaders(columns: GroupColumn[]) {
  return GROUPING_LEVELS.map((_, level) => {
    const row: GroupHeader[] = []
    for (const column of columns) {
      const id = JSON.stringify(column.path.slice(0, level + 1))
      const previous = row.at(-1)
      if (previous?.id === id) previous.span++
      else row.push({ id, label: column.path[level], span: 1 })
    }
    return row
  })
}

export function getGroupingFilterOptions(columns: GroupColumn[]): string[][] {
  return GROUPING_LEVELS.slice(0, 4).map((_, level) =>
    [...new Set(columns.map((column) => column.path[level]))].sort(collator.compare),
  )
}

export function filterGroupColumns(
  columns: GroupColumn[],
  excludedValues: string[][],
): GroupColumn[] {
  return columns.filter((column) =>
    column.path.slice(0, 4).every((value, level) => !excludedValues[level]?.includes(value)),
  )
}

export interface GroupingSearchState {
  selectedGroups: string[]
  groupQuery: string
  excludeGroups: boolean
  cellQuery: string
}

export const INITIAL_GROUPING_SEARCH: GroupingSearchState = {
  selectedGroups: [],
  groupQuery: "",
  excludeGroups: false,
  cellQuery: "",
}

export function searchGroupColumns(
  columns: GroupColumn[],
  search: GroupingSearchState,
): GroupColumn[] {
  const selected = columns.filter(
    (column) =>
      !search.selectedGroups.length ||
      (search.excludeGroups
        ? !search.selectedGroups.includes(column.path[4])
        : search.selectedGroups.includes(column.path[4])),
  )
  const normalize = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/\s+/g, " ").trim()
  const query = normalize(search.cellQuery)
  if (!query) return selected
  return selected
    .map((column) => ({
      ...column,
      lessonsBySlot: new Map(
        [...column.lessonsBySlot].flatMap(([key, entries]) => {
          const matches = entries.filter((entry) =>
            normalize(`${entry.lesson} ${entry.classroom ?? ""}`).includes(query),
          )
          return matches.length ? [[key, matches] as const] : []
        }),
      ),
    }))
    .filter((column) => column.lessonsBySlot.size > 0)
}
