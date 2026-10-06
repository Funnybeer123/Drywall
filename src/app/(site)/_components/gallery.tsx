'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BeforeAfter } from './before-after'

export type GalleryItem = {
  id: number
  title: string
  category: string
  description: string | null
  imageUrl: string
  beforeImageUrl: string | null
}

const ALL = 'All'

export function Gallery({ items }: { items: GalleryItem[] }) {
  const categories = useMemo(() => [ALL, ...new Set(items.map((i) => i.category))], [items])
  const [filter, setFilter] = useState(ALL)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const visible = useMemo(() => (filter === ALL ? items : items.filter((i) => i.category === filter)), [items, filter])

  return (
    <div>
      {categories.length > 2 ? (
        <div role="group" aria-label="Filter by category" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map((c) => {
            const count = c === ALL ? items.length : items.filter((i) => i.category === c).length
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                aria-pressed={filter === c}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors ring-inset',
                  filter === c
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-white text-slate-700 ring-slate-200 hover:ring-slate-400',
                )}
              >
                {c}
                <span className="text-xs text-slate-400">{count}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {visible.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group block w-full overflow-hidden rounded-2xl bg-white text-left ring-1 ring-slate-200 transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {item.beforeImageUrl ? (
                  <span className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur">
                    Before & after
                  </span>
                ) : null}
                <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand className="size-4" aria-hidden="true" />
                </span>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold tracking-wide text-brand uppercase">{item.category}</p>
                <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {openIndex != null && visible[openIndex] ? (
        <Lightbox items={visible} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
      ) : null}
    </div>
  )
}

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const item = items[index]
  const closeRef = useRef<HTMLButtonElement>(null)
  const many = items.length > 1

  const prev = useCallback(() => onIndex((index - 1 + items.length) % items.length), [index, items.length, onIndex])
  const next = useCallback(() => onIndex((index + 1) % items.length), [index, items.length, onIndex])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && many) prev()
      else if (e.key === 'ArrowRight' && many) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next, many])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
        <p className="text-sm text-slate-400" aria-live="polite">
          {index + 1} / {items.length}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="w-full max-w-5xl">
          {item.beforeImageUrl ? (
            <BeforeAfter
              key={item.id}
              before={item.beforeImageUrl}
              after={item.imageUrl}
              alt={item.title}
              className="mx-auto w-full max-w-[calc(70dvh*4/3)] rounded-xl"
            />
          ) : (
            <img src={item.imageUrl} alt={item.title} className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-xl object-contain" />
          )}
        </div>

        {many ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-6 text-white sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">{item.category}</p>
        <p className="mt-1 text-lg font-semibold">{item.title}</p>
        {item.description ? <p className="mt-1 text-sm text-slate-300">{item.description}</p> : null}
        {item.beforeImageUrl ? <p className="mt-1 text-xs text-slate-400">Drag the handle to compare before and after.</p> : null}
        {many ? (
          <div className="mt-4 flex gap-3 sm:hidden">
            <button type="button" onClick={prev} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 text-sm font-semibold">
              <ChevronLeft className="size-4" aria-hidden="true" /> Prev
            </button>
            <button type="button" onClick={next} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 text-sm font-semibold">
              Next <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
