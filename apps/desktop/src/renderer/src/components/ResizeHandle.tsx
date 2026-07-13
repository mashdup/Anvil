/**
 * A full-viewport transparent overlay held up for the duration of a divider
 * drag. Electron's <webview> (and any iframe) runs out-of-process and swallows
 * mouse events the instant the cursor crosses it, which strands the drag's
 * document-level listeners — the pointer "escapes" and the drag goes haywire.
 * The shield sits on top so every move/up lands in this document instead, and
 * carries the resize cursor across the whole window. Returns a remover.
 */
function beginDragShield(cursor: string): () => void {
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;inset:0;z-index:9999;cursor:${cursor}`
  document.body.appendChild(el)
  return () => el.remove()
}

/**
 * Draggable vertical divider. `onResize` receives the incremental pointer
 * delta (px) since the last move; the parent clamps and applies it.
 */
export function ResizeHandle({ onResize }: { onResize: (dx: number) => void }): React.JSX.Element {
  const onMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    let last = e.clientX
    const removeShield = beginDragShield('col-resize')
    const move = (ev: MouseEvent): void => {
      onResize(ev.clientX - last)
      last = ev.clientX
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      removeShield()
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize bg-zinc-800 transition-colors hover:bg-sky-600"
    />
  )
}

/** Horizontal divider for the stacked preview panels; reports vertical delta. */
export function RowResizeHandle({ onResize }: { onResize: (dy: number) => void }): React.JSX.Element {
  const onMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    let last = e.clientY
    const removeShield = beginDragShield('row-resize')
    const move = (ev: MouseEvent): void => {
      onResize(ev.clientY - last)
      last = ev.clientY
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      removeShield()
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }
  return (
    <div
      onMouseDown={onMouseDown}
      className="h-1 shrink-0 cursor-row-resize bg-zinc-800 transition-colors hover:bg-sky-600"
    />
  )
}

/** One row of the compact workspace-bar burger menu; closes the menu on use. */
export function BarMenuItem({
  children,
  onClick,
  close,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  close: (open: boolean) => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={() => {
        close(false)
        onClick()
      }}
      disabled={disabled}
      className="block w-full px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
    >
      {children}
    </button>
  )
}
