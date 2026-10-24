import { useEffect, useState } from "react"

interface RoomSearchState {
  selectedRooms: string[]
  query: string
}

export const ROOM_SEARCH_STORAGE_KEY = `campus:${import.meta.env.BASE_URL}:room-search:v1`

function readSavedSearch(): RoomSearchState {
  try {
    const saved = localStorage.getItem(ROOM_SEARCH_STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      if (
        typeof state?.query === "string" &&
        Array.isArray(state.selectedRooms) &&
        state.selectedRooms.every((room: unknown) => typeof room === "string")
      ) {
        return { query: state.query, selectedRooms: [...new Set<string>(state.selectedRooms)] }
      }
    }
  } catch {
    // Повреждённое или недоступное хранилище не мешает работе поиска.
  }
  return { selectedRooms: [], query: "" }
}

export function useRoomSearch() {
  const [search, setSearch] = useState<RoomSearchState>(readSavedSearch)

  useEffect(() => {
    try {
      localStorage.setItem(ROOM_SEARCH_STORAGE_KEY, JSON.stringify(search))
    } catch {
      // Если браузер запретил хранение, поиск продолжает работать в памяти.
    }
  }, [search])

  function setSelectedRooms(selectedRooms: string[]) {
    setSearch((previous) => ({ ...previous, selectedRooms }))
  }

  function setQuery(query: string) {
    setSearch((previous) => ({ ...previous, query }))
  }

  return { ...search, setSelectedRooms, setQuery }
}
