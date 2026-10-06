import type { Metadata } from 'next'
import { asc, desc } from 'drizzle-orm'
import { db } from '@/db'
import { priceItems } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { centsToInput } from '@/lib/money'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, CardHeader, Checkbox, EmptyState, Field, Input, PageHeader } from '@/components/ui'
import { createPriceItem, deletePriceItem, updatePriceItem } from './actions'

export const metadata: Metadata = { title: 'Price list' }

export default async function PriceListPage() {
  await requireUser('estimates:manage')
  const items = await db.select().from(priceItems).orderBy(desc(priceItems.active), asc(priceItems.name))

  return (
    <>
      <PageHeader
        title="Price list"
        description="Your standard prices. Pick them from “+ From price list” when building estimates and invoices — you can still change the price on each job."
      />

      <Card className="mb-6">
        <CardHeader title="Add an item" />
        <ActionForm action={createPriceItem} resetOnSuccess className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-[1fr_120px_140px_auto]">
          <Field label="Name" htmlFor="new-name" className="col-span-2 sm:col-span-1">
            <Input id="new-name" name="name" required placeholder='e.g. Hang & finish 1/2" drywall' />
          </Field>
          <Field label="Unit" htmlFor="new-unit">
            <Input id="new-unit" name="unit" placeholder="sheet, sq ft, each" defaultValue="each" />
          </Field>
          <Field label="Price ($)" htmlFor="new-price">
            <Input id="new-price" name="price" inputMode="decimal" required placeholder="0.00" />
          </Field>
          <div className="col-span-2 flex items-end sm:col-span-1">
            <SubmitButton className="w-full">Add</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader title={`Items (${items.length})`} description="Inactive items are hidden from the estimate & invoice editors." />
        {items.length === 0 ? (
          <EmptyState title="No price items yet" description="Add your common services above to speed up estimates." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <li key={it.id} className={it.active ? '' : 'bg-slate-50/70'}>
                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-end">
                  <ActionForm action={updatePriceItem.bind(null, it.id)} className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-[1fr_110px_120px_auto_auto] sm:items-end">
                    <Field label="Name" htmlFor={`name-${it.id}`} className="col-span-2 sm:col-span-1">
                      <Input id={`name-${it.id}`} name="name" required defaultValue={it.name} />
                    </Field>
                    <Field label="Unit" htmlFor={`unit-${it.id}`}>
                      <Input id={`unit-${it.id}`} name="unit" defaultValue={it.unit} />
                    </Field>
                    <Field label="Price ($)" htmlFor={`price-${it.id}`}>
                      <Input id={`price-${it.id}`} name="price" inputMode="decimal" required defaultValue={centsToInput(it.unitPriceCents)} />
                    </Field>
                    <div className="flex h-10 items-center">
                      <Checkbox name="active" defaultChecked={it.active} label="Active" />
                    </div>
                    <div className="flex items-end">
                      <SubmitButton variant="secondary" size="sm">
                        Save
                      </SubmitButton>
                    </div>
                  </ActionForm>
                  <div className="flex justify-end sm:pb-1">
                    <ConfirmButton action={deletePriceItem} hidden={{ id: it.id }} variant="ghost" confirm={`Delete “${it.name}”? Existing estimates and invoices aren’t affected.`}>
                      Delete
                    </ConfirmButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
