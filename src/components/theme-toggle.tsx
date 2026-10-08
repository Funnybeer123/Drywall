'use client'

import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Flips between light and dark and remembers the choice on this device.
 * Pass the display class (e.g. `inline-flex`) in className; `label` shows the action as text.
 */
export function ThemeToggle({ className, label = false }: { className?: string; label?: boolean }) {
  function toggle() {
    const dark = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {}
  }

  // Icons swap via the dark: variant, so server and client render the same markup.
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle dark mode"
      className={cn('items-center justify-center gap-2 rounded-lg transition-colors', className)}
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <span className={cn('dark:hidden', !label && 'sr-only')}>{label ? 'Dark mode' : 'Switch to dark mode'}</span>
      <span className={cn('hidden dark:inline', !label && 'sr-only')}>{label ? 'Light mode' : 'Switch to light mode'}</span>
    </button>
  )
}
