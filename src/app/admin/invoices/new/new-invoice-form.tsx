'use client'

import { useState } from 'react'
import { ActionForm, SubmitButton } from '@/components/form'
import { LineItemsEditor, type PriceItemOption } from '@/components/line-items-editor'
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui'
import { formatCents } from '@/lib/money'
import { addDays } from '@/lib/dates'
import { createInvoiceAction } from '../actions'
import { INVOICE_KIND_LABELS } from '../shared'

type Item = { description: string; quantity: number; unitPriceCents: number }
type Kind = keyof typeof INVOICE_KIND_LABELS

export type NewInvoiceProps = {
  customers: { id: number; name: string }[]
  projects: { id: number; customerId: number; title: string; baseCents: number; baseLabel: string }[]
  priceItems: PriceItemOption[]
  paymentTermsDays: number
  initial: {
    customerId: number | null
    projectId: number | null
    estimate: { id: number; title: string; totalCents: number } | null
    kind: Kind
    issueDate: string
    dueDate: string
    items: Item[]
    taxRatePct: number
    notes: string
  }
}

export function NewInvoiceForm({ customers, projects, priceItems, paymentTermsDays, initial }: NewInvoiceProps) {
  const [customerId, setCustomerId] = useState(initial.customerId ? String(initial.customerId) : '')
  const [projectId, setProjectId] = useState(initial.projectId ? String(initial.projectId) : '')
  const [kind, setKind] = useState<Kind>(initial.kind)
  const [issueDate, setIssueDate] = useState(initial.issueDate)
  const [dueDate, setDueDate] = useState(initial.dueDate)
  const [dueTouched, setDueTouched] = useState(false)
  const [pct, setPct] = useState('50')
  const [editor, setEditor] = useState({ key: 0, items: initial.items, taxRatePct: initial.taxRatePct })

  const customerProjects = projects.filter((p) => String(p.customerId) === customerId)
  const project = projects.find((p) => String(p.id) === projectId)
  const estimate = initial.estimate && String(initial.customerId) === customerId ? initial.estimate : null

  // What a deposit is a percentage of: the estimate we came from, else the job's accepted estimate / quote.
  const base = estimate
    ? { cents: estimate.totalCents, label: `estimate “${estimate.title}”`, title: estimate.title }
    : project && project.baseCents > 0
      ? { cents: project.baseCents, label: project.baseLabel, title: project.title }
      : null
  const pctNum = Math.min(100, Math.max(0, Number(pct) || 0))
  const depositCents = base ? Math.round((base.cents * pctNum) / 100) : 0

  function applyDeposit() {
    if (!base || depositCents <= 0) return
    setEditor((e) => ({
      key: e.key + 1,
      // Deposits are a share of the (already taxed) total, so no extra tax on this line.
      taxRatePct: 0,
      items: [{ description: `Deposit (${pctNum}%) — ${base.title}`, quantity: 1, unitPriceCents: depositCents }],
    }))
  }

  return (
    <ActionForm action={createInvoiceAction} className="space-y-6">
      {estimate ? <input type="hidden" name="estimateId" value={estimate.id} /> : null}

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" htmlFor="customerId">
            <Select
              id="customerId"
              name="customerId"
              required
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                setProjectId('')
              }}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Job (optional)" htmlFor="projectId" hint={customerId && customerProjects.length === 0 ? 'This customer has no jobs yet.' : undefined}>
            <Select id="projectId" name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!customerId}>
              <option value="">No job</option>
              {customerProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Invoice type" htmlFor="kind">
            <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {Object.entries(INVOICE_KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue date" htmlFor="issueDate">
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                required
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value)
                  if (!dueTouched && e.target.value) setDueDate(addDays(e.target.value, paymentTermsDays))
                }}
              />
            </Field>
            <Field label="Due date" htmlFor="dueDate">
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  setDueTouched(true)
                }}
              />
            </Field>
          </div>
        </div>

        {kind === 'deposit' ? (
          <div className="mt-5 rounded-lg bg-brand-soft p-4">
            <p className="text-sm font-semibold text-slate-900">Deposit helper</p>
            {base ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <Input
                  aria-label="Deposit percent"
                  inputMode="decimal"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className="h-8 w-16 text-right"
                />
                <span>
                  % of {base.label} ({formatCents(base.cents)}) = <strong>{formatCents(depositCents)}</strong>
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={applyDeposit} disabled={depositCents <= 0}>
                  Use this amount
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Pick a job with a quote or accepted estimate to calculate a percentage deposit.</p>
            )}
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Line items</h2>
        <LineItemsEditor key={editor.key} initial={editor.items} priceItems={priceItems} defaultTaxRate={editor.taxRatePct} />
      </Card>

      <Card className="p-5">
        <Field label="Notes (shown on the invoice)" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={initial.notes} placeholder="e.g. Thank you! Checks payable to…" />
        </Field>
      </Card>

      <div className="flex justify-end">
        <SubmitButton size="lg">Create invoice</SubmitButton>
      </div>
    </ActionForm>
  )
}
