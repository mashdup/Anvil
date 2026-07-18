import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Preview } from '../FilePreview'
import type { PreviewPanel } from './types'
import { clamp } from './helpers'
import { usePanelWidth, useElementWidth } from './hooks'
import { computeLayout } from './layout'

/**
 * usePreviewPanels owns the responsive three-pane geometry and the stacked
 * preview slot (file viewer + live browser): panel widths, which panels are
 * open and in what order, the adjustable vertical split between them, and the
 * live-refresh of the open file when its directory changes on disk. It also
 * fields agent-driven preview requests (preview_file / preview_url tools) via
 * `requestAgentPreview`, which the event reducer calls.
 */
export function usePreviewPanels(cwd: string, toAbs: (p: string) => string) {
  const [showFiles, setShowFiles] = useState(true)
  const [treeWidth, setTreeWidth] = usePanelWidth('tree', 224)
  const [previewWidth, setPreviewWidth] = usePanelWidth('preview', 480)
  const [viewer, setViewer] = useState<Preview | null>(null)
  // Mirror the open file's path in a ref so the fs-change effect can re-read it
  // without depending on `viewer` (which would resubscribe on every open).
  const viewerPathRef = useRef<string | null>(null)
  viewerPathRef.current = viewer?.path ?? null
  const [browserOpen, setBrowserOpen] = useState(false)
  // The preview slot stacks the file viewer and the live browser vertically.
  // panelOrder records open order: [0] on top, closing one gives the other the
  // full height. An adjustable row divider sets the split (each panel min 160px).
  const [panelOrder, setPanelOrder] = useState<PreviewPanel[]>([])
  const openPanel = useCallback((p: PreviewPanel) => {
    setPanelOrder((o) => (o.includes(p) ? o : [...o, p]))
  }, [])
  const closeViewer = useCallback(() => {
    setViewer(null)
    setPanelOrder((o) => o.filter((x) => x !== 'file'))
  }, [])
  const closeBrowser = useCallback(() => {
    setBrowserOpen(false)
    setPanelOrder((o) => o.filter((x) => x !== 'browser'))
  }, [])
  const previewSlotRef = useRef<HTMLDivElement>(null)
  const [splitRatio, setSplitRatio] = useState(() => {
    const s = Number(localStorage.getItem('chpreviewsplit'))
    return Number.isFinite(s) && s > 0.1 && s < 0.9 ? s : 0.5
  })
  const adjustSplit = useCallback((dy: number) => {
    setSplitRatio((prev) => {
      const h = previewSlotRef.current?.clientHeight ?? 600
      const min = 160 / h
      const next = clamp(prev + dy / h, min, 1 - min)
      localStorage.setItem('chpreviewsplit', String(next))
      return next
    })
  }, [])
  // Agent-driven navigation for the browser pane (preview_url tool).
  const [browserNav, setBrowserNav] = useState<{ url: string; nonce: number } | null>(null)
  // Pending agent preview request from the event stream (see the effect below).
  const [agentPreview, setAgentPreview] = useState<{
    path?: string
    url?: string
    nonce: number
  } | null>(null)
  const requestAgentPreview = useCallback((path: string | undefined, url: string | undefined) => {
    setAgentPreview((prev) => ({ path, url, nonce: (prev?.nonce ?? 0) + 1 }))
  }, [])
  // Open the live browser pane at a URL (new tab if none loaded), used by the
  // "Open in browser" affordances for HTML files. Same plumbing as the agent's
  // preview_url path: bump browserNav's nonce, reveal + stack the browser panel.
  const openBrowserAt = useCallback(
    (url: string) => {
      setBrowserNav((prev) => ({ url, nonce: (prev?.nonce ?? 0) + 1 }))
      setBrowserOpen(true)
      openPanel('browser')
    },
    [openPanel],
  )
  const previewInUse = panelOrder.length > 0
  const [mainRef, mainW] = useElementWidth<HTMLDivElement>()
  // Default to a wide value until measured so the first paint is inline (the
  // common case) rather than flashing the overlay drawers.
  const layout = useMemo(
    () => computeLayout(mainW || 99999, showFiles, previewInUse, treeWidth, previewWidth),
    [mainW, showFiles, previewInUse, treeWidth, previewWidth],
  )

  // Read an absolute path into the viewer. Shared by openFile and the live
  // fs-refresh, so re-reading on a disk change doesn't re-stack the panel.
  const loadViewer = useCallback(
    async (abs: string): Promise<void> => {
      let r: Awaited<ReturnType<typeof window.codehamr.readPreview>>
      try {
        r = await window.codehamr.readPreview(cwd, abs)
      } catch {
        return // file vanished (deleted/renamed) between the change and the read
      }
      switch (r.kind) {
        case 'text':
        case 'markdown':
          setViewer({ kind: r.kind, path: abs, content: r.content, note: r.truncated ? 'truncated view' : null })
          break
        case 'image':
          setViewer({ kind: 'image', path: abs, mime: r.mime, dataB64: r.dataB64 })
          break
        case 'pdf':
        case 'docx':
          setViewer({ kind: r.kind, path: abs, dataB64: r.dataB64 })
          break
        case 'binary':
          setViewer({ kind: 'unsupported', path: abs, note: 'no preview for this file type' })
          break
        case 'too-large':
          setViewer({ kind: 'unsupported', path: abs, note: `too large to preview (${Math.round(r.size / 1024)}KB)` })
          break
      }
    },
    [cwd],
  )

  const openFile = useCallback(
    async (path: string): Promise<void> => {
      openPanel('file') // stacks alongside the browser rather than replacing it
      await loadViewer(toAbs(path))
    },
    [loadViewer, toAbs, openPanel],
  )

  // Live-refresh the open file preview when its directory changes on disk
  // (agent writes or external edits). The watcher already debounces (300ms) and
  // reports absolute dirs; re-read only when the open file's own dir is among
  // them, so unrelated changes don't reload the viewer.
  useEffect(() => {
    return window.codehamr.onFsChanged(({ cwd: changedCwd, dirs }) => {
      if (changedCwd !== cwd || !dirs.length) return
      const vp = viewerPathRef.current
      if (!vp) return
      const n = (p: string): string => p.replace(/\\/g, '/').toLowerCase()
      const vdir = n(vp).replace(/\/[^/]*$/, '')
      if (dirs.some((d) => n(d) === vdir)) void loadViewer(vp)
    })
  }, [cwd, loadViewer])

  // React to agent preview requests (preview_file / preview_url tools). File
  // and browser now stack rather than replace, so opening one keeps the other.
  useEffect(() => {
    if (!agentPreview) return
    if (agentPreview.url) {
      setBrowserNav({ url: agentPreview.url, nonce: agentPreview.nonce })
      setBrowserOpen(true)
      openPanel('browser')
    } else if (agentPreview.path) {
      void openFile(agentPreview.path)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentPreview])

  return {
    showFiles,
    setShowFiles,
    treeWidth,
    setTreeWidth,
    previewWidth,
    setPreviewWidth,
    viewer,
    browserOpen,
    setBrowserOpen,
    panelOrder,
    openPanel,
    closeViewer,
    closeBrowser,
    previewSlotRef,
    splitRatio,
    adjustSplit,
    browserNav,
    requestAgentPreview,
    openBrowserAt,
    previewInUse,
    mainRef,
    mainW,
    layout,
    openFile,
  }
}
