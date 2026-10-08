import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { AlertTriangle, CheckCircle2, CreditCard, Download, Phone } from 'lucide-react'
import { db } from '@/db'
import { customers, projects } from '@/db/schema'
import { balanceDue, getInvoiceWithItems } from '@/lib/billing'
import { getSettings } from '@/lib/settings'
import { getStripe } from '@/lib/stripe'
import { formatCents } from '@/lib/money'
import { formatDate, todayISO } from '@/lib/dates'
import { formatPhone, telHref } from '@/lib/utils'
import { SubmitButton } from '@/components/form'
import { buttonClass } from '@/components/ui'
import { InvoiceDocument } from '@/app/admin/invoices/invoice-document'
import { displayStatus } from '@/app/admin/invoices/shared'
import { payInvoiceAction } from './actions'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; payError?: string }>
}

const TOKEN_RE = /^[A-Za-z0-9]{10,64}$/

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const data = TOKEN_RE.test(token) ? await getInvoiceWithItems({ token }) : null
  return {
    title: data ? `Invoice #${data.invoice.number}` : 'Invoice',
    robots: { index: false, follow: false },
  }
}

export default async function PublicInvoicePage({ params, searchParams }: Props) {
  const { token } = await params
  if (!TOKEN_RE.test(token)) notFound()
  const data = await getInvoiceWithItems({ token })
  if (!data) notFound()
  const sp = await searchParams
  const { invoice, items, payments } = data
  const [[customer], [project], s] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, invoice.customerId)),
    invoice.projectId ? db.select().from(projects).where(eq(projects.id, invoice.projectId)) : Promise.resolve([]),
    getSettings(),
  ])

  const status = displayStatus(invoice, todayISO())
  const balance = balanceDue(invoice)
  const isVoid = invoice.status === 'void'
  const justPaid = sp.paid === '1'
  const stripeReady = getStripe() !== null
  const canPayOnline = stripeReady && !isVoid && balance >= 50 && !(justPaid && invoice.status !== 'paid')

  return (
    <div className="min-h-dvh bg-slate-100 pb-16">
      <header className="theme-static bg-slate-900 text-white" style={{ borderBottom: `4px solid ${s.accentColor}` }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="font-bold">{s.businessName}</p>
          <a href={telHref(s.phone)} className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
            <Phone className="size-4" /> {formatPhone(s.phone)}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Status banners */}
        <div className="mb-6 space-y-3 empty:hidden">
          {justPaid && invoice.status !== 'paid' && !isVoid ? (
            <Banner tone="green" icon={<CheckCircle2 className="size-5" />} title="Payment received — thank you!">
              It can take a moment for your payment to show on this invoice. You’ll get a receipt by email from Stripe.
            </Banner>
          ) : null}
          {invoice.status === 'paid' ? (
            <Banner tone="green" icon={<CheckCircle2 className="size-5" />} title={justPaid ? 'Payment received — thank you!' : 'PAID'}>
              This invoice is paid in full{invoice.paidAt ? ` as of ${formatDate(todayISO(invoice.paidAt))}` : ''}. Thank you for your business!
            </Banner>
          ) : null}
          {status === 'overdue' && !justPaid ? (
            <Banner tone="red" icon={<AlertTriangle className="size-5" />} title="OVERDUE">
              This invoice was due {formatDate(invoice.dueDate)}. Please pay the balance of {formatCents(balance)} at your earliest convenience.
            </Banner>
          ) : null}
          {isVoid ? (
            <Banner tone="gray" icon={<AlertTriangle className="size-5" />} title="This invoice has been voided">
              No payment is due. Questions? Call {formatPhone(s.phone)}.
            </Banner>
          ) : null}
          {sp.payError ? (
            <Banner tone="red" icon={<AlertTriangle className="size-5" />} title="We couldn’t start the online payment">
              {sp.payError === 'busy' ? 'Too many attempts — please wait a few minutes and try again.' : 'Please try again, or contact us to pay another way.'}
            </Banner>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Pay box first on mobile */}
          <aside className="space-y-4 lg:order-2">
            <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">{isVoid ? 'Invoice' : balance > 0 ? 'Amount due' : 'Balance'}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{formatCents(isVoid ? 0 : balance)}</p>
              {!isVoid && balance > 0 ? (
                <p className={status === 'overdue' ? 'mt-1 text-sm font-medium text-red-600' : 'mt-1 text-sm text-slate-500'}>
                  Due {formatDate(invoice.dueDate)}
                </p>
              ) : null}

              {canPayOnline ? (
                <form action={payInvoiceAction} className="mt-5">
                  <input type="hidden" name="token" value={invoice.token} />
                  <SubmitButton size="lg" className="w-full" pendingText="Opening secure checkout…">
                    <CreditCard className="size-5" /> Pay {formatCents(balance)} now
                  </SubmitButton>
                  <p className="mt-2 text-center text-xs text-slate-500">Card or bank transfer · secure checkout by Stripe</p>
                </form>
              ) : null}

              <a
                href={`/i/${invoice.token}/pdf`}
                target="_blank"
                rel="noopener"
                className={buttonClass('secondary', 'md', `${canPayOnline ? 'mt-3' : 'mt-5'} w-full`)}
              >
                <Download className="size-4" /> Download PDF
              </a>
            </div>

            {!isVoid && balance > 0 ? (
              <div className="rounded-xl bg-surface p-5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                <p className="font-semibold text-slate-900">{stripeReady ? 'Prefer to pay offline?' : 'How to pay'}</p>
                <p className="mt-1">
                  Pay by check payable to <strong className="text-slate-900">{s.businessName}</strong>
                  {s.address ? (
                    <>
                      , mailed to {s.address}, {s.city}, {s.state}
                    </>
                  ) : null}
                  . Please write invoice #{invoice.number} on the memo line.
                </p>
                <p className="mt-2">
                  Questions? Call or text{' '}
                  <a href={telHref(s.phone)} className="font-medium text-brand-fg hover:underline">
                    {formatPhone(s.phone)}
                  </a>
                  .
                </p>
              </div>
            ) : null}
          </aside>

          <article className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-slate-200 sm:p-10 lg:order-1">
            <InvoiceDocument settings={s} invoice={invoice} items={items} payments={payments} customer={customer} projectTitle={project?.title} />
          </article>
        </div>
      </main>
    </div>
  )
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'green' | 'red' | 'gray'
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    red: 'bg-red-50 text-red-900 ring-red-200',
    gray: 'bg-slate-50 text-slate-800 ring-slate-200',
  }
  return (
    <div role="status" className={`flex gap-3 rounded-xl p-4 ring-1 ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-bold tracking-wide">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{children}</p>
      </div>
    </div>
  )
}
