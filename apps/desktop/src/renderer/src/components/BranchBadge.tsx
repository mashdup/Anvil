import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * BranchBadge: the header's git branch indicator, upgraded from a static label
 * into an interactive dropdown for the branch operations a user reaches for
 * most — switching branches, creating one, and syncing with the remote
 * (fetch / pull / push) with a live ahead/behind readout.
 *
 * It owns its own branch/upstream/ahead-behind snapshot (fetched from the main
 * process on open and after every op) rather than leaning on the bar's
 * lightweight branch string, so the sync counts stay fresh without widening
 * the shared git-status hook. `refreshGitStat` is called after any op that
 * changes the working tree or HEAD so the rest of the UI (file tree, diff
 * badge, gutters) updates in lockstep.
 */

type BranchInfo = {
  current: string | null
  detached: boolean
  upstream: string | null
  ahead: number
  behind: number
  dirty: boolean
}

type BranchEntry = { name: string; remote: boolean; ref?: string }

const BranchIcon = (): React.JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    className="h-3 w-3 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
)

export function BranchBadge({
  cwd,
  currentBranch,
  onRefresh,
  onToast,
}: {
  cwd: string
  /** Bar's lightweight branch string; drives the collapsed label + visibility. */
  currentBranch: string
  /** Refresh the shared git status (tree, diff badge, gutters) after an op. */
  onRefresh: () => void
  /** Surface a short success/error message to the user. */
  onToast: (msg: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<BranchInfo | null>(null)
  const [branches, setBranches] = useState<BranchEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    void window.codehamr.gitBranchInfo(cwd).then(setInfo)
    void window.codehamr.gitListBranches(cwd).then(setBranches)
  }, [cwd])

  // Refresh the snapshot whenever the menu opens (branch/sync state is cheap
  // and can change from external git activity between opens).
  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = useCallback(
    async (label: string, op: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
      setBusy(label)
      try {
        const res = await op()
        if (res.ok) {
          onToast(done)
          onRefresh()
          load()
        } else {
          onToast(res.error || `${label} failed`)
        }
      } finally {
        setBusy(null)
      }
    },
    [onRefresh, onToast, load],
  )

  const switchTo = (branch: string): void => {
    if (branch === info?.current) {
      setOpen(false)
      return
    }
    void run(`switch to ${branch}`, () => window.codehamr.gitCheckout(cwd, branch), `on ${branch}`)
  }

  const create = (): void => {
    const name = newName.trim()
    if (!name) return
    setNewName('')
    setCreating(false)
    void run(
      `create ${name}`,
      () => window.codehamr.gitCreateBranch(cwd, name),
      `created and switched to ${name}`,
    )
  }

  if (!currentBranch) return <></>

  const ahead = info?.ahead ?? 0
  const behind = info?.behind ?? 0
  const hasUpstream = !!info?.upstream

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="git branch — click for branch actions"
        aria-expanded={open}
        className="flex max-w-[14rem] items-center gap-1 rounded border border-zinc-700 bg-zinc-900/50 px-2 py-0.5 font-mono text-sky-400 hover:bg-zinc-800"
      >
        <BranchIcon />
        <span className="truncate">{currentBranch}</span>
        {(ahead > 0 || behind > 0) && (
          <span className="ml-0.5 flex items-center gap-1 text-[10px] text-zinc-400">
            {behind > 0 && <span title={`${behind} behind upstream`}>↓{behind}</span>}
            {ahead > 0 && <span title={`${ahead} ahead of upstream`}>↑{ahead}</span>}
          </span>
        )}
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 text-xs shadow-2xl">
          {/* Sync section */}
          <div className="border-b border-zinc-800 px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-sky-400">{info?.current ?? currentBranch}</span>
              <span className="text-[10px] text-zinc-500">
                {info?.detached
                  ? 'detached HEAD'
                  : hasUpstream
                    ? `→ ${info?.upstream}`
                    : 'no upstream'}
              </span>
            </div>
            {hasUpstream && (
              <div className="mb-2 flex items-center gap-3 text-[10px] text-zinc-400">
                <span className={behind > 0 ? 'text-amber-400' : ''}>↓ {behind} behind</span>
                <span className={ahead > 0 ? 'text-emerald-400' : ''}>↑ {ahead} ahead</span>
                {info?.dirty && <span className="text-zinc-500">· uncommitted changes</span>}
              </div>
            )}
            <div className="flex gap-1.5">
              <SyncButton
                label="Fetch"
                busy={busy === 'fetch'}
                onClick={() =>
                  run('fetch', () => window.codehamr.gitFetch(cwd), 'fetched from remote')
                }
              />
              <SyncButton
                label={behind > 0 ? `Pull (${behind})` : 'Pull'}
                busy={busy === 'pull'}
                disabled={!hasUpstream}
                onClick={() => run('pull', () => window.codehamr.gitPull(cwd), 'pulled')}
              />
              <SyncButton
                label={ahead > 0 ? `Push (${ahead})` : 'Push'}
                busy={busy === 'push'}
                accent={ahead > 0}
                onClick={() =>
                  run('push', () => window.codehamr.gitPush(cwd, !hasUpstream), 'pushed')
                }
              />
            </div>
          </div>

          {/* Create branch */}
          <div className="border-b border-zinc-800 px-3 py-2">
            {creating ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') create()
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setNewName('')
                    }
                  }}
                  placeholder="new-branch-name"
                  className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-zinc-200 outline-none focus:border-sky-500"
                />
                <button
                  onClick={create}
                  disabled={!newName.trim()}
                  className="rounded bg-sky-600 px-2 py-1 text-white hover:bg-sky-500 disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-zinc-300 hover:bg-zinc-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create new branch
              </button>
            )}
          </div>

          {/* Switch branch */}
          <div className="max-h-64 overflow-y-auto py-1">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-600">
              Switch branch
            </div>
            {branches.length === 0 && (
              <div className="px-3 py-1.5 text-zinc-500">no other branches</div>
            )}
            {branches.map((b) => {
              const active = b.name === info?.current
              return (
                <button
                  key={(b.remote ? 'r:' : 'l:') + b.name}
                  onClick={() => switchTo(b.name)}
                  disabled={!!busy}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono hover:bg-zinc-800 ${
                    active ? 'text-sky-400' : 'text-zinc-300'
                  }`}
                >
                  <span className="w-3 shrink-0 text-center">{active ? '●' : ''}</span>
                  <span className="truncate">{b.name}</span>
                  {b.remote && (
                    <span
                      className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-zinc-600"
                      title={`remote-only (${b.ref}) — checkout creates a local tracking branch`}
                    >
                      remote
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SyncButton({
  label,
  onClick,
  busy,
  disabled,
  accent,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  accent?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`flex-1 rounded border px-2 py-1 text-[11px] transition-colors disabled:opacity-40 ${
        accent
          ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
          : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      {busy ? '…' : label}
    </button>
  )
}
