// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SubjectsTable } from "./subjects-table"

afterEach(cleanup)

it("shows grouped lessons, missing fields and safe online links without inventing dates", () => {
  const base = {
    weekday: "ПОНЕДЕЛЬНИК",
    time: null,
    classroom: null,
    lesson: "История",
    group: "А-1",
  }
  render(
    <SubjectsTable
      lessons={[
        base,
        { ...base, group: "А-2" },
        { ...base, lesson: "Физика", classroom: "https://example.com/lesson" },
      ]}
      loading={false}
      error={null}
      onRetry={async () => {}}
    />,
  )
  const rows = screen.getAllByRole("row")
  expect(rows).toHaveLength(3)
  const history = rows.find((row) => within(row).queryByText("История"))!
  expect(within(history).getByRole("list").textContent).toBe("А-1А-2")
  expect(within(history).getByText("Время не указано")).toBeTruthy()
  expect(within(history).getByText("Не указана")).toBeTruthy()
  const link = screen.getByRole("link", { name: "Онлайн-занятие" })
  expect(link.getAttribute("href")).toBe("https://example.com/lesson")
  expect(link.getAttribute("rel")).toContain("noopener")
  expect(
    screen.getByText("В исходном расписании указаны дни недели, без календарных дат."),
  ).toBeTruthy()
})

it("handles loading, failures with retry, and empty results within the table", async () => {
  const onRetry = vi.fn(async () => {})
  const props = { lessons: [], loading: true, error: null, onRetry }
  const view = render(<SubjectsTable {...props} />)
  expect(screen.getByRole("status").closest("table")).toBeTruthy()
  view.rerender(<SubjectsTable {...props} loading={false} error="Нет связи" />)
  expect(screen.getByRole("alert").textContent).toContain("Нет связи")
  await userEvent.setup().click(screen.getByRole("button", { name: "Попробовать снова" }))
  expect(onRetry).toHaveBeenCalledOnce()
  view.rerender(<SubjectsTable {...props} loading={false} />)
  expect(screen.getByText("В расписании нет предметов.").closest("table")).toBeTruthy()
})
