import { getLessonWeekParity, type WeekParity } from "@/lib/week-parity"
import { DAYS, normalizeRoom, parseTime, type Lesson } from "@/lib/schedule"

export interface SubjectRow {
  weekParity?: WeekParity | null
  id: string
  weekday: string
  time: string | null
  subject: string
  groups: string[]
  classroom: string | null
  isPlaceholder?: boolean
}

const collator = new Intl.Collator("ru", { numeric: true })

export function createSubjectsTable(lessons: Lesson[]): SubjectRow[] {
  const rows = new Map<string, SubjectRow>()
  for (const lesson of lessons) {
    const subject = lesson.lesson.replace(/\s+/g, " ").trim()
    // Самостоятельные пометки недель не содержат предмета.
    if (!subject || /^[нч]\s*\.$/iu.test(subject)) continue
    const weekday = lesson.weekday.trim().toUpperCase()
    const time = lesson.time?.trim() || null
    const interval = parseTime(time)
    const classroom = normalizeRoom(lesson.classroom)?.name || lesson.classroom?.trim() || null
    const weekParity = getLessonWeekParity(lesson)
    const id = JSON.stringify([
      weekday,
      interval ? [interval.start, interval.end] : time,
      subject,
      classroom,
      weekParity,
    ])
    let row = rows.get(id)
    if (!row) {
      row = { id, weekday, time, subject, classroom, weekParity, groups: [] }
      rows.set(id, row)
    }
    const group = lesson.group.trim()
    if (group && !row.groups.includes(group)) row.groups.push(group)
  }
  return [...rows.values()]
    .map((row) => ({ ...row, groups: row.groups.sort(collator.compare) }))
    .sort(compareSubjectRows)
}

function dayOrder(day: string): number {
  const index = DAYS.findIndex((value) => value === day)
  return index < 0 ? DAYS.length : index
}

function compareSubjectRows(a: SubjectRow, b: SubjectRow): number {
  return (
    dayOrder(a.weekday) - dayOrder(b.weekday) ||
    collator.compare(a.weekday, b.weekday) ||
    (parseTime(a.time)?.start ?? Infinity) - (parseTime(b.time)?.start ?? Infinity) ||
    (parseTime(a.time)?.end ?? Infinity) - (parseTime(b.time)?.end ?? Infinity) ||
    collator.compare(a.time ?? "", b.time ?? "") ||
    collator.compare(a.subject, b.subject) ||
    collator.compare(a.classroom ?? "", b.classroom ?? "")
  )
}

export function addEmptySubjectSlots(lessons: Lesson[], matchingRows: SubjectRow[]): SubjectRow[] {
  const slotKey = (weekday: string, time: string | null) => {
    const interval = parseTime(time)
    return JSON.stringify([weekday, interval ? [interval.start, interval.end] : time])
  }
  const occupied = new Set(matchingRows.map((row) => slotKey(row.weekday, row.time)))
  const placeholders: SubjectRow[] = []
  for (const lesson of lessons) {
    const weekday = lesson.weekday.trim().toUpperCase()
    const time = lesson.time?.trim() || null
    const key = slotKey(weekday, time)
    if (occupied.has(key)) continue
    occupied.add(key)
    placeholders.push({
      id: `empty:${key}`,
      weekday,
      time,
      subject: "",
      groups: [],
      classroom: null,
      isPlaceholder: true,
    })
  }
  return [...matchingRows, ...placeholders].sort(compareSubjectRows)
}

export function getSubjectRowSpans(rows: SubjectRow[]): { day: number; time: number }[] {
  const spans = rows.map(() => ({ day: 0, time: 0 }))
  const timeKey = (row: SubjectRow) => {
    const interval = parseTime(row.time)
    return JSON.stringify(interval ? [interval.start, interval.end] : row.time)
  }
  let dayStart = 0
  while (dayStart < rows.length) {
    let dayEnd = dayStart + 1
    while (dayEnd < rows.length && rows[dayEnd].weekday === rows[dayStart].weekday) dayEnd++
    spans[dayStart].day = dayEnd - dayStart
    let timeStart = dayStart
    while (timeStart < dayEnd) {
      let timeEnd = timeStart + 1
      const key = timeKey(rows[timeStart])
      while (timeEnd < dayEnd && timeKey(rows[timeEnd]) === key) timeEnd++
      spans[timeStart].time = timeEnd - timeStart
      timeStart = timeEnd
    }
    dayStart = dayEnd
  }
  return spans
}
