import { useEffect } from 'react'

/**
 * useMenuDismiss: auto-dismiss menus on click/Escape.
 * Takes a menu state and setter; returns nothing (installs the effect).
 */
export function useMenuDismiss<T>(menu: T | null, setMenu: (v: null) => void): void {
  useEffect(() => {
    if (!menu) return
    const close = (): void => setMenu(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu, setMenu])
}

/**
 * useMenuDismissDeferred: same as useMenuDismiss but defers the click listener
 * to avoid the opening click immediately closing the menu.
 */
export function useMenuDismissDeferred(menu: any, setMenu: (v: false) => void): void {
  useEffect(() => {
    if (!menu) return
    const close = (): void => setMenu(false)
    // Defer so the opening click doesn't immediately close it.
    const id = window.setTimeout(() => window.addEventListener('click', close), 0)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('click', close)
    }
  }, [menu, setMenu])
}
