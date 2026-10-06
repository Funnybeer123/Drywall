'use client'

import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui'

export function CopyLinkButton({ url, label = 'Copy link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Older browsers / insecure origins: fall back to a prompt the user can copy from.
      window.prompt('Copy this link:', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy}>
      {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />}
      {copied ? 'Copied!' : label}
    </Button>
  )
}
