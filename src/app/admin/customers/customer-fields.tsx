import type { Customer } from '@/db/schema'
import { Field, Input, Textarea } from '@/components/ui'

/** Contact fields shared by the new-customer and edit-customer forms. */
export function CustomerFields({ c }: { c?: Partial<Customer> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={c?.name ?? ''} autoComplete="off" />
      </Field>
      <Field label="Company" htmlFor="company" hint="Optional — for builders and property managers.">
        <Input id="company" name="company" defaultValue={c?.company ?? ''} />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={c?.phone ?? ''} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={c?.email ?? ''} />
      </Field>
      <Field label="Street address" htmlFor="address" className="sm:col-span-2">
        <Input id="address" name="address" defaultValue={c?.address ?? ''} />
      </Field>
      <div className="grid grid-cols-[1fr_80px_100px] gap-3 sm:col-span-2">
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={c?.city ?? ''} />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" defaultValue={c?.state ?? ''} maxLength={40} />
        </Field>
        <Field label="ZIP" htmlFor="zip">
          <Input id="zip" name="zip" inputMode="numeric" defaultValue={c?.zip ?? ''} />
        </Field>
      </div>
      <Field label="How they found you" htmlFor="source">
        <Input id="source" name="source" placeholder="Google, referral, Facebook…" defaultValue={c?.source ?? ''} />
      </Field>
      <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={3} defaultValue={c?.notes ?? ''} />
      </Field>
    </div>
  )
}
