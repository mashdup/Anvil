import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with a theme that fits the dark Zinc UI
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface MermaidRendererProps {
  code: string;
}

/**
 * A component that renders Mermaid diagrams.
 *
 * `code` streams in token-by-token while the assistant is still generating
 * the message (see Markdown -> MdCode), so most renders during a stream see
 * truncated/invalid Mermaid source and are EXPECTED to fail — only the final,
 * complete chunk is guaranteed to parse. Errors must therefore be transient
 * (state, not a ref) so a later successful render clears them and repaints;
 * a ref-held error doesn't trigger a re-render, so the UI would otherwise get
 * stuck showing the last mid-stream parse failure even once the finished
 * diagram is valid.
 */
export function MermaidRenderer({ code }: MermaidRendererProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards against an in-flight render for stale `code` overwriting the DOM
  // after a newer one has already started (renders are async and can resolve
  // out of order as tokens stream in).
  const tokenRef = useRef(0);

  useEffect(() => {
    const token = ++tokenRef.current;
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        const { svg } = await mermaid.render(id, code);
        if (tokenRef.current !== token) return; // superseded by a newer render
        if (containerRef.current) containerRef.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        if (tokenRef.current !== token) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    void renderDiagram();
  }, [code]);

  return (
    <div className="my-4 flex flex-col items-center justify-center overflow-x-auto w-full">
      {error && (
        <div className="rounded border border-red-900/50 bg-red-900/20 p-3 text-xs text-red-400">
          <p className="font-bold">Mermaid Error:</p>
          <p>{error}</p>
        </div>
      )}
      {/* Kept mounted even on error (just hidden) so a later successful
          render — e.g. once streaming finishes — has somewhere to paint. */}
      <div
        ref={containerRef}
        className="mermaid-svg-container flex justify-center min-h-[40px]"
        style={error ? { display: 'none' } : undefined}
      />
    </div>
  );
}
