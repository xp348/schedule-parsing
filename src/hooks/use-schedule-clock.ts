import { useEffect, useState } from "react"
import { getScheduleClock } from "@/lib/schedule-clock"

export function useScheduleClock() {
  const [clock, setClock] = useState(getScheduleClock)

  useEffect(() => {
    let timer: number
    const update = () => {
      setClock(getScheduleClock())
      window.clearTimeout(timer)
      timer = window.setTimeout(update, 60_000 - (Date.now() % 60_000))
    }
    update()
    document.addEventListener("visibilitychange", update)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  return clock
}
