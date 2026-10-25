import { useId, useRef, useState } from "react"
import { BroomIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MultiSelectSearchProps {
  labels: {
    input: string
    options: string
    placeholder: string
    remove: (value: string) => string
    clear: string
    clearTitle: string
    empty: string
    allSelected: string
  }
  normalizeQuery?: (value: string) => string
  items: string[]
  selectedValues: string[]
  query: string
  onQueryChange: (query: string) => void
  disabled?: boolean
  onChange: (items: string[]) => void
}

export function MultiSelectSearch({
  labels,
  normalizeQuery = (value) => value.toLocaleLowerCase("ru").trim(),
  items,
  selectedValues,
  query,
  onQueryChange,
  disabled,
  onChange,
}: MultiSelectSearchProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const suggestions = items.filter(
    (value) =>
      !selectedValues.includes(value) && normalizeQuery(value).includes(normalizeQuery(query)),
  )
  const expanded = open && !disabled

  function selectValue(value: string) {
    if (selectedValues.includes(value)) return
    onChange([...selectedValues, value])
    onQueryChange("")
    setActiveIndex(0)
    setOpen(true)
    input.current?.focus()
  }

  return (
    <div
      className="relative my-4 w-[27.5rem] max-w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {selectedValues.map((value) => (
          <Badge key={value} variant="secondary" className="w-26 min-w-0">
            <span className="truncate" title={value}>
              {value}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={labels.remove(value)}
              disabled={disabled}
              onClick={() => {
                onChange(selectedValues.filter((selected) => selected !== value))
                setActiveIndex(0)
                input.current?.focus()
              }}
            >
              <XIcon />
            </Button>
          </Badge>
        ))}
      </div>
      <div className="relative mt-2 w-full">
        <Input
          className="pr-11"
          ref={input}
          type="text"
          role="combobox"
          aria-label={labels.input}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={
            expanded && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder={selectedValues.length ? "Добавить…" : labels.placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => {
            setOpen(true)
            setActiveIndex(0)
          }}
          onChange={(event) => {
            onQueryChange(event.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !query && selectedValues.length) {
              onChange(selectedValues.slice(0, -1))
              setActiveIndex(0)
            } else if (event.key === "Escape") {
              setOpen(false)
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              setOpen(true)
              const direction = event.key === "ArrowDown" ? 1 : -1
              const nextIndex = !open
                ? 0
                : (activeIndex + direction + suggestions.length) % suggestions.length
              setActiveIndex(Number.isFinite(nextIndex) ? nextIndex : 0)
              document
                .getElementById(`${listId}-${nextIndex}`)
                ?.scrollIntoView?.({ block: "nearest" })
            } else if (event.key === "Enter" && expanded && suggestions[activeIndex]) {
              event.preventDefault()
              selectValue(suggestions[activeIndex])
            }
          }}
        />
        {(query || selectedValues.length > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            disabled={disabled}
            aria-label={labels.clear}
            title={labels.clearTitle}
            onClick={() => {
              onQueryChange("")
              onChange([])
              setActiveIndex(0)
              setOpen(true)
              input.current?.focus()
            }}
          >
            <BroomIcon />
          </Button>
        )}
      </div>
      {expanded && (
        <div className="absolute top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          <ul className="m-0 list-none p-1" id={listId} role="listbox" aria-label={labels.options}>
            {suggestions.map((value, index) => (
              <li
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                key={value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectValue(value)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {value}
              </li>
            ))}
          </ul>
          {suggestions.length === 0 && (
            <p role="status" className="p-2 text-sm text-muted-foreground">
              {items.length > 0 && items.every((value) => selectedValues.includes(value))
                ? labels.allSelected
                : labels.empty}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
