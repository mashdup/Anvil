import { MutableRefObject } from 'react'

interface UseInputMenuParams {
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  inputRef: MutableRefObject<HTMLTextAreaElement | null>
  inputMenu: { x: number; y: number; start: number; end: number } | null
  setInputMenu: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; start: number; end: number } | null>
  >
}

export function useInputMenu({
  input,
  setInput,
  inputRef,
  inputMenu,
  setInputMenu,
}: UseInputMenuParams) {
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
    restoreCaret,
    copyInput,
    cutInput,
    pasteInput,
    selectAllInput,
  }
}
