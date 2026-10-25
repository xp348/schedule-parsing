// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "@/App"
import type { Lesson } from "@/lib/schedule"

const base: Lesson = {
  group: "А-1",
  weekday: "ПОНЕДЕЛЬНИК",
  time: "8.40-10.10",
  lesson: "Нечётная пара",
  classroom: "М-101",
  week_parity: "odd",
}
const lessons: Lesson[] = [
  base,
  { ...base, group: "Б-1", lesson: "Чётная пара", classroom: "М-102", week_parity: "even" },
  { ...base, group: "В-1", lesson: "Без пометки", classroom: "М-103", week_parity: null },
]
const week = (name: string) =>
  within(screen.getByRole("radiogroup", { name: "Неделя расписания" })).getByRole("radio", { name })
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => lessons })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

it.each(["Группы", "Предметы"])(
  "filters lesson variants in %s and combines week selection with search",
  async (tab) => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: tab }))
    await screen.findByText("Нечётная пара")
    expect(screen.getByText("Чётная пара")).toBeTruthy()
    await user.click(week("Нечётная"))
    expect(screen.queryByText("Чётная пара")).toBeNull()
    expect(screen.getByText("Нечётная пара")).toBeTruthy()
    expect(screen.getByText("Без пометки")).toBeTruthy()
    await user.click(week("Чётная"))
    expect(screen.queryByText("Нечётная пара")).toBeNull()
    expect(screen.getByText("Чётная пара")).toBeTruthy()
    expect(screen.getByText("Без пометки")).toBeTruthy()
    const query = screen.getByRole("searchbox", {
      name: tab === "Группы" ? "Поиск по ячейкам" : "Поиск по предмету",
    })
    await user.type(query, "Без пометки")
    expect(screen.queryByText("Чётная пара")).toBeNull()
    expect(screen.getByText("Без пометки")).toBeTruthy()
    await user.clear(query)
    await user.click(week("Обе недели"))
    expect(screen.getByText("Нечётная пара")).toBeTruthy()
    expect(screen.getByText("Чётная пара")).toBeTruthy()
  },
)

it("recalculates both occupied and free rooms for the selected week", async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText("Нет свободных аудиторий")
  await user.click(screen.getByRole("radio", { name: "Занятые" }))
  expect(within(screen.getByRole("table")).getByRole("list").textContent).toBe("М-101М-102М-103")
  await user.click(week("Нечётная"))
  expect(within(screen.getByRole("table")).getByRole("list").textContent).toBe("М-101М-103")
  await user.click(screen.getByRole("radio", { name: "Свободные" }))
  expect(within(screen.getByRole("table")).getByRole("list").textContent).toBe("М-102")
  await user.click(week("Чётная"))
  expect(within(screen.getByRole("table")).getByRole("list").textContent).toBe("М-101")
  await user.click(screen.getByRole("radio", { name: "Занятые" }))
  expect(within(screen.getByRole("table")).getByRole("list").textContent).toBe("М-102М-103")
})

it("restores independent week selections for all three tabs after reopening", async () => {
  const user = userEvent.setup()
  const first = render(<App />)
  await user.click(week("Нечётная"))
  await user.click(screen.getByRole("tab", { name: "Группы" }))
  expect(week("Обе недели").getAttribute("aria-checked")).toBe("true")
  await user.click(week("Чётная"))
  await user.click(screen.getByRole("tab", { name: "Предметы" }))
  await user.click(week("Нечётная"))
  first.unmount()
  render(<App />)
  expect(screen.getByRole("tab", { name: "Предметы" }).getAttribute("aria-selected")).toBe("true")
  expect(week("Нечётная").getAttribute("aria-checked")).toBe("true")
  await user.click(screen.getByRole("tab", { name: "Группы" }))
  expect(week("Чётная").getAttribute("aria-checked")).toBe("true")
  await user.click(screen.getByRole("tab", { name: "Аудитории" }))
  expect(week("Нечётная").getAttribute("aria-checked")).toBe("true")
})
