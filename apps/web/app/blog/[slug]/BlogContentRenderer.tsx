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

    // --- Lightbox for gallery images ---
    const galleryImages = container.querySelectorAll<HTMLImageElement>('.blog-gallery-wrapper img');
    if (galleryImages.length === 0) return;

    const urls = Array.from(galleryImages).map((img) => img.src);
    let currentIndex = 0;

    // Build lightbox DOM programmatically (not from user HTML, safe to skip DOMPurify)
    const overlay = document.createElement('div');
    overlay.className = 'blog-lightbox-overlay';
    overlay.innerHTML = [
      '<button class="blog-lightbox-close" aria-label="關閉">&#x2715;</button>',
      '<button class="blog-lightbox-prev" aria-label="上一張">&#8249;</button>',
      '<img class="blog-lightbox-img" src="" alt="" />',
      '<button class="blog-lightbox-next" aria-label="下一張">&#8250;</button>',
      '<div class="blog-lightbox-counter"></div>',
    ].join('');
    container.appendChild(overlay);

    const lightboxImg = overlay.querySelector<HTMLImageElement>('.blog-lightbox-img')!;
    const counter = overlay.querySelector<HTMLElement>('.blog-lightbox-counter')!;

    function show(index: number) {
      currentIndex = (index + urls.length) % urls.length;
      lightboxImg.src = urls[currentIndex];
      lightboxImg.alt = galleryImages[currentIndex].alt;
      counter.textContent = `${currentIndex + 1} / ${urls.length}`;
    }

    function open(index: number) {
      show(index);
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    galleryImages.forEach((img, i) => {
      img.addEventListener('click', () => open(i));
    });

    overlay.querySelector('.blog-lightbox-close')!.addEventListener('click', close);
    overlay.querySelector('.blog-lightbox-prev')!.addEventListener('click', () => show(currentIndex - 1));
    overlay.querySelector('.blog-lightbox-next')!.addEventListener('click', () => show(currentIndex + 1));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const handleKey = (e: KeyboardEvent) => {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(currentIndex - 1);
      if (e.key === 'ArrowRight') show(currentIndex + 1);
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [html]);

  return <div ref={containerRef} />;
}
