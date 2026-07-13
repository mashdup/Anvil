import { useState } from 'react'
import type { Decide, Item } from '../workspace/types'
import { Markdown } from './Markdown'
import { ToolCard } from './ToolCard'

export function TranscriptItem({
  item,
  onDecide,
  onOpenFile,
  cwd,
}: {
  item: Item
  onDecide: Decide
  onOpenFile: (path: string) => void
  cwd?: string
}): React.JSX.Element {
  switch (item.kind) {
    case 'user':
      return (
        <div className="ml-auto w-fit max-w-[var(--msg-max,85%)] rounded-lg bg-emerald-900/40 px-3 py-2 text-sm">
          {item.images && item.images.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {item.images.map((src, i) => (
                <img key={i} src={src} className="max-h-40 rounded border border-emerald-800/50" />
              ))}
            </div>
          )}
          {item.files && item.files.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {item.files.map((name, i) => (
                <span
                  key={i}
                  className="rounded bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300"
                >
                  📄 {name}
                </span>
              ))}
            </div>
          )}
          {item.text && <Markdown text={item.text} />}
        </div>
      )
    case 'assistant':
      return (
        <div className="w-fit max-w-[var(--msg-max,85%)] rounded-lg bg-zinc-900 px-3 py-2 text-sm">
          <Markdown text={item.text} />
          {item.streaming && <span className="animate-pulse text-zinc-500"> ▍</span>}
        </div>
      )
    case 'reasoning':
      return <ReasoningCard item={item} />
    case 'tool':
      return <ToolCard item={item} onDecide={onDecide} onOpenFile={onOpenFile} cwd={cwd} />
    case 'notice':
      return (
        <div
          className={`rounded px-3 py-1.5 text-xs ${
            item.tone === 'error' ? 'bg-red-950 text-red-300' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          {item.text}
        </div>
      )
  }
}

/**
 * ReasoningCard: live-streams chain-of-thought while thinking, collapses to a
 * one-line summary once answer tokens start. Click to re-open.
 */
function ReasoningCard({
  item,
}: {
  item: Extract<Item, { kind: 'reasoning' }>
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const expanded = item.streaming || open
  return (
    <div className="max-w-[var(--msg-max,85%)] rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-xs text-zinc-500">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
      >
        <span className={item.streaming ? 'animate-pulse text-violet-400' : 'text-violet-500/70'}>
          {item.streaming ? '◈ thinking…' : '◈ thought'}
        </span>
        {!expanded && <span className="truncate">{item.text.slice(0, 120)}</span>}
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-zinc-800/60 px-3 py-2 whitespace-pre-wrap">
          {item.text}
          {item.streaming && <span className="animate-pulse"> ▍</span>}
        </div>
      )}
    </div>
  )
}
