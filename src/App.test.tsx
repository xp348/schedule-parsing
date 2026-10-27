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
  vi.useRealTimers()
})

describe("minimal timetable interface", () => {
  it.each([
    ["2026-10-26T02:00:00Z", "08:40"],
    ["2026-10-26T03:15:00Z", "10:20"],
  ])("highlights the current or next interval in all three tables at %s", async (now, time) => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(now))
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText("М-102")
    for (const name of ["Аудитории", "Группы", "Предметы"]) {
      await user.click(screen.getByRole("tab", { name }))
      const table = screen.getByRole("table")
      const currentRows = table.querySelectorAll('tr[data-current-time="true"]')
      expect(currentRows).toHaveLength(1)
      expect(currentRows[0].getAttribute("data-current-day")).toBe("true")
      expect(within(currentRows[0] as HTMLElement).getByText(time)).toBeTruthy()
      expect(table.querySelectorAll('tr[data-current-day="true"]')).toHaveLength(2)
      expect(
        within(currentRows[0] as HTMLElement)
          .getByText(time)
          .closest("td")?.className,
      ).toContain("bg-neutral-200")
    }
  })

  it("shows four tabs and a room table with exactly three columns", async () => {
    render(<App />)
    await screen.findByText("М-102")
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Группы",
      "Предметы",
      "Аудитории",
      "Прочее",
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
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    await user.click(screen.getByRole("tab", { name: "Аудитории" }))
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

  it("shows the grouping table and a five-column subjects table", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    const table = await screen.findByRole("table")
    expect(within(table).getByRole("columnheader", { name: "День" }).getAttribute("rowspan")).toBe(
      "5",
    )
    expect(within(table).getByRole("columnheader", { name: "Время" })).toBeTruthy()
    expect(within(table).getByRole("columnheader", { name: "Группа: ИЭ-26" })).toBeTruthy()
    expect(within(table).getByRole("columnheader", { name: "Группа: ИС-26" })).toBeTruthy()
    expect(
      within(table).getByRole("rowheader", { name: "Понедельник" }).getAttribute("rowspan"),
    ).toBe("2")
    const rows = within(table).getAllByRole("row").slice(5)
    const firstCells = within(rows[0]).getAllByRole("cell")
    const secondCells = within(rows[1]).getAllByRole("cell")
    const groups = within(table)
      .getAllByRole("columnheader")
      .filter((header) => header.getAttribute("aria-label")?.startsWith("Группа:"))
    const programmingColumn = groups.findIndex((header) => header.textContent === "ИЭ-26") + 1
    const mathColumn = groups.findIndex((header) => header.textContent === "ИС-26") + 1
    expect(within(firstCells[programmingColumn]).getByText("Программирование")).toBeTruthy()
    expect(within(firstCells[programmingColumn]).getByText("Аудитория: М-101")).toBeTruthy()
    expect(firstCells[mathColumn].textContent).toBe("")
    expect(secondCells[programmingColumn].textContent).toBe("")
    expect(within(secondCells[mathColumn]).getByText("Математика")).toBeTruthy()
    expect(within(secondCells[mathColumn]).getByText("Аудитория: М-102")).toBeTruthy()
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    const subjectsTable = screen.getByRole("table")
    expect(
      within(subjectsTable)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Дата", "Время", "Предмет", "Группы", "Аудитория"])
    const subjectRows = within(subjectsTable).getAllByRole("row").slice(1)
    expect(within(subjectRows[0]).getByText("Понедельник")).toBeTruthy()
    expect(within(subjectRows[0]).getByText("08:40")).toBeTruthy()
    expect(within(subjectRows[0]).getByText("Программирование")).toBeTruthy()
    expect(within(subjectRows[0]).getByText("ИЭ-26")).toBeTruthy()
    expect(within(subjectRows[0]).getByText("М-101")).toBeTruthy()
    expect(within(subjectRows[1]).getByText("Математика")).toBeTruthy()
  })

  it("keeps grouping filters when switching tabs", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    const faculty = await screen.findByRole("toolbar", { name: "Факультет" })
    await user.click(within(faculty).getByRole("button", { name: "Факультет не указан" }))
    expect(screen.queryByRole("table")).toBeNull()
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    expect(screen.queryByRole("table")).toBeNull()
    const option = within(screen.getByRole("toolbar", { name: "Факультет" })).getByRole("button", {
      name: "Факультет не указан",
    })
    expect(option.getAttribute("aria-pressed")).toBe("false")
    await user.click(option)
    expect(screen.getByRole("table")).toBeTruthy()
  })

  it("keeps selected groups, exclusion mode and cell search across tabs", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    await user.type(await screen.findByRole("combobox", { name: "Группы" }), "ИЭ-26")
    await user.click(screen.getByRole("option", { name: "ИЭ-26" }))
    await user.click(screen.getByRole("switch", { name: "Исключать выбранные группы" }))
    await user.type(screen.getByRole("searchbox", { name: "Поиск по ячейкам" }), "Математика")
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    expect(screen.getByRole("button", { name: "Убрать группу ИЭ-26" })).toBeTruthy()
    expect(
      screen
        .getByRole("switch", { name: "Исключать выбранные группы" })
        .getAttribute("aria-checked"),
    ).toBe("true")
    expect(
      (screen.getByRole("searchbox", { name: "Поиск по ячейкам" }) as HTMLInputElement).value,
    ).toBe("Математика")
    expect(
      within(screen.getByRole("table")).queryByRole("columnheader", { name: "Группа: ИЭ-26" }),
    ).toBeNull()
    expect(within(screen.getByRole("table")).getByText("Математика")).toBeTruthy()
  })

  it("switches between free and occupied rooms and keeps the selection and mode across tabs", async () => {
    const user = userEvent.setup()
    render(<App />)
    const table = screen.getByRole("table")
    await within(table).findByText("М-102")
    const mode = screen.getByRole("radiogroup", { name: "Занятость аудиторий" })
    expect(
      within(mode).getByRole("radio", { name: "Свободные" }).getAttribute("aria-checked"),
    ).toBe("true")
    await user.click(within(mode).getByRole("radio", { name: "Занятые" }))
    const rows = within(table).getAllByRole("row")
    expect(within(rows[1]).getByRole("list", { name: "Занятые аудитории" }).textContent).toBe(
      "М-101",
    )
    expect(within(rows[2]).getByRole("list", { name: "Занятые аудитории" }).textContent).toBe(
      "М-102",
    )
    await user.type(screen.getByRole("combobox", { name: "Аудитория" }), "101")
    await user.click(screen.getByRole("option", { name: "М-101" }))
    expect(within(table).getAllByRole("row")).toHaveLength(2)
    expect(within(table).getByText("08:40")).toBeTruthy()
    expect(within(table).queryByText("10:20")).toBeNull()
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    await user.click(screen.getByRole("tab", { name: "Аудитории" }))
    expect(screen.getByRole("radio", { name: "Занятые" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()
    await user.click(screen.getByRole("radio", { name: "Свободные" }))
    const restoredTable = screen.getByRole("table")
    expect(within(restoredTable).getByText("10:20")).toBeTruthy()
    expect(within(restoredTable).queryByText("08:40")).toBeNull()
  })

  it("searches subjects, reports missing matches and keeps the query across tabs", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [...fixtures, { ...fixtures[0], lesson: "Теория   вероятностей" }],
    } as Response)
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    await screen.findByText("Математика")
    const input = screen.getByRole("searchbox", { name: "Поиск по предмету" })
    await user.type(input, "  МАТЕМАТИКА  ")
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2)
    expect(screen.getByText("Математика")).toBeTruthy()
    expect(screen.queryByText("Программирование")).toBeNull()
    await user.click(screen.getByRole("tab", { name: "Аудитории" }))
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    const restoredInput = screen.getByRole("searchbox", { name: "Поиск по предмету" })
    expect((restoredInput as HTMLInputElement).value).toBe("  МАТЕМАТИКА  ")
    await user.clear(restoredInput)
    await user.type(restoredInput, "вероятностёй")
    expect(screen.getByText("Теория вероятностей")).toBeTruthy()
    await user.clear(restoredInput)
    await user.type(restoredInput, "М-101")
    expect(screen.getByRole("status").textContent).toBe("Предметы по запросу не найдены.")
    await user.click(screen.getByRole("button", { name: "Очистить поиск по предмету" }))
    expect((restoredInput as HTMLInputElement).value).toBe("")
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4)
  })

  it("keeps empty room intervals and days on request, independently of other tabs", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [...fixtures, { ...fixtures[1], weekday: "ВТОРНИК", time: "12.10-13.40" }],
    } as Response)
    render(<App />)
    await within(screen.getByRole("table")).findByText("М-102")
    await user.click(screen.getByRole("radio", { name: "Занятые" }))
    await user.type(screen.getByRole("combobox", { name: "Аудитория" }), "101")
    await user.click(screen.getByRole("option", { name: "М-101" }))
    const toggle = screen.getByRole("switch", { name: "Показывать пустые дни и время" })
    expect(toggle.getAttribute("aria-checked")).toBe("false")
    expect(within(screen.getByRole("table")).queryByText("12:10")).toBeNull()
    await user.click(toggle)
    expect(within(screen.getByRole("table")).getByText("12:10")).toBeTruthy()
    expect(
      within(screen.getByRole("table")).getByRole("rowheader", { name: "Вторник" }),
    ).toBeTruthy()
    expect(
      within(screen.getByRole("table"))
        .getByRole("rowheader", { name: "Понедельник" })
        .getAttribute("rowspan"),
    ).toBe("2")
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    expect(
      screen
        .getByRole("switch", { name: "Показывать пустые дни и время" })
        .getAttribute("aria-checked"),
    ).toBe("false")
    await user.click(screen.getByRole("tab", { name: "Аудитории" }))
    expect(
      screen
        .getByRole("switch", { name: "Показывать пустые дни и время" })
        .getAttribute("aria-checked"),
    ).toBe("true")
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    expect(within(screen.getByRole("table")).queryByText("12:10")).toBeNull()
  })

  it("shows empty group rows under filters and cell search only when enabled", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [...fixtures, { ...fixtures[1], weekday: "ВТОРНИК", time: "12.10-13.40" }],
    } as Response)
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    await user.type(await screen.findByRole("combobox", { name: "Группы" }), "ИЭ-26")
    await user.click(screen.getByRole("option", { name: "ИЭ-26" }))
    expect(within(screen.getByRole("table")).queryByText("12:10")).toBeNull()
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    expect(within(screen.getByRole("table")).getByText("12:10")).toBeTruthy()
    await user.type(screen.getByRole("searchbox", { name: "Поиск по ячейкам" }), "нет совпадений")
    expect(within(screen.getByRole("table")).getByText("08:40")).toBeTruthy()
    expect(within(screen.getByRole("table")).getByText("12:10")).toBeTruthy()
    expect(within(screen.getByRole("table")).queryByText("Программирование")).toBeNull()
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.getByRole("status").textContent).toContain("Занятия по запросу не найдены")
  })

  it("shows blank subject rows with day and time while searching when enabled", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [...fixtures, { ...fixtures[1], weekday: "ВТОРНИК", time: "12.10-13.40" }],
    } as Response)
    render(<App />)
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    const input = screen.getByRole("searchbox", { name: "Поиск по предмету" })
    await user.type(input, "Программирование")
    await screen.findByText("Программирование")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    expect(screen.getAllByRole("row")).toHaveLength(4)
    const emptyRow = screen.getAllByRole("row").find((row) => within(row).queryByText("12:10"))!
    const cells = within(emptyRow).getAllByRole("cell")
    expect(within(cells[0]).getByText("Вторник")).toBeTruthy()
    expect(within(cells[0]).getByTitle("Вторник").textContent).toBe("Вт")
    expect(cells.slice(2).map((cell) => cell.textContent)).toEqual(["", "", ""])
    await user.clear(input)
    await user.type(input, "нет совпадений")
    expect(screen.getAllByRole("row")).toHaveLength(4)
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    expect(screen.getByRole("status").textContent).toBe("Предметы по запросу не найдены.")
    expect(screen.getAllByRole("row")).toHaveLength(2)
  })

  it("restores all tabs' inputs and switches after reopening the page", async () => {
    const user = userEvent.setup()
    const firstVisit = render(<App />)
    await screen.findByText("М-102")
    await user.click(screen.getByRole("radio", { name: "Занятые" }))
    await user.type(screen.getByRole("combobox", { name: "Аудитория" }), "101")
    await user.click(screen.getByRole("option", { name: "М-101" }))
    await user.type(screen.getByRole("combobox", { name: "Аудитория" }), "102")
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    await user.type(screen.getByRole("combobox", { name: "Группы" }), "ИС-26")
    await user.click(screen.getByRole("option", { name: "ИС-26" }))
    await user.type(screen.getByRole("combobox", { name: "Группы" }), "ИЭ")
    await user.click(screen.getByRole("switch", { name: "Исключать выбранные группы" }))
    await user.type(screen.getByRole("searchbox", { name: "Поиск по ячейкам" }), "Программирование")
    for (const name of ["Факультет", "Уровень обучения", "Форма обучения", "Курс"]) {
      await user.click(within(screen.getByRole("toolbar", { name })).getByRole("button"))
    }
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    await user.click(screen.getByRole("tab", { name: "Предметы" }))
    await user.type(screen.getByRole("searchbox", { name: "Поиск по предмету" }), "Матем")
    await user.click(screen.getByRole("switch", { name: "Показывать пустые дни и время" }))
    firstVisit.unmount()
    render(<App />)
    expect(screen.getByRole("tab", { name: "Предметы" }).getAttribute("aria-selected")).toBe("true")
    expect(
      (screen.getByRole("searchbox", { name: "Поиск по предмету" }) as HTMLInputElement).value,
    ).toBe("Матем")
    expect(
      screen
        .getByRole("switch", { name: "Показывать пустые дни и время" })
        .getAttribute("aria-checked"),
    ).toBe("true")
    await user.click(screen.getByRole("tab", { name: "Группы" }))
    await screen.findByRole("button", { name: "Убрать группу ИС-26" })
    expect((screen.getByRole("combobox", { name: "Группы" }) as HTMLInputElement).value).toBe("ИЭ")
    expect(
      (screen.getByRole("searchbox", { name: "Поиск по ячейкам" }) as HTMLInputElement).value,
    ).toBe("Программирование")
    expect(
      screen
        .getByRole("switch", { name: "Исключать выбранные группы" })
        .getAttribute("aria-checked"),
    ).toBe("true")
    expect(
      screen
        .getByRole("switch", { name: "Показывать пустые дни и время" })
        .getAttribute("aria-checked"),
    ).toBe("true")
    for (const name of ["Факультет", "Уровень обучения", "Форма обучения", "Курс"]) {
      expect(
        within(screen.getByRole("toolbar", { name }))
          .getByRole("button")
          .getAttribute("aria-pressed"),
      ).toBe("false")
    }
    await user.click(screen.getByRole("tab", { name: "Аудитории" }))
    expect(screen.getByRole("radio", { name: "Занятые" }).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("button", { name: "Убрать аудиторию М-101" })).toBeTruthy()
    expect((screen.getByRole("combobox", { name: "Аудитория" }) as HTMLInputElement).value).toBe(
      "102",
    )
    expect(
      screen
        .getByRole("switch", { name: "Показывать пустые дни и время" })
        .getAttribute("aria-checked"),
    ).toBe("true")
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
