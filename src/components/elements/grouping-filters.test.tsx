// @vitest-environment jsdom
import { useState } from "react"
import { afterEach, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GroupingTable } from "./grouping-table"
import { INITIAL_GROUPING_SEARCH } from "@/lib/grouping"
import type { Lesson } from "@/lib/schedule"

const base: Lesson = {
  group: "А-1",
  faculty: "Факультет А",
  program: "бакалавриат",
  education_form: "очная",
  course: 1,
  weekday: "ПОНЕДЕЛЬНИК",
  time: "8.40-10.10",
  lesson: "Математика",
  classroom: "М-101",
}
const lessons: Lesson[] = [
  base,
  { ...base, group: "А-2", course: 2, lesson: "Физика" },
  { ...base, group: "М-1", program: "магистратура", education_form: "заочная", lesson: "Алгебра" },
  { ...base, group: "Б-1", faculty: "Факультет Б", lesson: "История" },
]
function Example() {
  const [search, setSearch] = useState(INITIAL_GROUPING_SEARCH)
  const [excludedValues, setExcludedValues] = useState<string[][]>([[], [], [], []])
  return (
    <GroupingTable
      lessons={lessons}
      loading={false}
      error={null}
      onRetry={async () => {}}
      search={search}
      onSearchChange={(updates) => setSearch((previous) => ({ ...previous, ...updates }))}
      excludedValues={excludedValues}
      onExcludedChange={(level, excluded) =>
        setExcludedValues((previous) =>
          previous.map((values, index) => (index === level ? excluded : values)),
        )
      }
    />
  )
}
const filter = (name: string, option: string) =>
  within(screen.getByRole("toolbar", { name })).getByRole("button", { name: option })
const groups = () =>
  within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .filter((header) => header.getAttribute("aria-label")?.startsWith("Группа:"))
    .map((header) => header.textContent)
afterEach(cleanup)

it("starts with all options enabled, hides faculty columns, updates spans and restores them", async () => {
  const user = userEvent.setup()
  render(<Example />)
  expect(screen.getAllByRole("toolbar")).toHaveLength(4)
  expect(
    screen.getAllByRole("button").every((button) => button.getAttribute("aria-pressed") === "true"),
  ).toBe(true)
  expect(groups()).toEqual(["А-1", "А-2", "М-1", "Б-1"])
  await user.click(filter("Факультет", "Факультет А"))
  expect(groups()).toEqual(["Б-1"])
  expect(screen.queryByText("Математика")).toBeNull()
  expect(screen.getByText("История")).toBeTruthy()
  expect(
    screen.getByRole("columnheader", { name: "Факультет: Факультет Б" }).getAttribute("colspan"),
  ).toBe("1")
  expect(filter("Факультет", "Факультет А").getAttribute("aria-pressed")).toBe("false")
  await user.click(filter("Факультет", "Факультет А"))
  expect(groups()).toHaveLength(4)
  expect(
    screen.getByRole("columnheader", { name: "Факультет: Факультет А" }).getAttribute("colspan"),
  ).toBe("3")
})

it("combines all four filters, retains options when empty and allows recovery", async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.click(filter("Факультет", "Факультет Б"))
  await user.click(filter("Уровень обучения", "магистратура"))
  await user.click(filter("Форма обучения", "заочная"))
  await user.click(filter("Курс", "2 курс"))
  expect(groups()).toEqual(["А-1"])
  await user.click(filter("Курс", "1 курс"))
  expect(screen.queryByRole("table")).toBeNull()
  expect(screen.getByRole("status").textContent).toContain("Нет групп")
  expect(screen.getAllByRole("toolbar")).toHaveLength(4)
  await user.click(filter("Курс", "2 курс"))
  expect(groups()).toEqual(["А-2"])
  expect(screen.getByText("Физика")).toBeTruthy()
})

it("supports toggling with the keyboard", async () => {
  const user = userEvent.setup()
  render(<Example />)
  filter("Факультет", "Факультет Б").focus()
  await user.keyboard(" ")
  expect(groups()).toEqual(["А-1", "А-2", "М-1"])
})

it("selects groups using suggestions and switches between including and excluding them", async () => {
  const user = userEvent.setup()
  render(<Example />)
  const input = screen.getByRole("combobox", { name: "Группы" })
  await user.type(input, "а 1")
  await user.click(screen.getByRole("option", { name: "А-1" }))
  expect(groups()).toEqual(["А-1"])
  expect(screen.getByRole("button", { name: "Убрать группу А-1" })).toBeTruthy()
  expect(screen.queryByRole("option", { name: "А-1" })).toBeNull()
  const mode = screen.getByRole("switch", { name: "Исключать выбранные группы" })
  await user.click(mode)
  expect(mode.getAttribute("aria-checked")).toBe("true")
  expect(groups()).toEqual(["А-2", "М-1", "Б-1"])
  await user.click(screen.getByRole("button", { name: "Очистить выбранные группы" }))
  expect(groups()).toHaveLength(4)
  expect((input as HTMLInputElement).value).toBe("")
})

it("selects multiple groups using the keyboard and removes tags individually", async () => {
  const user = userEvent.setup()
  render(<Example />)
  const input = screen.getByRole("combobox", { name: "Группы" })
  await user.type(input, "А-1")
  await user.keyboard("{Enter}")
  await user.type(input, "А-2")
  await user.keyboard("{Enter}")
  expect(groups()).toEqual(["А-1", "А-2"])
  await user.click(screen.getByRole("button", { name: "Убрать группу А-1" }))
  expect(groups()).toEqual(["А-2"])
  await user.click(input)
  await user.keyboard("{Backspace}")
  expect(groups()).toHaveLength(4)
})

it("searches lesson cells together with filters and restores results after clearing", async () => {
  const user = userEvent.setup()
  render(<Example />)
  const input = screen.getByRole("searchbox", { name: "Поиск по ячейкам" })
  await user.type(input, "фИЗИКА")
  expect(groups()).toEqual(["А-2"])
  expect(screen.getByText("Физика")).toBeTruthy()
  expect(screen.queryByText("Математика")).toBeNull()
  await user.click(filter("Курс", "2 курс"))
  expect(screen.queryByRole("table")).toBeNull()
  expect(screen.getByRole("status").textContent).toContain("Занятия по запросу не найдены")
  await user.clear(input)
  expect(groups()).toEqual(["А-1", "М-1", "Б-1"])
  await user.type(input, "М-101")
  expect(groups()).toHaveLength(3)
  await user.clear(input)
  await user.type(input, "ничего подобного нет")
  expect(screen.queryByRole("table")).toBeNull()
  expect(screen.getAllByRole("toolbar")).toHaveLength(4)
})
