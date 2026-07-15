import { useState, useEffect } from 'react'

interface Checkpoint {
  ref: string
  timestamp: number
  sessionId: string
  filesChanged: number
}

interface CheckpointTimelineProps {
  cwd: string
  sessionId: string
  onRevert: (stashRef: string) => void
  onPreview: (stashRef: string) => void
}

export function CheckpointTimeline({
  cwd,
  sessionId,
  onRevert,
  onPreview,
}: CheckpointTimelineProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const list = await window.codehamr.checkpointList(cwd, sessionId)
      setCheckpoints(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [cwd, sessionId])

  if (checkpoints.length === 0 && !loading) {
    return (
      <div className="px-3 py-2 text-xs text-zinc-500">
        No checkpoints yet
      </div>
    )
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {loading && checkpoints.length === 0 && (
        <div className="px-3 py-2 text-xs text-zinc-500">Loading…</div>
      )}
      <div className="space-y-1">
        {checkpoints.map((cp, idx) => (
          <CheckpointRow
            key={cp.ref}
            checkpoint={cp}
            index={idx}
            onRevert={onRevert}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  )
}

function CheckpointRow({
  checkpoint,
  index,
  onRevert,
  onPreview,
}: {
  checkpoint: Checkpoint
  index: number
  onRevert: (stashRef: string) => void
  onPreview: (stashRef: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const time = new Date(checkpoint.timestamp)
  const timeStr = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateStr = time.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })

  const handleRevert = () => {
    if (confirming) {
      onRevert(checkpoint.ref)
      setConfirming(false)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-800/50">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-200">{timeStr}</span>
          <span className="text-xs text-zinc-500">{dateStr}</span>
        </div>
        <div className="text-xs text-zinc-400">
          {checkpoint.filesChanged} {checkpoint.filesChanged === 1 ? 'file' : 'files'} changed
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPreview(checkpoint.ref)}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Preview changes"
        >
          Preview
        </button>
        <button
          onClick={handleRevert}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            confirming
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
          title={confirming ? 'Click again to confirm' : 'Revert to this checkpoint'}
        >
          {confirming ? 'Confirm?' : 'Revert'}
        </button>
      </div>
    </div>
  )
}
