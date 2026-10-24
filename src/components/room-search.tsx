import { useId, useRef, useState } from "react"

interface RoomSearchProps {
  rooms: string[]
  selectedRooms: string[]
  query: string
  onQueryChange: (query: string) => void
  disabled?: boolean
  onChange: (rooms: string[]) => void
}

function normalizeQuery(value: string) {
  return value.toUpperCase().replace(/M/g, "М").replace(/Y/g, "У").replace(/[\s-]/g, "")
}

export function RoomSearch({
  rooms,
  selectedRooms,
  query,
  onQueryChange,
  disabled,
  onChange,
}: RoomSearchProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const suggestions = rooms.filter(
    (room) => !selectedRooms.includes(room) && normalizeQuery(room).includes(normalizeQuery(query)),
  )
  const expanded = open && !disabled

  function selectRoom(room: string) {
    if (selectedRooms.includes(room)) return
    onChange([...selectedRooms, room])
    onQueryChange("")
    setActiveIndex(0)
    setOpen(true)
    input.current?.focus()
  }

  return (
    <div
      className="room-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="room-search-field">
        {selectedRooms.map((room) => (
          <span key={room} className="room-search-tag">
            <span>{room}</span>
            <button
              type="button"
              aria-label={`Убрать аудиторию ${room}`}
              disabled={disabled}
              onClick={() => {
                onChange(selectedRooms.filter((selected) => selected !== room))
                setActiveIndex(0)
                input.current?.focus()
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Аудитория"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={
            expanded && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder={selectedRooms.length ? "Добавить…" : "Найти аудитории…"}
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
            if (event.key === "Backspace" && !query && selectedRooms.length) {
              onChange(selectedRooms.slice(0, -1))
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
              selectRoom(suggestions[activeIndex])
            }
          }}
        />
        {(query || selectedRooms.length > 0) && (
          <button
            type="button"
            className="room-search-clear"
            aria-label="Очистить поиск"
            onClick={() => {
              onQueryChange("")
              onChange([])
              setActiveIndex(0)
              setOpen(true)
              input.current?.focus()
            }}
          >
            ×
          </button>
        )}
      </div>
      {expanded && (
        <div className="room-suggestions">
          <ul id={listId} role="listbox" aria-label="Аудитории">
            {suggestions.map((room, index) => (
              <li
                key={room}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectRoom(room)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {room}
              </li>
            ))}
          </ul>
          {suggestions.length === 0 && (
            <p role="status">
              {rooms.length > 0 && rooms.every((room) => selectedRooms.includes(room))
                ? "Все аудитории выбраны"
                : "Аудитории не найдены"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
