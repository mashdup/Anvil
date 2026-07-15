import { useEffect, useMemo } from 'react'
import { numberDiffLines } from '../workspace/diff'

interface CheckpointDiffModalProps {
  diff: string
  ref: string
  onClose: () => void
  onRevert: (ref: string) => void
}

export function CheckpointDiffModal({ diff, ref, onClose, onRevert }: CheckpointDiffModalProps) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Parse the diff into lines with metadata
  const diffLines = useMemo(() => {
    if (!diff) return []
    return numberDiffLines(diff)
  }, [diff])

  // Count files changed
  const filesChanged = useMemo(() => {
    const files = new Set<string>()
    for (const line of diffLines) {
      if (line.kind === 'meta' && line.text.startsWith('diff --git')) {
        const match = line.text.match(/b\/(.+)$/)
        if (match) files.add(match[1])
      }
    }
    return files.size
  }, [diffLines])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Checkpoint Diff</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {filesChanged} file{filesChanged !== 1 ? 's' : ''} changed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onRevert(ref)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              Revert to This Checkpoint
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto">
          {diffLines.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              No changes in this checkpoint
            </div>
          ) : (
            <pre className="text-xs font-mono leading-5">
              {diffLines.map((line, i) => {
                let className = 'px-4 py-0.5 '
                if (line.kind === 'add') className += 'bg-green-900/20 text-green-300'
                else if (line.kind === 'del') className += 'bg-red-900/20 text-red-300'
                else if (line.kind === 'hunk') className += 'bg-blue-900/20 text-blue-300'
                else if (line.kind === 'meta') className += 'bg-zinc-800/50 text-zinc-400 font-semibold'
                else className += 'text-zinc-500'

                return (
                  <div key={i} className={className}>
                    <span className="inline-block w-12 text-right pr-3 text-zinc-600 select-none">
                      {line.oldNo || ''}
                    </span>
                    <span className="inline-block w-12 text-right pr-3 text-zinc-600 select-none">
                      {line.newNo || ''}
                    </span>
                    <span className="ml-2">{line.text}</span>
                  </div>
                )
              })}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
