import { useState, type FormEvent } from 'react'

export function useDirectoryFilter() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ q: '', page: 0 })

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilter({ q: search.trim(), page: 0 })
  }

  return {
    search,
    setSearch,
    submitSearch,
    filter,
    selectPage: (page: number) => setFilter(previous => ({ ...previous, page })),
  }
}
