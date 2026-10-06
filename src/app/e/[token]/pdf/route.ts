import { estimatePdfResponse } from '@/app/admin/estimates/pdf-response'

// Public: anyone with the unguessable estimate link can download its PDF.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!/^[A-Za-z0-9]{10,64}$/.test(token)) return new Response('Not found', { status: 404 })
  return estimatePdfResponse({ token })
}
