import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, priceItems } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { getInvoiceWithItems } from '@/lib/billing'
import { ActionForm, SubmitButton } from '@/components/form'
import { LineItemsEditor } from '@/components/line-items-editor'
import { Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from '@/components/ui'
import { updateInvoiceAction } from '../../actions'
import { INVOICE_KIND_LABELS } from '../../shared'

export const metadata: Metadata = { title: 'Edit invoice' }

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('invoices:manage')
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const data = await getInvoiceWithItems({ id })
  if (!data) notFound()
  const { invoice, items } = data
  if (invoice.status === 'paid' || invoice.status === 'void') redirect(`/admin/invoices/${id}`)

  const [[customer], priceRows] = await Promise.all([
    db.select({ name: customers.name }).from(customers).where(eq(customers.id, invoice.customerId)),
    db
      .select({ id: priceItems.id, name: priceItems.name, unit: priceItems.unit, unitPriceCents: priceItems.unitPriceCents })
      .from(priceItems)
      .where(eq(priceItems.active, true))
      .orderBy(asc(priceItems.name)),
  ])

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Edit invoice #${invoice.number}`}
        description={customer?.name}
        back={{ href: `/admin/invoices/${id}`, label: `Invoice #${invoice.number}` }}
      />
      <ActionForm action={updateInvoiceAction} className="space-y-6">
        <input type="hidden" name="id" value={invoice.id} />
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Invoice type" htmlFor="kind">
              <Select id="kind" name="kind" defaultValue={invoice.kind}>
                {Object.entries(INVOICE_KIND_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Issue date" htmlFor="issueDate">
              <Input id="issueDate" name="issueDate" type="date" required defaultValue={invoice.issueDate} />
            </Field>
            <Field label="Due date" htmlFor="dueDate">
              <Input id="dueDate" name="dueDate" type="date" required defaultValue={invoice.dueDate} />
            </Field>
          </div>
          {invoice.paidCents > 0 ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This invoice already has payments recorded. Changing the total will update the balance due.
            </p>
          ) : null}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Line items</h2>
          <LineItemsEditor
            initial={items.map((i) => ({ description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents }))}
            priceItems={priceRows}
            defaultTaxRate={invoice.taxRateBps / 100}
          />
        </Card>
        <Card className="p-5">
          <Field label="Notes (shown on the invoice)" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={invoice.notes ?? ''} />
          </Field>
        </Card>
        <div className="flex justify-end gap-2">
          <LinkButton href={`/admin/invoices/${id}`} variant="secondary" size="lg">
            Cancel
          </LinkButton>
          <SubmitButton size="lg">Save changes</SubmitButton>
        </div>
      </ActionForm>
    </div>
  )
}
