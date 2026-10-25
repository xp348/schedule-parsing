import type { Lesson } from "@/lib/schedule"

export type WeekParity = "odd" | "even"
export type WeekSelection = "all" | WeekParity

export function restoreWeekSelection(value: unknown): WeekSelection {
  return value === "odd" || value === "even" ? value : "all"
}

export function getLessonWeekParity(lesson: Lesson): WeekParity | null {
  if (lesson.week_parity !== undefined) {
    return lesson.week_parity === "odd" || lesson.week_parity === "even" ? lesson.week_parity : null
  }
  // Совместимость с JSON, выгруженным до появления week_parity.
  const match = lesson.lesson.match(/^\s*([нч])\.\s*/iu)
  if (!match) return null
  const remainder = lesson.lesson.slice(match[0].length)
  if (/^(?:[нч]\.|[/,;|])/iu.test(remainder) || /[;|/]\s*[нч]\./iu.test(remainder)) return null
  return match[1].toLocaleLowerCase("ru") === "н" ? "odd" : "even"
}

export function matchesWeek(
  parity: WeekParity | null | undefined,
  selection: WeekSelection,
): boolean {
  return selection === "all" || parity == null || parity === selection
}

export function filterLessonsByWeek(lessons: Lesson[], selection: WeekSelection): Lesson[] {
  return selection === "all"
    ? lessons
    : lessons.filter((lesson) => matchesWeek(getLessonWeekParity(lesson), selection))
}
