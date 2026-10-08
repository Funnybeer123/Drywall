import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { CheckCircle2, Download, Mail, Phone, XCircle } from 'lucide-react'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { getEstimateWithItems } from '@/lib/billing'
import { getSettings } from '@/lib/settings'
import { formatCents } from '@/lib/money'
import { formatDate, formatDateTime, todayISO } from '@/lib/dates'
import { formatPhone, telHref } from '@/lib/utils'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, Checkbox, Field, Input, buttonClass } from '@/components/ui'
import { LineItemsView } from '@/app/admin/_ops/line-items-view'
import { acceptEstimate } from './actions'

type Props = { params: Promise<{ token: string }> }

const validToken = (t: string) => /^[A-Za-z0-9]{10,64}$/.test(t)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const data = validToken(token) ? await getEstimateWithItems({ token }) : null
  return {
    title: data ? `Estimate E-${data.estimate.id}: ${data.estimate.title}` : 'Estimate',
    robots: { index: false, follow: false },
  }
}

export default async function PublicEstimatePage({ params }: Props) {
  const { token } = await params
  if (!validToken(token)) notFound()
  const data = await getEstimateWithItems({ token })
  if (!data) notFound()
  const { estimate: e, items } = data
  const [[customer], s] = await Promise.all([db.select().from(customers).where(eq(customers.id, e.customerId)), getSettings()])

  const today = todayISO()
  const expired = !!e.validUntil && e.validUntil < today
  const canAccept = (e.status === 'draft' || e.status === 'sent') && !expired
  const questionHref = `mailto:${s.email}?subject=${encodeURIComponent(`Question about estimate E-${e.id}: ${e.title}`)}`

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="theme-static border-b-4 border-brand bg-slate-900 text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold">
            {s.businessName}
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <a href={telHref(s.phone)} className="flex items-center gap-1.5 hover:text-white">
              <Phone className="size-4" /> {formatPhone(s.phone)}
            </a>
            <a href={`mailto:${s.email}`} className="hidden items-center gap-1.5 hover:text-white sm:flex">
              <Mail className="size-4" /> {s.email}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {e.status === 'accepted' ? (
          <Banner tone="good" icon={<CheckCircle2 className="size-5" />}>
            Accepted{e.acceptedAt ? ` on ${formatDateTime(e.acceptedAt)}` : ''}. Thank you! {s.ownerName} will be in touch to schedule your project.
          </Banner>
        ) : e.status === 'declined' ? (
          <Banner tone="bad" icon={<XCircle className="size-5" />}>
            This estimate is no longer active. Call {formatPhone(s.phone)} if you’d like an updated quote.
          </Banner>
        ) : expired ? (
          <Banner tone="bad" icon={<XCircle className="size-5" />}>
            This estimate expired on {formatDate(e.validUntil)}. Please call or email us for an updated quote.
          </Banner>
        ) : null}

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <p className="eyebrow">Estimate E-{e.id}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{e.title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(todayISO(e.sentAt ?? e.createdAt))}
                {e.validUntil ? ` · Valid until ${formatDate(e.validUntil)}` : ''}
              </p>
            </div>
            <a href={`/e/${e.token}/pdf`} className={buttonClass('secondary', 'sm')}>
              <Download className="size-4" /> Download PDF
            </a>
          </div>

          <div className="grid gap-5 border-b border-slate-100 p-5 text-sm sm:grid-cols-2 sm:p-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Prepared for</p>
              <p className="mt-1 font-semibold text-slate-900">{customer?.name}</p>
              {customer?.company ? <p className="text-slate-700">{customer.company}</p> : null}
              {customer?.address ? <p className="text-slate-700">{customer.address}</p> : null}
              {customer?.city ? (
                <p className="text-slate-700">
                  {customer.city}
                  {customer.state ? `, ${customer.state}` : ''} {customer.zip ?? ''}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">From</p>
              <p className="mt-1 font-semibold text-slate-900">{s.businessName}</p>
              <p className="text-slate-700">{formatPhone(s.phone)}</p>
              <p className="text-slate-700">{s.email}</p>
              {s.licenseNumber ? <p className="text-slate-500">License #{s.licenseNumber}{s.insured ? ' · Fully insured' : ''}</p> : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <LineItemsView items={items} subtotalCents={e.subtotalCents} taxRateBps={e.taxRateBps} taxCents={e.taxCents} totalCents={e.totalCents} />
            {e.notes ? (
              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Notes</p>
                <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{e.notes}</p>
              </div>
            ) : null}
          </div>
        </Card>

        {canAccept ? (
          <Card className="mt-6 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Ready to move forward?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Accept this estimate for <span className="font-semibold text-slate-900">{formatCents(e.totalCents)}</span> and we’ll reach out to
              schedule your project.
            </p>
            <ActionForm action={acceptEstimate.bind(null, e.token)} className="mt-5 space-y-4">
              <Field label="Your full name" htmlFor="name">
                <Input id="name" name="name" required minLength={2} maxLength={120} autoComplete="name" defaultValue={customer?.name ?? ''} />
              </Field>
              <Checkbox
                name="agree"
                required
                label={`I agree to the scope and price in this estimate and authorize ${s.businessName} to proceed.`}
              />
              <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Accepting…">
                <CheckCircle2 className="size-5" /> Accept estimate
              </SubmitButton>
            </ActionForm>
          </Card>
        ) : null}

        <div className="mt-6 rounded-xl bg-surface p-5 text-sm text-slate-600 ring-1 ring-slate-200 sm:p-6">
          <p className="font-medium text-slate-900">Have a question, or want to decline?</p>
          <p className="mt-1">No problem — just reach out and {s.ownerName} will get back to you.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={telHref(s.phone)} className={buttonClass('secondary', 'sm')}>
              <Phone className="size-4" /> Call {formatPhone(s.phone)}
            </a>
            <a href={questionHref} className={buttonClass('secondary', 'sm')}>
              <Mail className="size-4" /> Email a question
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">{s.invoiceFooter}</p>
      </main>
    </div>
  )
}

function Banner({ tone, icon, children }: { tone: 'good' | 'bad'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className={`mb-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${
        tone === 'good' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-amber-200'
      }`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  )
}
