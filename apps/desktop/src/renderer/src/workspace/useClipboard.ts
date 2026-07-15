import type { RefObject } from 'react'

interface UseClipboardParams {
  input: string
  setInput: (value: string | ((prev: string) => string)) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
  inputMenu: { x: number; y: number; start: number; end: number } | null
  setInputMenu: (value: { x: number; y: number; start: number; end: number } | null) => void
}

export function useClipboard({
  input,
  setInput,
  inputRef,
  inputMenu,
  setInputMenu,
}: UseClipboardParams) {
  const restoreCaret = (pos: number): void => {
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.selectionStart = el.selectionEnd = pos
      }
    })
  }

  const copyInput = (): void => {
    if (!inputMenu) return
    const sel = input.slice(inputMenu.start, inputMenu.end)
    if (sel) void window.codehamr.writeClipboard(sel)
    setInputMenu(null)
  }

  const cutInput = (): void => {
    if (!inputMenu) return
    const { start, end } = inputMenu
    const sel = input.slice(start, end)
    if (sel) {
      void window.codehamr.writeClipboard(sel)
      setInput(input.slice(0, start) + input.slice(end))
      restoreCaret(start)
    }
    setInputMenu(null)
  }

  const pasteInput = async (): Promise<void> => {
    if (!inputMenu) return
    const { start, end } = inputMenu
    const text = await window.codehamr.readClipboard()
    setInputMenu(null)
    if (!text) return
    setInput(input.slice(0, start) + text + input.slice(end))
    restoreCaret(start + text.length)
  }

  const selectAllInput = (): void => {
    setInputMenu(null)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.select()
      }
    })
  }

  return {
    copyInput,
    cutInput,
    pasteInput,
    selectAllInput,
  }
}
