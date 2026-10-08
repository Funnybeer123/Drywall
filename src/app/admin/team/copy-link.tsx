'use client'

import { useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Read-only link with a "Copy" button — for sending invite links by text when email isn't set up. */
export function CopyLink({ url, compact }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — select the text so it can be copied by hand.
      ref.current?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 ring-inset hover:bg-slate-50"
        title={url}
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    )
  }

  return (
    <div className="flex gap-2">
      <input
        ref={ref}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="block h-10 w-full min-w-0 rounded-lg border-0 bg-slate-50 px-3 font-mono text-xs text-slate-700 ring-1 ring-slate-300 ring-inset"
        aria-label="Invite link"
      />
      <button
        type="button"
        onClick={copy}
        className={cn(
          'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ring-1 ring-inset',
          copied ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-surface text-slate-900 ring-slate-300 hover:bg-slate-50',
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
