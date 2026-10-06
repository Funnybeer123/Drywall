import 'server-only'
import { z } from 'zod'
import { appUrl } from '@/lib/settings'
import { saveUpload } from '@/lib/storage'
import type { Customer, Estimate, Expense, Invoice, Lead, Project } from '@/db/schema'
import { badRequest } from './framework'

// ---------- Input building blocks ----------

export const zId = z.coerce.number().int().positive()
/** Path param with a specific name (jobId, invoiceId…) so an AI can't mix up which id goes where. */
export const idParam = <N extends string>(name: N, label: string) =>
  z.object({ [name]: zId.describe(label) } as { [K in N]: typeof zId })
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').describe('Date as YYYY-MM-DD')
export const zDollars = z.number().min(0).max(10_000_000)
export const zAmount = z.number().positive().max(10_000_000)
export const zText = (max: number) => z.string().trim().max(max)
export const zLimit = z.coerce.number().int().min(1).max(200).default(50).describe('Max rows to return (default 50)')

export const zItems = z
  .array(
    z.object({
      description: zText(500).min(1),
      quantity: z.number().positive().max(1_000_000).default(1),
      unitPrice: zDollars.describe('Price per unit in dollars'),
    }),
  )
  .min(1)
  .max(100)
  .describe('Line items')

export const zUpload = z
  .object({
    filename: zText(200).min(1),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
    dataBase64: z.string().min(10).max(12_000_000).describe('File contents, base64-encoded (max ~8 MB)'),
  })
  .describe('A file to upload (photo or PDF)')

export const toCents = (dollars: number) => Math.round(dollars * 100)
export const toDollars = (cents: number | null | undefined) => Math.round(cents ?? 0) / 100
export const taxBpsFromPercent = (pct: number | undefined, fallbackBps: number) =>
  pct == null ? fallbackBps : Math.round(pct * 100)
export const itemsToCents = (items: z.infer<typeof zItems>) =>
  items.map((i) => ({ description: i.description, quantity: i.quantity, unitPriceCents: toCents(i.unitPrice) }))

export async function saveBase64Upload(u: z.infer<typeof zUpload>, folder: Parameters<typeof saveUpload>[1]) {
  let buf: Buffer
  try {
    buf = Buffer.from(u.dataBase64.replace(/^data:[^,]+,/, ''), 'base64')
  } catch {
    throw badRequest('dataBase64 is not valid base64.')
  }
  if (buf.length === 0) throw badRequest('Uploaded file is empty.')
  return saveUpload(new File([new Uint8Array(buf)], u.filename, { type: u.contentType }), folder)
}

const absolute = (url: string | null | undefined) => (url && url.startsWith('/') ? appUrl(url) : (url ?? null))

// ---------- Output shapes (money in dollars) ----------

export const leadOut = (l: Lead) => ({
  id: l.id,
  status: l.status,
  name: l.name,
  phone: l.phone,
  email: l.email,
  address: l.address,
  city: l.city,
  jobType: l.jobType,
  description: l.description,
  timeframe: l.timeframe,
  source: l.source,
  referredBy: l.referredBy,
  photoUrls: l.photoUrls.map(absolute),
  notes: l.notes,
  customerId: l.customerId,
  createdAt: l.createdAt,
})

export const customerOut = (c: Customer) => ({
  id: c.id,
  name: c.name,
  company: c.company,
  email: c.email,
  phone: c.phone,
  address: c.address,
  city: c.city,
  state: c.state,
  zip: c.zip,
  source: c.source,
  notes: c.notes,
  createdAt: c.createdAt,
})

export const jobOut = (p: Project) => ({
  id: p.id,
  customerId: p.customerId,
  title: p.title,
  status: p.status,
  description: p.description,
  address: p.address,
  city: p.city,
  startDate: p.startDate,
  endDate: p.endDate,
  quoted: toDollars(p.quotedCents),
  notes: p.notes,
  completedAt: p.completedAt,
  dashboardUrl: appUrl(`/admin/projects/${p.id}`),
})

export const estimateOut = (e: Estimate) => ({
  id: e.id,
  number: `E-${e.id}`,
  customerId: e.customerId,
  leadId: e.leadId,
  jobId: e.projectId,
  title: e.title,
  status: e.status,
  subtotal: toDollars(e.subtotalCents),
  tax: toDollars(e.taxCents),
  total: toDollars(e.totalCents),
  taxRatePercent: e.taxRateBps / 100,
  validUntil: e.validUntil,
  notes: e.notes,
  sentAt: e.sentAt,
  acceptedAt: e.acceptedAt,
  acceptedName: e.acceptedName,
  customerLink: appUrl(`/e/${e.token}`),
})

export const invoiceOut = (i: Invoice, today?: string) => ({
  id: i.id,
  number: i.number,
  customerId: i.customerId,
  jobId: i.projectId,
  estimateId: i.estimateId,
  kind: i.kind,
  status: i.status,
  overdue: today ? (i.status === 'sent' || i.status === 'partial') && i.dueDate < today : undefined,
  issueDate: i.issueDate,
  dueDate: i.dueDate,
  subtotal: toDollars(i.subtotalCents),
  tax: toDollars(i.taxCents),
  total: toDollars(i.totalCents),
  paid: toDollars(i.paidCents),
  balanceDue: toDollars(Math.max(0, i.totalCents - i.paidCents)),
  taxRatePercent: i.taxRateBps / 100,
  notes: i.notes,
  sentAt: i.sentAt,
  paidAt: i.paidAt,
  customerLink: appUrl(`/i/${i.token}`),
})

export const expenseOut = (e: Expense) => ({
  id: e.id,
  date: e.date,
  category: e.category,
  vendor: e.vendor,
  description: e.description,
  amount: toDollars(e.amountCents),
  jobId: e.projectId,
  receiptUrl: absolute(e.receiptUrl),
  createdBy: e.createdBy,
  createdAt: e.createdAt,
})

export { absolute }
