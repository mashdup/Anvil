import { useState, useRef, useCallback, useEffect } from 'react'
import type { Attachment } from './types'
import { fileToAttachment } from './helpers'
import { uid } from './types'

interface UseDragDropParams {
  connected: boolean
  push: (item: any) => void
  setAttachments: (updater: (prev: Attachment[]) => Attachment[]) => void
}

export function useDragDrop({ connected, push, setAttachments }: UseDragDropParams) {
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  const addFiles = useCallback(async (files: Iterable<File>): Promise<void> => {
    const results = await Promise.all([...files].map(fileToAttachment))
    const good: Attachment[] = []
    for (const r of results) {
      if ('ok' in r) good.push(r.ok)
      // A dropped file that vanishes with no explanation is the worst
      // outcome; say why it didn't attach.
      else push({ kind: 'notice', id: uid(), text: `not attached — ${r.reject}`, tone: 'info' })
    }
    if (good.length === 0) return
    setAttachments((prev) => [...prev, ...good].slice(0, 10))
  }, [push, setAttachments])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepth.current += 1
    setDragOver(true)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setDragOver(true)
    }
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    if (connected) void addFiles(e.dataTransfer.files)
  }, [connected, addFiles])

  // Drop-overlay safety net. The depth-counted enter/leave handlers on the
  // container clear the overlay in the normal case, but a drag can end without
  // any leave/drop landing on us: cancelled with Escape, dropped outside the
  // window, or swallowed by the out-of-process <webview>. These window-level
  // listeners guarantee the "drop files" banner never gets stranded on screen.
  useEffect(() => {
    if (!dragOver) return
    const clear = (): void => {
      dragDepth.current = 0
      setDragOver(false)
    }
    // A dragleave whose relatedTarget is null means the pointer left the
    // window entirely; a global drop/dragend covers drops that never reach us.
    const onLeave = (e: DragEvent): void => {
      if (!e.relatedTarget) clear()
    }
    window.addEventListener('drop', clear)
    window.addEventListener('dragend', clear)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('drop', clear)
      window.removeEventListener('dragend', clear)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('blur', clear)
    }
  }, [dragOver])

  return {
    dragOver,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    addFiles,
  }
}
