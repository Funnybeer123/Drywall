import type { Metadata } from 'next'
import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, priceItems, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { getEstimateWithItems } from '@/lib/billing'
import { getSettings } from '@/lib/settings'
import { addDays, todayISO } from '@/lib/dates'
import { PageHeader } from '@/components/ui'
import { NewInvoiceForm, type NewInvoiceProps } from './new-invoice-form'

export const metadata: Metadata = { title: 'New invoice' }

const KINDS = ['standard', 'deposit', 'progress', 'final'] as const

function toId(v: string | undefined) {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; estimateId?: string; customerId?: string; kind?: string }>
}) {
  await requireUser('invoices:manage')
  const sp = await searchParams
  const s = await getSettings()

  const [customerRows, projectRows, priceRows, acceptedEstimates] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, company: customers.company }).from(customers).orderBy(asc(customers.name)),
    db
      .select({ id: projects.id, customerId: projects.customerId, title: projects.title, quotedCents: projects.quotedCents })
      .from(projects)
      .where(ne(projects.status, 'cancelled'))
      .orderBy(desc(projects.createdAt)),
    db
      .select({ id: priceItems.id, name: priceItems.name, unit: priceItems.unit, unitPriceCents: priceItems.unitPriceCents })
      .from(priceItems)
      .where(eq(priceItems.active, true))
      .orderBy(asc(priceItems.name)),
    db
      .select({ projectId: estimates.projectId, totalCents: estimates.totalCents })
      .from(estimates)
      .where(and(eq(estimates.status, 'accepted')))
      .orderBy(desc(estimates.acceptedAt)),
  ])

  // First (most recently) accepted estimate per job is the basis for deposit percentages.
  const estByProject = new Map<number, number>()
  for (const e of acceptedEstimates) if (e.projectId && !estByProject.has(e.projectId)) estByProject.set(e.projectId, e.totalCents)

  const today = todayISO()
  const kind = (KINDS as readonly string[]).includes(sp.kind ?? '') ? (sp.kind as (typeof KINDS)[number]) : 'standard'
  const initial: NewInvoiceProps['initial'] = {
    customerId: toId(sp.customerId),
    projectId: null,
    estimate: null,
    kind,
    issueDate: today,
    dueDate: addDays(today, s.paymentTermsDays),
    items: [],
    taxRatePct: s.taxRateBps / 100,
    notes: '',
  }

  const estimateId = toId(sp.estimateId)
  const projectId = toId(sp.projectId)
  if (estimateId) {
    const data = await getEstimateWithItems({ id: estimateId })
    if (data) {
      initial.customerId = data.estimate.customerId
      initial.projectId = data.estimate.projectId
      initial.estimate = { id: data.estimate.id, title: data.estimate.title, totalCents: data.estimate.totalCents }
      initial.items = data.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents }))
      initial.taxRatePct = data.estimate.taxRateBps / 100
    }
  }
  if (projectId) {
    const p = projectRows.find((r) => r.id === projectId)
    if (p) {
      initial.customerId = p.customerId
      initial.projectId = p.id
      if (!initial.estimate && kind !== 'deposit') {
        initial.items = [{ description: `Work on ${p.title}`, quantity: 1, unitPriceCents: p.quotedCents }]
      }
    }
  }

  const backHref = projectId ? `/admin/projects/${projectId}` : estimateId ? `/admin/estimates/${estimateId}` : '/admin/invoices'

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="New invoice"
        description={initial.estimate ? `From estimate “${initial.estimate.title}”` : 'Bill a customer for work done.'}
        back={{ href: backHref, label: projectId ? 'Back to job' : estimateId ? 'Back to estimate' : 'Invoices' }}
      />
      <NewInvoiceForm
        customers={customerRows.map((c) => ({ id: c.id, name: c.company ? `${c.name} (${c.company})` : c.name }))}
        projects={projectRows.map((p) => {
          const est = estByProject.get(p.id)
          return {
            id: p.id,
            customerId: p.customerId,
            title: p.title,
            baseCents: est ?? p.quotedCents,
            baseLabel: est ? 'the accepted estimate' : 'the job quote',
          }
        })}
        priceItems={priceRows}
        paymentTermsDays={s.paymentTermsDays}
        initial={initial}
      />
    </div>
  )
}
