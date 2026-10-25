import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const label = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
