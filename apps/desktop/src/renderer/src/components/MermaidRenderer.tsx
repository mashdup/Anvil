import React, { useEffect, useRef } from 'react';
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
 * It uses a ref to a container and calls mermaid.render asynchronously.
 */
export function MermaidRenderer({ code }: MermaidRendererProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      // Clear previous content/errors
      containerRef.current.innerHTML = '';
      errorRef.current = null;

      try {
        // Create a unique ID for this specific render to avoid collisions in the DOM
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        
        // mermaid.render returns { svg, bindFunctions }
        const { svg } = await mermaid.render(id, code);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        errorRef.current = err instanceof Error ? err.message : 'Unknown error';
      }
    };

    renderDiagram();
  }, [code]);

  return (
    <div className="my-4 flex flex-col items-center justify-center overflow-x-auto w-full">
      {errorRef.current ? (
        <div className="rounded border border-red-900/50 bg-red-900/20 p-3 text-xs text-red-400">
          <p className="font-bold">Mermaid Error:</p>
          <p>{errorRef.current}</p>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="mermaid-svg-container flex justify-center min-h-[40px]" 
        />
      )}
    </div>
  );
}
