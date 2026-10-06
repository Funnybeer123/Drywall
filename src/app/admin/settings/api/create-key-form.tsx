'use client'

import { useActionState, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, Checkbox, Field, Input } from '@/components/ui'
import { createApiKey, type CreateKeyState } from './actions'

export function CreateKeyForm({ scopes }: { scopes: { id: string; label: string; defaultOn: boolean }[] }) {
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createApiKey, {})
  const [copied, setCopied] = useState(false)

  if (state.key) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong>Copy this key now</strong> — for security it’s only shown once. Paste it into your Grok bot’s settings.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={state.key} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(state.key!)
              setCopied(true)
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => location.reload()}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Name" htmlFor="key-name" hint="So you can tell keys apart, e.g. “Grok assistant”.">
        <Input id="key-name" name="name" required maxLength={80} defaultValue="Grok assistant" />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">What can this key do?</legend>
        <div className="space-y-2.5">
          {scopes.map((s) => (
            <Checkbox
              key={s.id}
              name="scope"
              value={s.id}
              defaultChecked={s.defaultOn}
              label={
                <span>
                  <span className="font-medium text-slate-900">{s.id}</span> <span className="text-slate-500">— {s.label}</span>
                </span>
              }
            />
          ))}
        </div>
      </fieldset>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create API key'}
      </Button>
    </form>
  )
}
