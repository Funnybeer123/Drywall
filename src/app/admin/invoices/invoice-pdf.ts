import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, projects } from '@/db/schema'
import { getInvoiceWithItems } from '@/lib/billing'
import { renderDocPdf } from '@/lib/pdf'
import { appUrl, getSettings } from '@/lib/settings'

/** Renders an invoice PDF and wraps it in a download Response (shared by admin + public routes). */
export async function invoicePdfResponse(where: { id: number } | { token: string }): Promise<Response> {
  const data = await getInvoiceWithItems(where)
  if (!data) return new Response('Not found', { status: 404 })
  const { invoice, items } = data
  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId))
  const [project] = invoice.projectId ? await db.select().from(projects).where(eq(projects.id, invoice.projectId)) : []
  const settings = await getSettings()

  const pdf = await renderDocPdf({
    kind: 'Invoice',
    number: String(invoice.number),
    settings,
    customer,
    issueDate: invoice.issueDate,
    dueLabel: 'Due',
    dueDate: invoice.dueDate,
    title: project?.title,
    items,
    subtotalCents: invoice.subtotalCents,
    taxRateBps: invoice.taxRateBps,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    notes: invoice.notes,
    link: invoice.status === 'void' ? undefined : appUrl(`/i/${invoice.token}`),
  })

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice-${invoice.number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
