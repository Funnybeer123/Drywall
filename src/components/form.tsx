'use client'

import { createContext, startTransition, use, useActionState, useEffect, useRef, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from './ui'
import type { ActionState } from '@/lib/action-state'
import { cn } from '@/lib/utils'

const PendingContext = createContext(false)

export function SubmitButton({
  children,
  pendingText = 'Saving…',
  variant,
  size,
  className,
  name,
  value,
}: {
  children: ReactNode
  pendingText?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  name?: string
  value?: string
}) {
  const status = useFormStatus()
  const pending = status.pending || use(PendingContext)
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className} name={name} value={value}>
      {pending ? pendingText : children}
    </Button>
  )
}

/**
 * Form bound to a server action that returns ActionState. Shows the error/success
 * message inline. Actions that succeed usually redirect, so the message is mostly
 * for validation errors.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  encType,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children: ReactNode
  className?: string
  resetOnSuccess?: boolean
  encType?: 'multipart/form-data'
}) {
  const [state, formAction, isPending] = useActionState(action, {})
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset()
  }, [state, resetOnSuccess])

  // Submitting via onSubmit (instead of the `action` prop) stops React from
  // auto-resetting the form, so a validation error doesn't wipe what was typed.
  return (
    <form
      ref={ref}
      className={className}
      encType={encType}
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
        startTransition(() => formAction(fd))
      }}
    >
      <PendingContext value={isPending}>{children}</PendingContext>
      <FormMessage state={state} />
    </form>
  )
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.error && !state.message) return null
  return (
    <p
      role={state.error ? 'alert' : 'status'}
      className={cn(
        'mt-3 rounded-lg px-3 py-2 text-sm',
        state.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
      )}
    >
      {state.error ?? state.message}
    </p>
  )
}

/** A small one-click action button (e.g. "Mark paid", "Delete") with optional confirm prompt. */
export function ConfirmButton({
  action,
  children,
  confirm,
  variant = 'secondary',
  size = 'sm',
  hidden,
}: {
  action: (formData: FormData) => Promise<void>
  children: ReactNode
  confirm?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
  size?: 'sm' | 'md'
  hidden?: Record<string, string | number>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <SubmitButton variant={variant} size={size} pendingText="Working…">
        {children}
      </SubmitButton>
    </form>
  )
}
