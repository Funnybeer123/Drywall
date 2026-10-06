'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { computeTotals, formatCents, lineTotal } from '@/lib/money'
import { Button, Input, Select } from './ui'

type Row = { description: string; quantity: string; unitPrice: string }
export type PriceItemOption = { id: number; name: string; unit: string; unitPriceCents: number }

const toCents = (s: string) => Math.round((Number(s.replace(/[$,]/g, '')) || 0) * 100)

/**
 * Editable line items for estimates and invoices. Submits a hidden `items` JSON
 * field: [{ description, quantity, unitPriceCents }].
 */
export function LineItemsEditor({
  initial,
  priceItems = [],
  defaultTaxRate,
}: {
  initial?: { description: string; quantity: number; unitPriceCents: number }[]
  priceItems?: PriceItemOption[]
  defaultTaxRate: number // percent, e.g. 8.25
}) {
  const [rows, setRows] = useState<Row[]>(
    initial?.length
      ? initial.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: (i.unitPriceCents / 100).toFixed(2) }))
      : [{ description: '', quantity: '1', unitPrice: '' }],
  )
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate))

  const items = rows
    .filter((r) => r.description.trim())
    .map((r) => ({ description: r.description.trim(), quantity: Number(r.quantity) || 0, unitPriceCents: toCents(r.unitPrice) }))
  const taxBps = Math.round((Number(taxRate) || 0) * 100)
  const totals = computeTotals(items, taxBps)

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="taxRateBps" value={taxBps} />

      <div className="hidden grid-cols-[1fr_80px_110px_100px_36px] gap-2 px-1 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase sm:grid">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <div className="space-y-3 sm:space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_36px] gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_80px_110px_100px_36px] sm:bg-transparent sm:p-0">
            <Input
              aria-label="Description"
              placeholder="e.g. Hang & finish 1/2&quot; drywall"
              value={r.description}
              onChange={(e) => update(i, { description: e.target.value })}
              className="col-span-3 sm:col-span-1"
            />
            <Input aria-label="Quantity" inputMode="decimal" value={r.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
            <Input aria-label="Unit price" inputMode="decimal" placeholder="0.00" value={r.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} />
            <span className="hidden self-center text-right text-sm font-medium sm:block">
              {formatCents(lineTotal({ quantity: Number(r.quantity) || 0, unitPriceCents: toCents(r.unitPrice) }))}
            </span>
            <button
              type="button"
              aria-label="Remove line"
              onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ description: '', quantity: '1', unitPrice: '' }]))}
              className="flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { description: '', quantity: '1', unitPrice: '' }])}>
          <Plus className="size-4" /> Add line
        </Button>
        {priceItems.length > 0 ? (
          <Select
            aria-label="Add from price list"
            className="h-8 w-auto py-0 text-sm"
            value=""
            onChange={(e) => {
              const p = priceItems.find((x) => x.id === Number(e.target.value))
              if (!p) return
              setRows((rs) => [
                ...rs.filter((r) => r.description.trim()),
                { description: p.name, quantity: '1', unitPrice: (p.unitPriceCents / 100).toFixed(2) },
              ])
            }}
          >
            <option value="">+ From price list…</option>
            {priceItems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCents(p.unitPriceCents)}/{p.unit}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <div className="mt-5 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span>{formatCents(totals.subtotalCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="taxRate" className="text-slate-500">
            Tax rate %
          </label>
          <Input id="taxRate" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="h-8 w-20 text-right" />
          <span className="w-24 text-right">{formatCents(totals.taxCents)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatCents(totals.totalCents)}</span>
        </div>
      </div>
    </div>
  )
}
