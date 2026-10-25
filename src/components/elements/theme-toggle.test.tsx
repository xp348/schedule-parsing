// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeToggle } from "./theme-toggle"
import { THEME_STORAGE_KEY } from "@/hooks/use-theme"

let media: EventTarget & { matches: boolean }

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
  document.documentElement.style.colorScheme = ""
  media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.classList.remove("dark")
  document.documentElement.style.colorScheme = ""
  localStorage.clear()
})

it("switches both ways and restores the saved theme after remounting", async () => {
  const user = userEvent.setup()
  const view = render(<ThemeToggle />)
  await user.click(screen.getByRole("button", { name: "Включить тёмную тему" }))
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  expect(document.documentElement.style.colorScheme).toBe("dark")
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
  view.unmount()
  render(<ThemeToggle />)
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  await user.click(screen.getByRole("button", { name: "Включить светлую тему" }))
  expect(document.documentElement.classList.contains("dark")).toBe(false)
  expect(document.documentElement.style.colorScheme).toBe("light")
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
})

it("follows system changes until the user chooses a theme", async () => {
  media.matches = true
  render(<ThemeToggle />)
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  act(() => {
    media.matches = false
    media.dispatchEvent(Object.assign(new Event("change"), { matches: false }))
  })
  expect(document.documentElement.classList.contains("dark")).toBe(false)
  await userEvent.setup().click(screen.getByRole("button", { name: "Включить тёмную тему" }))
  act(() => media.dispatchEvent(Object.assign(new Event("change"), { matches: false })))
  expect(document.documentElement.classList.contains("dark")).toBe(true)
})

it("prefers a saved light theme over the dark system setting", () => {
  media.matches = true
  localStorage.setItem(THEME_STORAGE_KEY, "light")
  render(<ThemeToggle />)
  expect(document.documentElement.classList.contains("dark")).toBe(false)
})

it("can switch themes even when browser storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked")
  })
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked")
  })
  render(<ThemeToggle />)
  await userEvent.setup().click(screen.getByRole("button", { name: "Включить тёмную тему" }))
  expect(document.documentElement.classList.contains("dark")).toBe(true)
})
