import { AcademicWeek } from "@/components/elements/academic-week"
import { ThemeToggle } from "@/components/elements/theme-toggle"
import { ScheduleTabs } from "@/components/elements/schedule-tabs"

export default function App() {
  return (
    <main className="container mx-auto p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <AcademicWeek />
        <ThemeToggle />
      </div>
      <ScheduleTabs />
    </main>
  )
}
