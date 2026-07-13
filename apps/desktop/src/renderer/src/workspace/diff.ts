// Shared unified-diff line numbering, used by the chat DiffBlock and the file
// preview's DiffView so both render an old·new gutter identically.

export type DiffRow = {
  kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'
  oldNo: number | null
  newNo: number | null
  text: string
}

/** Right-align a gutter number in a 4-wide cell (blank when there's none). */
export const gut = (n: number | null): string => (n === null ? '    ' : String(n).padStart(4, ' '))

/**
 * Walk a unified diff and assign old/new line numbers per row, driven by the
 * `@@ -oldStart,oldCount +newStart,newCount @@` hunk headers. Context lines
 * advance both counters, additions only the new side, deletions only the old;
 * file headers (---/+++/diff/index) and the hunk line itself carry no number.
 */
export function numberDiffLines(unified: string): DiffRow[] {
  const out: DiffRow[] = []
  let oldNo = 0
  let newNo = 0
  for (const text of unified.split('\n')) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text)
    if (hunk) {
      oldNo = Number(hunk[1])
      newNo = Number(hunk[2])
      out.push({ kind: 'hunk', oldNo: null, newNo: null, text })
      continue
    }
    if (
      text.startsWith('+++') ||
      text.startsWith('---') ||
      text.startsWith('diff ') ||
      text.startsWith('index ') ||
      text.startsWith('\\')
    ) {
      out.push({ kind: 'meta', oldNo: null, newNo: null, text })
      continue
    }
    if (text.startsWith('+')) {
      out.push({ kind: 'add', oldNo: null, newNo: newNo++, text })
    } else if (text.startsWith('-')) {
      out.push({ kind: 'del', oldNo: oldNo++, newNo: null, text })
    } else {
      // Context (or a blank trailing line): advance both when inside a hunk.
      const inHunk = oldNo > 0 || newNo > 0
      out.push({
        kind: 'ctx',
        oldNo: inHunk ? oldNo++ : null,
        newNo: inHunk ? newNo++ : null,
        text,
      })
    }
  }
  return out
}
