import type { ChatEntry, Item } from '../workspace/types'

type Message = Extract<Item, { kind: 'user' | 'assistant' }>

/**
 * SearchModal: full-text search over the chat's user/assistant messages.
 * Matches are computed by the parent (which owns the transcript); clicking a
 * result — or pressing Enter on the first — jumps to it in the transcript.
 */
export function SearchModal({
  query,
  onQuery,
  results,
  trimmedQuery,
  onJump,
  onClose,
}: {
  query: string
  onQuery: (q: string) => void
  results: Message[]
  trimmedQuery: string
  onJump: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 pt-24"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[90vw] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              onJump(results[0].id)
            }
          }}
          placeholder="search chat messages… (Enter jumps to the first match)"
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {results.map((m) => {
            const idx = m.text.toLowerCase().indexOf(trimmedQuery)
            const from = Math.max(0, idx - 40)
            const snippet =
              (from > 0 ? '…' : '') + m.text.slice(from, from + 160).replace(/\s+/g, ' ')
            return (
              <button
                key={m.id}
                onClick={() => onJump(m.id)}
                className="flex w-full items-start gap-2 px-4 py-2 text-left text-xs hover:bg-zinc-800"
              >
                <span
                  className={`w-10 shrink-0 pt-0.5 text-[10px] ${
                    m.kind === 'user' ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  {m.kind === 'user' ? 'you' : 'agent'}
                </span>
                <span className="line-clamp-2 text-zinc-300">{snippet}</span>
              </button>
            )
          })}
          {trimmedQuery && results.length === 0 && (
            <p className="px-4 py-3 text-xs text-zinc-500">no messages match</p>
          )}
          {!trimmedQuery && (
            <p className="px-4 py-3 text-xs text-zinc-600">
              type to search this chat — click a result to jump to it
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * HistoryModal: the workspace's archived chats. Switching restarts the agent
 * on that session; the active chat can't be switched to or deleted.
 */
export function HistoryModal({
  chats,
  onSwitch,
  onDelete,
  onClose,
}: {
  chats: ChatEntry[]
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 pt-24"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[90vw] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="text-sm font-medium text-zinc-200">Chat history</span>
          <button
            onClick={onClose}
            title="close"
            className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {chats.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-4 py-2 text-sm ${
                c.current ? 'text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <button
                onClick={() => onSwitch(c.id)}
                disabled={c.current}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="truncate">{c.title}</span>
                {c.current && (
                  <span className="shrink-0 text-[10px] text-emerald-500">· active</span>
                )}
                <span className="ml-auto shrink-0 text-[10px] text-zinc-500">
                  {new Date(c.updatedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </button>
              {!c.current && (
                <button
                  onClick={() => onDelete(c.id)}
                  title="delete this chat permanently"
                  className="shrink-0 rounded px-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-red-950 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {chats.length === 0 && (
            <p className="px-4 py-3 text-xs text-zinc-500">no chats yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
