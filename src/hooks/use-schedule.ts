import { useCallback, useEffect, useRef, useState } from "react"
import { validateSchedule, type Lesson } from "@/lib/schedule"

export interface ScheduleMetadata {
  updatedAt: string
  commit: string
}
const scheduleUrl =
  import.meta.env.VITE_SCHEDULE_URL || `${import.meta.env.BASE_URL}data/schedule.json`

export function useSchedule() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [metadata, setMetadata] = useState<ScheduleMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)

  const reload = useCallback(async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(scheduleUrl, { cache: "no-store", signal: request.signal })
      if (!response.ok) throw new Error(`Не удалось получить расписание (HTTP ${response.status}).`)
      const rows = validateSchedule(await response.json())
      if (request.signal.aborted) return
      setLessons(rows)
      // Дата относится к коммиту данных, а не к моменту открытия страницы.
      setMetadata(null)
      if (!import.meta.env.VITE_SCHEDULE_URL) {
        try {
          const metaResponse = await fetch(`${import.meta.env.BASE_URL}data/metadata.json`, {
            cache: "no-store",
            signal: request.signal,
          })
          if (metaResponse.ok) {
            const meta = await metaResponse.json()
            if (typeof meta.updatedAt === "string" && typeof meta.commit === "string")
              setMetadata(meta)
          }
        } catch {
          /* Расписание доступно и без необязательных метаданных. */
        }
      }
    } catch (cause) {
      if (!request.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Ошибка загрузки расписания.")
    } finally {
      if (!request.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    return () => controller.current?.abort()
  }, [reload])

  return { lessons, metadata, loading, error, reload }
}
