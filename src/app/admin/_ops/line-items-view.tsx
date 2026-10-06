import { formatCents, formatPercentBps, lineTotal } from '@/lib/money'

type Item = { id?: number; description: string; quantity: number; unitPriceCents: number }

/** Read-only line items + totals. Stacks on phones, table on wider screens. */
export function LineItemsView({
  items,
  subtotalCents,
  taxRateBps,
  taxCents,
  totalCents,
}: {
  items: Item[]
  subtotalCents: number
  taxRateBps: number
  taxCents: number
  totalCents: number
}) {
  return (
    <div>
      <ul className="divide-y divide-slate-100 sm:hidden">
        {items.map((it, i) => (
          <li key={it.id ?? i} className="py-3">
            <div className="flex justify-between gap-3">
              <p className="text-sm text-slate-900">{it.description}</p>
              <p className="shrink-0 text-sm font-medium">{formatCents(lineTotal(it))}</p>
            </div>
            <p className="text-xs text-slate-500">
              {it.quantity} × {formatCents(it.unitPriceCents)}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="table-base">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id ?? i}>
                <td className="whitespace-pre-line">{it.description}</td>
                <td className="text-right">{it.quantity}</td>
                <td className="text-right whitespace-nowrap">{formatCents(it.unitPriceCents)}</td>
                <td className="text-right font-medium whitespace-nowrap">{formatCents(lineTotal(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Subtotal</dt>
          <dd>{formatCents(subtotalCents)}</dd>
        </div>
        {taxRateBps > 0 ? (
          <div className="flex justify-between">
            <dt className="text-slate-500">Tax ({formatPercentBps(taxRateBps)})</dt>
            <dd>{formatCents(taxCents)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatCents(totalCents)}</dd>
        </div>
      </dl>
    </div>
  )
}
