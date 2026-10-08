'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { MoveHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Drag (or use arrow keys) to compare a before and after photo.
 * `touch-action: pan-y` keeps vertical page scrolling working on phones.
 */
export function BeforeAfter({
  before,
  after,
  alt,
  className,
  imgClassName = 'aspect-[4/3]',
}: {
  before: string
  after: string
  alt: string
  className?: string
  imgClassName?: string
}) {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  function setFromX(clientX: number) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    setFromX(e.clientX)
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragging.current) setFromX(e.clientX)
  }
  function onPointerUp() {
    dragging.current = false
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 20 : 5
    let next: number | null = null
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = pos - step
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = pos + step
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 100
    if (next == null) return
    e.preventDefault()
    e.stopPropagation() // don't let a surrounding lightbox treat arrows as prev/next
    setPos(Math.min(100, Math.max(0, next)))
  }

  return (
    <div
      ref={ref}
      className={cn(
        'theme-static relative cursor-ew-resize overflow-hidden bg-slate-100 select-none [touch-action:pan-y]',
        imgClassName,
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img src={after} alt={`${alt} — after`} draggable={false} className="absolute inset-0 size-full object-cover" />
      <img
        src={before}
        alt={`${alt} — before`}
        draggable={false}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur">
        Before
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-surface/85 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-900 uppercase backdrop-blur">
        After
      </span>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface shadow-[0_0_0_1px_rgb(15_23_42/0.15)]" style={{ left: `${pos}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Compare before and after: ${alt}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before`}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface text-slate-900 shadow-lg ring-1 ring-slate-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        style={{ left: `${pos}%` }}
      >
        <MoveHorizontal className="size-5" aria-hidden="true" />
      </div>
    </div>
  )
}
