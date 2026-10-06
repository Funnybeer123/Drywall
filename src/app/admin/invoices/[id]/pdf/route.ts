import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { invoicePdfResponse } from '../../invoice-pdf'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!can(user, 'invoices:manage')) return new Response('Forbidden', { status: 403 })
  const id = Number((await params).id)
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 })
  return invoicePdfResponse({ id })
}
