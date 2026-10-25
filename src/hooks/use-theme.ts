import { useEffect, useState } from "react"

export type Theme = "light" | "dark"
export const THEME_STORAGE_KEY = "campus:theme:v1"

function readPreference(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === "light" || saved === "dark" ? saved : null
  } catch {
    return null
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<Theme | null>(readPreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  )
  const theme = preference ?? (systemDark ? "dark" : "light")

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreference(readPreference())
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setPreference(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Переключение работает и при недоступном хранилище.
    }
  }

  return { theme, toggleTheme }
}
