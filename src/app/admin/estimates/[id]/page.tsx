import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { Download, ExternalLink, Hammer, Receipt, Send } from 'lucide-react'
import { db } from '@/db'
import { customers, invoices, leads, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getEstimateWithItems } from '@/lib/billing'
import { appUrl } from '@/lib/settings'
import { formatCents } from '@/lib/money'
import { formatDate, formatDateTime, todayISO } from '@/lib/dates'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Badge, Card, CardHeader, Checkbox, LinkButton, PageHeader, StatusBadge, buttonClass } from '@/components/ui'
import { idParam } from '../../_ops/access'
import { LineItemsView } from '../../_ops/line-items-view'
import { Notice } from '../../_ops/ui'
import { EstimateFields } from '../estimate-fields'
import { CopyLinkButton } from '../copy-link'
import { convertEstimateToJob, deleteEstimate, sendEstimateAction, setEstimateStatus, updateEstimate } from '../actions'

export const metadata: Metadata = { title: 'Estimate' }

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('estimates:manage')
  const id = idParam((await params).id)
  const data = await getEstimateWithItems({ id })
  if (!data) notFound()
  const { estimate: e, items } = data

  const [[customer], [lead], [project], invs] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, e.customerId)),
    e.leadId ? db.select({ id: leads.id, name: leads.name }).from(leads).where(eq(leads.id, e.leadId)) : Promise.resolve([]),
    e.projectId ? db.select({ id: projects.id, title: projects.title, status: projects.status }).from(projects).where(eq(projects.id, e.projectId)) : Promise.resolve([]),
    db
      .select({ id: invoices.id, number: invoices.number, status: invoices.status, totalCents: invoices.totalCents, kind: invoices.kind })
      .from(invoices)
      .where(eq(invoices.estimateId, e.id))
      .orderBy(desc(invoices.createdAt)),
  ])

  const editable = e.status === 'draft' || e.status === 'sent'
  const expired = editable && !!e.validUntil && e.validUntil < todayISO()
  const publicUrl = appUrl(`/e/${e.token}`)

  return (
    <>
      <PageHeader
        back={{ href: '/admin/estimates', label: 'Estimates' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            E-{e.id} · {e.title} <StatusBadge status={e.status} />
            {expired ? <Badge tone="red">Expired</Badge> : null}
          </span>
        }
        description={
          <>
            For{' '}
            <Link href={`/admin/customers/${customer.id}`} className="font-medium text-slate-700 hover:text-brand-fg">
              {customer.name}
            </Link>
            {lead ? (
              <>
                {' '}
                · from lead{' '}
                <Link href={`/admin/leads/${lead.id}`} className="font-medium text-slate-700 hover:text-brand-fg">
                  {lead.name}
                </Link>
              </>
            ) : null}{' '}
            · {formatCents(e.totalCents)}
          </>
        }
        actions={
          <>
            <a href={`/admin/estimates/${e.id}/pdf`} className={buttonClass('secondary', 'sm')}>
              <Download className="size-4" /> PDF
            </a>
            <CopyLinkButton url={publicUrl} label="Copy customer link" />
            <a href={`/e/${e.token}`} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'sm')}>
              <ExternalLink className="size-4" /> Preview
            </a>
          </>
        }
      />

      {expired ? <Notice tone="warn">This estimate expired on {formatDate(e.validUntil)}. Update the valid-until date before re-sending so the customer can accept it.</Notice> : null}
      {e.status === 'accepted' ? (
        <Notice tone="success">
          Accepted {e.acceptedAt ? formatDateTime(e.acceptedAt) : ''}
          {e.acceptedName ? ` — signed “${e.acceptedName}”` : ''}.
        </Notice>
      ) : null}
      {e.status === 'declined' ? <Notice tone="error">The customer declined this estimate.</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {editable ? (
              <>
                <CardHeader title="Edit estimate" description="Changes show up immediately on the customer’s link." />
                <ActionForm action={updateEstimate.bind(null, e.id)} className="p-5">
                  <EstimateFields title={e.title} validUntil={e.validUntil} notes={e.notes} items={items} taxRateBps={e.taxRateBps} />
                  <div className="mt-5">
                    <SubmitButton>Save changes</SubmitButton>
                  </div>
                </ActionForm>
              </>
            ) : (
              <>
                <CardHeader title="Line items" description={`Valid until ${formatDate(e.validUntil)}`} />
                <div className="p-5">
                  <LineItemsView items={items} subtotalCents={e.subtotalCents} taxRateBps={e.taxRateBps} taxCents={e.taxCents} totalCents={e.totalCents} />
                  {e.notes ? <p className="mt-6 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700">{e.notes}</p> : null}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {e.status !== 'declined' ? (
            <Card>
              <CardHeader title="Send to customer" description={e.sentAt ? `Last sent ${formatDateTime(e.sentAt)}` : 'Not sent yet'} />
              <ActionForm action={sendEstimateAction.bind(null, e.id)} className="space-y-3 p-5">
                <p className="text-sm text-slate-600">
                  {customer.email ? (
                    <>
                      Emails a PDF and an “accept online” link to <span className="font-medium">{customer.email}</span>.
                    </>
                  ) : (
                    'This customer has no email address on file.'
                  )}
                </p>
                {customer.phone ? <Checkbox name="sms" label="Also send by text message" defaultChecked={!customer.email} /> : null}
                <SubmitButton className="w-full" pendingText="Sending…">
                  <Send className="size-4" /> {e.sentAt ? 'Re-send estimate' : 'Send estimate'}
                </SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Customer response" />
            <div className="flex flex-wrap gap-2 p-5">
              {e.status !== 'accepted' ? (
                <ConfirmButton action={setEstimateStatus} hidden={{ id: e.id, status: 'accepted' }} confirm="Mark this estimate as accepted?">
                  Mark accepted
                </ConfirmButton>
              ) : null}
              {e.status !== 'declined' && e.status !== 'accepted' ? (
                <ConfirmButton action={setEstimateStatus} hidden={{ id: e.id, status: 'declined' }} variant="danger" confirm="Mark this estimate as declined?">
                  Mark declined
                </ConfirmButton>
              ) : null}
              {!editable ? (
                <ConfirmButton action={setEstimateStatus} hidden={{ id: e.id, status: 'reopen' }} variant="ghost" confirm="Reopen this estimate so it can be edited and re-sent?">
                  Reopen
                </ConfirmButton>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Job & billing" />
            <div className="space-y-3 p-5">
              {project ? (
                <Link href={`/admin/projects/${project.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                  <span className="flex min-w-0 items-center gap-2">
                    <Hammer className="size-4 shrink-0 text-slate-500" />
                    <span className="truncate font-medium">{project.title}</span>
                  </span>
                  <StatusBadge status={project.status} />
                </Link>
              ) : can(user, 'jobs:manage') ? (
                <form action={convertEstimateToJob}>
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton variant="secondary" className="w-full" pendingText="Creating job…">
                    <Hammer className="size-4" /> Convert to job
                  </SubmitButton>
                </form>
              ) : null}

              {can(user, 'invoices:manage') ? (
                <>
                  {invs.map((i) => (
                    <Link key={i.id} href={`/admin/invoices/${i.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                      <span className="flex items-center gap-2">
                        <Receipt className="size-4 text-slate-500" /> Invoice #{i.number} · {formatCents(i.totalCents)}
                      </span>
                      <StatusBadge status={i.status} />
                    </Link>
                  ))}
                  <LinkButton href={`/admin/invoices/new?estimateId=${e.id}`} variant="secondary" className="w-full">
                    <Receipt className="size-4" /> Create invoice from estimate
                  </LinkButton>
                </>
              ) : null}
            </div>
          </Card>

          {invs.length === 0 ? (
            <div className="flex justify-end">
              <ConfirmButton action={deleteEstimate} hidden={{ id: e.id }} variant="danger" confirm="Delete this estimate? The customer’s link will stop working.">
                Delete estimate
              </ConfirmButton>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
