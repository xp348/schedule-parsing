export const DAYS = ["ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА"] as const
export const DAY_LABELS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
export type Weekday = (typeof DAYS)[number]

export interface Lesson {
  group: string
  time: string | null
  weekday: string
  lesson: string
  classroom: string | null
  course?: number | null
  semester?: number | null
  faculty?: string | null
  education_form?: string | null
  program?: string | null
}

export interface Interval {
  start: number
  end: number
}
export interface Room {
  name: string
  building: string
  lessons: Lesson[]
}
export interface Booking extends Interval {
  lesson: Lesson
}
export interface RoomState {
  room: Room
  status: "free" | "busy" | "unknown"
  bookings: Booking[]
  nextBooking?: Booking
}

export function parseTime(value: string | null): Interval | null {
  if (!value) return null
  const match = value
    .trim()
    .match(/^(\d{1,2})[.:](\d{2})(?::\d{2})?\.?\s*[-–—]\s*(\d{1,2})[.:](\d{2})(?::\d{2})?$/)
  if (!match) return null
  const [, startHour, startMinute, endHour, endMinute] = match.map(Number)
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null
  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute
  return end > start ? { start, end } : null
}

export function formatTime(minutes: number): string {
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

export function normalizeRoom(value: string | null): { name: string; building: string } | null {
  if (!value) return null
  const text = value.trim().toUpperCase().replace(/[–—]/g, "-")
  const match = text.match(/^([А-ЯЁA-Z]{1,4})\s*-*\s*(\d{2,4}[А-ЯЁA-Z]?)$/)
  if (!match) return null
  const building = match[1].replace(/M/g, "М").replace(/Y/g, "У")
  return { name: `${building}-${match[2]}`, building }
}

export function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    ["group", "weekday", "lesson"].every((key) => typeof row[key] === "string") &&
    (row.time === null || typeof row.time === "string") &&
    (row.classroom === null || typeof row.classroom === "string")
  )
}

export function validateSchedule(data: unknown): Lesson[] {
  if (!Array.isArray(data) || data.length === 0 || !data.every(isLesson)) {
    throw new Error("Файл расписания пуст или имеет неподдерживаемый формат.")
  }
  return data
}

export function collectRooms(lessons: Lesson[]): Room[] {
  const rooms = new Map<string, Room>()
  for (const lesson of lessons) {
    const room = normalizeRoom(lesson.classroom)
    if (!room) continue
    if (!rooms.has(room.name)) rooms.set(room.name, { ...room, lessons: [] })
    rooms.get(room.name)!.lessons.push(lesson)
  }
  return [...rooms.values()].sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }))
}

export function getRoomState(room: Room, day: Weekday, interval: Interval): RoomState {
  const dayLessons = room.lessons.filter((lesson) => lesson.weekday.trim().toUpperCase() === day)
  const bookings: Booking[] = []
  let unknownTime = false
  for (const lesson of dayLessons) {
    const time = parseTime(lesson.time)
    if (time) bookings.push({ ...time, lesson })
    else unknownTime = true
  }
  bookings.sort((a, b) => a.start - b.start || a.end - b.end)
  const busy = bookings.some((booking) => overlaps(booking, interval))
  return {
    room,
    status: busy ? "busy" : unknownTime ? "unknown" : "free",
    bookings,
    nextBooking: bookings.find((booking) => booking.start >= interval.end),
  }
}

export function getTimeSlots(lessons: Lesson[]): Interval[] {
  const slots = new Map<string, Interval>()
  for (const lesson of lessons) {
    const time = parseTime(lesson.time)
    if (time) slots.set(`${time.start}-${time.end}`, time)
  }
  return [...slots.values()].sort((a, b) => a.start - b.start || a.end - b.end)
}

export function currentWeekday(): Weekday {
  const names: Record<string, Weekday> = {
    Mon: DAYS[0],
    Tue: DAYS[1],
    Wed: DAYS[2],
    Thu: DAYS[3],
    Fri: DAYS[4],
    Sat: DAYS[5],
    Sun: DAYS[0],
  }
  const day = new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "Asia/Krasnoyarsk",
  }).format(new Date())
  return names[day] || DAYS[0]
}

export interface AvailabilityDay {
  day: Weekday
  intervals: (Interval & { rooms: string[] })[]
}

export function createAvailabilityTable(lessons: Lesson[]): AvailabilityDay[] {
  const rooms = collectRooms(lessons)
  const table: AvailabilityDay[] = []

  for (const day of DAYS) {
    const dayLessons = lessons.filter((lesson) => lesson.weekday.trim().toUpperCase() === day)
    const slots = getTimeSlots(dayLessons)
    if (slots.length === 0) continue

    const intervals = slots.map((interval) => {
      const freeRooms = rooms.filter((room) => getRoomState(room, day, interval).status === "free")
      return { ...interval, rooms: freeRooms.map((room) => room.name) }
    })
    table.push({ day, intervals })
  }

  return table
}
