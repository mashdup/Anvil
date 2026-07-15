import { useState, useCallback, useRef } from 'react'
import type { Item } from './types'

export function useScrollManager() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const userScrolledUpRef = useRef(false)
  // True while scrollToBottom's own scrollTo calls are still settling. A
  // large/fast-streaming message can grow scrollHeight again in the gap
  // between one of those calls and its resulting `scroll` event, which would
  // otherwise read as "user scrolled away" even though nothing but our own
  // code moved anything — and since the auto-scroll effect only scrolls
  // while engaged, that one false positive would permanently wedge it off.
  const programmaticRef = useRef(false)
  const AT_BOTTOM_THRESHOLD = 32

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distFromBottom < AT_BOTTOM_THRESHOLD
    if (programmaticRef.current && !atBottom) return
    userScrolledUpRef.current = !atBottom
    setUserScrolledUp(!atBottom)
  }, [])

  // Scrolls to the true bottom and keeps nudging there across the next
  // couple of frames, so content that lands mid-flight (streaming tokens,
  // async syntax-highlight reflow) doesn't leave a visible gap that reads as
  // "stopped scrolling".
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    programmaticRef.current = true
    el.scrollTo({ top: el.scrollHeight })
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight })
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight })
        programmaticRef.current = false
      })
    })
  }, [])

  const scrollToMessage = (id: string): void => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return {
    scrollRef,
    userScrolledUp,
    userScrolledUpRef,
    handleMessagesScroll,
    scrollToBottom,
    scrollToMessage,
  }
}
