'use client'

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import { Button, Field, Input, Select, Textarea } from '@/components/ui'
import { FormMessage } from '@/components/form'
import { PhotoInput } from '@/components/photo-input'
import type { ActionState } from '@/lib/action-state'
import { submitQuote } from './actions'
import { JOB_TYPES, MAX_PHOTOS, SOURCES, TIMEFRAMES } from './options'
import { Turnstile } from './turnstile'

function Section({ step, title, description, children }: { step: number; title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 pt-8 first:border-0 first:pt-0">
      <legend className="flex items-center gap-3 text-base font-semibold text-slate-900">
        <span className="grid size-7 place-items-center rounded-full bg-slate-900 text-xs font-bold text-surface">{step}</span>
        {title}
      </legend>
      {description ? <p className="mt-1 pl-10 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function QuoteForm({ defaultJobType, turnstileSiteKey }: { defaultJobType: string; turnstileSiteKey?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitQuote, {})
  const [source, setSource] = useState('')
  const [attempt, setAttempt] = useState(0)
  const messageRef = useRef<HTMLDivElement>(null)

  // Submit manually (instead of <form action>) so React doesn't reset the fields when validation fails.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setAttempt((a) => a + 1) // Turnstile tokens are single-use; get a fresh one for any retry
    startTransition(() => formAction(fd))
  }

  useEffect(() => {
    if (state.error) messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [state])

  return (
    <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-8">
      <Section step={1} title="Your contact info">
        <Field label="Full name" htmlFor="q-name">
          <Input id="q-name" name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Phone" htmlFor="q-phone">
          <Input id="q-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} placeholder="(555) 555-0123" />
        </Field>
        <Field label="Email (optional)" htmlFor="q-email" className="sm:col-span-2" hint="We’ll email you a copy of your request.">
          <Input id="q-email" name="email" type="email" autoComplete="email" maxLength={200} />
        </Field>
        <Field label="Street address (optional)" htmlFor="q-address">
          <Input id="q-address" name="address" autoComplete="street-address" maxLength={200} />
        </Field>
        <Field label="City" htmlFor="q-city">
          <Input id="q-city" name="city" autoComplete="address-level2" maxLength={100} />
        </Field>
      </Section>

      <Section step={2} title="About the job">
        <Field label="Job type" htmlFor="q-type">
          <Select id="q-type" name="jobType" required defaultValue={defaultJobType}>
            <option value="" disabled>
              Choose one…
            </option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Timeframe" htmlFor="q-timeframe">
          <Select id="q-timeframe" name="timeframe" defaultValue="">
            <option value="">Not sure yet</option>
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Describe the project"
          htmlFor="q-description"
          className="sm:col-span-2"
          hint="Rooms, rough size (e.g. 12×14 ceiling), texture, anything we should know."
        >
          <Textarea id="q-description" name="description" required minLength={10} maxLength={5000} rows={5} />
        </Field>
      </Section>

      <Section step={3} title="Photos (optional)" description={`Up to ${MAX_PHOTOS} photos. They help us give you a faster, more accurate price.`}>
        <div className="sm:col-span-2">
          <PhotoInput name="photos" max={MAX_PHOTOS} label="Add photos of the area" />
        </div>
      </Section>

      <Section step={4} title="How did you hear about us?">
        <Field label="Source" htmlFor="q-source">
          <Select id="q-source" name="source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Select…</option>
            {SOURCES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {source === 'Referral' ? (
          <Field label="Who referred you?" htmlFor="q-ref">
            <Input id="q-ref" name="referredBy" maxLength={120} placeholder="So we can thank them" />
          </Field>
        ) : null}
      </Section>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="q-company-website">Company website</label>
        <input id="q-company-website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="border-t border-slate-100 pt-8">
        {turnstileSiteKey ? (
          <div className="mb-5">
            <Turnstile siteKey={turnstileSiteKey} resetKey={attempt} />
          </div>
        ) : null}
        <div ref={messageRef}>
          <FormMessage state={state} />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="mt-4 w-full">
          {pending ? 'Sending your request…' : (
            <>
              Send my quote request <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <Lock className="size-3" aria-hidden="true" /> Your info is only used to prepare your quote. No spam, ever.
        </p>
      </div>
    </form>
  )
}
