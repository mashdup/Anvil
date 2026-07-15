import { useState, useCallback, useRef } from 'react'
import type { Item } from './types'

export function useScrollManager() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const userScrolledUpRef = useRef(false)
  const AT_BOTTOM_THRESHOLD = 20

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distFromBottom < AT_BOTTOM_THRESHOLD
    userScrolledUpRef.current = !atBottom
    setUserScrolledUp(!atBottom)
  }, [])

  const scrollToMessage = (id: string): void => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return {
    scrollRef,
    userScrolledUp,
    userScrolledUpRef,
    handleMessagesScroll,
    scrollToMessage,
  }
}
