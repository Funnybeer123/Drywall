'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

/**
 * Full-bleed hero background that crossfades between close-up drywall clips.
 *
 * Smoothness notes:
 * - Only opacity/transform are animated (GPU-composited), never layout.
 * - The next clip is buffered a few seconds early and only faded in once it is
 *   actually playing, so there's never a black or frozen frame mid-fade.
 * - Clips are 25fps footage; PLAYBACK_RATE slows them slightly for a calm,
 *   slow-motion feel. Lower values look slower but get choppier — for true
 *   slow motion, re-encode the files with frame interpolation (see README).
 * - Pauses when the tab is hidden or the hero is scrolled away; respects
 *   "reduce motion" and data-saver settings by showing a still frame instead.
 *
 * Footage: Tima Miroshnichenko via Pexels (free for commercial use).
 */
const CLIPS = [
  { src: '/videos/mudding-joint.mp4', label: 'Mudding the joints', position: '50% 50%' },
  { src: '/videos/troweling-closeup.mp4', label: 'Troweling a skim coat', position: '50% 45%' },
  { src: '/videos/skimming-blade.mp4', label: 'Skimming the wall flat', position: '50% 35%' },
  { src: '/videos/sanding-closeup.mp4', label: 'Sanding to a flawless finish', position: '50% 50%' },
] as const

const PLAYBACK_RATE = 0.8
const SEGMENT_MS = 7000 // how long each clip stays on screen
const FADE_MS = 1600
const PRELOAD_LEAD_MS = 3500 // start buffering the next clip this early

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function prefersStill() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || saveData === true
}

export function HeroVideo() {
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const root = useRef<HTMLDivElement>(null)
  const jump = useRef<(i: number) => void>(() => {})
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0) // restarts the progress bar animation
  const [running, setRunning] = useState(false)
  const still = useSyncExternalStore(subscribeMotion, prefersStill, () => false)

  useEffect(() => {
    const vids = videos.current
    let current = 0
    let timers: number[] = [] // rotation timers
    let fadeTimers: number[] = [] // pause clips once faded out (not cancelled by rescheduling)
    let stopped = true

    const clearTimers = () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers = []
    }
    const prime = (i: number) => {
      const v = vids[i]
      if (v && v.preload !== 'auto') {
        v.preload = 'auto'
        v.load()
      }
    }
    const whenPlayable = (v: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        if (v.readyState >= 3) return resolve()
        v.addEventListener('canplay', () => resolve(), { once: true })
        window.setTimeout(resolve, 4000) // never stall the rotation on a slow network
      })

    const show = async (next: number) => {
      const prev = current
      const v = vids[next]
      if (!v) return
      prime(next)
      await whenPlayable(v)
      if (stopped) return
      if (prev !== next) v.currentTime = 0
      v.playbackRate = PLAYBACK_RATE
      await v.play().catch(() => {})
      current = next
      setActive(next)
      setCycle((c) => c + 1)
      if (prev !== next) {
        fadeTimers.push(window.setTimeout(() => current !== prev && vids[prev]?.pause(), FADE_MS + 100))
      }
    }

    const scheduleNext = () => {
      clearTimers()
      const next = (current + 1) % CLIPS.length
      timers.push(window.setTimeout(() => prime(next), SEGMENT_MS - PRELOAD_LEAD_MS))
      timers.push(
        window.setTimeout(async () => {
          await show(next)
          if (!stopped) scheduleNext()
        }, SEGMENT_MS),
      )
    }

    const start = async () => {
      if (!stopped) return
      stopped = false
      setRunning(true)
      await show(current)
      if (!stopped) scheduleNext()
    }
    const stop = () => {
      stopped = true
      setRunning(false)
      clearTimers()
      fadeTimers.forEach((t) => window.clearTimeout(t))
      fadeTimers = []
      vids.forEach((v) => v?.pause())
    }

    if (still) {
      // Reduced motion / data saver: show a single still frame.
      const v = vids[0]
      if (v) {
        prime(0)
        v.addEventListener('loadeddata', () => (v.currentTime = 1.5), { once: true })
      }
      return
    }

    jump.current = async (i: number) => {
      if (stopped || i === current) return
      clearTimers()
      await show(i)
      if (!stopped) scheduleNext()
    }

    let visible = document.visibilityState === 'visible'
    let onScreen = true
    const sync = () => (visible && onScreen ? start() : stop())
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      sync()
    })
    if (root.current) io.observe(root.current)
    const onVis = () => {
      visible = document.visibilityState === 'visible'
      sync()
    }
    document.addEventListener('visibilitychange', onVis)
    sync()

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      stop()
      jump.current = () => {}
    }
  }, [still])

  return (
    // No z-index here on purpose: the hero text (rendered after this, `relative`) paints on top,
    // while the clip indicator's own z-index keeps it clickable above the text container.
    <div ref={root} className="absolute inset-0 overflow-hidden bg-slate-950">
      {CLIPS.map((clip, i) => (
        <video
          key={clip.src}
          ref={(el) => {
            videos.current[i] = el
          }}
          src={clip.src}
          muted
          playsInline
          loop
          disablePictureInPicture
          preload={i === 0 ? 'auto' : 'none'}
          onLoadedMetadata={(e) => {
            e.currentTarget.defaultPlaybackRate = PLAYBACK_RATE
            e.currentTarget.playbackRate = PLAYBACK_RATE
          }}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 size-full object-cover"
          style={{
            objectPosition: clip.position,
            opacity: i === active ? 1 : 0,
            transform: `translateZ(0) scale(${i === active && running ? 1.07 : 1})`,
            transition:
              i === active
                ? `opacity ${FADE_MS}ms ease-in-out, transform ${SEGMENT_MS + FADE_MS}ms linear`
                : `opacity ${FADE_MS}ms ease-in-out, transform 0ms linear ${FADE_MS}ms`,
            willChange: 'opacity, transform',
            backfaceVisibility: 'hidden',
          }}
        />
      ))}

      {/* Readability: darken behind the text, keep the footage visible on the right. */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/70 to-transparent" />

      {/* Clip indicator — click to jump to a clip */}
      <div className="absolute right-4 bottom-5 z-20 flex items-center gap-3 sm:right-6 lg:right-10 lg:bottom-8">
        <span className="hidden text-xs font-medium tracking-wide text-white/80 sm:block" aria-live="polite">
          {CLIPS[active].label}
        </span>
        <div className="flex gap-1.5">
          {CLIPS.map((clip, i) => (
            <button
              key={clip.src}
              type="button"
              onClick={() => jump.current(i)}
              aria-label={`Show clip: ${clip.label}`}
              aria-current={i === active}
              className="relative h-1.5 w-7 overflow-hidden rounded-full bg-white/25 transition-colors hover:bg-white/40"
            >
              <span
                key={i === active ? `${cycle}` : 'idle'}
                className={cn('absolute inset-y-0 left-0 rounded-full bg-white', i === active ? 'w-full' : 'w-0')}
                style={i === active && running ? { animation: `hero-progress ${SEGMENT_MS}ms linear both` } : undefined}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
