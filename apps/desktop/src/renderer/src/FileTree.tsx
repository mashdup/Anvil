import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * FileTree: a drill-in file browser for the open workspace. Instead of an
 * ever-expanding tree, clicking a folder navigates INTO it (showing just that
 * folder's contents); a breadcrumb bar walks back up. `touched` files get an
 * emerald dot, and so does any folder with a `touched` file nested anywhere
 * inside it, so change indicators aren't buried below collapsed folders.
 * `reload` re-fetches the current folder when it changes on disk.
 *
 * A single directory level is small enough to render directly (capped at CAP
 * rows), so there's no windowing/virtualization — the hand-rolled version left
 * ghost rows on navigation. Entries are cleared the instant the directory
 * changes so the previous folder's rows can never linger under the new path.
 */

interface Entry {
  name: string
  path: string
  isDir: boolean
}

// Cap on rows rendered for one directory. Real single-level folders rarely
// exceed this; beyond it we show a "first N of M" note rather than freezing the
// UI (a flat node_modules can hold thousands of entries).
const CAP = 2000

const basename = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p

export function FileTree({
  root,
  touched,
  reload,
  onOpen,
}: {
  root: string
  touched: Set<string>
  reload: { dirs: string[]; nonce: number } | null
  onOpen: (path: string) => void
}): React.JSX.Element {
  const [dir, setDir] = useState(root)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  // Guards against out-of-order navigation: a slow listing of a folder we've
  // already left must not overwrite the current one's contents.
  const reqRef = useRef(0)
  const load = useCallback(
    async (d: string): Promise<void> => {
      const token = ++reqRef.current
      setLoading(true)
      let result: Entry[]
      try {
        result = await window.codehamr.listDir(root, d)
      } catch {
        result = []
      }
      if (token === reqRef.current) {
        setEntries(result)
        setLoading(false)
      }
    },
    [root],
  )

  // Navigate to a directory. Clearing entries in the SAME state batch as the
  // dir change means the previous folder's rows are gone before React paints
  // the new path — no stale rows, not even for a frame.
  const navigate = useCallback((d: string): void => {
    setEntries([])
    setDir(d)
  }, [])

  // Reset to the workspace root when the workspace changes.
  useEffect(() => {
    navigate(root)
  }, [root, navigate])

  // Load whenever the current directory changes; reset scroll to the top.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    void load(dir)
  }, [dir, load])

  // Re-fetch the current folder if it (or a file in it) changed on disk.
  useEffect(() => {
    if (reload && reload.dirs.includes(dir)) void load(dir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload?.nonce])

  // Breadcrumb: root + each ancestor segment down to the current directory.
  const sep = dir.includes('\\') ? '\\' : '/'
  const rel = dir === root ? '' : dir.slice(root.length).replace(/^[\\/]+/, '')
  const parts = rel ? rel.split(/[\\/]/) : []
  const crumbs = [{ name: basename(root) || root, path: root }]
  let acc = root
  for (const p of parts) {
    acc = `${acc}${sep}${p}`
    crumbs.push({ name: p, path: acc })
  }

  const shown = entries.slice(0, CAP)

  // A folder shows the change dot when any touched file is nested anywhere
  // inside it. `touched` holds lowercased, forward-slashed absolute paths;
  // match by directory prefix so nesting depth doesn't matter.
  const dirTouched = useCallback(
    (folderPath: string): boolean => {
      const prefix = folderPath.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '') + '/'
      for (const p of touched) if (p.startsWith(prefix)) return true
      return false
    },
    [touched],
  )

  return (
    <div className="flex h-full flex-col font-mono text-xs">
      <div className="flex shrink-0 items-center overflow-x-auto border-b border-zinc-800 px-2 py-1 whitespace-nowrap text-zinc-400">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={c.path} className="flex items-center">
              {i > 0 && <span className="mx-0.5 shrink-0 text-zinc-600">/</span>}
              <button
                onClick={() => navigate(c.path)}
                disabled={isLast}
                className={
                  isLast ? 'text-zinc-200' : 'shrink-0 hover:text-zinc-200 hover:underline'
                }
              >
                {c.name}
              </button>
            </span>
          )
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto py-1">
        {!loading && entries.length === 0 && (
          <p className="px-3 py-2 text-zinc-600">empty folder</p>
        )}
        {shown.map((entry) =>
          entry.isDir ? (
            <button
              key={entry.path}
              onClick={() => navigate(entry.path)}
              className="flex h-6 w-full items-center gap-1.5 px-2 text-left text-zinc-300 hover:bg-zinc-800/60"
            >
              <span className="shrink-0 text-amber-500/80">▸</span>
              <span className="truncate">{entry.name}</span>
              {dirTouched(entry.path) && (
                <span
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                  title="contains files edited by the agent this session"
                />
              )}
              <span
                className={`shrink-0 text-zinc-600 ${dirTouched(entry.path) ? 'ml-1' : 'ml-auto'}`}
              >
                ›
              </span>
            </button>
          ) : (
            <button
              key={entry.path}
              onClick={() => onOpen(entry.path)}
              title={entry.path}
              className="flex h-6 w-full items-center gap-1.5 px-2 text-left text-zinc-300 hover:bg-zinc-800/60"
            >
              <span className="w-2 shrink-0" />
              <span className="truncate">{entry.name}</span>
              {touched.has(entry.path.toLowerCase()) && (
                <span
                  className="ml-auto mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                  title="edited by the agent this session"
                />
              )}
            </button>
          ),
        )}
        {entries.length > CAP && (
          <p className="px-3 py-2 text-zinc-600">
            showing first {CAP} of {entries.length} entries
          </p>
        )}
      </div>
    </div>
  )
}
