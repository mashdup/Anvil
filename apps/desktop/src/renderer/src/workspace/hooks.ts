import { useCallback, useEffect, useRef, useState } from 'react'

/** Panel width persisted app-wide so it survives restarts and new tabs. */
export function usePanelWidth(
  key: string,
  initial: number,
): [number, (updater: (w: number) => number) => void] {
  const [w, setW] = useState(() => {
    const s = Number(localStorage.getItem(`chpanel:${key}`))
    return Number.isFinite(s) && s > 0 ? s : initial
  })
  const set = useCallback(
    (updater: (w: number) => number) =>
      setW((prev) => {
        const next = updater(prev)
        localStorage.setItem(`chpanel:${key}`, String(next))
        return next
      }),
    [key],
  )
  return [w, set]
}

/** Track an element's live pixel width via ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width)
    })
    ro.observe(el)
    setW(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}
