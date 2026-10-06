'use client'

import { useActionState, useEffect, useRef, type ReactNode } from 'react'
import { FormMessage } from '@/components/form'
import type { LinkActionState } from './types'
import { CopyLink } from './copy-link'

/**
 * Like <ActionForm>, but when the action returns a `link` (invite / password reset)
 * it's shown below the form with a copy button.
 */
export function LinkActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: (state: LinkActionState, formData: FormData) => Promise<LinkActionState>
  children: ReactNode
  className?: string
  resetOnSuccess?: boolean
}) {
  const [state, formAction] = useActionState(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
      {state.link ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-slate-600">Link (expires in 7 days):</p>
          <CopyLink url={state.link} />
        </div>
      ) : null}
    </form>
  )
}
