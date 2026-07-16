import { useEffect, useState } from 'react'
import { Logo } from './Logo'

/** Last path segment, for display. */
const basename = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p
/** Parent directory, shown dim beneath the folder name. */
const dirname = (p: string): string => {
  const parts = p.split(/[\\/]/).filter(Boolean)
  parts.pop()
  return parts.join('/')
}

const RECENTS_KEY = 'anvil:recentProjects'

/** Read the recent-projects list from localStorage (most-recent first). */
export function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Push a freshly-opened folder to the front of the recents list (deduped,
 *  capped). Returns the new list so callers can update state without re-reading. */
export function pushRecent(dir: string): string[] {
  const next = [dir, ...loadRecents().filter((d) => d !== dir)].slice(0, 8)
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota — recents are best-effort */
  }
  return next
}

/**
 * StartScreen: the welcoming landing view shown when no project is open.
 * Branding, a greeting, quick-open, and recent-project cards. Mirrors the
 * empty-chat "ready" screen for visual consistency.
 */
export function StartScreen({
  onOpen,
  onOpenPath,
}: {
  onOpen: () => void
  onOpenPath: (dir: string) => void
}): React.JSX.Element {
  const [recents, setRecents] = useState<string[]>([])
  useEffect(() => setRecents(loadRecents()), [])

  const forget = (dir: string): void => {
    const next = recents.filter((d) => d !== dir)
    setRecents(next)
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch {
      /* best-effort */
    }
  }

  const greeting = timeGreeting()

  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-6 py-16">
        {/* Branding: the anvil+spark mark. */}
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg">
          <Logo className="h-9 w-9 text-zinc-200" />
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-100">
          {greeting} — welcome to Anvil
        </h1>
        <p className="mt-1.5 max-w-md text-center text-sm text-zinc-500">
          Open a project folder to start forging. Your agent runs locally with full context of
          the repo, its history, and everything you build together.
        </p>

        {/* Primary action */}
        <button
          onClick={onOpen}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-400"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Open project folder
        </button>
        <p className="mt-2 text-[11px] text-zinc-600">
          or press{' '}
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-400">
            Ctrl
          </kbd>{' '}
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-400">O</kbd>
        </p>

        {/* Recent projects */}
        {recents.length > 0 && (
          <div className="mt-9 w-full">
            <div className="mb-2.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 text-sky-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              Recent projects
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recents.map((dir) => (
                <div
                  key={dir}
                  className="group relative flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/60"
                >
                  <button
                    onClick={() => onOpenPath(dir)}
                    title={dir}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-amber-400/90">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-200">{basename(dir)}</span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        {dirname(dir) || dir}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => forget(dir)}
                    title="remove from recents"
                    className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-700 hover:text-zinc-300"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature stat cards — what Anvil brings to the table. */}
        <div className="mt-9 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3">
          <FeatureCard
            accent="emerald"
            label="Local & private"
            value="Your work stays put"
            icon={
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            }
          />
          <FeatureCard
            accent="violet"
            label="Checkpoints"
            value="Turn back time"
            icon={
              <>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </>
            }
          />
          <FeatureCard
            accent="sky"
            label="Project memory"
            value="Grows with your project"
            icon={
              <>
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 4.5 17H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 1-1.73A2 2 0 0 1 2 10V9a2 2 0 0 1 1.5-1.94A2.5 2.5 0 0 1 5 3.5 2.5 2.5 0 0 1 7.5 2z" />
              </>
            }
          />
        </div>
      </div>
    </div>
  )
}

type Accent = 'sky' | 'violet' | 'emerald'

const ACCENT_TEXT: Record<Accent, string> = {
  sky: 'text-sky-400',
  violet: 'text-violet-400',
  emerald: 'text-emerald-400',
}
const ACCENT_RING: Record<Accent, string> = {
  sky: 'border-sky-900/70',
  violet: 'border-violet-900/70',
  emerald: 'border-emerald-900/70',
}

/** A single feature tile — same visual language as ProjectStatsView's cards. */
function FeatureCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string
  accent: Accent
  icon: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-1 rounded-lg border ${ACCENT_RING[accent]} bg-zinc-900/60 px-3 py-2`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <span className={ACCENT_TEXT[accent]}>
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icon}
          </svg>
        </span>
        {label}
      </div>
      <div className={`truncate text-sm ${ACCENT_TEXT[accent]}`}>{value}</div>
    </div>
  )
}

/** Time-of-day greeting so the landing feels a touch more personal. */
function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
