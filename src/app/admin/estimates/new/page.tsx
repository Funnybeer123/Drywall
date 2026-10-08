import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, leads } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { addDays, todayISO } from '@/lib/dates'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, Field, PageHeader, Select } from '@/components/ui'
import { sp } from '../../_ops/ui'
import { EstimateFields } from '../estimate-fields'
import { createEstimate } from '../actions'

export const metadata: Metadata = { title: 'New estimate' }

export default async function NewEstimatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser('estimates:manage')
  const q = await searchParams
  const customerId = Number(sp(q.customerId)) || undefined
  const leadId = Number(sp(q.leadId)) || undefined

  const [list, [lead]] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, company: customers.company, city: customers.city }).from(customers).orderBy(asc(customers.name)),
    leadId ? db.select().from(leads).where(eq(leads.id, leadId)) : Promise.resolve([]),
  ])

  return (
    <>
      <PageHeader
        back={lead ? { href: `/admin/leads/${lead.id}`, label: `Lead: ${lead.name}` } : { href: '/admin/estimates', label: 'Estimates' }}
        title="New estimate"
      />
      <Card className="p-5">
        {list.length === 0 ? (
          <p className="text-sm text-slate-600">
            Add a customer first.{' '}
            <Link href="/admin/customers/new" className="font-medium text-brand-fg underline">
              New customer
            </Link>
          </p>
        ) : (
          <ActionForm action={createEstimate} className="space-y-5">
            {lead ? <input type="hidden" name="leadId" value={lead.id} /> : null}
            <Field
              label="Customer"
              htmlFor="customerId"
              hint={
                <>
                  Not listed?{' '}
                  <Link href="/admin/customers/new" className="text-brand-fg underline">
                    Add a customer
                  </Link>
                </>
              }
            >
              <Select id="customerId" name="customerId" required defaultValue={customerId ?? ''} className="sm:max-w-md">
                <option value="" disabled>
                  Choose a customer…
                </option>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` (${c.company})` : ''}
                    {c.city ? ` — ${c.city}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            {lead?.description ? (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Customer’s request:</span> {lead.description}
              </div>
            ) : null}
            <EstimateFields title={lead ? lead.jobType : ''} validUntil={addDays(todayISO(), 30)} />
            <div className="flex gap-2">
              <SubmitButton>Save estimate</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Card>
    </>
  )
}
