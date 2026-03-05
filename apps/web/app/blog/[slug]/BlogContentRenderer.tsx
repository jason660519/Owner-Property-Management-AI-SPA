// filepath: apps/web/app/blog/[slug]/BlogContentRenderer.tsx
'use client';

import { useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';

interface BlogContentRendererProps {
  html: string;
}

export function BlogContentRenderer({ html }: BlogContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !html) return;

    const clean = DOMPurify.sanitize(html, {
      RETURN_DOM: true,
      ADD_TAGS: ['article', 'section', 'img'],
      ADD_ATTR: ['loading', 'alt', 'src', 'href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
    });

    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    while (clean.firstChild) {
      container.appendChild(clean.firstChild);
    }
  }, [html]);

  return <div ref={containerRef} />;
}
