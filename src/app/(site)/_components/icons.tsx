import { Building, Droplets, Hammer, House, Layers, Paintbrush, Ruler, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

const SERVICE_ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  wrench: Wrench,
  sparkles: Sparkles,
  home: House,
  house: House,
  droplets: Droplets,
  building: Building,
  hammer: Hammer,
  paintbrush: Paintbrush,
  ruler: Ruler,
}

/** Maps the `services.icon` field to a lucide icon (falls back to a hammer). */
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = SERVICE_ICONS[name.toLowerCase()] ?? Hammer
  return <Icon className={className} aria-hidden="true" />
}

// lucide no longer ships brand marks, so these are minimal inline versions.
export function FacebookIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.5h2.53l.38-2.94H13.5V8.68c0-.85.24-1.43 1.46-1.43h1.56V4.62a20.9 20.9 0 0 0-2.27-.12c-2.25 0-3.79 1.37-3.79 3.9v2.16H7.92v2.94h2.54V21h3.04Z" />
    </svg>
  )
}

export function InstagramIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GoogleIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.97-4.32 2.97-7.33Z" />
      <path d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Z" opacity=".8" />
      <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96L6.4 13.9Z" opacity=".6" />
      <path d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" opacity=".9" />
    </svg>
  )
}
