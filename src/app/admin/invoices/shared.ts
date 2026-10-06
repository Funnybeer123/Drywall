import type { Invoice } from '@/db/schema'

export type InvoiceDisplayStatus = Invoice['status'] | 'overdue'

/** "overdue" is derived: sent/partial invoices whose due date has passed. */
export function displayStatus(inv: Pick<Invoice, 'status' | 'dueDate'>, today: string): InvoiceDisplayStatus {
  if ((inv.status === 'sent' || inv.status === 'partial') && inv.dueDate < today) return 'overdue'
  return inv.status
}

export const INVOICE_KIND_LABELS: Record<Invoice['kind'], string> = {
  standard: 'Standard',
  deposit: 'Deposit',
  progress: 'Progress',
  final: 'Final',
}

export const PAYMENT_METHOD_LABELS = {
  stripe: 'Online (Stripe)',
  cash: 'Cash',
  check: 'Check',
  zelle: 'Zelle',
  venmo: 'Venmo',
  other: 'Other',
} as const

export const MANUAL_PAYMENT_METHODS = ['check', 'cash', 'zelle', 'venmo', 'other'] as const
