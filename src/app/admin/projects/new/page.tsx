import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, Field, PageHeader, Select } from '@/components/ui'
import { PROJECT_STATUSES, label, sp } from '../../_ops/ui'
import { ProjectFields } from '../project-fields'
import { createProject } from '../actions'

export const metadata: Metadata = { title: 'New job' }

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser('jobs:manage')
  const customerId = Number(sp((await searchParams).customerId)) || undefined
  const list = await db
    .select({ id: customers.id, name: customers.name, company: customers.company, city: customers.city })
    .from(customers)
    .orderBy(asc(customers.name))
  const [preset] = customerId ? await db.select().from(customers).where(eq(customers.id, customerId)) : []

  return (
    <>
      <PageHeader back={{ href: '/admin/projects', label: 'Jobs' }} title="New job" />
      <Card className="max-w-3xl p-5">
        {list.length === 0 ? (
          <p className="text-sm text-slate-600">
            Add a customer first.{' '}
            <Link href="/admin/customers/new" className="font-medium text-brand underline">
              New customer
            </Link>
          </p>
        ) : (
          <ActionForm action={createProject} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Customer" htmlFor="customerId">
                <Select id="customerId" name="customerId" required defaultValue={preset?.id ?? ''}>
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
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue="pending">
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <ProjectFields
              p={preset ? { address: preset.address, city: preset.city } : undefined}
              addressHint="Leave blank to use the customer’s address."
            />
            <SubmitButton>Create job</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </>
  )
}
