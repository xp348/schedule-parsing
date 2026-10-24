// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App"
import type { Lesson } from "./lib/schedule"
import { ROOM_SEARCH_STORAGE_KEY } from "./hooks/use-room-search"

const fixtures: Lesson[] = [
  {
    group: "ИЭ-26",
    time: "8.40-10.10",
    weekday: "ПОНЕДЕЛЬНИК",
    lesson: "Программирование",
    classroom: "М-101",
  },
  {
    group: "ИС-26",
    time: "10.20-11.50",
    weekday: "ПОНЕДЕЛЬНИК",
    lesson: "Математика",
    classroom: "М-102",
  },
]

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("metadata")
          ? { updatedAt: "2026-10-24T10:00:00+07:00", commit: "abc123" }
          : fixtures,
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("minimal timetable interface", () => {
  it("shows only three tabs and a table with exactly three columns", async () => {
    render(<App />)
    await screen.findByText("М-102")
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Группировка",
      "Поиск",
      "Свободные аудитории",
    ])
    const table = screen.getByRole("table")
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["День", "Время", "Аудитории"])
    expect(screen.queryByRole("heading")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Аудитория" })).toBeTruthy()
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("groups intervals under the day and excludes occupied rooms in each row", async () => {
    render(<App />)
    await screen.findByText("М-102")
    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByRole("list").textContent).toBe("М-102")
    expect(within(rows[2]).getByRole("list").textContent).toBe("М-101")
    const day = screen.getByRole("rowheader", { name: "Понедельник" })
    expect(day.getAttribute("rowspan")).toBe("2")
    expect(within(rows[1]).getByText("08:40")).toBeTruthy()
    expect(within(rows[2]).getByText("10:20")).toBeTruthy()
  })

  it("suggests rooms while typing, selects a room and clears the table filter", async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText("М-102")
    const input = screen.getByRole("combobox", { name: "Аудитория" }) as HTMLInputElement
    await user.type(input, "101")
    expect(screen.getByRole("option", { name: "М-101" })).toBeTruthy()
    expect(screen.queryByRole("option", { name: "М-102" })).toBeNull()
    await user.click(screen.getByRole("option", { name: "М-101" }))
    expect(input.value).toBe("")
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()
    expect(screen.queryByRole("option", { name: "М-101" })).toBeNull()
    expect(screen.getByRole("option", { name: "М-102" })).toBeTruthy()
    const table = screen.getByRole("table")
    expect(within(table).getAllByRole("row")).toHaveLength(2)
    expect(within(table).getByRole("list").textContent).toBe("М-101")
    expect(within(table).getByText("10:20")).toBeTruthy()
    expect(within(table).queryByText("08:40")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Очистить поиск" }))
    expect(input.value).toBe("")
    expect(within(table).getAllByRole("row")).toHaveLength(3)
  })

  it("supports keyboard selection and closes suggestions with Escape", async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText("М-102")
    const input = screen.getByRole("combobox", { name: "Аудитория" }) as HTMLInputElement
    await user.type(input, "м 10")
    expect(screen.getAllByRole("option")).toHaveLength(2)
    await user.keyboard("{ArrowDown}{Enter}")
    expect(input.value).toBe("")
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-102" })).toBeTruthy()
    expect(within(screen.getByRole("table")).getByText("08:40")).toBeTruthy()
    expect(within(screen.getByRole("table")).queryByText("10:20")).toBeNull()
    await user.clear(input)
    await user.type(input, "999")
    expect(screen.getByText("Аудитории не найдены")).toBeTruthy()
    await user.keyboard("{Escape}")
    expect(screen.queryByText("Аудитории не найдены")).toBeNull()
    expect(input.getAttribute("aria-expanded")).toBe("false")
  })

  it("restores selected rooms and unfinished text after reopening, switching tabs and clearing", async () => {
    const user = userEvent.setup()
    const firstVisit = render(<App />)
    await screen.findByText("М-102")
    await user.type(screen.getByRole("combobox"), "101")
    await user.click(screen.getByRole("option", { name: "М-101" }))
    await user.type(screen.getByRole("combobox"), "102")
    expect(JSON.parse(localStorage.getItem(ROOM_SEARCH_STORAGE_KEY)!)).toEqual({
      selectedRooms: ["М-101"],
      query: "102",
    })

    firstVisit.unmount()
    const secondVisit = render(<App />)
    await within(screen.getByRole("table")).findByText("М-101")
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("102")
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()
    expect(within(screen.getByRole("table")).queryByText("08:40")).toBeNull()
    await user.click(screen.getByRole("tab", { name: "Поиск" }))
    await user.click(screen.getByRole("tab", { name: "Свободные аудитории" }))
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("102")
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Очистить поиск" }))
    secondVisit.unmount()
    render(<App />)
    await within(screen.getByRole("table")).findByText("М-102")
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("")
    expect(screen.queryByRole("button", { name: "Убрать аудиторию М-101" })).toBeNull()
    expect(screen.getAllByRole("row")).toHaveLength(3)
  })

  it("ignores corrupted saved search data", async () => {
    localStorage.setItem(ROOM_SEARCH_STORAGE_KEY, "not JSON")
    render(<App />)
    await screen.findByText("М-102")
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("")
    expect(screen.getAllByRole("row")).toHaveLength(3)
  })

  it("still lets users select rooms when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked")
    })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText("М-102")
    await user.type(screen.getByRole("combobox"), "101")
    await user.click(screen.getByRole("option", { name: "М-101" }))
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()
    expect(within(screen.getByRole("table")).getByRole("list").textContent).toBe("М-101")
  })

  it("shows a clear message when all known rooms are occupied", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [fixtures[0]],
    } as Response)
    render(<App />)
    expect(await screen.findByText("Нет свободных аудиторий")).toBeTruthy()
  })

  it("selects several rooms without duplicates and removes them individually", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [...fixtures, { ...fixtures[0], classroom: "М-103", time: "12.10-13.40" }],
    } as Response)
    render(<App />)
    const table = screen.getByRole("table")
    await within(table).findAllByText("М-103")
    const input = screen.getByRole("combobox", { name: "Аудитория" })
    await user.type(input, "101")
    await user.click(screen.getByRole("option", { name: "М-101" }))
    await user.type(input, "102")
    await user.click(screen.getByRole("option", { name: "М-102" }))
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-102" })).toBeTruthy()
    expect(screen.queryByRole("option", { name: "М-101" })).toBeNull()
    expect(screen.queryByRole("option", { name: "М-102" })).toBeNull()
    expect(within(table).queryByText("М-103")).toBeNull()
    const rows = within(table).getAllByRole("row")
    expect(within(rows[1]).getByRole("list").textContent).toBe("М-102")
    expect(within(rows[2]).getByRole("list").textContent).toBe("М-101")
    expect(
      within(rows[3])
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["М-101", "М-102"])
    await user.click(screen.getByRole("button", { name: "Убрать аудиторию М-101" }))
    expect(within(table).queryByText("М-101")).toBeNull()
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-102" })).toBeTruthy()
    await user.click(input)
    await user.keyboard("{Backspace}")
    expect(screen.queryByRole("button", { name: "Убрать аудиторию М-102" })).toBeNull()
    expect(within(table).getAllByText("М-103").length).toBeGreaterThan(0)
  })

  it("switches to simple placeholders in the other two tabs", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Группировка" }))
    expect(screen.getByText("Раздел «Группировка» в разработке.")).toBeTruthy()
    expect(screen.queryByRole("table")).toBeNull()
    await user.click(screen.getByRole("tab", { name: "Поиск" }))
    expect(screen.getByText("Раздел «Поиск» в разработке.")).toBeTruthy()
  })

  it("renders loading and error states inside the table and retries", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Сервер недоступен"))
    render(<App />)
    expect(screen.getByRole("status").closest("table")).toBeTruthy()
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.getByRole("alert").closest("table")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Попробовать снова" }))
    await screen.findByText("М-102")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
