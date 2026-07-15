import { useEffect } from 'react'
import type { Item } from './types'

interface UseMessageMenuParams {
  msgMenu: { x: number; y: number; id: string } | null
  setMsgMenu: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; id: string } | null>
  >
  items: Item[]
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
  showToast: (msg: string) => void
}

export function useMessageMenu({
  msgMenu,
  setMsgMenu,
  items,
  setItems,
  showToast,
}: UseMessageMenuParams) {
  const togglePin = (id: string): void => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && (it.kind === 'user' || it.kind === 'assistant')
          ? { ...it, pinned: !it.pinned }
          : it,
      ),
    )
  }

  const copyMessage = (id: string): void => {
    const it = items.find((i) => i.id === id)
    if (it && (it.kind === 'user' || it.kind === 'assistant')) {
      void navigator.clipboard.writeText(it.text)
      showToast('message copied')
    }
  }

  // Any click or Escape dismisses the message context menu.
  useEffect(() => {
    if (!msgMenu) return
    const close = (): void => setMsgMenu(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [msgMenu])

  return { togglePin, copyMessage }
}
