import type { Attachment, FileAttachment } from './types'
import { MAX_IMAGE_BYTES, MAX_FILE_BYTES, MAX_INLINE_CHARS } from './types'

/** Last path segment, for the auto-mode banner and file chips. */
export const basename = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** Normalize a path for cross-item comparison (win/mac slashes, case). */
export const normPath = (p: string): string => p.replace(/\\/g, '/').toLowerCase()

/** True when a path string is already absolute (POSIX or Windows). */
export const isAbsPath = (p: string): boolean => /^([a-zA-Z]:[\\/]|\/)/.test(p)

/** Human status line for a running tool: what it's doing, not just its name. */
export function toolLabel(name: string, args: Record<string, unknown>): string {
  const file = (p: unknown): string => (typeof p === 'string' && p ? basename(p) : '')
  const clip = (s: string, n = 44): string => (s.length > n ? s.slice(0, n) + '…' : s)
  switch (name) {
    case 'bash': {
      const cmd = typeof args.cmd === 'string' ? args.cmd : typeof args.command === 'string' ? args.command : ''
      return cmd ? `running: ${clip(cmd.replace(/\s+/g, ' ').trim())}` : 'running command'
    }
    case 'read_file':
      return file(args.path) ? `reading ${file(args.path)}` : 'reading file'
    case 'write_file':
      return file(args.path) ? `writing ${file(args.path)}` : 'writing file'
    case 'edit_file':
      return file(args.path) ? `editing ${file(args.path)}` : 'editing file'
    case 'multi_edit':
      return file(args.path) ? `editing ${file(args.path)}` : 'editing file'
    case 'grep': {
      const p = typeof args.pattern === 'string' ? args.pattern : ''
      return p ? `searching for ${clip(p, 30)}` : 'searching'
    }
    case 'glob': {
      const p = typeof args.pattern === 'string' ? args.pattern : ''
      return p ? `finding ${clip(p, 30)}` : 'finding files'
    }
    case 'web_fetch': {
      const u = typeof args.url === 'string' ? args.url : ''
      return u ? `fetching ${clip(u, 40)}` : 'fetching page'
    }
    case 'todo_write':
      return 'updating plan'
    case 'remember': {
      const f = typeof args.fact === 'string' ? args.fact : ''
      return f ? `remembering: ${clip(f)}` : 'saving to project memory'
    }
    case 'preview_file':
      return 'opening preview'
    case 'preview_url':
      return 'opening browser'
    default:
      return `running ${name}`
  }
}

const readAs = (file: File, how: 'dataURL' | 'text'): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    if (how === 'dataURL') r.readAsDataURL(file)
    else r.readAsText(file)
  })

/**
 * Classify a dropped file. Returns the attachment, or a rejection reason to
 * show the user — silently ignoring a dropped file is the worst outcome.
 */
export async function fileToAttachment(
  file: File,
): Promise<{ ok: Attachment } | { reject: string }> {
  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_BYTES) return { reject: `${file.name}: image over 8MB` }
    const dataUrl = await readAs(file, 'dataURL')
    return { ok: { kind: 'image', mime: file.type, dataB64: dataUrl.slice(dataUrl.indexOf(',') + 1) } }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { reject: `${file.name}: over 2MB — ask the agent to read it instead` }
  }
  const text = await readAs(file, 'text')
  // A NUL byte or a pile of replacement chars means we decoded binary as
  // text; inlining that is noise the model pays tokens for.
  const sample = text.slice(0, 4096)
  if (sample.includes('\u0000') || (sample.match(/\uFFFD/g)?.length ?? 0) > 8) {
    return { reject: `${file.name}: looks binary — only text files can be attached` }
  }
  return {
    ok: {
      kind: 'file',
      name: file.name,
      path: window.codehamr.getFilePath(file),
      text: text.slice(0, MAX_INLINE_CHARS),
      truncated: text.length > MAX_INLINE_CHARS,
    },
  }
}

/** Render file attachments as fenced blocks appended to the prompt. */
export function inlineFiles(text: string, files: FileAttachment[]): string {
  if (files.length === 0) return text
  const blocks = files.map((f) => {
    const header = f.path ? `${f.name} (${f.path})` : f.name
    const note = f.truncated ? ' — TRUNCATED, read the file for the rest' : ''
    return `--- Attached file: ${header}${note} ---\n\`\`\`\n${f.text}\n\`\`\``
  })
  return [text, ...blocks].filter(Boolean).join('\n\n')
}
