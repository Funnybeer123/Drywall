'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef } from 'react'

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; theme?: 'light' | 'dark' | 'auto'; size?: 'normal' | 'flexible' }) => string
  reset: (id?: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/**
 * Cloudflare Turnstile widget (explicit render so it survives client-side navigation).
 * It adds a hidden `cf-turnstile-response` input to the surrounding form.
 * Change `resetKey` to get a fresh token after a failed submit.
 */
export function Turnstile({ siteKey, resetKey }: { siteKey: string; resetKey: number }) {
  const el = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  const render = useCallback(() => {
    if (!window.turnstile || !el.current || widgetId.current) return
    widgetId.current = window.turnstile.render(el.current, { sitekey: siteKey, theme: 'light', size: 'flexible' })
  }, [siteKey])

  useEffect(() => {
    render()
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [render])

  useEffect(() => {
    if (resetKey > 0 && widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [resetKey])

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
      <div ref={el} className="min-h-[65px]" />
    </>
  )
}
