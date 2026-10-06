import type { Customer, Invoice, Settings } from '@/db/schema'
import type { payments as paymentsTable, invoiceItems as invoiceItemsTable } from '@/db/schema'
import { formatCents, formatPercentBps, lineTotal } from '@/lib/money'
import { formatDate, formatDateTime } from '@/lib/dates'
import { formatPhone } from '@/lib/utils'
import { INVOICE_KIND_LABELS, PAYMENT_METHOD_LABELS } from './shared'

type Payment = typeof paymentsTable.$inferSelect
type Item = typeof invoiceItemsTable.$inferSelect

/** The invoice "paper" — shared by the admin view and the customer's public page. */
export function InvoiceDocument({
  settings: s,
  invoice,
  items,
  payments,
  customer,
  projectTitle,
  showPaymentRefs = false,
}: {
  settings: Settings
  invoice: Invoice
  items: Item[]
  payments: Payment[]
  customer: Customer
  projectTitle?: string | null
  showPaymentRefs?: boolean
}) {
  const balance = Math.max(0, invoice.totalCents - invoice.paidCents)
  const cityLine = [customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <div className="text-sm text-slate-800">
      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {s.logoUrl ? <img src={s.logoUrl} alt="" className="mb-3 h-12 w-auto" /> : null}
          <p className="text-lg font-bold" style={{ color: s.accentColor }}>
            {s.businessName}
          </p>
          <div className="mt-1 space-y-0.5 text-slate-500">
            <p>{formatPhone(s.phone)}</p>
            <p>{s.email}</p>
            {s.address ? <p>{s.address}</p> : null}
            <p>
              {s.city}, {s.state}
            </p>
            {s.licenseNumber ? <p>License #{s.licenseNumber}</p> : null}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-bold tracking-tight text-slate-900">INVOICE</p>
          <p className="font-medium">#{invoice.number}</p>
          {invoice.kind !== 'standard' ? <p className="text-slate-500">{INVOICE_KIND_LABELS[invoice.kind]} invoice</p> : null}
          <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-slate-500 sm:justify-end">
            <dt>Issued</dt>
            <dd className="text-slate-900">{formatDate(invoice.issueDate)}</dd>
            <dt>Due</dt>
            <dd className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</dd>
          </dl>
        </div>
      </div>

      {/* Parties */}
      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Bill to</p>
          <p className="mt-1 font-semibold text-slate-900">{customer.name}</p>
          {customer.company ? <p>{customer.company}</p> : null}
          {customer.address ? <p>{customer.address}</p> : null}
          {cityLine ? <p>{cityLine}</p> : null}
          {customer.email ? <p className="text-slate-500">{customer.email}</p> : null}
        </div>
        {projectTitle ? (
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Project</p>
            <p className="mt-1">{projectTitle}</p>
          </div>
        ) : null}
      </div>

      {/* Items */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-slate-300 text-xs tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-3 font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Price</th>
              <th className="py-2 pl-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2.5 pr-3">{it.description}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{it.quantity}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCents(it.unitPriceCents)}</td>
                <td className="py-2.5 pl-3 text-right tabular-nums">{formatCents(lineTotal(it))}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No line items
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1.5 tabular-nums">
        <div className="flex justify-between">
          <dt className="text-slate-500">Subtotal</dt>
          <dd>{formatCents(invoice.subtotalCents)}</dd>
        </div>
        {invoice.taxRateBps > 0 ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Tax ({formatPercentBps(invoice.taxRateBps)})</dt>
            <dd>{formatCents(invoice.taxCents)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
          <dt>Total</dt>
          <dd>{formatCents(invoice.totalCents)}</dd>
        </div>
        {invoice.paidCents > 0 ? (
          <div className="flex justify-between text-emerald-700">
            <dt>Paid</dt>
            <dd>−{formatCents(invoice.paidCents)}</dd>
          </div>
        ) : null}
        {invoice.status !== 'void' ? (
          <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2 text-base font-bold text-slate-900">
            <dt>Balance due</dt>
            <dd>{formatCents(balance)}</dd>
          </div>
        ) : null}
      </dl>

      {/* Payments */}
      {payments.length > 0 ? (
        <div className="mt-8">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Payments received</p>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  {formatDateTime(p.receivedAt)} · {PAYMENT_METHOD_LABELS[p.method]}
                  {showPaymentRefs && p.reference ? <span className="text-slate-500"> · {p.reference}</span> : null}
                </span>
                <span className="font-medium tabular-nums">{formatCents(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invoice.notes ? (
        <div className="mt-8 rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      ) : null}

      {s.invoiceFooter ? <p className="mt-8 text-center text-slate-500">{s.invoiceFooter}</p> : null}
    </div>
  )
}
