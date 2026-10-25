import { useEffect, useState } from "react"
import { getAcademicWeek } from "@/lib/academic-week"

export function AcademicWeek() {
  const [week, setWeek] = useState(() => getAcademicWeek())

  useEffect(() => {
    const update = () => setWeek(getAcademicWeek())
    const timer = window.setInterval(update, 60_000)
    document.addEventListener("visibilitychange", update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  return (
    <p
      className="text-sm text-muted-foreground"
      title="Отсчёт с 1 сентября, смена недели в понедельник. Время Красноярска."
    >
      Учебная неделя: {week}
    </p>
  )
}
