import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { Download, ExternalLink, Pencil } from 'lucide-react'
import { db } from '@/db'
import { customers, projects } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { balanceDue, getInvoiceWithItems } from '@/lib/billing'
import { appUrl, getSettings } from '@/lib/settings'
import { centsToInput, formatCents } from '@/lib/money'
import { formatDateTime, todayISO } from '@/lib/dates'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { buttonClass, Card, CardHeader, Checkbox, Field, Input, LinkButton, PageHeader, Select, StatusBadge } from '@/components/ui'
import { deletePaymentAction, recordPaymentAction, sendInvoiceAction, voidInvoiceAction } from '../actions'
import { InvoiceDocument } from '../invoice-document'
import { displayStatus, MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../shared'
import { CopyLink } from './copy-link'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id)
  const data = Number.isInteger(id) ? await getInvoiceWithItems({ id }) : null
  return { title: data ? `Invoice #${data.invoice.number}` : 'Invoice' }
}

export default async function InvoicePage({ params }: Props) {
  const user = await requireUser('invoices:manage')
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const data = await getInvoiceWithItems({ id })
  if (!data) notFound()
  const { invoice, items, payments } = data
  const [[customer], [project], s] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, invoice.customerId)),
    invoice.projectId ? db.select().from(projects).where(eq(projects.id, invoice.projectId)) : Promise.resolve([]),
    getSettings(),
  ])

  const today = todayISO()
  const status = displayStatus(invoice, today)
  const balance = balanceDue(invoice)
  const isVoid = invoice.status === 'void'
  const editable = invoice.status !== 'paid' && !isVoid
  const canPay = can(user, 'payments:record') && !isVoid && balance > 0
  const publicUrl = appUrl(`/i/${invoice.token}`)
  const idField = <input type="hidden" name="id" value={invoice.id} />

  return (
    <div>
      <PageHeader
        back={{ href: '/admin/invoices', label: 'Invoices' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Invoice #{invoice.number} <StatusBadge status={status} />
          </span>
        }
        description={
          <>
            <Link href={`/admin/customers/${customer.id}`} className="hover:underline">
              {customer.name}
            </Link>
            {project ? (
              <>
                {' · '}
                <Link href={`/admin/projects/${project.id}`} className="hover:underline">
                  {project.title}
                </Link>
              </>
            ) : null}
            {invoice.estimateId ? (
              <>
                {' · '}
                <Link href={`/admin/estimates/${invoice.estimateId}`} className="hover:underline">
                  From estimate
                </Link>
              </>
            ) : null}
          </>
        }
        actions={
          <>
            {editable ? (
              <LinkButton href={`/admin/invoices/${invoice.id}/edit`} variant="secondary">
                <Pencil className="size-4" /> Edit
              </LinkButton>
            ) : null}
            <a href={`/admin/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener" className={buttonClass('secondary')}>
              <Download className="size-4" /> PDF
            </a>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5 sm:p-8">
          {isVoid ? <p className="mb-6 rounded-lg bg-slate-100 px-4 py-2 text-center font-semibold text-slate-600">VOID</p> : null}
          <InvoiceDocument
            settings={s}
            invoice={invoice}
            items={items}
            payments={payments}
            customer={customer}
            projectTitle={project?.title}
            showPaymentRefs
          />
        </Card>

        <div className="space-y-6">
          {!isVoid ? (
            <Card>
              <CardHeader
                title={invoice.sentAt ? 'Send again' : 'Send to customer'}
                description={
                  invoice.sentAt
                    ? `Last sent ${formatDateTime(invoice.sentAt)}${invoice.lastReminderAt ? ` · reminder ${formatDateTime(invoice.lastReminderAt)}` : ''}`
                    : customer.email
                      ? `Emails ${customer.email} with the PDF and a pay link.`
                      : 'No email on file — send by text instead.'
                }
              />
              <div className="space-y-4 p-5">
                <ActionForm action={sendInvoiceAction} className="space-y-3">
                  {idField}
                  <input type="hidden" name="mode" value="send" />
                  <Checkbox name="viaSms" label="Also text the customer" defaultChecked={!customer.email && !!customer.phone} disabled={!customer.phone} />
                  <SubmitButton className="w-full" pendingText="Sending…">
                    {invoice.sentAt ? 'Resend invoice' : 'Send invoice'}
                  </SubmitButton>
                </ActionForm>
                {invoice.sentAt && balance > 0 ? (
                  <ActionForm action={sendInvoiceAction} className="border-t border-slate-100 pt-4">
                    {idField}
                    <input type="hidden" name="mode" value="reminder" />
                    <input type="hidden" name="viaSms" value={customer.phone ? 'on' : ''} />
                    <SubmitButton variant="secondary" className="w-full" pendingText="Sending…">
                      Send reminder{customer.phone ? ' (email + text)' : ''}
                    </SubmitButton>
                  </ActionForm>
                ) : null}
              </div>
            </Card>
          ) : null}

          {canPay ? (
            <Card>
              <CardHeader title="Record payment" description={`Balance due ${formatCents(balance)}`} />
              <ActionForm action={recordPaymentAction} className="space-y-3 p-5" resetOnSuccess>
                {idField}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount ($)" htmlFor="amount">
                    <Input id="amount" name="amount" inputMode="decimal" required defaultValue={centsToInput(balance)} />
                  </Field>
                  <Field label="Date" htmlFor="date">
                    <Input id="date" name="date" type="date" required defaultValue={today} max={today} />
                  </Field>
                </div>
                <Field label="Method" htmlFor="method">
                  <Select id="method" name="method" defaultValue="check">
                    {MANUAL_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reference (optional)" htmlFor="reference">
                  <Input id="reference" name="reference" placeholder="Check #, Zelle confirmation…" />
                </Field>
                <SubmitButton className="w-full" variant="dark">
                  Record payment
                </SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          {payments.length > 0 && can(user, 'payments:record') ? (
            <Card>
              <CardHeader title="Payments" />
              <ul className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium">{formatCents(p.amountCents)}</p>
                      <p className="text-xs text-slate-500">
                        {PAYMENT_METHOD_LABELS[p.method]} · {formatDateTime(p.receivedAt)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </p>
                    </div>
                    {p.method !== 'stripe' ? (
                      <ConfirmButton action={deletePaymentAction} hidden={{ paymentId: p.id }} variant="ghost" confirm="Remove this payment record?">
                        Remove
                      </ConfirmButton>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {!isVoid ? (
            <Card>
              <CardHeader title="Customer link" description="Anyone with this link can view and pay this invoice." />
              <div className="space-y-3 p-5">
                <CopyLink url={publicUrl} />
                <a href={`/i/${invoice.token}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
                  Preview customer view <ExternalLink className="size-3.5" />
                </a>
              </div>
            </Card>
          ) : null}

          {!isVoid && invoice.paidCents === 0 ? (
            <div className="flex justify-end">
              <ConfirmButton action={voidInvoiceAction} hidden={{ id: invoice.id }} variant="danger" confirm={`Void invoice #${invoice.number}? This can’t be undone.`}>
                Void invoice
              </ConfirmButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
