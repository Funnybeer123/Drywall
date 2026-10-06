import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers } from '@/db/schema'
import { getEstimateWithItems } from '@/lib/billing'
import { renderDocPdf } from '@/lib/pdf'
import { appUrl, getSettings } from '@/lib/settings'
import { todayISO } from '@/lib/dates'

/** Renders an estimate as a PDF download (shared by the admin and public routes). */
export async function estimatePdfResponse(where: { id: number } | { token: string }): Promise<Response> {
  const data = await getEstimateWithItems(where)
  if (!data) return new Response('Not found', { status: 404 })
  const { estimate, items } = data
  const [[customer], settings] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, estimate.customerId)),
    getSettings(),
  ])
  if (!customer) return new Response('Not found', { status: 404 })

  const pdf = await renderDocPdf({
    kind: 'Estimate',
    number: `E-${estimate.id}`,
    settings,
    customer,
    issueDate: todayISO(estimate.sentAt ?? estimate.createdAt),
    dueLabel: 'Valid until',
    dueDate: estimate.validUntil,
    title: estimate.title,
    items,
    subtotalCents: estimate.subtotalCents,
    taxRateBps: estimate.taxRateBps,
    taxCents: estimate.taxCents,
    totalCents: estimate.totalCents,
    notes: estimate.notes,
    link: appUrl(`/e/${estimate.token}`),
  })
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Estimate-E-${estimate.id}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
