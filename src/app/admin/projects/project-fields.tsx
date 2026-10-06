import type { Project } from '@/db/schema'
import { centsToInput } from '@/lib/money'
import { Field, Input, Textarea } from '@/components/ui'

/** Title / description / site / dates / quote — shared by the new and edit job forms. */
export function ProjectFields({ p, addressHint }: { p?: Partial<Project>; addressHint?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Job title" htmlFor="title" className="sm:col-span-2">
        <Input id="title" name="title" required defaultValue={p?.title ?? ''} placeholder="e.g. Kitchen ceiling repair" />
      </Field>
      <Field label="Description / scope" htmlFor="description" className="sm:col-span-2">
        <Textarea id="description" name="description" rows={3} defaultValue={p?.description ?? ''} />
      </Field>
      <Field label="Job site address" htmlFor="address" hint={addressHint}>
        <Input id="address" name="address" defaultValue={p?.address ?? ''} />
      </Field>
      <Field label="City" htmlFor="city">
        <Input id="city" name="city" defaultValue={p?.city ?? ''} />
      </Field>
      <Field label="Start date" htmlFor="startDate">
        <Input id="startDate" name="startDate" type="date" defaultValue={p?.startDate ?? ''} />
      </Field>
      <Field label="End date" htmlFor="endDate" hint="Leave blank for a one-day job.">
        <Input id="endDate" name="endDate" type="date" defaultValue={p?.endDate ?? ''} />
      </Field>
      <Field label="Quoted amount ($, before tax)" htmlFor="quoted">
        <Input id="quoted" name="quoted" inputMode="decimal" placeholder="0.00" defaultValue={p?.quotedCents ? centsToInput(p.quotedCents) : ''} />
      </Field>
    </div>
  )
}
