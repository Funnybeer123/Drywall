import { PhotoInput } from '@/components/photo-input'
import { Checkbox, Field, Input, Select } from '@/components/ui'
import { COMMON_VENDORS, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/lib/expense-categories'
import { centsToInput } from '@/lib/money'
import type { Expense } from '@/db/schema'

/** Shared fields for the new + edit expense forms (rendered inside an <ActionForm>). */
export function ExpenseFields({
  projects,
  allowOverhead,
  defaults,
}: {
  projects: { id: number; title: string }[]
  allowOverhead: boolean
  defaults: Partial<Pick<Expense, 'date' | 'category' | 'projectId' | 'vendor' | 'description' | 'amountCents' | 'receiptUrl'>>
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount ($)" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
            autoFocus={!defaults.amountCents}
            defaultValue={defaults.amountCents ? centsToInput(defaults.amountCents) : ''}
            className="text-lg font-semibold"
          />
        </Field>
        <Field label="Date" htmlFor="date">
          <Input id="date" name="date" type="date" required defaultValue={defaults.date} />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" required defaultValue={defaults.category ?? ''}>
            <option value="" disabled>
              Choose…
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Job"
          htmlFor="projectId"
          hint={!allowOverhead && projects.length === 0 ? 'You’re not assigned to any jobs yet — ask the owner to add you.' : undefined}
        >
          <Select id="projectId" name="projectId" defaultValue={defaults.projectId ? String(defaults.projectId) : ''} required={!allowOverhead}>
            {allowOverhead ? <option value="">Overhead / not tied to a job</option> : <option value="">Choose a job…</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vendor" htmlFor="vendor">
          <Input id="vendor" name="vendor" list="vendor-list" placeholder="e.g. Home Depot" defaultValue={defaults.vendor ?? ''} autoComplete="off" />
          <datalist id="vendor-list">
            {COMMON_VENDORS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Description" htmlFor="description">
          <Input id="description" name="description" placeholder="e.g. 20 sheets 1/2&quot; 4x8" defaultValue={defaults.description ?? ''} />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Receipt</p>
        {defaults.receiptUrl ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <a href={defaults.receiptUrl} target="_blank" rel="noopener" className="text-brand hover:underline">
              View current receipt
            </a>
            <Checkbox name="removeReceipt" label="Remove it" />
          </div>
        ) : null}
        <PhotoInput
          name="receipt"
          multiple={false}
          accept="image/*,application/pdf"
          label={defaults.receiptUrl ? 'Replace receipt' : 'Snap or upload receipt'}
        />
      </div>
    </div>
  )
}
