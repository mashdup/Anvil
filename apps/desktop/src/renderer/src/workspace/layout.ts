// ---------------------------------------------------------------------------
// Responsive three-pane layout. The file tree and preview are fixed-width side
// panels; the chat column is the flexible middle. Naively they'd squeeze the
// chat to nothing on a narrow window. Instead we measure the container and give
// the chat first claim on MIN_CHAT px; each side panel is shown inline only if
// it (down to its minimum) still fits in what's left, and otherwise falls back
// to a floating modal overlay over the chat rather than eating into it.
// Priority when space runs out: chat > file tree > preview. The tree is small
// and is primary navigation; the preview is large and transient (reopened by
// clicking a file), so it's the first to be pushed to an overlay.
//
// Overlays respect a strict view hierarchy so an open panel is never buried:
// the file preview stacks on top of everything until closed, the file browser
// (tree) is a modal above the chat but below the preview.
// ---------------------------------------------------------------------------

export const MIN_CHAT = 380 // chat keeps at least this many px; panels hide before eating into it
export const TREE_MIN = 160
export const TREE_MAX = 560
export const PREVIEW_MIN = 300
const HANDLE_W = 4 // ResizeHandle width (w-1) + slack

// 'inline' — a fixed side column that eats into the container.
// 'overlay' — the panel is open but there's no room to seat it inline, so it
//   floats as a modal over the chat. Overlays respect a view hierarchy: the
//   file preview sits on top of everything, the file browser (tree) is a modal
//   above the chat but below the preview.
// 'hidden' — the user has the panel closed.
export type PanelMode = 'inline' | 'overlay' | 'hidden'
export type PanelLayout = { mode: PanelMode; width: number }

export function computeLayout(
  cw: number,
  showTree: boolean,
  showPreview: boolean,
  treeW: number,
  previewW: number,
): { tree: PanelLayout; preview: PanelLayout } {
  const tree: PanelLayout = { mode: showTree ? 'overlay' : 'hidden', width: treeW }
  const preview: PanelLayout = { mode: showPreview ? 'overlay' : 'hidden', width: previewW }
  // Reserve the chat's minimum up front; panels draw only from what remains.
  let remaining = cw - MIN_CHAT

  // Tree gets first refusal (small, primary navigation). It may shrink toward
  // its minimum to fit; below that it falls back to an overlay modal.
  if (showTree && remaining >= TREE_MIN + HANDLE_W) {
    tree.mode = 'inline'
    tree.width = Math.min(treeW, remaining - HANDLE_W)
    remaining -= tree.width + HANDLE_W
  }
  // Preview takes whatever's left, shrinking toward its minimum, else overlays.
  if (showPreview && remaining >= PREVIEW_MIN + HANDLE_W) {
    preview.mode = 'inline'
    preview.width = Math.min(previewW, remaining - HANDLE_W)
    remaining -= preview.width + HANDLE_W
  }
  return { tree, preview }
}
