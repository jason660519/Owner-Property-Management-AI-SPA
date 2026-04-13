'use client'

import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

type PropertyImageCarouselProps = {
  title: string
  images: string[]
  placeholder: string
}

const SWIPE_THRESHOLD_PX = 48

export function PropertyImageCarousel({
  title,
  images,
  placeholder,
}: PropertyImageCarouselProps) {
  const slides = images.length > 0 ? images : [placeholder]
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        const next = prev + delta
        if (next < 0) return slides.length - 1
        if (next >= slides.length) return 0
        return next
      })
    },
    [slides.length]
  )

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || slides.length < 2) return
    const endX = e.changedTouches[0].clientX
    const dx = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (dx > 0) go(-1)
    else go(1)
  }

  return (
    <div className="overflow-hidden rounded-t-xl">
      <div
        className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:h-96 lg:aspect-auto touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={slides[index]}
          alt={`${title} — ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority={index === 0}
        />

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 z-[var(--z-base)] -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="上一張"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 z-[var(--z-base)] -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="下一張"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-1/2 z-[var(--z-base)] -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {index + 1} / {slides.length}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-4 [scrollbar-width:thin]">
          {slides.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-24 sm:w-28 ${
                index === i
                  ? 'border-[var(--color-accent)]'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              aria-label={`縮圖 ${i + 1}`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="112px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
