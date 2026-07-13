import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { highlight } from '../syntax'

/** Markdown renderer for assistant bubbles, styled for the dark transcript. */
// Custom code renderer: syntax-highlight fenced blocks with the shared hljs;
// leave inline code (no language class) to the CSS styling.
function MdCode({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}): React.JSX.Element {
  const lang = /language-(\w+)/.exec(className ?? '')?.[1]
  const html = lang ? highlight(String(children).replace(/\n$/, ''), lang) : null
  if (html) {
    return <code className="hljs !bg-transparent" dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <code className={className}>{children}</code>
}

/** Small clipboard button; flips to "Copied" for a beat after a click. */
export function CopyButton({
  text,
  className = '',
}: {
  text: string
  className?: string
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
      title="copy to clipboard"
      className={`rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] leading-none text-zinc-300 backdrop-blur transition hover:bg-zinc-700 ${className}`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// Minimal shape of the hast node react-markdown hands to element components —
// enough to walk it for the block's raw text (the rendered <code> may be
// highlighted HTML, so the DOM children aren't a reliable source).
type HastNode = { type?: string; value?: string; children?: HastNode[] }
const nodeText = (n?: HastNode): string =>
  !n ? '' : n.type === 'text' ? (n.value ?? '') : (n.children ?? []).map(nodeText).join('')

/**
 * Fenced code block wrapper: adds a hover-reveal Copy button. Overriding `pre`
 * (not `code`) keeps inline code untouched — react-markdown only wraps block
 * code in <pre>.
 */
function MdPre({
  children,
  node,
}: {
  children?: React.ReactNode
  node?: HastNode
}): React.JSX.Element {
  const code = nodeText(node).replace(/\n$/, '')
  return (
    <div className="group/code relative">
      <CopyButton
        text={code}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover/code:opacity-100"
      />
      <pre>{children}</pre>
    </div>
  )
}

const MD_COMPONENTS = { code: MdCode, pre: MdPre }

export function Markdown({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="space-y-2 text-sm [&_a]:text-sky-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-[var(--code-border)] [&_pre]:bg-[var(--code-bg)] [&_pre]:p-3 [&_pre]:text-[var(--code-fg)] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:border-collapse [&_td]:border [&_td]:border-zinc-700 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-700 [&_th]:bg-zinc-800 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MD_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
