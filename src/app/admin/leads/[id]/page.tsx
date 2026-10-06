import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { FilePlus2, UserCheck } from 'lucide-react'
import { db } from '@/db'
import { customers, estimates, leads } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { formatCents } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { formatPhone } from '@/lib/utils'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, CardHeader, PageHeader, Select, StatusBadge, Textarea } from '@/components/ui'
import { ContactLinks, DetailList, LEAD_STATUSES, label } from '../../_ops/ui'
import { idParam } from '../../_ops/access'
import { convertLead, createEstimateFromLead, deleteLead, updateLeadNotes, updateLeadStatus } from '../actions'

export const metadata: Metadata = { title: 'Lead' }

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('leads:manage')
  const id = idParam((await params).id)
  const [lead] = await db.select().from(leads).where(eq(leads.id, id))
  if (!lead) notFound()

  const [customer] = lead.customerId ? await db.select().from(customers).where(eq(customers.id, lead.customerId)) : []
  const leadEstimates = await db.select().from(estimates).where(eq(estimates.leadId, id)).orderBy(desc(estimates.createdAt))
  // Only render URLs our upload code produces (local /uploads or https blob storage).
  const photos = lead.photoUrls.filter((u) => /^(\/(?!\/)|https:\/\/)/.test(u))
  const canConvert = can(user, 'customers:manage')
  const canEstimate = can(user, 'estimates:manage')

  return (
    <>
      <PageHeader
        back={{ href: '/admin/leads', label: 'Leads' }}
        title={lead.name}
        description={
          <>
            {lead.jobType} · received {formatDateTime(lead.createdAt)}
          </>
        }
        actions={<StatusBadge status={lead.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-5">
              <ContactLinks phone={lead.phone} email={lead.email} address={lead.address} city={lead.city} />
            </div>
            <DetailList
              items={[
                ['Phone', formatPhone(lead.phone)],
                ['Email', lead.email],
                ['Address', [lead.address, lead.city].filter(Boolean).join(', ')],
                ['Job type', lead.jobType],
                ['Timeframe', lead.timeframe],
                ['Source', lead.source],
                ['Referred by', lead.referredBy],
              ]}
            />
            {lead.description ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Project details</p>
                <p className="mt-1 text-sm whitespace-pre-line text-slate-900">{lead.description}</p>
              </div>
            ) : null}
          </Card>

          {photos.length ? (
            <Card>
              <CardHeader title={`Photos (${photos.length})`} description="Tap a photo to open it full size." />
              <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
                {photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg ring-1 ring-slate-200">
                    {url.toLowerCase().endsWith('.pdf') ? (
                      <span className="flex aspect-square items-center justify-center bg-slate-50 text-xs text-slate-500">PDF</span>
                    ) : (
                      <img src={url} alt={`Photo ${i + 1} from ${lead.name}`} className="aspect-square w-full object-cover transition hover:scale-105" />
                    )}
                  </a>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Notes" description="Private — only your team sees these." />
            <ActionForm action={updateLeadNotes.bind(null, lead.id)} className="p-5">
              <Textarea name="notes" defaultValue={lead.notes ?? ''} rows={5} placeholder="Call notes, measurements, follow-up reminders…" />
              <div className="mt-3">
                <SubmitButton variant="secondary" size="sm">
                  Save notes
                </SubmitButton>
              </div>
            </ActionForm>
          </Card>

          {leadEstimates.length ? (
            <Card>
              <CardHeader title="Estimates" />
              <ul className="divide-y divide-slate-100">
                {leadEstimates.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/estimates/${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <span className="min-w-0 truncate font-medium">
                        E-{e.id} · {e.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm">{formatCents(e.totalCents)}</span>
                        <StatusBadge status={e.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Next steps" />
            <div className="space-y-3 p-5">
              {canEstimate ? (
                <form action={createEstimateFromLead}>
                  <input type="hidden" name="id" value={lead.id} />
                  <SubmitButton className="w-full" pendingText="Opening…">
                    <FilePlus2 className="size-4" /> Create estimate
                  </SubmitButton>
                </form>
              ) : null}
              {customer ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Customer:{' '}
                  <Link href={`/admin/customers/${customer.id}`} className="font-semibold underline">
                    {customer.name}
                  </Link>
                </p>
              ) : canConvert ? (
                <form action={convertLead} className="space-y-2">
                  <input type="hidden" name="id" value={lead.id} />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="markWon" value="1" className="size-4 accent-[var(--brand)]" /> Also mark lead as Won
                  </label>
                  <SubmitButton variant="secondary" className="w-full" pendingText="Converting…">
                    <UserCheck className="size-4" /> Convert to customer
                  </SubmitButton>
                  <p className="text-xs text-slate-500">Links to an existing customer with the same phone or email if there is one.</p>
                </form>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <ActionForm action={updateLeadStatus.bind(null, lead.id)} className="space-y-3 p-5">
              <Select name="status" defaultValue={lead.status} aria-label="Lead status">
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </Select>
              <SubmitButton variant="secondary" size="sm">
                Update status
              </SubmitButton>
            </ActionForm>
          </Card>

          {leadEstimates.length === 0 ? (
            <div className="flex justify-end">
              <ConfirmButton action={deleteLead} hidden={{ id: lead.id }} variant="danger" confirm="Delete this lead permanently? Use this for spam only.">
                Delete lead
              </ConfirmButton>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
