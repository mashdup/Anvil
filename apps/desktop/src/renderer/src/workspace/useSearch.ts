import { useState, useRef, useMemo } from 'react'
import type { Item } from './types'

export function useSearch(items: Item[], scrollToMessage: (id: string) => void) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  const trimmedQuery = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return []
    return items
      .filter(
        (it): it is Extract<Item, { kind: 'user' | 'assistant' }> =>
          (it.kind === 'user' || it.kind === 'assistant') &&
          it.text.toLowerCase().includes(trimmedQuery),
      )
      .slice(0, 50)
  }, [items, trimmedQuery])

  const jumpToMessage = (id: string): void => {
    setSearchOpen(false)
    scrollToMessage(id)
    setFlashId(id)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1600)
  }

  return {
    query,
    setQuery,
    searchOpen,
    setSearchOpen,
    flashId,
    trimmedQuery,
    searchResults,
    jumpToMessage,
  }
}
