import { DAYS, normalizeRoom, parseTime, type Lesson } from "@/lib/schedule"

export interface SubjectRow {
  id: string
  weekday: string
  time: string | null
  subject: string
  groups: string[]
  classroom: string | null
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
    const id = JSON.stringify([
      weekday,
      interval ? [interval.start, interval.end] : time,
      subject,
      classroom,
    ])
    let row = rows.get(id)
    if (!row) {
      row = { id, weekday, time, subject, classroom, groups: [] }
      rows.set(id, row)
    }
    const group = lesson.group.trim()
    if (group && !row.groups.includes(group)) row.groups.push(group)
  }
  const dayOrder = (day: string) => {
    const index = DAYS.findIndex((value) => value === day)
    return index < 0 ? DAYS.length : index
  }
  return [...rows.values()]
    .map((row) => ({ ...row, groups: row.groups.sort(collator.compare) }))
    .sort(
      (a, b) =>
        dayOrder(a.weekday) - dayOrder(b.weekday) ||
        collator.compare(a.weekday, b.weekday) ||
        (parseTime(a.time)?.start ?? Infinity) - (parseTime(b.time)?.start ?? Infinity) ||
        (parseTime(a.time)?.end ?? Infinity) - (parseTime(b.time)?.end ?? Infinity) ||
        collator.compare(a.time ?? "", b.time ?? "") ||
        collator.compare(a.subject, b.subject) ||
        collator.compare(a.classroom ?? "", b.classroom ?? ""),
    )
}
