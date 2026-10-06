import { invoicePdfResponse } from '@/app/admin/invoices/invoice-pdf'

// Public: the unguessable token is the credential (same as the /i/<token> page).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9]{10,64}$/.test(token)) return new Response('Not found', { status: 404 })
  return invoicePdfResponse({ token })
}
