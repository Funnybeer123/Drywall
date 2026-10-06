import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { priceItems } from '@/db/schema'
import { getSettings } from '@/lib/settings'
import { LineItemsEditor } from '@/components/line-items-editor'
import { Field, Input, Textarea } from '@/components/ui'

/** Title / valid-until / line items / notes — shared by the new and edit estimate forms. */
export async function EstimateFields({
  title,
  validUntil,
  notes,
  items,
  taxRateBps,
}: {
  title?: string
  validUntil?: string | null
  notes?: string | null
  items?: { description: string; quantity: number; unitPriceCents: number }[]
  taxRateBps?: number
}) {
  const [s, prices] = await Promise.all([
    getSettings(),
    db
      .select({ id: priceItems.id, name: priceItems.name, unit: priceItems.unit, unitPriceCents: priceItems.unitPriceCents })
      .from(priceItems)
      .where(eq(priceItems.active, true))
      .orderBy(asc(priceItems.name)),
  ])
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" required defaultValue={title ?? ''} placeholder="e.g. Basement hang & finish" />
        </Field>
        <Field label="Valid until" htmlFor="validUntil">
          <Input id="validUntil" name="validUntil" type="date" defaultValue={validUntil ?? ''} />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Line items</p>
        <LineItemsEditor initial={items} priceItems={prices} defaultTaxRate={(taxRateBps ?? s.taxRateBps) / 100} />
      </div>
      <Field label="Notes for the customer" htmlFor="notes" hint="Scope, exclusions, payment terms — shown on the estimate.">
        <Textarea id="notes" name="notes" rows={4} defaultValue={notes ?? ''} />
      </Field>
    </div>
  )
}
